import { randomUUID } from "node:crypto";
import { z } from "zod";
import type { AiInvocationRecord } from "../audit.js";
import {
  assertRequestWithinBudget,
  assertUsageWithinBudget,
} from "../budget.js";
import type { VersionedPrompt } from "../prompts.js";
import {
  AiError,
  mapAiError,
  type AiBudget,
  type AiProvider,
} from "../types.js";

export interface AiOperationOptions {
  readonly provider: AiProvider;
  readonly modelId?: string;
  readonly timeoutMs?: number;
  readonly retries?: number;
  readonly maxTokens?: number;
  readonly temperature?: number;
  readonly budget?: AiBudget;
  readonly signal?: AbortSignal;
  readonly correlationId?: string;
  readonly onAudit?: (record: AiInvocationRecord) => void | Promise<void>;
}

export interface OperationDefaults {
  readonly timeoutMs: number;
  readonly retries: number;
  readonly maxTokens: number;
  readonly budget: AiBudget;
}

const sleep = async (milliseconds: number, signal?: AbortSignal): Promise<void> => {
  if (signal?.aborted === true) {
    throw new AiError("AI operation was aborted", {
      code: "ABORTED",
      retryable: false,
      cause: signal.reason,
    });
  }
  await new Promise<void>((resolve, reject) => {
    const timer = setTimeout(resolve, milliseconds);
    const onAbort = (): void => {
      clearTimeout(timer);
      reject(
        new AiError("AI operation was aborted", {
          code: "ABORTED",
          retryable: false,
          cause: signal?.reason,
        }),
      );
    };
    signal?.addEventListener("abort", onAbort, { once: true });
  });
};

function combinedSignal(
  externalSignal: AbortSignal | undefined,
  timeoutMs: number,
): {
  signal: AbortSignal;
  didTimeout: () => boolean;
  dispose: () => void;
} {
  const controller = new AbortController();
  let timedOut = false;
  const onExternalAbort = (): void => controller.abort(externalSignal?.reason);
  externalSignal?.addEventListener("abort", onExternalAbort, { once: true });
  if (externalSignal?.aborted === true) {
    controller.abort(externalSignal.reason);
  }
  const timer = setTimeout(() => {
    timedOut = true;
    controller.abort(new Error(`AI operation timed out after ${timeoutMs}ms`));
  }, timeoutMs);
  return {
    signal: controller.signal,
    didTimeout: () => timedOut,
    dispose: () => {
      clearTimeout(timer);
      externalSignal?.removeEventListener("abort", onExternalAbort);
    },
  };
}

export async function executeOperation<TInput, TOutput>(
  prompt: VersionedPrompt,
  inputSchema: z.ZodType<TInput>,
  outputSchema: z.ZodType<TOutput>,
  input: TInput,
  options: AiOperationOptions,
  defaults: OperationDefaults,
): Promise<TOutput> {
  const validatedInput = inputSchema.parse(input);
  const user = JSON.stringify(validatedInput);
  const timeoutMs = options.timeoutMs ?? defaults.timeoutMs;
  const retries = options.retries ?? defaults.retries;
  const maxTokens = options.maxTokens ?? defaults.maxTokens;
  const budget = options.budget ?? defaults.budget;
  const correlationId = options.correlationId ?? randomUUID();

  if (timeoutMs <= 0 || retries < 0 || maxTokens <= 0) {
    throw new AiError("Operation timeout, retries, and maxTokens are invalid", {
      code: "CONFIGURATION",
      retryable: false,
    });
  }
  assertRequestWithinBudget(budget, `${prompt.system}\n${user}`, maxTokens);

  let lastError: AiError | undefined;
  for (let attempt = 0; attempt <= retries; attempt += 1) {
    const startedAt = Date.now();
    const abort = combinedSignal(options.signal, timeoutMs);
    try {
      const response = await options.provider.generateStructured({
        system: prompt.system,
        user,
        schema: outputSchema,
        modelId: options.modelId,
        maxTokens,
        temperature: options.temperature ?? 0,
        signal: abort.signal,
        budget,
      });
      const result = outputSchema.safeParse(response.data);
      if (!result.success) {
        throw new AiError(
          `AI response failed schema validation: ${result.error.message}`,
          {
            code: "VALIDATION",
            providerId: options.provider.id,
            retryable: false,
            cause: result.error,
          },
        );
      }
      assertUsageWithinBudget(budget, response.usage, response.estimatedCost);
      await options.onAudit?.({
        provider: response.providerId,
        model: response.modelId,
        promptVersion: prompt.promptVersion,
        latencyMs: Date.now() - startedAt,
        tokenUsage: response.usage,
        estimatedCost: response.estimatedCost,
        validationOk: true,
        correlationId,
        redacted: true,
      });
      return result.data;
    } catch (error) {
      lastError = abort.didTimeout()
        ? new AiError(`AI operation timed out after ${timeoutMs}ms`, {
            code: "TIMEOUT",
            providerId: options.provider.id,
            retryable: true,
            cause: error,
          })
        : mapAiError(error, options.provider.id);
      if (
        attempt >= retries ||
        !lastError.retryable ||
        options.signal?.aborted === true
      ) {
        throw lastError;
      }
    } finally {
      abort.dispose();
    }
    await sleep(100 * 2 ** attempt, options.signal);
  }
  throw lastError ?? new AiError("AI operation failed", {
    code: "PROVIDER",
    providerId: options.provider.id,
    retryable: false,
  });
}
