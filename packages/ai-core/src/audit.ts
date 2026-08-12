import type { EstimatedCost, TokenUsage } from "./types.js";

export interface AiInvocationRecord {
  readonly provider: string;
  readonly model: string;
  readonly promptVersion: string;
  readonly latencyMs: number;
  readonly tokenUsage: TokenUsage;
  readonly estimatedCost: EstimatedCost;
  readonly validationOk: boolean;
  readonly correlationId: string;
  readonly redacted: boolean;
}
