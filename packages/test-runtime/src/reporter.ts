import { readFile } from "node:fs/promises";

export type RuntimeAttemptOutcome =
  | "PASSED"
  | "FAILED"
  | "SKIPPED"
  | "TIMED_OUT"
  | "CANCELLED";

export interface RuntimeAttempt {
  attemptNumber: number;
  outcome: RuntimeAttemptOutcome;
  durationMs: number;
  error?: { message: string; stack?: string };
  attachments: Array<{
    name: string;
    path?: string;
    contentType?: string;
  }>;
}

export interface RuntimeTestExecution {
  title: string;
  file: string;
  attempts: RuntimeAttempt[];
}

interface JsonResult {
  retry?: number;
  status?: string;
  duration?: number;
  error?: { message?: string; stack?: string };
  attachments?: Array<{ name?: string; path?: string; contentType?: string }>;
}

interface JsonTest {
  results?: JsonResult[];
}

interface JsonSpec {
  title?: string;
  file?: string;
  tests?: JsonTest[];
}

interface JsonSuite {
  suites?: JsonSuite[];
  specs?: JsonSpec[];
}

function mapOutcome(status: string | undefined): RuntimeAttemptOutcome {
  switch (status) {
    case "passed":
      return "PASSED";
    case "skipped":
      return "SKIPPED";
    case "timedOut":
      return "TIMED_OUT";
    case "interrupted":
      return "CANCELLED";
    default:
      return "FAILED";
  }
}

function flattenSuite(suite: JsonSuite): RuntimeTestExecution[] {
  const executions: RuntimeTestExecution[] = [];
  for (const spec of suite.specs ?? []) {
    const results = spec.tests?.flatMap((test) => test.results ?? []) ?? [];
    executions.push({
      title: spec.title ?? "Unnamed Playwright test",
      file: spec.file ?? "",
      attempts: results.map((result, index) => ({
        attemptNumber: (result.retry ?? index) + 1,
        outcome: mapOutcome(result.status),
        durationMs: result.duration ?? 0,
        error:
          result.error?.message === undefined
            ? undefined
            : {
                message: result.error.message,
                stack: result.error.stack,
              },
        attachments: (result.attachments ?? []).map((attachment) => ({
          name: attachment.name ?? "attachment",
          path: attachment.path,
          contentType: attachment.contentType,
        })),
      })),
    });
  }
  for (const child of suite.suites ?? []) executions.push(...flattenSuite(child));
  return executions;
}

export function parsePlaywrightJsonReport(
  input: string | unknown,
): RuntimeTestExecution[] {
  const report = (
    typeof input === "string" ? JSON.parse(input) : input
  ) as JsonSuite;
  return flattenSuite(report);
}

export async function readPlaywrightJsonReport(
  path: string,
): Promise<RuntimeTestExecution[]> {
  return parsePlaywrightJsonReport(await readFile(path, "utf8"));
}
