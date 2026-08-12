import OpenAI from "openai";
import {
  assertRequestWithinBudget,
  assertUsageWithinBudget,
} from "../budget.js";
import {
  AiError,
  mapAiError,
  type AiCapabilities,
  type AiGenerateStructuredRequest,
  type AiProvider,
  type AiStructuredResponse,
} from "../types.js";
import {
  calculateCost,
  normalizeUsage,
  numberField,
  objectField,
  parseStructuredOutput,
  requireApiKey,
  type ProviderPricing,
} from "./shared.js";

export interface OpenAiCompatibleProviderConfig extends ProviderPricing {
  readonly baseUrl: string;
  readonly apiKey?: string;
  readonly defaultModelId?: string;
  readonly headers?: Record<string, string>;
}

type ChatCreate = (
  body: Record<string, unknown>,
  options?: { signal?: AbortSignal },
) => Promise<unknown>;

function extractContent(completion: unknown): string | undefined {
  if (typeof completion !== "object" || completion === null) {
    return undefined;
  }
  const choices = (completion as Record<string, unknown>).choices;
  if (!Array.isArray(choices) || choices.length === 0) {
    return undefined;
  }
  const message = objectField(choices[0], "message");
  const content = message?.content;
  return typeof content === "string" ? content : undefined;
}

export class OpenAiCompatibleProvider implements AiProvider {
  readonly id = "openai-compatible";
  readonly capabilities: AiCapabilities = {
    structuredOutput: true,
    toolCalling: true,
    streaming: true,
    usage: true,
  };
  private readonly config: OpenAiCompatibleProviderConfig;

  constructor(config: OpenAiCompatibleProviderConfig) {
    this.config = config;
  }

  async generateStructured<T>(
    request: AiGenerateStructuredRequest<T>,
  ): Promise<AiStructuredResponse<T>> {
    if (this.config.baseUrl.trim() === "") {
      throw new AiError("OpenAI-compatible baseUrl is required", {
        code: "CONFIGURATION",
        providerId: this.id,
        retryable: false,
      });
    }
    const apiKey = requireApiKey(
      this.config.apiKey ?? process.env.OPENAI_COMPATIBLE_API_KEY,
      this.id,
      "OPENAI_COMPATIBLE_API_KEY",
    );
    const modelId =
      request.modelId ?? this.config.defaultModelId ?? "default";
    const maxTokens = request.maxTokens ?? 2_000;
    const promptText = `${request.system}\n${request.user}`;
    assertRequestWithinBudget(request.budget, promptText, maxTokens);
    try {
      const client = new OpenAI({
        apiKey,
        baseURL: this.config.baseUrl,
        defaultHeaders: this.config.headers,
      });
      const create = client.chat.completions.create.bind(
        client.chat.completions,
      ) as unknown as ChatCreate;
      const raw = await create(
        {
          model: modelId,
          messages: [
            { role: "system", content: request.system },
            { role: "user", content: request.user },
          ],
          max_tokens: maxTokens,
          temperature: request.temperature,
          response_format: { type: "json_object" },
        },
        { signal: request.signal },
      );
      const outputText = extractContent(raw);
      if (outputText === undefined || outputText === "") {
        throw new Error(
          "OpenAI-compatible response did not contain message content",
        );
      }
      const data = parseStructuredOutput(outputText, request.schema, this.id);
      const usageRecord = objectField(raw, "usage");
      const usage = normalizeUsage(
        numberField(usageRecord, "prompt_tokens"),
        numberField(usageRecord, "completion_tokens"),
        promptText,
        outputText,
      );
      const estimatedCost = calculateCost(usage, this.config);
      assertUsageWithinBudget(request.budget, usage, estimatedCost);
      return {
        data,
        providerId: this.id,
        modelId,
        usage,
        estimatedCost,
        raw,
      };
    } catch (error) {
      throw mapAiError(error, this.id);
    }
  }
}
