import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import { mkdir, mkdtemp, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type { Queue } from "bullmq";
import {
  Prisma,
  type AttemptOutcome,
  type PrismaClient,
} from "@testpilot/database";
import { resolveReportedOutcome } from "@testpilot/domain";
import { assertSafeUrl, type SsrfPolicy } from "@testpilot/security";
import { compileTestIntent } from "@testpilot/test-compiler";
import { validateTestIntent } from "@testpilot/test-ir";
import {
  collectArtifacts,
  readPlaywrightJsonReport,
  type RuntimeAttempt,
  type RuntimeTestExecution,
} from "@testpilot/test-runtime";
import type { WorkerConfig } from "../config.js";
import type { PublishProgress } from "../state.js";
import {
  canFailRun,
  transitionPersistedRun,
} from "../state.js";
import { ArtifactStorage } from "../storage.js";
import { QUEUE_NAME, type ExecuteRunJob } from "../types.js";

interface RunConfig {
  allowDestructive?: boolean;
  retries?: number;
  workers?: number;
  testCaseIds?: string[];
}

interface EnvironmentConfig {
  allowedDomains?: string[];
  allowDestructiveTests?: boolean;
}

function record(value: Prisma.JsonValue): Record<string, Prisma.JsonValue> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, Prisma.JsonValue>)
    : {};
}

function runConfiguration(value: Prisma.JsonValue): RunConfig {
  const input = record(value);
  return {
    allowDestructive: input.allowDestructive === true,
    retries:
      typeof input.retries === "number" && input.retries >= 0
        ? Math.min(Math.floor(input.retries), 2)
        : 0,
    workers:
      typeof input.workers === "number" && input.workers > 0
        ? Math.min(Math.floor(input.workers), 4)
        : 1,
    testCaseIds: Array.isArray(input.testCaseIds)
      ? input.testCaseIds.filter(
          (item): item is string => typeof item === "string",
        )
      : undefined,
  };
}

function environmentConfiguration(value: Prisma.JsonValue): EnvironmentConfig {
  const input = record(value);
  return {
    allowedDomains: Array.isArray(input.allowedDomains)
      ? input.allowedDomains.filter(
          (item): item is string => typeof item === "string",
        )
      : undefined,
    allowDestructiveTests: input.allowDestructiveTests === true,
  };
}

function playwrightConfig(
  baseUrl: string,
  outputDirectory: string,
  reportPath: string,
  retries: number,
  workers: number,
): string {
  return `import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "./tests",
  outputDir: ${JSON.stringify(outputDirectory)},
  timeout: 30000,
  retries: ${retries},
  workers: ${workers},
  reporter: [["json", { outputFile: ${JSON.stringify(reportPath)} }]],
  use: {
    baseURL: ${JSON.stringify(baseUrl)},
    browserName: "chromium",
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
    video: "retain-on-failure"
  }
});
`;
}

async function runPlaywright(
  directory: string,
  configPath: string,
  logPath: string,
): Promise<number> {
  const cli = fileURLToPath(
    new URL("../../node_modules/@playwright/test/cli.js", import.meta.url),
  );
  return new Promise<number>((resolveRun, reject) => {
    const child = spawn(process.execPath, [cli, "test", "--config", configPath], {
      cwd: directory,
      env: { ...process.env, CI: "1" },
      stdio: ["ignore", "pipe", "pipe"],
    });
    const output: Buffer[] = [];
    child.stdout.on("data", (chunk: Buffer) => output.push(chunk));
    child.stderr.on("data", (chunk: Buffer) => output.push(chunk));
    child.once("error", reject);
    child.once("close", async (code) => {
      await writeFile(logPath, Buffer.concat(output));
      resolveRun(code ?? 1);
    });
  });
}

function fallbackExecution(
  testCaseId: string,
  message: string,
): RuntimeTestExecution {
  return {
    title: testCaseId,
    file: `${testCaseId}.spec.ts`,
    attempts: [
      {
        attemptNumber: 1,
        outcome: "FAILED",
        durationMs: 0,
        error: { message },
        attachments: [],
      },
    ],
  };
}

