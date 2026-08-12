import type { z } from "zod";

export interface AiCapabilities {
  readonly structuredOutput: boolean;
  readonly toolCalling: boolean;
  readonly streaming: boolean;
  readonly usage: boolean;
}

export interface TokenUsage {
  readonly inputTokens: number;
  readonly outputTokens: number;
  readonly totalTokens: number;
}

export interface EstimatedCost {
  readonly currency: "USD";
  readonly input: number;
  readonly output: number;
  readonly total: number;
}

export interface AiBudget {
  readonly maxInputTokens?: number;
  readonly maxOutputTokens?: number;
  readonly maxTotalTokens?: number;
  readonly maxCostUsd?: number;
}

export interface AiGenerateStructuredRequest<T> {
  readonly system: string;
  readonly user: string;
  readonly schema: z.ZodType<T>;
  readonly modelId?: string;
  readonly maxTokens?: number;
  readonly temperature?: number;
  readonly signal?: AbortSignal;
  readonly budget?: AiBudget;
}

export interface AiStructuredResponse<T> {
  readonly data: T;
  readonly providerId: string;
  readonly modelId: string;
  readonly usage: TokenUsage;
  readonly estimatedCost: EstimatedCost;
  readonly raw?: unknown;
}

export interface AiProvider {
  readonly id: string;
  readonly capabilities: AiCapabilities;
  generateStructured<T>(
    request: AiGenerateStructuredRequest<T>,
  ): Promise<AiStructuredResponse<T>>;
}

export type AiErrorCode =
  | "AUTHENTICATION"
  | "RATE_LIMIT"
  | "TIMEOUT"
  | "ABORTED"
  | "BUDGET_EXCEEDED"
  | "VALIDATION"
  | "PROVIDER"
  | "CONFIGURATION";

export interface AiErrorDetails {
  readonly code: AiErrorCode;
  readonly providerId?: string;
  readonly statusCode?: number;
  readonly retryable: boolean;
  readonly cause?: unknown;
}

export class AiError extends Error implements AiErrorDetails {
  readonly code: AiErrorCode;
  readonly providerId?: string;
  readonly statusCode?: number;
  readonly retryable: boolean;
  override readonly cause?: unknown;

  constructor(message: string, details: AiErrorDetails) {
    super(message, { cause: details.cause });
    this.name = "AiError";
    this.code = details.code;
    this.providerId = details.providerId;
    this.statusCode = details.statusCode;
    this.retryable = details.retryable;
    this.cause = details.cause;
  }
}

interface ErrorLike {
  readonly message?: unknown;
  readonly name?: unknown;
  readonly status?: unknown;
  readonly statusCode?: unknown;
  readonly code?: unknown;
}

export function mapAiError(error: unknown, providerId?: string): AiError {
  if (error instanceof AiError) {
    return error;
  }

  const candidate =
    typeof error === "object" && error !== null ? (error as ErrorLike) : undefined;
  const statusValue = candidate?.status ?? candidate?.statusCode;
  const statusCode = typeof statusValue === "number" ? statusValue : undefined;
  const message =
    typeof candidate?.message === "string"
      ? candidate.message
      : typeof error === "string"
        ? error
        : "AI provider request failed";

  if (
    candidate?.name === "AbortError" ||
    candidate?.code === "ABORT_ERR" ||
    candidate?.code === "ERR_CANCELED"
  ) {
    return new AiError(message, {
      code: "ABORTED",
      providerId,
      retryable: false,
      cause: error,
    });
  }

  if (statusCode === 401 || statusCode === 403) {
    return new AiError(message, {
      code: "AUTHENTICATION",
      providerId,
      statusCode,
      retryable: false,
      cause: error,
    });
  }

  if (statusCode === 429) {
    return new AiError(message, {
      code: "RATE_LIMIT",
      providerId,
      statusCode,
      retryable: true,
      cause: error,
    });
  }

  const retryable =
    statusCode === undefined || statusCode === 408 || statusCode >= 500;
  return new AiError(message, {
    code: statusCode === 408 ? "TIMEOUT" : "PROVIDER",
    providerId,
    statusCode,
    retryable,
    cause: error,
  });
}
