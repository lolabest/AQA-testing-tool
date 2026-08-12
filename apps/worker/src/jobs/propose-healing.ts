import {
  MockAiProvider,
  proposeHealing,
  type AiInvocationRecord,
} from "@testpilot/ai-core";
import { Prisma, type PrismaClient, type RiskLevel } from "@testpilot/database";
import { validateTestIntent } from "@testpilot/test-ir";
import type { ProposeHealingJob } from "../types.js";

function json(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

function proposedIntent(
  original: unknown,
  changes: Array<{ before?: string; after?: string }>,
): { value: unknown; applied: boolean[] } {
  let serialized = JSON.stringify(original);
  const applied: boolean[] = [];
  for (const change of changes) {
    const canApply =
      Boolean(change.before) &&
      change.after !== undefined &&
      serialized.includes(change.before!);
    applied.push(canApply);
    if (canApply) serialized = serialized.replaceAll(change.before!, change.after!);
  }
  const candidate = JSON.parse(serialized) as unknown;
  return {
    value: validateTestIntent(candidate),
    applied,
  };
}

function healingRisk(confidence: number, applied: boolean[]): RiskLevel {
  if (confidence < 0.7 || applied.some((value) => !value)) return "HIGH";
  if (confidence < 0.9) return "MEDIUM";
  return "LOW";
}

export async function processProposeHealing(
  database: PrismaClient,
  data: ProposeHealingJob,
): Promise<{ healingProposalId: string }> {
  const existing = await database.healingProposal.findFirst({
    where: {
      failureAnalysisId: data.failureAnalysisId,
      status: "PENDING",
    },
  });
  if (existing) return { healingProposalId: existing.id };

  const analysis = await database.failureAnalysis.findUniqueOrThrow({
    where: { id: data.failureAnalysisId },
    include: {
      testResult: {
        include: {
          testCase: true,
          testRun: true,
          artifacts: true,
          testAttempt: true,
        },
      },
    },
  });
  const result = analysis.testResult;
  const evidence = {
    deterministic: analysis.evidence,
    error: result.testAttempt.error,
    artifacts: result.artifacts.map((artifact) => ({
      kind: artifact.kind,
      name: artifact.name,
      storageUrl: artifact.storageUrl,
      checksum: artifact.checksum,
    })),
  };
  let audit: AiInvocationRecord | undefined;
  const recommendation = await proposeHealing(
    {
      testIntent: JSON.stringify(result.testCase.intent),
      failure: JSON.stringify({
        classification: analysis.classification,
        summary: analysis.summary,
        rootCause: analysis.rootCause,
      }),
      pageSnapshot: JSON.stringify(evidence),
    },
    {
      provider: new MockAiProvider(),
      onAudit: (record) => { audit = record; },
    },
  );
  if (!audit) throw new Error("AI healing proposal did not emit audit data");
  const next = proposedIntent(result.testCase.intent, recommendation.changes);
  const diff = recommendation.changes.map((change, index) => ({
    ...change,
    applied: next.applied[index] ?? false,
  }));
  await database.aiInvocation.create({
    data: {
      workspaceId: analysis.workspaceId,
      projectId: result.testRun.projectId,
      provider: "MOCK",
      model: audit.model,
      purpose: "proposeHealing",
      request: json({
        testIntent: result.testCase.intent,
        failureAnalysisId: analysis.id,
      }),
      response: json(recommendation),
      inputTokens: audit.tokenUsage.inputTokens,
      outputTokens: audit.tokenUsage.outputTokens,
      latencyMs: audit.latencyMs,
      status: "SUCCEEDED",
      relatedType: "FailureAnalysis",
      relatedId: analysis.id,
    },
  });
  const proposal = await database.healingProposal.create({
    data: {
      workspaceId: analysis.workspaceId,
      projectId: result.testRun.projectId,
      testCaseId: result.testCase.id,
      failureAnalysisId: analysis.id,
      status: "PENDING",
      originalIntent: json(result.testCase.intent),
      proposedIntent: json(next.value),
      evidence: json(evidence),
      diff: json(diff),
      rationale: `${recommendation.diagnosis}\nRisks: ${recommendation.risks.join("; ")}`,
      confidence: recommendation.confidence,
      riskLevel: healingRisk(recommendation.confidence, next.applied),
    },
  });
  return { healingProposalId: proposal.id };
}
