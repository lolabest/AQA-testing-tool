import { describe, expect, it } from "vitest";
import {
  InvalidTestRunTransitionError,
  type TestRunStatus,
} from "@testpilot/domain";
import { assertRunTransition, canFailRun } from "./state.js";

describe("worker test-run state transitions", () => {
  it("supports the successful execution path", () => {
    const path: TestRunStatus[] = [
      "QUEUED",
      "PREPARING",
      "RUNNING",
      "COLLECTING_ARTIFACTS",
      "COMPLETED",
    ];
    for (let index = 1; index < path.length; index += 1) {
      expect(assertRunTransition(path[index - 1]!, path[index]!)).toBe(
        path[index],
      );
    }
  });

  it("supports collection, triage, and failure", () => {
    expect(assertRunTransition("COLLECTING_ARTIFACTS", "TRIAGING")).toBe(
      "TRIAGING",
    );
    expect(assertRunTransition("TRIAGING", "FAILED")).toBe("FAILED");
  });

  it("rejects skipped and terminal transitions", () => {
    expect(() => assertRunTransition("QUEUED", "RUNNING")).toThrow(
      InvalidTestRunTransitionError,
    );
    expect(() => assertRunTransition("COMPLETED", "FAILED")).toThrow(
      InvalidTestRunTransitionError,
    );
  });

  it("only marks non-terminal failure-capable states as fail-able", () => {
    expect(canFailRun("PREPARING")).toBe(true);
    expect(canFailRun("RUNNING")).toBe(true);
    expect(canFailRun("COMPLETED")).toBe(false);
  });
});
