import { describe, expect, it } from "vitest";
import {
  AiBudgetTracker,
  assertRequestWithinBudget,
  assertUsageWithinBudget,
  estimateTokens,
} from "../budget.js";

describe("AI budgets", () => {
  it("estimates prompt tokens conservatively", () => {
    expect(estimateTokens("12345")).toBe(2);
    expect(estimateTokens("")).toBe(0);
  });

  it("rejects requests that cannot fit the token budget", () => {
    expect(() =>
      assertRequestWithinBudget(
        { maxTotalTokens: 10 },
        "A".repeat(20),
        6,
      ),
    ).toThrow(/Total token budget exceeded/);
  });

  it("enforces actual cost and cumulative usage", () => {
    expect(() =>
      assertUsageWithinBudget(
        { maxCostUsd: 0.01 },
        { inputTokens: 5, outputTokens: 5, totalTokens: 10 },
        { currency: "USD", input: 0.006, output: 0.006, total: 0.012 },
      ),
    ).toThrow(/Cost \(USD\) budget exceeded/);

    const tracker = new AiBudgetTracker({ maxTotalTokens: 10 });
    tracker.record(
      { inputTokens: 2, outputTokens: 3, totalTokens: 5 },
      { currency: "USD", input: 0, output: 0, total: 0 },
    );
    expect(() =>
      tracker.record(
        { inputTokens: 3, outputTokens: 3, totalTokens: 6 },
        { currency: "USD", input: 0, output: 0, total: 0 },
      ),
    ).toThrow(/Total token budget exceeded/);
    expect(tracker.usage.totalTokens).toBe(5);
  });
});
