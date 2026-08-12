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
  requirementIds?: string[];
  createdById?: string;
}

export interface CompileTestsJob {
  workspaceId: string;
  projectId: string;
  testCaseIds?: string[];
}

export interface ExecuteRunJob {
  runId: string;
}

export interface TriageFailureJob {
  testResultId: string;
}

export interface ProposeHealingJob {
  failureAnalysisId: string;
}

export interface DiscoveryJob {
  workspaceId: string;
  projectId: string;
  environmentId: string;
  maxPages?: number;
  createdById?: string;
}

export type TestPilotJobData =
  | GeneratePlanJob
  | CompileTestsJob
  | ExecuteRunJob
  | TriageFailureJob
  | ProposeHealingJob
  | DiscoveryJob;
