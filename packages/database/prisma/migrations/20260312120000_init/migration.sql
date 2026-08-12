-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "Role" AS ENUM ('OWNER', 'ADMIN', 'QA_ENGINEER', 'DEVELOPER', 'VIEWER');

-- CreateEnum
CREATE TYPE "TestCaseStatus" AS ENUM ('DRAFT', 'GENERATED', 'VALIDATED', 'APPROVED', 'ACTIVE', 'DISABLED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "TestRunStatus" AS ENUM ('QUEUED', 'PREPARING', 'RUNNING', 'COLLECTING_ARTIFACTS', 'TRIAGING', 'COMPLETED', 'FAILED', 'CANCELLED', 'TIMED_OUT');

-- CreateEnum
CREATE TYPE "AttemptOutcome" AS ENUM ('PASSED', 'FAILED', 'SKIPPED', 'BLOCKED', 'TIMED_OUT', 'CANCELLED', 'FLAKY');

-- CreateEnum
CREATE TYPE "FailureClassification" AS ENUM ('PRODUCT_DEFECT', 'TEST_DEFECT', 'ENVIRONMENT_ISSUE', 'TEST_DATA_ISSUE', 'FLAKY_BEHAVIOR', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "EnvironmentKind" AS ENUM ('LOCAL', 'TEST', 'STAGING', 'PRODUCTION_LIKE');

-- CreateEnum
CREATE TYPE "ArtifactKind" AS ENUM ('SCREENSHOT', 'VIDEO', 'TRACE', 'LOG', 'NETWORK', 'REPORT', 'DOM_SNAPSHOT', 'OTHER');

-- CreateEnum
CREATE TYPE "HealingProposalStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'APPLIED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "RiskLevel" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "AiProviderKind" AS ENUM ('OPENAI', 'ANTHROPIC', 'GOOGLE', 'AZURE_OPENAI', 'AWS_BEDROCK', 'MOCK');

-- CreateTable
CREATE TABLE "Workspace" (
    "id" UUID NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "createdById" UUID,
    "updatedById" UUID,

    CONSTRAINT "Workspace_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Membership" (
    "id" UUID NOT NULL,
    "role" "Role" NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "workspaceId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "createdById" UUID,
    "updatedById" UUID,

    CONSTRAINT "Membership_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Project" (
    "id" UUID NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "workspaceId" UUID NOT NULL,
    "createdById" UUID,
    "updatedById" UUID,

    CONSTRAINT "Project_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Environment" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "kind" "EnvironmentKind" NOT NULL,
    "baseUrl" TEXT NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "config" JSONB NOT NULL DEFAULT '{}',
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "workspaceId" UUID NOT NULL,
    "projectId" UUID NOT NULL,
    "createdById" UUID,
    "updatedById" UUID,

    CONSTRAINT "Environment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EnvironmentSecret" (
    "id" UUID NOT NULL,
    "key" TEXT NOT NULL,
    "encryptedValue" JSONB NOT NULL,
    "fingerprint" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "workspaceId" UUID NOT NULL,
    "environmentId" UUID NOT NULL,
    "createdById" UUID,
    "updatedById" UUID,

    CONSTRAINT "EnvironmentSecret_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Requirement" (
    "id" UUID NOT NULL,
    "key" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "acceptanceCriteria" JSONB NOT NULL DEFAULT '[]',
    "riskLevel" "RiskLevel" NOT NULL DEFAULT 'MEDIUM',
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "workspaceId" UUID NOT NULL,
    "projectId" UUID NOT NULL,
    "createdById" UUID,
    "updatedById" UUID,

    CONSTRAINT "Requirement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RequirementVersion" (
    "id" UUID NOT NULL,
    "revision" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "acceptanceCriteria" JSONB NOT NULL,
    "riskLevel" "RiskLevel" NOT NULL,
    "changeSummary" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "workspaceId" UUID NOT NULL,
    "requirementId" UUID NOT NULL,
    "createdById" UUID,

    CONSTRAINT "RequirementVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TestPlan" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "objective" JSONB NOT NULL DEFAULT '{}',
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "workspaceId" UUID NOT NULL,
    "projectId" UUID NOT NULL,
    "createdById" UUID,
    "updatedById" UUID,

    CONSTRAINT "TestPlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TestCase" (
    "id" UUID NOT NULL,
    "key" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "status" "TestCaseStatus" NOT NULL DEFAULT 'DRAFT',
    "riskLevel" "RiskLevel" NOT NULL DEFAULT 'MEDIUM',
    "currentVersion" INTEGER NOT NULL DEFAULT 1,
    "intent" JSONB NOT NULL,
    "tags" JSONB NOT NULL DEFAULT '[]',
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "workspaceId" UUID NOT NULL,
    "projectId" UUID NOT NULL,
    "testPlanId" UUID,
    "requirementId" UUID,
    "createdById" UUID,
    "updatedById" UUID,

    CONSTRAINT "TestCase_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TestCaseVersion" (
    "id" UUID NOT NULL,
    "revision" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "status" "TestCaseStatus" NOT NULL,
    "riskLevel" "RiskLevel" NOT NULL,
    "intent" JSONB NOT NULL,
    "tags" JSONB NOT NULL,
    "changeSummary" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "workspaceId" UUID NOT NULL,
    "testCaseId" UUID NOT NULL,
    "createdById" UUID,

    CONSTRAINT "TestCaseVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TestSuite" (
    "id" UUID NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "status" "TestCaseStatus" NOT NULL DEFAULT 'DRAFT',
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "workspaceId" UUID NOT NULL,
    "projectId" UUID NOT NULL,
    "testPlanId" UUID,
    "createdById" UUID,
    "updatedById" UUID,

    CONSTRAINT "TestSuite_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TestSuiteItem" (
    "id" UUID NOT NULL,
    "position" INTEGER NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "config" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "workspaceId" UUID NOT NULL,
    "testSuiteId" UUID NOT NULL,
    "testCaseId" UUID NOT NULL,
    "createdById" UUID,

    CONSTRAINT "TestSuiteItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TestRun" (
    "id" UUID NOT NULL,
    "status" "TestRunStatus" NOT NULL DEFAULT 'QUEUED',
    "trigger" TEXT NOT NULL DEFAULT 'MANUAL',
    "config" JSONB NOT NULL DEFAULT '{}',
    "totalTests" INTEGER NOT NULL DEFAULT 0,
    "passedTests" INTEGER NOT NULL DEFAULT 0,
    "failedTests" INTEGER NOT NULL DEFAULT 0,
    "skippedTests" INTEGER NOT NULL DEFAULT 0,
    "startedAt" TIMESTAMP(3),
    "finishedAt" TIMESTAMP(3),
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "workspaceId" UUID NOT NULL,
    "projectId" UUID NOT NULL,
    "testSuiteId" UUID,
    "environmentId" UUID NOT NULL,
    "createdById" UUID,

    CONSTRAINT "TestRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TestRunShard" (
    "id" UUID NOT NULL,
    "shardIndex" INTEGER NOT NULL,
    "status" "TestRunStatus" NOT NULL DEFAULT 'QUEUED',
    "workerId" TEXT,
    "startedAt" TIMESTAMP(3),
    "finishedAt" TIMESTAMP(3),
    "error" JSONB,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "workspaceId" UUID NOT NULL,
    "testRunId" UUID NOT NULL,

    CONSTRAINT "TestRunShard_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TestAttempt" (
    "id" UUID NOT NULL,
    "attemptNumber" INTEGER NOT NULL DEFAULT 1,
    "outcome" "AttemptOutcome",
    "startedAt" TIMESTAMP(3),
    "finishedAt" TIMESTAMP(3),
    "durationMs" INTEGER,
    "error" JSONB,
    "metrics" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "workspaceId" UUID NOT NULL,
    "testRunId" UUID NOT NULL,
    "testRunShardId" UUID,
    "testCaseId" UUID NOT NULL,
    "testCaseVersionId" UUID,

    CONSTRAINT "TestAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TestResult" (
    "id" UUID NOT NULL,
    "outcome" "AttemptOutcome" NOT NULL,
    "durationMs" INTEGER,
    "summary" TEXT,
    "details" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "workspaceId" UUID NOT NULL,
    "testRunId" UUID NOT NULL,
    "testAttemptId" UUID NOT NULL,
    "testCaseId" UUID NOT NULL,

    CONSTRAINT "TestResult_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Artifact" (
    "id" UUID NOT NULL,
    "kind" "ArtifactKind" NOT NULL,
    "name" TEXT NOT NULL,
    "storageUrl" TEXT NOT NULL,
    "contentType" TEXT,
    "sizeBytes" BIGINT,
    "checksum" TEXT,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "workspaceId" UUID NOT NULL,
    "projectId" UUID NOT NULL,
    "testRunId" UUID NOT NULL,
    "testAttemptId" UUID,
    "testResultId" UUID,

    CONSTRAINT "Artifact_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FailureAnalysis" (
    "id" UUID NOT NULL,
    "classification" "FailureClassification" NOT NULL DEFAULT 'UNKNOWN',
    "confidence" DOUBLE PRECISION NOT NULL,
    "summary" TEXT NOT NULL,
    "rootCause" TEXT,
    "evidence" JSONB NOT NULL DEFAULT '[]',
    "model" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "workspaceId" UUID NOT NULL,
    "testResultId" UUID NOT NULL,
    "reviewedById" UUID,

    CONSTRAINT "FailureAnalysis_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HealingProposal" (
    "id" UUID NOT NULL,
    "status" "HealingProposalStatus" NOT NULL DEFAULT 'PENDING',
    "proposedIntent" JSONB NOT NULL,
    "rationale" TEXT NOT NULL,
    "confidence" DOUBLE PRECISION NOT NULL,
    "riskLevel" "RiskLevel" NOT NULL DEFAULT 'MEDIUM',
    "reviewComment" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "appliedAt" TIMESTAMP(3),
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "workspaceId" UUID NOT NULL,
    "projectId" UUID NOT NULL,
    "testCaseId" UUID NOT NULL,
    "failureAnalysisId" UUID NOT NULL,
    "reviewedById" UUID,
    "appliedById" UUID,

    CONSTRAINT "HealingProposal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AiConfiguration" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "provider" "AiProviderKind" NOT NULL,
    "model" TEXT NOT NULL,
    "encryptedCredentials" JSONB,
    "settings" JSONB NOT NULL DEFAULT '{}',
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "workspaceId" UUID NOT NULL,
    "projectId" UUID,
    "createdById" UUID,
    "updatedById" UUID,

    CONSTRAINT "AiConfiguration_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AiInvocation" (
    "id" UUID NOT NULL,
    "provider" "AiProviderKind" NOT NULL,
    "model" TEXT NOT NULL,
    "purpose" TEXT NOT NULL,
    "request" JSONB NOT NULL,
    "response" JSONB,
    "inputTokens" INTEGER,
    "outputTokens" INTEGER,
    "latencyMs" INTEGER,
    "status" TEXT NOT NULL,
    "error" TEXT,
    "relatedType" TEXT,
    "relatedId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "workspaceId" UUID NOT NULL,
    "projectId" UUID,
    "aiConfigurationId" UUID,
    "createdById" UUID,

    CONSTRAINT "AiInvocation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Schedule" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "cron" TEXT NOT NULL,
    "timezone" TEXT NOT NULL DEFAULT 'UTC',
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "config" JSONB NOT NULL DEFAULT '{}',
    "nextRunAt" TIMESTAMP(3),
    "lastRunAt" TIMESTAMP(3),
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "workspaceId" UUID NOT NULL,
    "projectId" UUID NOT NULL,
    "testSuiteId" UUID NOT NULL,
    "environmentId" UUID NOT NULL,
    "createdById" UUID,
    "updatedById" UUID,

    CONSTRAINT "Schedule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditEvent" (
    "id" UUID NOT NULL,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" UUID,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "workspaceId" UUID NOT NULL,
    "actorId" UUID,

    CONSTRAINT "AuditEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ApiSpec" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "format" TEXT NOT NULL,
    "sourceUrl" TEXT,
    "content" TEXT,
    "checksum" TEXT,
    "parsedSchema" JSONB,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "workspaceId" UUID NOT NULL,
    "projectId" UUID NOT NULL,
    "createdById" UUID,
    "updatedById" UUID,

    CONSTRAINT "ApiSpec_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ApplicationMap" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "graph" JSONB NOT NULL,
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "workspaceId" UUID NOT NULL,
    "projectId" UUID NOT NULL,
    "environmentId" UUID,
    "createdById" UUID,
    "updatedById" UUID,

    CONSTRAINT "ApplicationMap_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WebhookEndpoint" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "encryptedSecret" JSONB,
    "events" JSONB NOT NULL DEFAULT '[]',
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "workspaceId" UUID NOT NULL,
    "projectId" UUID,
    "createdById" UUID,
    "updatedById" UUID,

    CONSTRAINT "WebhookEndpoint_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WebhookDelivery" (
    "id" UUID NOT NULL,
    "eventType" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "responseStatus" INTEGER,
    "responseBody" TEXT,
    "nextAttemptAt" TIMESTAMP(3),
    "deliveredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "workspaceId" UUID NOT NULL,
    "webhookEndpointId" UUID NOT NULL,

    CONSTRAINT "WebhookDelivery_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" UUID NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "lastSeenAt" TIMESTAMP(3),
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "userId" UUID NOT NULL,
    "workspaceId" UUID,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QualityGateConfig" (
    "id" UUID NOT NULL,
    "thresholds" JSONB NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "workspaceId" UUID NOT NULL,
    "projectId" UUID NOT NULL,
    "createdById" UUID,
    "updatedById" UUID,

    CONSTRAINT "QualityGateConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QuarantineRecord" (
    "id" UUID NOT NULL,
    "reason" TEXT NOT NULL,
    "classification" "FailureClassification",
    "active" BOOLEAN NOT NULL DEFAULT true,
    "quarantinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3),
    "releasedAt" TIMESTAMP(3),
    "releaseReason" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "workspaceId" UUID NOT NULL,
    "projectId" UUID NOT NULL,
    "testCaseId" UUID NOT NULL,
    "quarantinedById" UUID,
    "releasedById" UUID,

    CONSTRAINT "QuarantineRecord_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Workspace_key_key" ON "Workspace"("key");

-- CreateIndex
CREATE UNIQUE INDEX "Workspace_slug_key" ON "Workspace"("slug");

-- CreateIndex
CREATE INDEX "Workspace_createdById_idx" ON "Workspace"("createdById");

-- CreateIndex
CREATE INDEX "Workspace_updatedById_idx" ON "Workspace"("updatedById");

-- CreateIndex
CREATE INDEX "Workspace_deletedAt_idx" ON "Workspace"("deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_deletedAt_idx" ON "User"("deletedAt");

-- CreateIndex
CREATE INDEX "Membership_workspaceId_idx" ON "Membership"("workspaceId");

-- CreateIndex
CREATE INDEX "Membership_userId_idx" ON "Membership"("userId");

-- CreateIndex
CREATE INDEX "Membership_createdById_idx" ON "Membership"("createdById");

-- CreateIndex
CREATE INDEX "Membership_updatedById_idx" ON "Membership"("updatedById");

-- CreateIndex
CREATE INDEX "Membership_deletedAt_idx" ON "Membership"("deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "Membership_workspaceId_userId_key" ON "Membership"("workspaceId", "userId");

-- CreateIndex
CREATE INDEX "Project_workspaceId_idx" ON "Project"("workspaceId");

-- CreateIndex
CREATE INDEX "Project_createdById_idx" ON "Project"("createdById");

-- CreateIndex
CREATE INDEX "Project_updatedById_idx" ON "Project"("updatedById");

-- CreateIndex
CREATE INDEX "Project_deletedAt_idx" ON "Project"("deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "Project_workspaceId_key_key" ON "Project"("workspaceId", "key");

-- CreateIndex
CREATE INDEX "Environment_workspaceId_idx" ON "Environment"("workspaceId");

-- CreateIndex
CREATE INDEX "Environment_projectId_idx" ON "Environment"("projectId");

-- CreateIndex
CREATE INDEX "Environment_createdById_idx" ON "Environment"("createdById");

-- CreateIndex
CREATE INDEX "Environment_updatedById_idx" ON "Environment"("updatedById");

-- CreateIndex
CREATE INDEX "Environment_deletedAt_idx" ON "Environment"("deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "Environment_projectId_name_key" ON "Environment"("projectId", "name");

-- CreateIndex
CREATE INDEX "EnvironmentSecret_workspaceId_idx" ON "EnvironmentSecret"("workspaceId");

-- CreateIndex
CREATE INDEX "EnvironmentSecret_environmentId_idx" ON "EnvironmentSecret"("environmentId");

-- CreateIndex
CREATE INDEX "EnvironmentSecret_createdById_idx" ON "EnvironmentSecret"("createdById");

-- CreateIndex
CREATE INDEX "EnvironmentSecret_updatedById_idx" ON "EnvironmentSecret"("updatedById");

-- CreateIndex
CREATE INDEX "EnvironmentSecret_deletedAt_idx" ON "EnvironmentSecret"("deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "EnvironmentSecret_environmentId_key_key" ON "EnvironmentSecret"("environmentId", "key");

-- CreateIndex
CREATE INDEX "Requirement_workspaceId_idx" ON "Requirement"("workspaceId");

-- CreateIndex
CREATE INDEX "Requirement_projectId_idx" ON "Requirement"("projectId");

-- CreateIndex
CREATE INDEX "Requirement_createdById_idx" ON "Requirement"("createdById");

-- CreateIndex
CREATE INDEX "Requirement_updatedById_idx" ON "Requirement"("updatedById");

-- CreateIndex
CREATE INDEX "Requirement_deletedAt_idx" ON "Requirement"("deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "Requirement_projectId_key_key" ON "Requirement"("projectId", "key");

-- CreateIndex
CREATE INDEX "RequirementVersion_workspaceId_idx" ON "RequirementVersion"("workspaceId");

-- CreateIndex
CREATE INDEX "RequirementVersion_requirementId_idx" ON "RequirementVersion"("requirementId");

-- CreateIndex
CREATE INDEX "RequirementVersion_createdById_idx" ON "RequirementVersion"("createdById");

-- CreateIndex
CREATE UNIQUE INDEX "RequirementVersion_requirementId_revision_key" ON "RequirementVersion"("requirementId", "revision");

-- CreateIndex
CREATE INDEX "TestPlan_workspaceId_idx" ON "TestPlan"("workspaceId");

-- CreateIndex
CREATE INDEX "TestPlan_projectId_idx" ON "TestPlan"("projectId");

-- CreateIndex
CREATE INDEX "TestPlan_createdById_idx" ON "TestPlan"("createdById");

-- CreateIndex
CREATE INDEX "TestPlan_updatedById_idx" ON "TestPlan"("updatedById");

-- CreateIndex
CREATE INDEX "TestPlan_deletedAt_idx" ON "TestPlan"("deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "TestPlan_projectId_name_key" ON "TestPlan"("projectId", "name");

-- CreateIndex
CREATE INDEX "TestCase_workspaceId_idx" ON "TestCase"("workspaceId");

-- CreateIndex
CREATE INDEX "TestCase_projectId_idx" ON "TestCase"("projectId");

-- CreateIndex
CREATE INDEX "TestCase_testPlanId_idx" ON "TestCase"("testPlanId");

-- CreateIndex
CREATE INDEX "TestCase_requirementId_idx" ON "TestCase"("requirementId");

-- CreateIndex
CREATE INDEX "TestCase_createdById_idx" ON "TestCase"("createdById");

-- CreateIndex
CREATE INDEX "TestCase_updatedById_idx" ON "TestCase"("updatedById");

-- CreateIndex
CREATE INDEX "TestCase_status_idx" ON "TestCase"("status");

-- CreateIndex
CREATE INDEX "TestCase_deletedAt_idx" ON "TestCase"("deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "TestCase_projectId_key_key" ON "TestCase"("projectId", "key");

-- CreateIndex
CREATE INDEX "TestCaseVersion_workspaceId_idx" ON "TestCaseVersion"("workspaceId");

-- CreateIndex
CREATE INDEX "TestCaseVersion_testCaseId_idx" ON "TestCaseVersion"("testCaseId");

-- CreateIndex
CREATE INDEX "TestCaseVersion_createdById_idx" ON "TestCaseVersion"("createdById");

-- CreateIndex
CREATE UNIQUE INDEX "TestCaseVersion_testCaseId_revision_key" ON "TestCaseVersion"("testCaseId", "revision");

-- CreateIndex
CREATE INDEX "TestSuite_workspaceId_idx" ON "TestSuite"("workspaceId");

-- CreateIndex
CREATE INDEX "TestSuite_projectId_idx" ON "TestSuite"("projectId");

-- CreateIndex
CREATE INDEX "TestSuite_testPlanId_idx" ON "TestSuite"("testPlanId");

-- CreateIndex
CREATE INDEX "TestSuite_createdById_idx" ON "TestSuite"("createdById");

-- CreateIndex
CREATE INDEX "TestSuite_updatedById_idx" ON "TestSuite"("updatedById");

-- CreateIndex
CREATE INDEX "TestSuite_deletedAt_idx" ON "TestSuite"("deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "TestSuite_projectId_key_key" ON "TestSuite"("projectId", "key");

-- CreateIndex
CREATE INDEX "TestSuiteItem_workspaceId_idx" ON "TestSuiteItem"("workspaceId");

-- CreateIndex
CREATE INDEX "TestSuiteItem_testSuiteId_idx" ON "TestSuiteItem"("testSuiteId");

-- CreateIndex
CREATE INDEX "TestSuiteItem_testCaseId_idx" ON "TestSuiteItem"("testCaseId");

-- CreateIndex
CREATE INDEX "TestSuiteItem_createdById_idx" ON "TestSuiteItem"("createdById");

-- CreateIndex
CREATE UNIQUE INDEX "TestSuiteItem_testSuiteId_testCaseId_key" ON "TestSuiteItem"("testSuiteId", "testCaseId");

-- CreateIndex
CREATE UNIQUE INDEX "TestSuiteItem_testSuiteId_position_key" ON "TestSuiteItem"("testSuiteId", "position");

-- CreateIndex
CREATE INDEX "TestRun_workspaceId_idx" ON "TestRun"("workspaceId");

-- CreateIndex
CREATE INDEX "TestRun_projectId_idx" ON "TestRun"("projectId");

-- CreateIndex
CREATE INDEX "TestRun_testSuiteId_idx" ON "TestRun"("testSuiteId");

-- CreateIndex
CREATE INDEX "TestRun_environmentId_idx" ON "TestRun"("environmentId");

-- CreateIndex
CREATE INDEX "TestRun_createdById_idx" ON "TestRun"("createdById");

-- CreateIndex
CREATE INDEX "TestRun_status_idx" ON "TestRun"("status");

-- CreateIndex
CREATE INDEX "TestRun_createdAt_idx" ON "TestRun"("createdAt");

-- CreateIndex
CREATE INDEX "TestRunShard_workspaceId_idx" ON "TestRunShard"("workspaceId");

-- CreateIndex
CREATE INDEX "TestRunShard_testRunId_idx" ON "TestRunShard"("testRunId");

-- CreateIndex
CREATE INDEX "TestRunShard_status_idx" ON "TestRunShard"("status");

-- CreateIndex
CREATE UNIQUE INDEX "TestRunShard_testRunId_shardIndex_key" ON "TestRunShard"("testRunId", "shardIndex");

-- CreateIndex
CREATE INDEX "TestAttempt_workspaceId_idx" ON "TestAttempt"("workspaceId");

-- CreateIndex
CREATE INDEX "TestAttempt_testRunId_idx" ON "TestAttempt"("testRunId");

-- CreateIndex
CREATE INDEX "TestAttempt_testRunShardId_idx" ON "TestAttempt"("testRunShardId");

-- CreateIndex
CREATE INDEX "TestAttempt_testCaseId_idx" ON "TestAttempt"("testCaseId");

-- CreateIndex
CREATE INDEX "TestAttempt_testCaseVersionId_idx" ON "TestAttempt"("testCaseVersionId");

-- CreateIndex
CREATE INDEX "TestAttempt_outcome_idx" ON "TestAttempt"("outcome");

-- CreateIndex
CREATE UNIQUE INDEX "TestAttempt_testRunId_testCaseId_attemptNumber_key" ON "TestAttempt"("testRunId", "testCaseId", "attemptNumber");

-- CreateIndex
CREATE UNIQUE INDEX "TestResult_testAttemptId_key" ON "TestResult"("testAttemptId");

-- CreateIndex
CREATE INDEX "TestResult_workspaceId_idx" ON "TestResult"("workspaceId");

-- CreateIndex
CREATE INDEX "TestResult_testRunId_idx" ON "TestResult"("testRunId");

-- CreateIndex
CREATE INDEX "TestResult_testCaseId_idx" ON "TestResult"("testCaseId");

-- CreateIndex
CREATE INDEX "TestResult_outcome_idx" ON "TestResult"("outcome");

-- CreateIndex
CREATE INDEX "Artifact_workspaceId_idx" ON "Artifact"("workspaceId");

-- CreateIndex
CREATE INDEX "Artifact_projectId_idx" ON "Artifact"("projectId");

-- CreateIndex
CREATE INDEX "Artifact_testRunId_idx" ON "Artifact"("testRunId");

-- CreateIndex
CREATE INDEX "Artifact_testAttemptId_idx" ON "Artifact"("testAttemptId");

-- CreateIndex
CREATE INDEX "Artifact_testResultId_idx" ON "Artifact"("testResultId");

-- CreateIndex
CREATE INDEX "Artifact_kind_idx" ON "Artifact"("kind");

-- CreateIndex
CREATE UNIQUE INDEX "FailureAnalysis_testResultId_key" ON "FailureAnalysis"("testResultId");

-- CreateIndex
CREATE INDEX "FailureAnalysis_workspaceId_idx" ON "FailureAnalysis"("workspaceId");

-- CreateIndex
CREATE INDEX "FailureAnalysis_reviewedById_idx" ON "FailureAnalysis"("reviewedById");

-- CreateIndex
CREATE INDEX "FailureAnalysis_classification_idx" ON "FailureAnalysis"("classification");

-- CreateIndex
CREATE INDEX "HealingProposal_workspaceId_idx" ON "HealingProposal"("workspaceId");

-- CreateIndex
CREATE INDEX "HealingProposal_projectId_idx" ON "HealingProposal"("projectId");

-- CreateIndex
CREATE INDEX "HealingProposal_testCaseId_idx" ON "HealingProposal"("testCaseId");

-- CreateIndex
CREATE INDEX "HealingProposal_failureAnalysisId_idx" ON "HealingProposal"("failureAnalysisId");

-- CreateIndex
CREATE INDEX "HealingProposal_reviewedById_idx" ON "HealingProposal"("reviewedById");

-- CreateIndex
CREATE INDEX "HealingProposal_appliedById_idx" ON "HealingProposal"("appliedById");

-- CreateIndex
CREATE INDEX "HealingProposal_status_idx" ON "HealingProposal"("status");

-- CreateIndex
CREATE INDEX "AiConfiguration_workspaceId_idx" ON "AiConfiguration"("workspaceId");

-- CreateIndex
CREATE INDEX "AiConfiguration_projectId_idx" ON "AiConfiguration"("projectId");

-- CreateIndex
CREATE INDEX "AiConfiguration_createdById_idx" ON "AiConfiguration"("createdById");

-- CreateIndex
CREATE INDEX "AiConfiguration_updatedById_idx" ON "AiConfiguration"("updatedById");

-- CreateIndex
CREATE INDEX "AiConfiguration_deletedAt_idx" ON "AiConfiguration"("deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "AiConfiguration_workspaceId_name_key" ON "AiConfiguration"("workspaceId", "name");

-- CreateIndex
CREATE INDEX "AiInvocation_workspaceId_idx" ON "AiInvocation"("workspaceId");

-- CreateIndex
CREATE INDEX "AiInvocation_projectId_idx" ON "AiInvocation"("projectId");

-- CreateIndex
CREATE INDEX "AiInvocation_aiConfigurationId_idx" ON "AiInvocation"("aiConfigurationId");

-- CreateIndex
CREATE INDEX "AiInvocation_createdById_idx" ON "AiInvocation"("createdById");

-- CreateIndex
CREATE INDEX "AiInvocation_relatedType_relatedId_idx" ON "AiInvocation"("relatedType", "relatedId");

-- CreateIndex
CREATE INDEX "AiInvocation_createdAt_idx" ON "AiInvocation"("createdAt");

-- CreateIndex
CREATE INDEX "Schedule_workspaceId_idx" ON "Schedule"("workspaceId");

-- CreateIndex
CREATE INDEX "Schedule_projectId_idx" ON "Schedule"("projectId");

-- CreateIndex
CREATE INDEX "Schedule_testSuiteId_idx" ON "Schedule"("testSuiteId");

-- CreateIndex
CREATE INDEX "Schedule_environmentId_idx" ON "Schedule"("environmentId");

-- CreateIndex
CREATE INDEX "Schedule_createdById_idx" ON "Schedule"("createdById");

-- CreateIndex
CREATE INDEX "Schedule_updatedById_idx" ON "Schedule"("updatedById");

-- CreateIndex
CREATE INDEX "Schedule_nextRunAt_idx" ON "Schedule"("nextRunAt");

-- CreateIndex
CREATE INDEX "Schedule_deletedAt_idx" ON "Schedule"("deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "Schedule_projectId_name_key" ON "Schedule"("projectId", "name");

-- CreateIndex
CREATE INDEX "AuditEvent_workspaceId_idx" ON "AuditEvent"("workspaceId");

-- CreateIndex
CREATE INDEX "AuditEvent_actorId_idx" ON "AuditEvent"("actorId");

-- CreateIndex
CREATE INDEX "AuditEvent_entityType_entityId_idx" ON "AuditEvent"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "AuditEvent_createdAt_idx" ON "AuditEvent"("createdAt");

-- CreateIndex
CREATE INDEX "ApiSpec_workspaceId_idx" ON "ApiSpec"("workspaceId");

-- CreateIndex
CREATE INDEX "ApiSpec_projectId_idx" ON "ApiSpec"("projectId");

-- CreateIndex
CREATE INDEX "ApiSpec_createdById_idx" ON "ApiSpec"("createdById");

-- CreateIndex
CREATE INDEX "ApiSpec_updatedById_idx" ON "ApiSpec"("updatedById");

-- CreateIndex
CREATE INDEX "ApiSpec_deletedAt_idx" ON "ApiSpec"("deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "ApiSpec_projectId_name_key" ON "ApiSpec"("projectId", "name");

-- CreateIndex
CREATE INDEX "ApplicationMap_workspaceId_idx" ON "ApplicationMap"("workspaceId");

-- CreateIndex
CREATE INDEX "ApplicationMap_projectId_idx" ON "ApplicationMap"("projectId");

-- CreateIndex
CREATE INDEX "ApplicationMap_environmentId_idx" ON "ApplicationMap"("environmentId");

-- CreateIndex
CREATE INDEX "ApplicationMap_createdById_idx" ON "ApplicationMap"("createdById");

-- CreateIndex
CREATE INDEX "ApplicationMap_updatedById_idx" ON "ApplicationMap"("updatedById");

-- CreateIndex
CREATE INDEX "ApplicationMap_deletedAt_idx" ON "ApplicationMap"("deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "ApplicationMap_projectId_name_key" ON "ApplicationMap"("projectId", "name");

-- CreateIndex
CREATE INDEX "WebhookEndpoint_workspaceId_idx" ON "WebhookEndpoint"("workspaceId");

-- CreateIndex
CREATE INDEX "WebhookEndpoint_projectId_idx" ON "WebhookEndpoint"("projectId");

-- CreateIndex
CREATE INDEX "WebhookEndpoint_createdById_idx" ON "WebhookEndpoint"("createdById");

-- CreateIndex
CREATE INDEX "WebhookEndpoint_updatedById_idx" ON "WebhookEndpoint"("updatedById");

-- CreateIndex
CREATE INDEX "WebhookEndpoint_deletedAt_idx" ON "WebhookEndpoint"("deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "WebhookEndpoint_workspaceId_name_key" ON "WebhookEndpoint"("workspaceId", "name");

-- CreateIndex
CREATE INDEX "WebhookDelivery_workspaceId_idx" ON "WebhookDelivery"("workspaceId");

-- CreateIndex
CREATE INDEX "WebhookDelivery_webhookEndpointId_idx" ON "WebhookDelivery"("webhookEndpointId");

-- CreateIndex
CREATE INDEX "WebhookDelivery_status_nextAttemptAt_idx" ON "WebhookDelivery"("status", "nextAttemptAt");

-- CreateIndex
CREATE INDEX "WebhookDelivery_createdAt_idx" ON "WebhookDelivery"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Session_tokenHash_key" ON "Session"("tokenHash");

-- CreateIndex
CREATE INDEX "Session_userId_idx" ON "Session"("userId");

-- CreateIndex
CREATE INDEX "Session_workspaceId_idx" ON "Session"("workspaceId");

-- CreateIndex
CREATE INDEX "Session_expiresAt_idx" ON "Session"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "QualityGateConfig_projectId_key" ON "QualityGateConfig"("projectId");

-- CreateIndex
CREATE INDEX "QualityGateConfig_workspaceId_idx" ON "QualityGateConfig"("workspaceId");

-- CreateIndex
CREATE INDEX "QualityGateConfig_createdById_idx" ON "QualityGateConfig"("createdById");

-- CreateIndex
CREATE INDEX "QualityGateConfig_updatedById_idx" ON "QualityGateConfig"("updatedById");

-- CreateIndex
CREATE INDEX "QualityGateConfig_deletedAt_idx" ON "QualityGateConfig"("deletedAt");

-- CreateIndex
CREATE INDEX "QuarantineRecord_workspaceId_idx" ON "QuarantineRecord"("workspaceId");

-- CreateIndex
CREATE INDEX "QuarantineRecord_projectId_idx" ON "QuarantineRecord"("projectId");

-- CreateIndex
CREATE INDEX "QuarantineRecord_testCaseId_idx" ON "QuarantineRecord"("testCaseId");

-- CreateIndex
CREATE INDEX "QuarantineRecord_quarantinedById_idx" ON "QuarantineRecord"("quarantinedById");

-- CreateIndex
CREATE INDEX "QuarantineRecord_releasedById_idx" ON "QuarantineRecord"("releasedById");

-- CreateIndex
CREATE INDEX "QuarantineRecord_active_expiresAt_idx" ON "QuarantineRecord"("active", "expiresAt");

-- AddForeignKey
ALTER TABLE "Workspace" ADD CONSTRAINT "Workspace_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Workspace" ADD CONSTRAINT "Workspace_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Membership" ADD CONSTRAINT "Membership_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Membership" ADD CONSTRAINT "Membership_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Membership" ADD CONSTRAINT "Membership_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Membership" ADD CONSTRAINT "Membership_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Project" ADD CONSTRAINT "Project_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Project" ADD CONSTRAINT "Project_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Project" ADD CONSTRAINT "Project_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Environment" ADD CONSTRAINT "Environment_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Environment" ADD CONSTRAINT "Environment_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Environment" ADD CONSTRAINT "Environment_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Environment" ADD CONSTRAINT "Environment_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EnvironmentSecret" ADD CONSTRAINT "EnvironmentSecret_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EnvironmentSecret" ADD CONSTRAINT "EnvironmentSecret_environmentId_fkey" FOREIGN KEY ("environmentId") REFERENCES "Environment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EnvironmentSecret" ADD CONSTRAINT "EnvironmentSecret_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EnvironmentSecret" ADD CONSTRAINT "EnvironmentSecret_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Requirement" ADD CONSTRAINT "Requirement_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Requirement" ADD CONSTRAINT "Requirement_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Requirement" ADD CONSTRAINT "Requirement_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Requirement" ADD CONSTRAINT "Requirement_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RequirementVersion" ADD CONSTRAINT "RequirementVersion_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RequirementVersion" ADD CONSTRAINT "RequirementVersion_requirementId_fkey" FOREIGN KEY ("requirementId") REFERENCES "Requirement"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RequirementVersion" ADD CONSTRAINT "RequirementVersion_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TestPlan" ADD CONSTRAINT "TestPlan_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TestPlan" ADD CONSTRAINT "TestPlan_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TestPlan" ADD CONSTRAINT "TestPlan_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TestPlan" ADD CONSTRAINT "TestPlan_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TestCase" ADD CONSTRAINT "TestCase_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TestCase" ADD CONSTRAINT "TestCase_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TestCase" ADD CONSTRAINT "TestCase_testPlanId_fkey" FOREIGN KEY ("testPlanId") REFERENCES "TestPlan"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TestCase" ADD CONSTRAINT "TestCase_requirementId_fkey" FOREIGN KEY ("requirementId") REFERENCES "Requirement"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TestCase" ADD CONSTRAINT "TestCase_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TestCase" ADD CONSTRAINT "TestCase_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TestCaseVersion" ADD CONSTRAINT "TestCaseVersion_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TestCaseVersion" ADD CONSTRAINT "TestCaseVersion_testCaseId_fkey" FOREIGN KEY ("testCaseId") REFERENCES "TestCase"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TestCaseVersion" ADD CONSTRAINT "TestCaseVersion_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TestSuite" ADD CONSTRAINT "TestSuite_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TestSuite" ADD CONSTRAINT "TestSuite_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TestSuite" ADD CONSTRAINT "TestSuite_testPlanId_fkey" FOREIGN KEY ("testPlanId") REFERENCES "TestPlan"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TestSuite" ADD CONSTRAINT "TestSuite_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TestSuite" ADD CONSTRAINT "TestSuite_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TestSuiteItem" ADD CONSTRAINT "TestSuiteItem_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TestSuiteItem" ADD CONSTRAINT "TestSuiteItem_testSuiteId_fkey" FOREIGN KEY ("testSuiteId") REFERENCES "TestSuite"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TestSuiteItem" ADD CONSTRAINT "TestSuiteItem_testCaseId_fkey" FOREIGN KEY ("testCaseId") REFERENCES "TestCase"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TestSuiteItem" ADD CONSTRAINT "TestSuiteItem_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TestRun" ADD CONSTRAINT "TestRun_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TestRun" ADD CONSTRAINT "TestRun_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TestRun" ADD CONSTRAINT "TestRun_testSuiteId_fkey" FOREIGN KEY ("testSuiteId") REFERENCES "TestSuite"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TestRun" ADD CONSTRAINT "TestRun_environmentId_fkey" FOREIGN KEY ("environmentId") REFERENCES "Environment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TestRun" ADD CONSTRAINT "TestRun_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TestRunShard" ADD CONSTRAINT "TestRunShard_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TestRunShard" ADD CONSTRAINT "TestRunShard_testRunId_fkey" FOREIGN KEY ("testRunId") REFERENCES "TestRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TestAttempt" ADD CONSTRAINT "TestAttempt_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TestAttempt" ADD CONSTRAINT "TestAttempt_testRunId_fkey" FOREIGN KEY ("testRunId") REFERENCES "TestRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TestAttempt" ADD CONSTRAINT "TestAttempt_testRunShardId_fkey" FOREIGN KEY ("testRunShardId") REFERENCES "TestRunShard"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TestAttempt" ADD CONSTRAINT "TestAttempt_testCaseId_fkey" FOREIGN KEY ("testCaseId") REFERENCES "TestCase"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TestAttempt" ADD CONSTRAINT "TestAttempt_testCaseVersionId_fkey" FOREIGN KEY ("testCaseVersionId") REFERENCES "TestCaseVersion"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TestResult" ADD CONSTRAINT "TestResult_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TestResult" ADD CONSTRAINT "TestResult_testRunId_fkey" FOREIGN KEY ("testRunId") REFERENCES "TestRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TestResult" ADD CONSTRAINT "TestResult_testAttemptId_fkey" FOREIGN KEY ("testAttemptId") REFERENCES "TestAttempt"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TestResult" ADD CONSTRAINT "TestResult_testCaseId_fkey" FOREIGN KEY ("testCaseId") REFERENCES "TestCase"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Artifact" ADD CONSTRAINT "Artifact_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Artifact" ADD CONSTRAINT "Artifact_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Artifact" ADD CONSTRAINT "Artifact_testRunId_fkey" FOREIGN KEY ("testRunId") REFERENCES "TestRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Artifact" ADD CONSTRAINT "Artifact_testAttemptId_fkey" FOREIGN KEY ("testAttemptId") REFERENCES "TestAttempt"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Artifact" ADD CONSTRAINT "Artifact_testResultId_fkey" FOREIGN KEY ("testResultId") REFERENCES "TestResult"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FailureAnalysis" ADD CONSTRAINT "FailureAnalysis_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FailureAnalysis" ADD CONSTRAINT "FailureAnalysis_testResultId_fkey" FOREIGN KEY ("testResultId") REFERENCES "TestResult"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FailureAnalysis" ADD CONSTRAINT "FailureAnalysis_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HealingProposal" ADD CONSTRAINT "HealingProposal_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HealingProposal" ADD CONSTRAINT "HealingProposal_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HealingProposal" ADD CONSTRAINT "HealingProposal_testCaseId_fkey" FOREIGN KEY ("testCaseId") REFERENCES "TestCase"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HealingProposal" ADD CONSTRAINT "HealingProposal_failureAnalysisId_fkey" FOREIGN KEY ("failureAnalysisId") REFERENCES "FailureAnalysis"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HealingProposal" ADD CONSTRAINT "HealingProposal_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HealingProposal" ADD CONSTRAINT "HealingProposal_appliedById_fkey" FOREIGN KEY ("appliedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AiConfiguration" ADD CONSTRAINT "AiConfiguration_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AiConfiguration" ADD CONSTRAINT "AiConfiguration_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AiConfiguration" ADD CONSTRAINT "AiConfiguration_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AiConfiguration" ADD CONSTRAINT "AiConfiguration_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AiInvocation" ADD CONSTRAINT "AiInvocation_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AiInvocation" ADD CONSTRAINT "AiInvocation_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AiInvocation" ADD CONSTRAINT "AiInvocation_aiConfigurationId_fkey" FOREIGN KEY ("aiConfigurationId") REFERENCES "AiConfiguration"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AiInvocation" ADD CONSTRAINT "AiInvocation_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Schedule" ADD CONSTRAINT "Schedule_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Schedule" ADD CONSTRAINT "Schedule_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Schedule" ADD CONSTRAINT "Schedule_testSuiteId_fkey" FOREIGN KEY ("testSuiteId") REFERENCES "TestSuite"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Schedule" ADD CONSTRAINT "Schedule_environmentId_fkey" FOREIGN KEY ("environmentId") REFERENCES "Environment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Schedule" ADD CONSTRAINT "Schedule_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Schedule" ADD CONSTRAINT "Schedule_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditEvent" ADD CONSTRAINT "AuditEvent_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditEvent" ADD CONSTRAINT "AuditEvent_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApiSpec" ADD CONSTRAINT "ApiSpec_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApiSpec" ADD CONSTRAINT "ApiSpec_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApiSpec" ADD CONSTRAINT "ApiSpec_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApiSpec" ADD CONSTRAINT "ApiSpec_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApplicationMap" ADD CONSTRAINT "ApplicationMap_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApplicationMap" ADD CONSTRAINT "ApplicationMap_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApplicationMap" ADD CONSTRAINT "ApplicationMap_environmentId_fkey" FOREIGN KEY ("environmentId") REFERENCES "Environment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApplicationMap" ADD CONSTRAINT "ApplicationMap_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApplicationMap" ADD CONSTRAINT "ApplicationMap_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WebhookEndpoint" ADD CONSTRAINT "WebhookEndpoint_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WebhookEndpoint" ADD CONSTRAINT "WebhookEndpoint_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WebhookEndpoint" ADD CONSTRAINT "WebhookEndpoint_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WebhookEndpoint" ADD CONSTRAINT "WebhookEndpoint_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WebhookDelivery" ADD CONSTRAINT "WebhookDelivery_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WebhookDelivery" ADD CONSTRAINT "WebhookDelivery_webhookEndpointId_fkey" FOREIGN KEY ("webhookEndpointId") REFERENCES "WebhookEndpoint"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QualityGateConfig" ADD CONSTRAINT "QualityGateConfig_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QualityGateConfig" ADD CONSTRAINT "QualityGateConfig_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QualityGateConfig" ADD CONSTRAINT "QualityGateConfig_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QualityGateConfig" ADD CONSTRAINT "QualityGateConfig_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuarantineRecord" ADD CONSTRAINT "QuarantineRecord_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuarantineRecord" ADD CONSTRAINT "QuarantineRecord_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuarantineRecord" ADD CONSTRAINT "QuarantineRecord_testCaseId_fkey" FOREIGN KEY ("testCaseId") REFERENCES "TestCase"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuarantineRecord" ADD CONSTRAINT "QuarantineRecord_quarantinedById_fkey" FOREIGN KEY ("quarantinedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuarantineRecord" ADD CONSTRAINT "QuarantineRecord_releasedById_fkey" FOREIGN KEY ("releasedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
