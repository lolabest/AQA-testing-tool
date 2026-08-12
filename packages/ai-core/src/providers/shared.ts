import type { z } from "zod";
import { estimateTokens } from "../budget.js";
import {
  AiError,
  type EstimatedCost,
  type TokenUsage,
} from "../types.js";

export interface ProviderPricing {
  readonly inputUsdPerMillionTokens?: number;
  readonly outputUsdPerMillionTokens?: number;
}

export function requireApiKey(
  apiKey: string | undefined,
  providerId: string,
  environmentVariable: string,
): string {
  if (apiKey === undefined || apiKey.trim() === "") {
    throw new AiError(
      `${providerId} API key is missing; set ${environmentVariable} or pass apiKey`,
      {
        code: "CONFIGURATION",
        providerId,
        retryable: false,
      },
    );
  }
  return apiKey;
}

export function parseStructuredOutput<T>(
  value: unknown,
  schema: z.ZodType<T>,
  providerId: string,
): T {
  try {
    let candidate = value;
    if (typeof value === "string") {
      const trimmed = value
        .trim()
        .replace(/^```(?:json)?\s*/i, "")
        .replace(/\s*```$/, "");
      candidate = JSON.parse(trimmed) as unknown;
    }
    return schema.parse(candidate);
  } catch (error) {
    throw new AiError(`${providerId} returned invalid structured output`, {
      code: "VALIDATION",
      providerId,
      retryable: false,
      cause: error,
    });
  }
}

export function normalizeUsage(
  inputTokens: unknown,
  outputTokens: unknown,
  fallbackInput: string,
  fallbackOutput: string,
): TokenUsage {
  const input =
    typeof inputTokens === "number" ? inputTokens : estimateTokens(fallbackInput);
  const output =
    typeof outputTokens === "number"
      ? outputTokens
      : estimateTokens(fallbackOutput);
  return {
    inputTokens: input,
    outputTokens: output,
    totalTokens: input + output,
  };
}

export function calculateCost(
  usage: TokenUsage,
  pricing: ProviderPricing,
): EstimatedCost {
  const input =
    (usage.inputTokens * (pricing.inputUsdPerMillionTokens ?? 0)) / 1_000_000;
  const output =
    (usage.outputTokens * (pricing.outputUsdPerMillionTokens ?? 0)) / 1_000_000;
  return { currency: "USD", input, output, total: input + output };
}

export function stringField(record: unknown, key: string): string | undefined {
  if (typeof record !== "object" || record === null) {
    return undefined;
  }
  const value = (record as Record<string, unknown>)[key];
  return typeof value === "string" ? value : undefined;
}

export function numberField(record: unknown, key: string): number | undefined {
  if (typeof record !== "object" || record === null) {
    return undefined;
  }
  const value = (record as Record<string, unknown>)[key];
  return typeof value === "number" ? value : undefined;
}

export function objectField(
  record: unknown,
  key: string,
): Record<string, unknown> | undefined {
  if (typeof record !== "object" || record === null) {
    return undefined;
  }
  const value = (record as Record<string, unknown>)[key];
  return typeof value === "object" && value !== null
    ? (value as Record<string, unknown>)
    : undefined;
}
