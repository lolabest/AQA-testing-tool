import type { TestCaseStatus } from "./types.js";

const TRANSITIONS: Record<TestCaseStatus, readonly TestCaseStatus[]> = {
  DRAFT: ["GENERATED", "VALIDATED", "ARCHIVED"],
  GENERATED: ["VALIDATED", "DRAFT", "ARCHIVED"],
  VALIDATED: ["APPROVED", "DRAFT", "ARCHIVED"],
  APPROVED: ["ACTIVE", "DISABLED", "ARCHIVED", "VALIDATED"],
  ACTIVE: ["DISABLED", "ARCHIVED", "VALIDATED"],
  DISABLED: ["ACTIVE", "ARCHIVED"],
  ARCHIVED: [],
};

export class InvalidTestCaseTransitionError extends Error {
  readonly code = "INVALID_TEST_CASE_TRANSITION";
  constructor(
    readonly from: TestCaseStatus,
    readonly to: TestCaseStatus,
  ) {
    super(`Cannot transition test case from ${from} to ${to}`);
    this.name = "InvalidTestCaseTransitionError";
  }
}

export function canTransitionTestCase(
  from: TestCaseStatus,
  to: TestCaseStatus,
): boolean {
  return TRANSITIONS[from].includes(to);
}

export function transitionTestCase(
  from: TestCaseStatus,
  to: TestCaseStatus,
): TestCaseStatus {
  if (!canTransitionTestCase(from, to)) {
    throw new InvalidTestCaseTransitionError(from, to);
  }
  return to;
}

/** Material edits invalidate approval and return to VALIDATED or DRAFT. */
export function statusAfterMaterialChange(
  current: TestCaseStatus,
): TestCaseStatus {
  if (current === "ARCHIVED" || current === "DISABLED") {
    return current;
  }
  if (
    current === "APPROVED" ||
    current === "ACTIVE" ||
    current === "VALIDATED" ||
    current === "GENERATED"
  ) {
    return "VALIDATED";
  }
  return "DRAFT";
}

export function isExecutableInProtectedEnvironment(
  status: TestCaseStatus,
): boolean {
  return status === "APPROVED" || status === "ACTIVE";
}
