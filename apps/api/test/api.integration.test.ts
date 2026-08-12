import { randomUUID } from "node:crypto";
import { hash } from "bcryptjs";
import { PrismaClient } from "@testpilot/database";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { buildApp, InMemoryJobQueue } from "../src/app.js";
import { readConfig } from "../src/config.js";

const databaseAvailable = Boolean(process.env.DATABASE_URL);
const suite = databaseAvailable ? describe : describe.skip;
const prisma = new PrismaClient();
const suffix = randomUUID().slice(0, 8);
const password = "Integration1!";

let app: Awaited<ReturnType<typeof buildApp>>;
let ownerToken = "";
let viewerToken = "";
let primaryWorkspaceId = "";
let isolatedWorkspaceId = "";
let primaryProjectId = "";
let isolatedProjectId = "";
let environmentId = "";
let testCaseId = "";
const userIds: string[] = [];

async function signIn(email: string): Promise<string> {
  const response = await app.inject({
    method: "POST",
    url: "/api/v1/auth/sign-in",
    payload: { email, password },
  });
  expect(response.statusCode).toBe(200);
  return response.json<{ accessToken: string }>().accessToken;
}

suite("TestPilot API integration", () => {
  beforeAll(async () => {
    await prisma.$connect();
    const passwordHash = await hash(password, 4);
    const owner = await prisma.user.create({
      data: {
        email: `api-owner-${suffix}@testpilot.local`,
        passwordHash,
        displayName: "API Integration Owner",
      },
    });
    const viewer = await prisma.user.create({
      data: {
        email: `api-viewer-${suffix}@testpilot.local`,
        passwordHash,
        displayName: "API Integration Viewer",
      },
    });
    const isolatedOwner = await prisma.user.create({
      data: {
        email: `api-isolated-${suffix}@testpilot.local`,
        passwordHash,
        displayName: "Isolated Owner",
      },
    });
    userIds.push(owner.id, viewer.id, isolatedOwner.id);

    const primary = await prisma.workspace.create({
      data: {
        key: `api-${suffix}`,
        slug: `api-${suffix}`,
        name: "API Integration Workspace",
        createdById: owner.id,
        memberships: {
          create: [
            {
              userId: owner.id,
              role: "OWNER",
              createdById: owner.id,
              updatedById: owner.id,
            },
            {
              userId: viewer.id,
              role: "VIEWER",
              createdById: owner.id,
              updatedById: owner.id,
            },
          ],
        },
      },
    });
    primaryWorkspaceId = primary.id;
    const isolated = await prisma.workspace.create({
      data: {
        key: `isolated-${suffix}`,
        slug: `isolated-${suffix}`,
        name: "Isolated Integration Workspace",
        createdById: isolatedOwner.id,
        memberships: {
          create: {
            userId: isolatedOwner.id,
            role: "OWNER",
            createdById: isolatedOwner.id,
            updatedById: isolatedOwner.id,
          },
        },
      },
    });
    isolatedWorkspaceId = isolated.id;

    const project = await prisma.project.create({
      data: {
        workspaceId: primary.id,
        key: `API_${suffix.toUpperCase()}`,
        name: "API Integration Project",
        createdById: owner.id,
        updatedById: owner.id,
      },
    });
    primaryProjectId = project.id;
    const isolatedProject = await prisma.project.create({
      data: {
        workspaceId: isolated.id,
        key: `ISO_${suffix.toUpperCase()}`,
        name: "Tenant-isolated Project",
        createdById: isolatedOwner.id,
        updatedById: isolatedOwner.id,
      },
    });
    isolatedProjectId = isolatedProject.id;

    const environment = await prisma.environment.create({
      data: {
        workspaceId: primary.id,
        projectId: project.id,
        name: "Integration",
        kind: "TEST",
        baseUrl: "https://example.test",
        createdById: owner.id,
        updatedById: owner.id,
      },
    });
    environmentId = environment.id;
    const testCase = await prisma.testCase.create({
      data: {
        workspaceId: primary.id,
        projectId: project.id,
        key: "TC-INTEGRATION",
        title: "Integration test case",
        status: "APPROVED",
        riskLevel: "LOW",
        intent: {
          schemaVersion: "1.0.0",
          id: "integration-case",
          title: "Integration test case",
          businessObjective: "Verify API authorization",
          requirementRefs: [],
          riskLevel: "LOW",
          tags: [],
          preconditions: [],
          requiredData: {},
          environmentAssumptions: [],
          actions: [{ type: "navigate", url: "/" }],
          assertions: [{ type: "assertUrl", expected: "/" }],
          cleanupActions: [],
          destructive: false,
          expectedOutcome: "The page opens",
          traceability: {},
        },
        tags: [],
        createdById: owner.id,
        updatedById: owner.id,
      },
    });
    testCaseId = testCase.id;

    app = await buildApp({
      prisma,
      queue: new InMemoryJobQueue(),
      config: readConfig({
        NODE_ENV: "test",
        JWT_SECRET: "integration-test-secret-at-least-32-characters",
        AI_DEFAULT_PROVIDER: "mock",
      }),
    });
    ownerToken = await signIn(owner.email);
    viewerToken = await signIn(viewer.email);
  });

  afterAll(async () => {
    await app?.close();
    if (primaryWorkspaceId) {
      await prisma.workspace.deleteMany({
        where: { id: { in: [primaryWorkspaceId, isolatedWorkspaceId] } },
      });
    }
    if (userIds.length > 0) {
      await prisma.user.deleteMany({ where: { id: { in: userIds } } });
    }
    await prisma.$disconnect();
  });

  it("signs in and resolves the authenticated user", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/api/v1/auth/me",
      headers: { authorization: `Bearer ${ownerToken}` },
    });
    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      memberships: [
        {
          role: "OWNER",
          workspace: { id: primaryWorkspaceId },
        },
      ],
    });
  });

  it("denies a VIEWER permission to execute a run", async () => {
    const response = await app.inject({
      method: "POST",
      url: `/api/v1/projects/${primaryProjectId}/runs`,
      headers: { authorization: `Bearer ${viewerToken}` },
      payload: {
        environmentId,
        testCaseIds: [testCaseId],
      },
    });
    expect(response.statusCode).toBe(403);
    expect(response.json()).toMatchObject({
      error: { code: "FORBIDDEN" },
    });
    expect(
      await prisma.testRun.count({
        where: { projectId: primaryProjectId, createdById: userIds[1] },
      }),
    ).toBe(0);
  });

  it("does not expose a project from another workspace", async () => {
    const response = await app.inject({
      method: "GET",
      url: `/api/v1/projects/${isolatedProjectId}`,
      headers: { authorization: `Bearer ${ownerToken}` },
    });
    expect(response.statusCode).toBe(404);
    expect(response.json()).toMatchObject({
      error: { code: "NOT_FOUND" },
    });
  });
});
