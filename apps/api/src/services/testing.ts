import {
  MockAiProvider,
  generateTestPlan,
  generateTestIntents,
  classifyFailure,
  proposeHealing,
} from "@testpilot/ai-core";
import { prisma, type Prisma } from "@testpilot/database";
import { compileTestIntent } from "@testpilot/test-compiler";
import { validateTestIntent, type TestIntent } from "@testpilot/test-ir";
import { redactObject } from "@testpilot/security";
import { isExecutableInProtectedEnvironment } from "@testpilot/domain";

function demoIntentFromAi(
  partial: {
    id: string;
    name: string;
    goal: string;
    preconditions: string[];
    actions: Array<{ action: string; target: string; value?: string }>;
    assertions: string[];
    tags: string[];
  },
  requirementKey: string,
): TestIntent {
  const actions: TestIntent["actions"] = [{ type: "navigate", url: "/login" }];
  for (const step of partial.actions) {
    const action = step.action.toLowerCase();
    if (action.includes("fill") && step.target.toLowerCase().includes("email")) {
      actions.push({
        type: "fill",
        target: { strategy: "label", value: "Email" },
        value: step.value ?? "{{email}}",
      });
    } else if (
      action.includes("fill") &&
      step.target.toLowerCase().includes("password")
    ) {
      actions.push({
        type: "fill",
        target: { strategy: "label", value: "Password" },
        value: step.value ?? "{{password}}",
      });
    } else if (action.includes("click")) {
      actions.push({
        type: "click",
        target: {
          strategy: "role",
          value: "button",
          name: step.target || "Sign in",
        },
      });
    } else if (action.includes("goto") || action.includes("navigate")) {
      actions.push({
        type: "navigate",
        url: step.target.startsWith("/") ? step.target : `/${step.target}`,
      });
    }
  }
  if (actions.length === 1) {
    actions.push(
      {
        type: "fill",
        target: { strategy: "label", value: "Email" },
        value: "{{email}}",
      },
      {
        type: "fill",
        target: { strategy: "label", value: "Password" },
        value: "{{password}}",
      },
      {
        type: "click",
        target: { strategy: "role", value: "button", name: "Sign in" },
      },
    );
  }

  return validateTestIntent({
    schemaVersion: "1.0.0",
    id: partial.id,
    title: partial.name,
    businessObjective: partial.goal,
    requirementRefs: [requirementKey],
    riskLevel: "HIGH",
    tags: partial.tags,
    preconditions: partial.preconditions,
    requiredData: {
      email: "user@demo.local",
      password: "User123!",
    },
    environmentAssumptions: ["Demo SUT running"],
    actions,
    assertions: [
      { type: "assertUrl", expected: "**/dashboard" },
      {
        type: "assertVisible",
        target: { strategy: "role", value: "heading", name: "Dashboard" },
      },
    ],
    cleanupActions: [],
    destructive: false,
    expectedOutcome: partial.assertions[0] ?? "Expected outcome met",
    traceability: { source: requirementKey },
  });
}

