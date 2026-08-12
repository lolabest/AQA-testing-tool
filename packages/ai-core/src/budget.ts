import {
  AiError,
  type AiBudget,
  type EstimatedCost,
  type TokenUsage,
} from "./types.js";

export class BudgetExceededError extends AiError {
  constructor(message: string) {
    super(message, { code: "BUDGET_EXCEEDED", retryable: false });
    this.name = "BudgetExceededError";
  }
}

function assertLimit(
  value: number,
  limit: number | undefined,
  label: string,
): void {
  if (limit !== undefined && value > limit) {
    throw new BudgetExceededError(
      `${label} budget exceeded: ${value} > ${limit}`,
    );
  }
}

export function estimateTokens(text: string): number {
  if (text.length === 0) {
    return 0;
  }
  return Math.ceil(text.length / 4);
}

export function assertRequestWithinBudget(
  budget: AiBudget | undefined,
  inputText: string,
  requestedOutputTokens: number,
): void {
  if (budget === undefined) {
    return;
  }
  const inputTokens = estimateTokens(inputText);
  assertLimit(inputTokens, budget.maxInputTokens, "Input token");
  assertLimit(requestedOutputTokens, budget.maxOutputTokens, "Output token");
  assertLimit(
    inputTokens + requestedOutputTokens,
    budget.maxTotalTokens,
    "Total token",
  );
}

export function assertUsageWithinBudget(
  budget: AiBudget | undefined,
  usage: TokenUsage,
  cost: EstimatedCost,
): void {
  if (budget === undefined) {
    return;
  }
  assertLimit(usage.inputTokens, budget.maxInputTokens, "Input token");
  assertLimit(usage.outputTokens, budget.maxOutputTokens, "Output token");
  assertLimit(usage.totalTokens, budget.maxTotalTokens, "Total token");
  assertLimit(cost.total, budget.maxCostUsd, "Cost (USD)");
}

export class AiBudgetTracker {
  private inputTokens = 0;
  private outputTokens = 0;
  private costUsd = 0;

  constructor(readonly budget: AiBudget) {}

  record(usage: TokenUsage, cost: EstimatedCost): void {
    const nextUsage: TokenUsage = {
      inputTokens: this.inputTokens + usage.inputTokens,
      outputTokens: this.outputTokens + usage.outputTokens,
      totalTokens:
        this.inputTokens +
        this.outputTokens +
        usage.inputTokens +
        usage.outputTokens,
    };
    const nextCost: EstimatedCost = {
      currency: "USD",
      input: 0,
      output: 0,
      total: this.costUsd + cost.total,
    };
    assertUsageWithinBudget(this.budget, nextUsage, nextCost);
    this.inputTokens = nextUsage.inputTokens;
    this.outputTokens = nextUsage.outputTokens;
    this.costUsd = nextCost.total;
  }

  get usage(): TokenUsage {
    return {
      inputTokens: this.inputTokens,
      outputTokens: this.outputTokens,
      totalTokens: this.inputTokens + this.outputTokens,
    };
  }

  get estimatedCostUsd(): number {
    return this.costUsd;
  }
}
