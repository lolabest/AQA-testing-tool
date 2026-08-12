import type { TestRunStatus } from "./types.js";

const TRANSITIONS: Record<TestRunStatus, readonly TestRunStatus[]> = {
  QUEUED: ["PREPARING", "CANCELLED"],
  PREPARING: ["RUNNING", "FAILED", "CANCELLED", "TIMED_OUT"],
  RUNNING: [
    "COLLECTING_ARTIFACTS",
    "FAILED",
    "CANCELLED",
    "TIMED_OUT",
  ],
  COLLECTING_ARTIFACTS: ["TRIAGING", "COMPLETED", "FAILED", "CANCELLED"],
  TRIAGING: ["COMPLETED", "FAILED"],
  COMPLETED: [],
  FAILED: [],
  CANCELLED: [],
  TIMED_OUT: [],
};

const TERMINAL: ReadonlySet<TestRunStatus> = new Set([
  "COMPLETED",
  "FAILED",
  "CANCELLED",
  "TIMED_OUT",
]);

export class InvalidTestRunTransitionError extends Error {
  readonly code = "INVALID_TEST_RUN_TRANSITION";
  constructor(
    readonly from: TestRunStatus,
    readonly to: TestRunStatus,
  ) {
    super(`Cannot transition test run from ${from} to ${to}`);
    this.name = "InvalidTestRunTransitionError";
  }
}

export function isTerminalRunStatus(status: TestRunStatus): boolean {
  return TERMINAL.has(status);
}

export function canTransitionTestRun(
  from: TestRunStatus,
  to: TestRunStatus,
): boolean {
  return TRANSITIONS[from].includes(to);
}

export function transitionTestRun(
  from: TestRunStatus,
  to: TestRunStatus,
): TestRunStatus {
  if (!canTransitionTestRun(from, to)) {
    throw new InvalidTestRunTransitionError(from, to);
  }
  return to;
}
