import type { PrismaClient } from "@testpilot/database";
import { compileTestIntent } from "@testpilot/test-compiler";
import type { CompileTestsJob } from "../types.js";

export async function processCompileTests(
  database: PrismaClient,
  data: CompileTestsJob,
): Promise<{ compiled: number }> {
  const versions = await database.testCaseVersion.findMany({
    where: {
      workspaceId: data.workspaceId,
      testCase: {
        projectId: data.projectId,
        deletedAt: null,
        ...(data.testCaseIds ? { id: { in: data.testCaseIds } } : {}),
      },
    },
  });
  let compiled = 0;
  for (const version of versions) {
    const result = compileTestIntent(version.intent);
    await database.testCaseVersion.update({
      where: { id: version.id },
      data: {
        compiledCode: result.code,
        compiledChecksum: result.checksum,
        compilerVersion: result.compilerVersion,
        schemaVersion: result.schemaVersion,
      },
    });
    compiled += 1;
  }
  return { compiled };
}
