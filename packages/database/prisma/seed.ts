import { Prisma, PrismaClient } from "@prisma/client";
import { hash } from "bcryptjs";

const prisma = new PrismaClient();

const DEMO_EMAIL = "qa@testpilot.local";
const DEMO_PASSWORD = "TestPilot1!";

type SecretBoxLike = {
  encrypt(plaintext: string): Record<string, string>;
};

type SecretBoxModule = {
  SecretBox: new (hexKey: string, keyId?: string) => SecretBoxLike;
};

async function encryptSeedSecret(
  plaintext: string,
): Promise<Prisma.InputJsonObject> {
  const encryptionKey = process.env.ENCRYPTION_KEY;

  if (encryptionKey) {
    try {
      // Keep the seed runnable before workspace packages are built.
      const dynamicImport = new Function(
        "specifier",
        "return import(specifier)",
      ) as (specifier: string) => Promise<SecretBoxModule>;
      const { SecretBox } = await dynamicImport("@testpilot/security");
      return new SecretBox(encryptionKey, "seed-v1").encrypt(plaintext);
    } catch (error) {
      console.warn(
        "Could not load @testpilot/security SecretBox; using a non-secret placeholder.",
        error instanceof Error ? error.message : error,
      );
    }
  }

  return {
    alg: "PLACEHOLDER",
    keyId: "configure-ENCRYPTION_KEY-and-reseed",
    ciphertext: "",
    iv: "",
    tag: "",
  };
}