function databaseOutcome(outcome: RuntimeAttempt["outcome"]): AttemptOutcome {
  return outcome;
}

export async function processExecuteRun(
  database: PrismaClient,
  queue: Queue,
  storage: ArtifactStorage,
  config: WorkerConfig,
  publish: PublishProgress,
  data: ExecuteRunJob,
): Promise<{ outcome: "COMPLETED" | "FAILED"; failed: number }> {
  let temporaryDirectory: string | undefined;
  try {
    await transitionPersistedRun(
      database,
      data.runId,
      "PREPARING",
      "Validating run policy and preparing tests",
      publish,
    );
    const run = await database.testRun.findUniqueOrThrow({
      where: { id: data.runId },
      include: {
        environment: true,
        testSuite: {
          include: {
            items: {
              where: { enabled: true },
              orderBy: { position: "asc" },
              include: { testCase: { include: { versions: true } } },
            },
          },
        },
      },
    });
    const runConfig = runConfiguration(run.config);
    const environmentConfig = environmentConfiguration(run.environment.config);
    const baseUrl = run.environment.baseUrl || config.demoSutUrl;
    const baseHostname = new URL(baseUrl).hostname;
    const policy: SsrfPolicy = {
      allowPrivateNetwork: config.allowPrivateNetworkTargets,
      allowLocalhost: config.allowLocalhost,
      allowedHosts:
        environmentConfig.allowedDomains &&
        environmentConfig.allowedDomains.length > 0
          ? environmentConfig.allowedDomains
          : [baseHostname],
    };
    await assertSafeUrl(baseUrl, policy);

    const selectedIds = new Set(runConfig.testCaseIds ?? []);
    const cases =
      selectedIds.size > 0
        ? await database.testCase.findMany({
            where: {
              id: { in: [...selectedIds] },
              workspaceId: run.workspaceId,
              projectId: run.projectId,
              deletedAt: null,
            },
            include: { versions: true },
            orderBy: { key: "asc" },
          })
        : (run.testSuite?.items ?? []).map((item) => item.testCase);
    if (selectedIds.size > 0 && cases.length !== selectedIds.size) {
      throw new Error("One or more run tests are unavailable");
    }
    if (cases.length === 0) throw new Error("The run contains no enabled tests");

    const prepared: Array<{
      testCase: (typeof cases)[number];
      version: (typeof cases)[number]["versions"][number];
      code: string;
    }> = [];
    for (const testCase of cases) {
      if (
        run.environment.kind === "PRODUCTION_LIKE" &&
        testCase.status !== "APPROVED" &&
        testCase.status !== "ACTIVE"
      ) {
        throw new Error(
          `Test ${testCase.key} is not approved for PRODUCTION_LIKE execution`,
        );
      }
      const version = testCase.versions.find(
        (candidate) => candidate.revision === testCase.currentVersion,
      );
      if (!version) {
        throw new Error(`Current version is missing for ${testCase.key}`);
      }
      const intent = validateTestIntent(version.intent);
      if (
        intent.destructive &&
        !(
          runConfig.allowDestructive === true &&
          environmentConfig.allowDestructiveTests === true
        )
      ) {
        throw new Error(
          `Destructive test ${testCase.key} requires run and environment approval`,
        );
      }
      for (const action of [...intent.actions, ...intent.cleanupActions]) {
        if (action.type === "navigate") {
          await assertSafeUrl(new URL(action.url, baseUrl).toString(), policy);
        }
      }
      const compiled = version.compiledCode
        ? {
            code: version.compiledCode,
            checksum: version.compiledChecksum,
            compilerVersion: version.compilerVersion,
            schemaVersion: version.schemaVersion,
          }
        : compileTestIntent(intent);
      if (!version.compiledCode) {
        await database.testCaseVersion.update({
          where: { id: version.id },
          data: {
            compiledCode: compiled.code,
            compiledChecksum: compiled.checksum,
            compilerVersion: compiled.compilerVersion,
            schemaVersion: compiled.schemaVersion,
          },
        });
      }
      prepared.push({ testCase, version, code: compiled.code });
    }

    temporaryDirectory = await mkdtemp(join(tmpdir(), "testpilot-run-"));
    const testsDirectory = join(temporaryDirectory, "tests");
    const artifactsDirectory = join(temporaryDirectory, "artifacts");
    const outputDirectory = join(artifactsDirectory, "test-results");
    const reportPath = join(artifactsDirectory, "playwright-report.json");
    const logPath = join(artifactsDirectory, "playwright.log");
    await Promise.all([
      mkdir(testsDirectory, { recursive: true }),
      mkdir(outputDirectory, { recursive: true }),
    ]);
    const workerNodeModules = resolve(
      fileURLToPath(new URL("../../node_modules", import.meta.url)),
    );
    await symlink(workerNodeModules, join(temporaryDirectory, "node_modules"), "dir");
    await Promise.all(
      prepared.map(({ testCase, code }) =>
        writeFile(join(testsDirectory, `${testCase.id}.spec.ts`), code),
      ),
    );
    const configPath = join(temporaryDirectory, "playwright.config.mjs");
    await writeFile(
      configPath,
      playwrightConfig(
        baseUrl,
        outputDirectory,
        reportPath,
        runConfig.retries ?? 0,
        runConfig.workers ?? 1,
      ),
    );

    await transitionPersistedRun(
      database,
      data.runId,
      "RUNNING",
      `Running ${prepared.length} Playwright test(s)`,
      publish,
    );
    const exitCode = await runPlaywright(temporaryDirectory, configPath, logPath);
    await transitionPersistedRun(
      database,
      data.runId,
      "COLLECTING_ARTIFACTS",
      "Collecting results and uploading artifacts",
      publish,
    );

    let executions: RuntimeTestExecution[] = [];
    try {
      executions = await readPlaywrightJsonReport(reportPath);
    } catch {
      executions = [];
    }
    const results: Array<{
      testResultId: string;
      finalAttemptId: string;
      reportedOutcome: AttemptOutcome;
      attachmentPaths: Set<string>;
    }> = [];
    for (const { testCase, version } of prepared) {
      const execution =
        executions.find(
          (candidate) => basename(candidate.file) === `${testCase.id}.spec.ts`,
        ) ??
        fallbackExecution(
          testCase.id,
          `Playwright exited with code ${exitCode} without a test result`,
        );
      const attempts = execution.attempts.length
        ? execution.attempts
        : fallbackExecution(testCase.id, "No Playwright attempts were reported")
            .attempts;
      const persistedAttempts = [];
      for (const attempt of attempts) {
        const startedAt = new Date(Date.now() - attempt.durationMs);
        persistedAttempts.push(
          await database.testAttempt.create({
            data: {
              workspaceId: run.workspaceId,
              testRunId: run.id,
              testCaseId: testCase.id,
              testCaseVersionId: version.id,
              attemptNumber: attempt.attemptNumber,
              outcome: databaseOutcome(attempt.outcome),
              startedAt,
              finishedAt: new Date(),
              durationMs: attempt.durationMs,
              error: attempt.error ? jsonError(attempt.error) : undefined,
              metrics: {
                attachmentCount: attempt.attachments.length,
                playwrightExitCode: exitCode,
              },
            },
          }),
        );
      }
      const reportedOutcome = resolveReportedOutcome(
        attempts.map((attempt) => ({
          attemptNumber: attempt.attemptNumber,
          outcome: databaseOutcome(attempt.outcome),
        })),
      );
      const finalAttempt = persistedAttempts.at(-1)!;
      const testResult = await database.testResult.create({
        data: {
          workspaceId: run.workspaceId,
          testRunId: run.id,
          testAttemptId: finalAttempt.id,
          testCaseId: testCase.id,
          outcome: reportedOutcome,
          durationMs: attempts.reduce(
            (total, attempt) => total + attempt.durationMs,
            0,
          ),
          summary:
            reportedOutcome === "PASSED"
              ? `${testCase.title} passed`
              : `${testCase.title} reported ${reportedOutcome.toLowerCase()}`,
          details: {
            attempts: attempts.length,
            errors: attempts
              .map((attempt) => attempt.error?.message)
              .filter((message): message is string => message !== undefined),
          },
        },
      });
      results.push({
        testResultId: testResult.id,
        finalAttemptId: finalAttempt.id,
        reportedOutcome,
        attachmentPaths: new Set(
          attempts.flatMap((attempt) =>
            attempt.attachments.flatMap((attachment) =>
              attachment.path ? [resolve(attachment.path)] : [],
            ),
          ),
        ),
      });
    }

    const artifacts = await collectArtifacts(artifactsDirectory);
    for (const artifact of artifacts) {
      const owner = results.find((result) =>
        result.attachmentPaths.has(resolve(artifact.absolutePath)),
      );
      const uploaded = await storage.upload(
        `${run.workspaceId}/${run.projectId}/${run.id}/${randomUUID()}`,
        artifact,
      );
      await database.artifact.create({
        data: {
          workspaceId: run.workspaceId,
          projectId: run.projectId,
          testRunId: run.id,
          testAttemptId: owner?.finalAttemptId,
          testResultId: owner?.testResultId,
          kind: artifact.kind,
          name: artifact.name,
          storageUrl: uploaded.storageUrl,
          contentType: artifact.contentType,
          sizeBytes: BigInt(artifact.sizeBytes),
          checksum: artifact.checksum,
          metadata: { key: uploaded.key },
        },
      });
    }

    const passed = results.filter(
      (result) =>
        result.reportedOutcome === "PASSED" ||
        result.reportedOutcome === "FLAKY",
    ).length;
    const skipped = results.filter(
      (result) => result.reportedOutcome === "SKIPPED",
    ).length;
    const failed = results.length - passed - skipped;
    await database.testRun.update({
      where: { id: run.id },
      data: {
        totalTests: results.length,
        passedTests: passed,
        failedTests: failed,
        skippedTests: skipped,
      },
    });
    if (failed > 0 || exitCode !== 0) {
      await transitionPersistedRun(
        database,
        run.id,
        "TRIAGING",
        `Queueing triage for ${failed} failed test(s)`,
        publish,
      );
      for (const result of results) {
        if (
          result.reportedOutcome !== "PASSED" &&
          result.reportedOutcome !== "SKIPPED"
        ) {
          await queue.add(
            "triage-failure",
            { testResultId: result.testResultId },
            { jobId: `triage-${result.testResultId}` },
          );
        }
      }
      await transitionPersistedRun(
        database,
        run.id,
        "FAILED",
        "Run failed; triage jobs are queued",
        publish,
      );
      return { outcome: "FAILED", failed };
    }
    await transitionPersistedRun(
      database,
      run.id,
      "COMPLETED",
      "Run completed successfully",
      publish,
    );
    return { outcome: "COMPLETED", failed: 0 };
  } catch (error) {
    const current = await database.testRun.findUnique({
      where: { id: data.runId },
      select: { status: true },
    });
    if (current && canFailRun(current.status)) {
      await transitionPersistedRun(
        database,
        data.runId,
        "FAILED",
        error instanceof Error ? error.message : "Run failed",
        publish,
      );
    }
    throw error;
  } finally {
    if (temporaryDirectory) {
      await rm(temporaryDirectory, { recursive: true, force: true });
    }
  }
}

function jsonError(error: {
  message: string;
  stack?: string;
}): Prisma.InputJsonObject {
  return {
    message: error.message,
    ...(error.stack ? { stack: error.stack } : {}),
  };
}

export { QUEUE_NAME };
