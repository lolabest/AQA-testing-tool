import { mkdir } from "node:fs/promises";
import { join } from "node:path";
import { test as base, expect } from "@playwright/test";

export interface TestPilotFixtures {
  artifactDirectory: string;
}

export const test = base.extend<TestPilotFixtures>({
  artifactDirectory: async ({}, use, testInfo) => {
    const directory = join(testInfo.outputDir, "testpilot-artifacts");
    await mkdir(directory, { recursive: true });
    await use(directory);
  },
});

export { expect };