export async function generatePlanForProject(input: {
  projectId: string;
  workspaceId: string;
  userId: string;
  requirementIds: string[];
  correlationId: string;
}) {
  const requirements = await prisma.requirement.findMany({
    where: {
      id: { in: input.requirementIds },
      projectId: input.projectId,
      workspaceId: input.workspaceId,
      deletedAt: null,
    },
  });
  if (requirements.length === 0) {
    throw Object.assign(new Error("requirements_not_found"), { statusCode: 404 });
  }

  const provider = new MockAiProvider();
  const started = Date.now();
  const plan = await generateTestPlan(
    {
      requirements: requirements
        .map((r) => `${r.key}: ${r.title} — ${r.description}`)
        .join("\n"),
    },
    { provider, correlationId: input.correlationId },
  );

  const intentsResult = await generateTestIntents(
    {
      testPlan: JSON.stringify(plan),
      applicationContext: "Demo Shop local SUT with login, products, checkout",
    },
    { provider, correlationId: input.correlationId },
  );

  const testPlan = await prisma.testPlan.create({
    data: {
      workspaceId: input.workspaceId,
      projectId: input.projectId,
      name: `${plan.title} (${Date.now()})`,
      description: plan.objective,
      objective: plan as unknown as Prisma.InputJsonValue,
      status: "GENERATED",
      createdById: input.userId,
      updatedById: input.userId,
    },
  });

  await prisma.aiInvocation.create({
    data: {
      workspaceId: input.workspaceId,
      projectId: input.projectId,
      provider: "MOCK",
      model: "mock-v1",
      purpose: "generateTestPlan",
      request: redactObject({ requirementIds: input.requirementIds }),
      response: redactObject(plan) as Prisma.InputJsonValue,
      latencyMs: Date.now() - started,
      status: "SUCCEEDED",
      createdById: input.userId,
      relatedType: "TestPlan",
      relatedId: testPlan.id,
    },
  });

  const createdCases = [];
  for (const [index, partial] of intentsResult.intents.entries()) {
    const requirement = requirements[index % requirements.length]!;
    const intent = demoIntentFromAi(partial, requirement.key);
    const key = `GEN-${Date.now()}-${index}`;
    const testCase = await prisma.testCase.create({
      data: {
        workspaceId: input.workspaceId,
        projectId: input.projectId,
        testPlanId: testPlan.id,
        requirementId: requirement.id,
        key,
        title: intent.title,
        description: intent.businessObjective,
        status: "GENERATED",
        riskLevel: intent.riskLevel,
        intent: intent as unknown as Prisma.InputJsonValue,
        tags: intent.tags,
        createdById: input.userId,
        updatedById: input.userId,
        versions: {
          create: {
            workspaceId: input.workspaceId,
            revision: 1,
            title: intent.title,
            description: intent.businessObjective,
            status: "GENERATED",
            riskLevel: intent.riskLevel,
            intent: intent as unknown as Prisma.InputJsonValue,
            tags: intent.tags,
            createdById: input.userId,
          },
        },
      },
      include: { versions: true },
    });
    createdCases.push(testCase);
  }

  return { testPlan, testCases: createdCases, plan, intents: intentsResult };
}

export async function approveTestCase(input: {
  testCaseId: string;
  workspaceId: string;
  userId: string;
  note?: string;
}) {
  const testCase = await prisma.testCase.findFirst({
    where: {
      id: input.testCaseId,
      workspaceId: input.workspaceId,
      deletedAt: null,
    },
  });
  if (!testCase) {
    throw Object.assign(new Error("test_case_not_found"), { statusCode: 404 });
  }

  const updated = await prisma.testCase.update({
    where: { id: testCase.id },
    data: {
      status: "ACTIVE",
      currentVersion: { increment: 1 },
      updatedById: input.userId,
      version: { increment: 1 },
    },
  });

  await prisma.testCaseVersion.create({
    data: {
      workspaceId: input.workspaceId,
      testCaseId: testCase.id,
      revision: testCase.currentVersion + 1,
      title: testCase.title,
      description: testCase.description,
      status: "APPROVED",
      riskLevel: testCase.riskLevel,
      intent: testCase.intent as Prisma.InputJsonValue,
      tags: testCase.tags as Prisma.InputJsonValue,
      changeSummary: input.note ?? "Approved for execution",
      createdById: input.userId,
    },
  });

  return updated;
}

