import type { PrismaClient, TestRunStatus } from "@testpilot/database";
import {
  canTransitionTestRun,
  transitionTestRun,
  type TestRunStatus as DomainTestRunStatus,
} from "@testpilot/domain";

export interface ProgressEvent {
  runId: string;
  status: DomainTestRunStatus;
  message: string;
  timestamp: string;
}

export type PublishProgress = (event: ProgressEvent) => Promise<void>;

export function assertRunTransition(
  from: DomainTestRunStatus,
  to: DomainTestRunStatus,
): DomainTestRunStatus {
  return transitionTestRun(from, to);
}

export function canFailRun(status: DomainTestRunStatus): boolean {
  return canTransitionTestRun(status, "FAILED");
}

export async function transitionPersistedRun(
  database: PrismaClient,
  runId: string,
  to: DomainTestRunStatus,
  message: string,
  publish: PublishProgress,
): Promise<void> {
  const run = await database.testRun.findUniqueOrThrow({
    where: { id: runId },
    select: { status: true },
  });
  assertRunTransition(run.status, to);
  const timestamps =
    to === "RUNNING"
      ? { startedAt: new Date() }
      : to === "COMPLETED" || to === "FAILED"
        ? { finishedAt: new Date() }
        : {};
  await database.testRun.update({
    where: { id: runId },
    data: { status: to as TestRunStatus, ...timestamps },
  });
  await publish({
    runId,
    status: to,
    message,
    timestamp: new Date().toISOString(),
  });
}
