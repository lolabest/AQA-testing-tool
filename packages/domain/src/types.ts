export type Role = "OWNER" | "ADMIN" | "QA_ENGINEER" | "DEVELOPER" | "VIEWER";

export type TestCaseStatus =
  | "DRAFT"
  | "GENERATED"
  | "VALIDATED"
  | "APPROVED"
  | "ACTIVE"
  | "DISABLED"
  | "ARCHIVED";

export type TestRunStatus =
  | "QUEUED"
  | "PREPARING"
  | "RUNNING"
  | "COLLECTING_ARTIFACTS"
  | "TRIAGING"
  | "COMPLETED"
  | "FAILED"
  | "CANCELLED"
  | "TIMED_OUT";

export type AttemptOutcome =
  | "PASSED"
  | "FAILED"
  | "SKIPPED"
  | "BLOCKED"
  | "TIMED_OUT"
  | "CANCELLED"
  | "FLAKY";

export type FailureClassification =
  | "PRODUCT_DEFECT"
  | "TEST_DEFECT"
  | "ENVIRONMENT_ISSUE"
  | "TEST_DATA_ISSUE"
  | "FLAKY_BEHAVIOR"
  | "UNKNOWN";

export type EnvironmentKind = "LOCAL" | "TEST" | "STAGING" | "PRODUCTION_LIKE";

export type ArtifactKind =
  | "SCREENSHOT"
  | "VIDEO"
  | "TRACE"
  | "LOG"
  | "NETWORK"
  | "REPORT"
  | "DOM_SNAPSHOT"
  | "OTHER";

export type HealingProposalStatus =
  | "PENDING"
  | "APPROVED"
  | "REJECTED"
  | "APPLIED"
  | "EXPIRED";

export type CoverageStatus =
  | "COVERED_PASSING"
  | "COVERED_FAILING"
  | "COVERED_NOT_EXECUTED"
  | "PARTIALLY_COVERED"
  | "NOT_COVERED"
  | "BLOCKED";

export type RiskLevel = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export interface AuditActor {
  userId: string;
  role: Role;
}

export interface SoftDelete {
  deletedAt: Date | null;
}

export interface Concurrency {
  version: number;
}

export interface WorkspaceScoped {
  workspaceId: string;
}

export interface Timestamps {
  createdAt: Date;
  updatedAt: Date;
}

export interface Authorship {
  createdById: string;
  updatedById: string;
}
