import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { classifyArtifact, collectArtifacts } from "./artifacts.js";
import { parsePlaywrightJsonReport } from "./reporter.js";

const temporaryDirectories: string[] = [];

afterEach(async () => {
  await Promise.all(
    temporaryDirectories.splice(0).map((directory) =>
      rm(directory, { recursive: true, force: true }),
    ),
  );
});

describe("runtime artifact helpers", () => {
  it("classifies and hashes collected Playwright artifacts", async () => {
    const directory = await mkdtemp(join(tmpdir(), "runtime-test-"));
    temporaryDirectories.push(directory);
    await writeFile(join(directory, "trace.zip"), "trace data");
    const [artifact] = await collectArtifacts(directory);
    expect(artifact).toMatchObject({
      name: "trace.zip",
      kind: "TRACE",
      contentType: "application/zip",
      sizeBytes: 10,
    });
    expect(artifact?.checksum).toHaveLength(64);
    expect(classifyArtifact("failure.png").kind).toBe("SCREENSHOT");
  });
});

describe("Playwright JSON reporter helpers", () => {
  it("normalizes nested suites and retries", () => {
    const executions = parsePlaywrightJsonReport({
      suites: [
        {
          specs: [
            {
              title: "checkout",
              file: "case-id.spec.ts",
              tests: [
                {
                  results: [
                    { retry: 0, status: "failed", duration: 20 },
                    { retry: 1, status: "passed", duration: 10 },
                  ],
                },
              ],
            },
          ],
        },
      ],
    });
    expect(executions[0]).toMatchObject({
      title: "checkout",
      file: "case-id.spec.ts",
      attempts: [
        { attemptNumber: 1, outcome: "FAILED" },
        { attemptNumber: 2, outcome: "PASSED" },
      ],
    });
  });
});