async function main(): Promise<void> {
  const passwordHash = await hash(DEMO_PASSWORD, 12);
  const encryptedDemoCredentials = await encryptSeedSecret(
    JSON.stringify({ email: DEMO_EMAIL, password: DEMO_PASSWORD }),
  );

  const user = await prisma.user.upsert({
    where: { email: DEMO_EMAIL },
    create: {
      email: DEMO_EMAIL,
      passwordHash,
      displayName: "Demo QA Owner",
      active: true,
    },
    update: {
      passwordHash,
      displayName: "Demo QA Owner",
      active: true,
      deletedAt: null,
    },
  });

  const workspace = await prisma.workspace.upsert({
    where: { key: "demo" },
    create: {
      key: "demo",
      name: "TestPilot Demo",
      slug: "testpilot-demo",
      createdById: user.id,
      updatedById: user.id,
    },
    update: {
      name: "TestPilot Demo",
      slug: "testpilot-demo",
      createdById: user.id,
      updatedById: user.id,
      deletedAt: null,
    },
  });

  await prisma.membership.upsert({
    where: {
      workspaceId_userId: {
        workspaceId: workspace.id,
        userId: user.id,
      },
    },
    create: {
      workspaceId: workspace.id,
      userId: user.id,
      role: "OWNER",
      createdById: user.id,
      updatedById: user.id,
    },
    update: {
      role: "OWNER",
      updatedById: user.id,
      deletedAt: null,
    },
  });

  const project = await prisma.project.upsert({
    where: {
      workspaceId_key: { workspaceId: workspace.id, key: "DEMO-SHOP" },
    },
    create: {
      workspaceId: workspace.id,
      key: "DEMO-SHOP",
      name: "Demo Shop",
      description: "A sample storefront used to explore TestPilot.",
      createdById: user.id,
      updatedById: user.id,
    },
    update: {
      name: "Demo Shop",
      description: "A sample storefront used to explore TestPilot.",
      updatedById: user.id,
      deletedAt: null,
    },
  });

  const environment = await prisma.environment.upsert({
    where: {
      projectId_name: { projectId: project.id, name: "Local Demo Shop" },
    },
    create: {
      workspaceId: workspace.id,
      projectId: project.id,
      name: "Local Demo Shop",
      kind: "LOCAL",
      baseUrl: "http://localhost:3002",
      isDefault: true,
      config: {
        browser: "chromium",
        locale: "en-US",
        trace: "retain-on-failure",
      },
      createdById: user.id,
      updatedById: user.id,
    },
    update: {
      baseUrl: "http://localhost:3002",
      kind: "LOCAL",
      isDefault: true,
      updatedById: user.id,
      deletedAt: null,
    },
  });

  await prisma.environmentSecret.upsert({
    where: {
      environmentId_key: {
        environmentId: environment.id,
        key: "DEMO_CREDENTIALS",
      },
    },
    create: {
      workspaceId: workspace.id,
      environmentId: environment.id,
      key: "DEMO_CREDENTIALS",
      encryptedValue: encryptedDemoCredentials,
      fingerprint: "demo-login-v1",
      createdById: user.id,
      updatedById: user.id,
    },
    update: {
      encryptedValue: encryptedDemoCredentials,
      fingerprint: "demo-login-v1",
      updatedById: user.id,
      deletedAt: null,
    },
  });

  const requirementSeeds = [
    {
      key: "REQ-LOGIN",
      title: "Registered customers can sign in",
      description:
        "A registered customer can authenticate with valid credentials and reach their account.",
      acceptanceCriteria: [
        "Valid credentials redirect to /account",
        "The account navigation displays the customer name",
        "Authentication state persists after page reload",
      ],
      riskLevel: "CRITICAL" as const,
    },
    {
      key: "REQ-VALIDATION",
      title: "Invalid form input is explained",
      description:
        "Customer-facing forms reject invalid values with accessible, actionable messages.",
      acceptanceCriteria: [
        "Required fields are identified",
        "Invalid email addresses are rejected",
        "Validation messages are associated with their fields",
      ],
      riskLevel: "MEDIUM" as const,
    },
    {
      key: "REQ-CHECKOUT",
      title: "Customers can complete checkout",
      description:
        "A customer with an in-stock item can submit delivery and payment details and place an order.",
      acceptanceCriteria: [
        "Cart totals remain consistent through checkout",
        "A successful order receives a confirmation number",
        "Duplicate submissions do not create duplicate orders",
      ],
      riskLevel: "CRITICAL" as const,
    },
    {
      key: "REQ-PERMISSIONS",
      title: "Account pages enforce ownership",
      description:
        "Customers can only view and change resources owned by their account.",
      acceptanceCriteria: [
        "Anonymous users are redirected to sign in",
        "A customer cannot access another customer's order",
        "Unauthorized API requests return 403 without leaking data",
      ],
      riskLevel: "HIGH" as const,
    },
  ];

  const requirements = new Map<string, { id: string }>();
  for (const seed of requirementSeeds) {
    const requirement = await prisma.requirement.upsert({
      where: {
        projectId_key: { projectId: project.id, key: seed.key },
      },
      create: {
        workspaceId: workspace.id,
        projectId: project.id,
        ...seed,
        createdById: user.id,
        updatedById: user.id,
      },
      update: {
        title: seed.title,
        description: seed.description,
        acceptanceCriteria: seed.acceptanceCriteria,
        riskLevel: seed.riskLevel,
        status: "ACTIVE",
        updatedById: user.id,
        deletedAt: null,
      },
      select: { id: true },
    });
    requirements.set(seed.key, requirement);

    await prisma.requirementVersion.upsert({
      where: {
        requirementId_revision: {
          requirementId: requirement.id,
          revision: 1,
        },
      },
      create: {
        workspaceId: workspace.id,
        requirementId: requirement.id,
        revision: 1,
        title: seed.title,
        description: seed.description,
        acceptanceCriteria: seed.acceptanceCriteria,
        riskLevel: seed.riskLevel,
        changeSummary: "Initial demo requirement",
        createdById: user.id,
      },
      update: {
        title: seed.title,
        description: seed.description,
        acceptanceCriteria: seed.acceptanceCriteria,
        riskLevel: seed.riskLevel,
      },
    });
  }

  await prisma.aiConfiguration.upsert({
    where: {
      workspaceId_name: {
        workspaceId: workspace.id,
        name: "Deterministic Mock",
      },
    },
    create: {
      workspaceId: workspace.id,
      projectId: project.id,
      name: "Deterministic Mock",
      provider: "MOCK",
      model: "testpilot-mock-v1",
      settings: {
        deterministic: true,
        latencyMs: 25,
        fixtureSet: "demo-shop",
      },
      createdById: user.id,
      updatedById: user.id,
    },
    update: {
      projectId: project.id,
      provider: "MOCK",
      model: "testpilot-mock-v1",
      enabled: true,
      updatedById: user.id,
      deletedAt: null,
    },
  });

  const plan = await prisma.testPlan.upsert({
    where: {
      projectId_name: {
        projectId: project.id,
        name: "Demo Shop Critical Paths",
      },
    },
    create: {
      workspaceId: workspace.id,
      projectId: project.id,
      name: "Demo Shop Critical Paths",
      description: "Risk-based coverage of the storefront's core journeys.",
      objective: {
        scope: ["authentication", "checkout", "authorization"],
        browsers: ["chromium"],
      },
      status: "APPROVED",
      createdById: user.id,
      updatedById: user.id,
    },
    update: {
      status: "APPROVED",
      updatedById: user.id,
      deletedAt: null,
    },
  });

  const loginRequirement = requirements.get("REQ-LOGIN");
  if (!loginRequirement) {
    throw new Error("REQ-LOGIN was not seeded");
  }

  const loginIntent: Prisma.InputJsonObject = {
    schemaVersion: "1.0.0",
    id: "demo-shop-login",
    title: "Customer signs in with valid credentials",
    businessObjective:
      "Ensure registered customers can securely access their account.",
    requirementRefs: ["REQ-LOGIN"],
    riskLevel: "CRITICAL",
    tags: ["smoke", "authentication"],
    preconditions: ["A registered demo customer exists"],
    requiredRole: "customer",
    requiredData: {
      email: "user@demo.local",
      password: "User123!",
    },
    environmentAssumptions: ["Demo Shop is reachable at the environment URL"],
    actions: [
      { type: "navigate", url: "/login" },
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
        target: { strategy: "role", value: "button", name: "Log in" },
      },
    ],
    assertions: [
      { type: "assertUrl", expected: "**/products" },
      {
        type: "assertVisible",
        target: {
          strategy: "role",
          value: "heading",
          name: "Products",
        },
      },
    ],
    cleanupActions: [],
    destructive: false,
    expectedOutcome: "The customer reaches the products page after login.",
    traceability: {
      source: "REQ-LOGIN",
      notes: "Approved deterministic demo intent",
    },
  };

  const testCase = await prisma.testCase.upsert({
    where: {
      projectId_key: { projectId: project.id, key: "TC-LOGIN-001" },
    },
    create: {
      workspaceId: workspace.id,
      projectId: project.id,
      testPlanId: plan.id,
      requirementId: loginRequirement.id,
      key: "TC-LOGIN-001",
      title: "Customer signs in with valid credentials",
      description: "Critical happy-path authentication coverage.",
      status: "APPROVED",
      riskLevel: "CRITICAL",
      intent: loginIntent,
      tags: ["smoke", "authentication"],
      createdById: user.id,
      updatedById: user.id,
    },
    update: {
      testPlanId: plan.id,
      requirementId: loginRequirement.id,
      status: "APPROVED",
      riskLevel: "CRITICAL",
      intent: loginIntent,
      tags: ["smoke", "authentication"],
      updatedById: user.id,
      deletedAt: null,
    },
  });

  const testCaseVersion = await prisma.testCaseVersion.upsert({
    where: {
      testCaseId_revision: { testCaseId: testCase.id, revision: 1 },
    },
    create: {
      workspaceId: workspace.id,
      testCaseId: testCase.id,
      revision: 1,
      title: testCase.title,
      description: testCase.description,
      status: "APPROVED",
      riskLevel: "CRITICAL",
      intent: loginIntent,
      tags: ["smoke", "authentication"],
      changeSummary: "Initial approved demo test",
      createdById: user.id,
    },
    update: {
      title: testCase.title,
      status: "APPROVED",
      intent: loginIntent,
      tags: ["smoke", "authentication"],
    },
  });

  const suite = await prisma.testSuite.upsert({
    where: {
      projectId_key: { projectId: project.id, key: "SUITE-SMOKE" },
    },
    create: {
      workspaceId: workspace.id,
      projectId: project.id,
      testPlanId: plan.id,
      key: "SUITE-SMOKE",
      name: "Approved Smoke Suite",
      description: "Fast, approved checks for every Demo Shop deployment.",
      status: "APPROVED",
      createdById: user.id,
      updatedById: user.id,
    },
    update: {
      testPlanId: plan.id,
      name: "Approved Smoke Suite",
      status: "APPROVED",
      updatedById: user.id,
      deletedAt: null,
    },
  });

  await prisma.testSuiteItem.upsert({
    where: {
      testSuiteId_testCaseId: {
        testSuiteId: suite.id,
        testCaseId: testCase.id,
      },
    },
    create: {
      workspaceId: workspace.id,
      testSuiteId: suite.id,
      testCaseId: testCase.id,
      position: 1,
      createdById: user.id,
    },
    update: { position: 1, enabled: true },
  });

  await prisma.schedule.upsert({
    where: {
      projectId_name: {
        projectId: project.id,
        name: "Nightly smoke",
      },
    },
    create: {
      workspaceId: workspace.id,
      projectId: project.id,
      testSuiteId: suite.id,
      environmentId: environment.id,
      name: "Nightly smoke",
      cron: "0 2 * * *",
      timezone: "UTC",
      enabled: true,
      nextRunAt: new Date("2026-08-13T02:00:00.000Z"),
      createdById: user.id,
      updatedById: user.id,
    },
    update: {
      testSuiteId: suite.id,
      environmentId: environment.id,
      cron: "0 2 * * *",
      timezone: "UTC",
      enabled: true,
      nextRunAt: new Date("2026-08-13T02:00:00.000Z"),
      updatedById: user.id,
      deletedAt: null,
    },
  });

  const completedRunId = "10000000-0000-4000-8000-000000000001";
  const failedRunId = "10000000-0000-4000-8000-000000000002";
  const completedAttemptId = "20000000-0000-4000-8000-000000000001";
  const failedAttemptId = "20000000-0000-4000-8000-000000000002";
  const completedResultId = "30000000-0000-4000-8000-000000000001";
  const failedResultId = "30000000-0000-4000-8000-000000000002";

  await prisma.testRun.upsert({
    where: { id: completedRunId },
    create: {
      id: completedRunId,
      workspaceId: workspace.id,
      projectId: project.id,
      testSuiteId: suite.id,
      environmentId: environment.id,
      createdById: user.id,
      status: "COMPLETED",
      trigger: "SCHEDULE",
      config: { browser: "chromium", workers: 1 },
      totalTests: 1,
      passedTests: 1,
      startedAt: new Date("2026-03-10T09:00:00.000Z"),
      finishedAt: new Date("2026-03-10T09:00:05.420Z"),
      createdAt: new Date("2026-03-10T08:59:58.000Z"),
    },
    update: {
      status: "COMPLETED",
      totalTests: 1,
      passedTests: 1,
      failedTests: 0,
      skippedTests: 0,
    },
  });

  await prisma.testRun.upsert({
    where: { id: failedRunId },
    create: {
      id: failedRunId,
      workspaceId: workspace.id,
      projectId: project.id,
      testSuiteId: suite.id,
      environmentId: environment.id,
      createdById: user.id,
      status: "FAILED",
      trigger: "PULL_REQUEST",
      config: {
        browser: "chromium",
        workers: 1,
        source: { repository: "demo/shop", pullRequest: 42 },
      },
      totalTests: 1,
      failedTests: 1,
      startedAt: new Date("2026-03-11T14:12:00.000Z"),
      finishedAt: new Date("2026-03-11T14:12:08.935Z"),
      createdAt: new Date("2026-03-11T14:11:57.000Z"),
    },
    update: {
      status: "FAILED",
      totalTests: 1,
      passedTests: 0,
      failedTests: 1,
      skippedTests: 0,
    },
  });

  await prisma.testRunShard.upsert({
    where: {
      testRunId_shardIndex: { testRunId: completedRunId, shardIndex: 0 },
    },
    create: {
      workspaceId: workspace.id,
      testRunId: completedRunId,
      shardIndex: 0,
      status: "COMPLETED",
      workerId: "demo-worker-1",
      startedAt: new Date("2026-03-10T09:00:00.000Z"),
      finishedAt: new Date("2026-03-10T09:00:05.420Z"),
    },
    update: { status: "COMPLETED" },
  });

  const failedShard = await prisma.testRunShard.upsert({
    where: {
      testRunId_shardIndex: { testRunId: failedRunId, shardIndex: 0 },
    },
    create: {
      workspaceId: workspace.id,
      testRunId: failedRunId,
      shardIndex: 0,
      status: "FAILED",
      workerId: "demo-worker-2",
      startedAt: new Date("2026-03-11T14:12:00.000Z"),
      finishedAt: new Date("2026-03-11T14:12:08.935Z"),
      error: { message: "One test failed" },
    },
    update: { status: "FAILED" },
  });

  const completedAttempt = await prisma.testAttempt.upsert({
    where: { id: completedAttemptId },
    create: {
      id: completedAttemptId,
      workspaceId: workspace.id,
      testRunId: completedRunId,
      testCaseId: testCase.id,
      testCaseVersionId: testCaseVersion.id,
      attemptNumber: 1,
      outcome: "PASSED",
      startedAt: new Date("2026-03-10T09:00:01.000Z"),
      finishedAt: new Date("2026-03-10T09:00:05.120Z"),
      durationMs: 4120,
      metrics: { assertions: 2, retries: 0 },
    },
    update: { outcome: "PASSED", durationMs: 4120 },
  });

  await prisma.testResult.upsert({
    where: { id: completedResultId },
    create: {
      id: completedResultId,
      workspaceId: workspace.id,
      testRunId: completedRunId,
      testAttemptId: completedAttempt.id,
      testCaseId: testCase.id,
      outcome: "PASSED",
      durationMs: 4120,
      summary: "Login journey passed.",
      details: { assertionsPassed: 2, assertionsFailed: 0 },
    },
    update: {
      outcome: "PASSED",
      summary: "Login journey passed.",
    },
  });

  const failedAttempt = await prisma.testAttempt.upsert({
    where: { id: failedAttemptId },
    create: {
      id: failedAttemptId,
      workspaceId: workspace.id,
      testRunId: failedRunId,
      testRunShardId: failedShard.id,
      testCaseId: testCase.id,
      testCaseVersionId: testCaseVersion.id,
      attemptNumber: 1,
      outcome: "FAILED",
      startedAt: new Date("2026-03-11T14:12:01.000Z"),
      finishedAt: new Date("2026-03-11T14:12:08.500Z"),
      durationMs: 7500,
      error: {
        name: "TimeoutError",
        message: "Sign in button was not found within 5000ms",
      },
      metrics: { assertions: 0, retries: 0 },
    },
    update: {
      testRunShardId: failedShard.id,
      outcome: "FAILED",
      durationMs: 7500,
    },
  });

  await prisma.testResult.upsert({
    where: { id: failedResultId },
    create: {
      id: failedResultId,
      workspaceId: workspace.id,
      testRunId: failedRunId,
      testAttemptId: failedAttempt.id,
      testCaseId: testCase.id,
      outcome: "FAILED",
      durationMs: 7500,
      summary: "Login submit control could not be located.",
      details: {
        failedStep: 4,
        locator: { strategy: "role", value: "button", name: "Log in" },
      },
    },
    update: {
      outcome: "FAILED",
      summary: "Login submit control could not be located.",
    },
  });

  const analysis = await prisma.failureAnalysis.upsert({
    where: { testResultId: failedResultId },
    create: {
      workspaceId: workspace.id,
      testResultId: failedResultId,
      classification: "TEST_DEFECT",
      confidence: 0.94,
      summary:
        "The application changed the accessible name of the login button.",
      rootCause:
        "The test expects “Sign in”, while the current UI exposes “Continue”.",
      evidence: [
        {
          type: "DOM_SNAPSHOT",
          observation: "button[role=button] has accessible name Continue",
        },
        {
          type: "TRACE",
          observation: "No network or product error occurred before timeout",
        },
      ],
      model: "testpilot-mock-v1",
    },
    update: {
      classification: "TEST_DEFECT",
      confidence: 0.94,
      summary:
        "The application changed the accessible name of the login button.",
    },
  });

  const healedIntent: Prisma.InputJsonObject = {
    ...loginIntent,
    actions: [
      { type: "navigate", url: "/login" },
      {
        type: "fill",
        target: { strategy: "label", value: "Email" },
        value: DEMO_EMAIL,
      },
      {
        type: "fill",
        target: { strategy: "label", value: "Password" },
        value: "{{secrets.DEMO_CREDENTIALS.password}}",
      },
      {
        type: "click",
        target: { strategy: "role", value: "button", name: "Continue" },
      },
    ],
    traceability: {
      source: "REQ-LOGIN",
      notes: "Proposed locator update from failed run",
    },
  };

  await prisma.healingProposal.upsert({
    where: { id: "40000000-0000-4000-8000-000000000001" },
    create: {
      id: "40000000-0000-4000-8000-000000000001",
      workspaceId: workspace.id,
      projectId: project.id,
      testCaseId: testCase.id,
      failureAnalysisId: analysis.id,
      status: "PENDING",
      proposedIntent: healedIntent,
      rationale:
        "Use the current accessible button name while preserving the role-based locator.",
      confidence: 0.92,
      riskLevel: "LOW",
    },
    update: {
      status: "PENDING",
      proposedIntent: healedIntent,
      rationale:
        "Use the current accessible button name while preserving the role-based locator.",
      confidence: 0.92,
      riskLevel: "LOW",
    },
  });

  await prisma.artifact.upsert({
    where: { id: "50000000-0000-4000-8000-000000000001" },
    create: {
      id: "50000000-0000-4000-8000-000000000001",
      workspaceId: workspace.id,
      projectId: project.id,
      testRunId: failedRunId,
      testAttemptId: failedAttempt.id,
      testResultId: failedResultId,
      kind: "TRACE",
      name: "login-failure-trace.zip",
      storageUrl: "seed://artifacts/login-failure-trace.zip",
      contentType: "application/zip",
      sizeBytes: 184320n,
      checksum:
        "2c55d9db3e6714bc46be29939630c1726537d39f2c891b8f8a99fe033445ae04",
      metadata: { seeded: true, browser: "chromium" },
    },
    update: {
      testAttemptId: failedAttempt.id,
      testResultId: failedResultId,
      metadata: { seeded: true, browser: "chromium" },
    },
  });

  await prisma.qualityGateConfig.upsert({
    where: { projectId: project.id },
    create: {
      workspaceId: workspace.id,
      projectId: project.id,
      thresholds: {
        minimumPassRate: 0.95,
        maximumCriticalFailures: 0,
        maximumFlakyRate: 0.05,
      },
      createdById: user.id,
      updatedById: user.id,
    },
    update: {
      enabled: true,
      thresholds: {
        minimumPassRate: 0.95,
        maximumCriticalFailures: 0,
        maximumFlakyRate: 0.05,
      },
      updatedById: user.id,
      deletedAt: null,
    },
  });

  console.info(
    `Seeded ${workspace.name}: ${project.name} with demo owner ${DEMO_EMAIL}`,
  );
}

main()
  .catch((error: unknown) => {
    console.error("Database seed failed", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
