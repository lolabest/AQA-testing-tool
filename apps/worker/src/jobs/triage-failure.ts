import {
  classifyFailure,
  MockAiProvider,
  type AiInvocationRecord,
} from "@testpilot/ai-core";
import { Prisma, type FailureClassification, type PrismaClient } from "@testpilot/database";
import type { Queue } from "bullmq";
import type { TriageFailureJob } from "../types.js";

function classification(value: string): FailureClassification {
  const values: Record<string, FailureClassification> = {
    product_defect: "PRODUCT_DEFECT",
    test_defect: "TEST_DEFECT",
    environment: "ENVIRONMENT_ISSUE",
    data: "TEST_DATA_ISSUE",
    flaky: "FLAKY_BEHAVIOR",
    unknown: "UNKNOWN",
  };
  return values[value] ?? "UNKNOWN";
}

function json(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

export async function processTriageFailure(
  database: PrismaClient,
  queue: Queue,
  data: TriageFailureJob,
): Promise<{ failureAnalysisId: string }> {
  const result = await database.testResult.findUniqueOrThrow({
    where: { id: data.testResultId },
    include: {
      testCase: true,
      testAttempt: true,
      artifacts: true,
      testRun: true,
      failureAnalysis: true,
    },
  });
  if (result.failureAnalysis) {
    return { failureAnalysisId: result.failureAnalysis.id };
  }
  const deterministicEvidence = [
    {
      source: "test-attempt",
      outcome: result.outcome,
      error: result.testAttempt.error,
      durationMs: result.durationMs,
    },
    ...result.artifacts.map((artifact) => ({
      source: "artifact",
      kind: artifact.kind,
      name: artifact.name,
      checksum: artifact.checksum,
    })),
  ];
  const error = JSON.stringify(
    result.testAttempt.error ?? result.details ?? result.summary,
  );
  let audit: AiInvocationRecord | undefined;
  const provider = new MockAiProvider();
  const recommendation = await classifyFailure(
    {
      testName: result.testCase.title,
      error,
      logs: JSON.stringify(deterministicEvidence),
    },
    { provider, onAudit: (record) => { audit = record; } },
  );
  if (!audit) throw new Error("AI failure classification did not emit audit data");
  await database.aiInvocation.create({
    data: {
      workspaceId: result.workspaceId,
      projectId: result.testRun.projectId,
      provider: "MOCK",
      model: audit.model,
      purpose: "classifyFailure",
      request: json({ testName: result.testCase.title, error }),
      response: json(recommendation),
      inputTokens: audit.tokenUsage.inputTokens,
      outputTokens: audit.tokenUsage.outputTokens,
      latencyMs: audit.latencyMs,
      status: "SUCCEEDED",
      relatedType: "TestResult",
      relatedId: result.id,
    },
  });
  const analysis = await database.failureAnalysis.create({
    data: {
      workspaceId: result.workspaceId,
      testResultId: result.id,
      classification: classification(recommendation.category),
      confidence: recommendation.confidence,
      summary: recommendation.rationale,
      rootCause: recommendation.recommendedActions.join("\n"),
      evidence: json([
        ...deterministicEvidence,
        ...recommendation.evidence.map((item) => ({
          source: "ai-recommendation",
          observation: item,
        })),
      ]),
      model: audit.model,
    },
  });
  if (
    analysis.classification === "TEST_DEFECT" ||
    analysis.classification === "FLAKY_BEHAVIOR"
  ) {
    await queue.add(
      "propose-healing",
      { failureAnalysisId: analysis.id },
      { jobId: `healing-${analysis.id}` },
    );
  }
  return { failureAnalysisId: analysis.id };
}