export async function compileTestCase(input: {
  testCaseId: string;
  workspaceId: string;
  userId: string;
}) {
  const testCase = await prisma.testCase.findFirst({
    where: {
      id: input.testCaseId,
      workspaceId: input.workspaceId,
      deletedAt: null,
    },
    include: {
      versions: { orderBy: { revision: "desc" }, take: 1 },
    },
  });
  if (!testCase) {
    throw Object.assign(new Error("test_case_not_found"), { statusCode: 404 });
  }

  void isExecutableInProtectedEnvironment;
  const compiled = compileTestIntent(testCase.intent);
  const latest = testCase.versions[0];
  if (latest) {
    await prisma.testCaseVersion.update({
      where: { id: latest.id },
      data: {
        compiledCode: compiled.code,
        compiledChecksum: compiled.checksum,
        compilerVersion: compiled.compilerVersion,
        schemaVersion: compiled.schemaVersion,
      },
    });
  } else {
    await prisma.testCaseVersion.create({
      data: {
        workspaceId: input.workspaceId,
        testCaseId: testCase.id,
        revision: testCase.currentVersion,
        title: testCase.title,
        description: testCase.description,
        status: testCase.status,
        riskLevel: testCase.riskLevel,
        intent: testCase.intent as Prisma.InputJsonValue,
        tags: testCase.tags as Prisma.InputJsonValue,
        compiledCode: compiled.code,
        compiledChecksum: compiled.checksum,
        compilerVersion: compiled.compilerVersion,
        schemaVersion: compiled.schemaVersion,
        createdById: input.userId,
      },
    });
  }

  return compiled;
}

export async function triageWithAi(input: {
  workspaceId: string;
  testResultId: string;
  correlationId: string;
}) {
  const result = await prisma.testResult.findFirst({
    where: { id: input.testResultId, workspaceId: input.workspaceId },
  });
  if (!result) {
    throw Object.assign(new Error("result_not_found"), { statusCode: 404 });
  }

  const provider = new MockAiProvider();
  const details = (result.details ?? {}) as { message?: string; stack?: string };
  const analysis = await classifyFailure(
    {
      testName: result.id,
      error: String(details.message ?? result.summary ?? "Test failed"),
      logs: String(details.stack ?? ""),
      recentChanges: "",
    },
    { provider, correlationId: input.correlationId },
  );

  return prisma.failureAnalysis.create({
    data: {
      workspaceId: input.workspaceId,
      testResultId: result.id,
      classification: mapClassification(analysis.category),
      confidence: analysis.confidence,
      summary: analysis.rationale,
      rootCause: analysis.recommendedActions.join("; "),
      evidence: analysis as unknown as Prisma.InputJsonValue,
      model: "mock-v1",
    },
  });
}

function mapClassification(value: string) {
  const map: Record<string, "PRODUCT_DEFECT" | "TEST_DEFECT" | "ENVIRONMENT_ISSUE" | "TEST_DATA_ISSUE" | "FLAKY_BEHAVIOR" | "UNKNOWN"> = {
    product_defect: "PRODUCT_DEFECT",
    test_defect: "TEST_DEFECT",
    environment: "ENVIRONMENT_ISSUE",
    data: "TEST_DATA_ISSUE",
    flaky: "FLAKY_BEHAVIOR",
    unknown: "UNKNOWN",
  };
  return map[value] ?? "UNKNOWN";
}

export async function createHealingProposal(input: {
  workspaceId: string;
  projectId: string;
  testCaseId: string;
  failureAnalysisId: string;
  correlationId: string;
}) {
  const testCase = await prisma.testCase.findFirstOrThrow({
    where: { id: input.testCaseId, workspaceId: input.workspaceId },
  });
  const provider = new MockAiProvider();
  const proposal = await proposeHealing(
    {
      testIntent: JSON.stringify(testCase.intent),
      failure: "Locator mismatch on checkout button",
      pageSnapshot: "button data-testid=checkout-btn",
    },
    { provider, correlationId: input.correlationId },
  );

  return prisma.healingProposal.create({
    data: {
      workspaceId: input.workspaceId,
      projectId: input.projectId,
      testCaseId: input.testCaseId,
      failureAnalysisId: input.failureAnalysisId,
      status: "PENDING",
      proposedIntent: proposal as unknown as Prisma.InputJsonValue,
      rationale: proposal.diagnosis,
      confidence: proposal.confidence,
      riskLevel: "MEDIUM",
    },
  });
}
