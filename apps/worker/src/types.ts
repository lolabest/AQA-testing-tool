export const QUEUE_NAME = "testpilot-jobs";

export type TestPilotJobName =
  | "generate-plan"
  | "compile-tests"
  | "execute-run"
  | "triage-failure"
  | "propose-healing"
  | "discovery";

export interface GeneratePlanJob {
  workspaceId: string;
  projectId: string;
  planId?: string;
  requirementIds?: string[];
  includeDiscovery?: boolean;
  correlationId?: string;
  createdById?: string;
}

export interface CompileTestsJob {
  workspaceId: string;
  projectId: string;
  testCaseIds?: string[];
  correlationId?: string;
}

export interface ExecuteRunJob {
  runId: string;
  workspaceId?: string;
  projectId?: string;
  environmentId?: string;
  testCaseIds?: string[];
  correlationId?: string;
}

export interface TriageFailureJob {
  testResultId: string;
  correlationId?: string;
}

export interface ProposeHealingJob {
  failureAnalysisId: string;
  correlationId?: string;
}

export interface DiscoveryJob {
  workspaceId: string;
  projectId: string;
  environmentId: string;
  maxPages?: number;
  correlationId?: string;
  createdById?: string;
}

export type TestPilotJobData =
  | GeneratePlanJob
  | CompileTestsJob
  | ExecuteRunJob
  | TriageFailureJob
  | ProposeHealingJob
  | DiscoveryJob;
