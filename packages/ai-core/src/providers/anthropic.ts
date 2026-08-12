import Anthropic from "@anthropic-ai/sdk";
import {
  assertRequestWithinBudget,
  assertUsageWithinBudget,
} from "../budget.js";
import {
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

export interface AnthropicProviderConfig extends ProviderPricing {
  readonly apiKey?: string;
  readonly defaultModelId?: string;
}

type MessagesCreate = (
  body: Record<string, unknown>,
  options?: { signal?: AbortSignal },
) => Promise<unknown>;

function extractText(message: unknown): string | undefined {
  if (typeof message !== "object" || message === null) {
    return undefined;
  }
  const content = (message as Record<string, unknown>).content;
  if (!Array.isArray(content)) {
    return undefined;
  }
  return content
    .map((block) => {
      if (typeof block !== "object" || block === null) {
        return "";
      }
      const text = (block as Record<string, unknown>).text;
      return typeof text === "string" ? text : "";
    })
    .join("");
}

export class AnthropicProvider implements AiProvider {
  readonly id = "anthropic";
  readonly capabilities: AiCapabilities = {
    structuredOutput: true,
    toolCalling: true,
    streaming: true,
    usage: true,
  };
  private readonly config: AnthropicProviderConfig;

  constructor(config: AnthropicProviderConfig = {}) {
    this.config = config;
  }

  async generateStructured<T>(
    request: AiGenerateStructuredRequest<T>,
  ): Promise<AiStructuredResponse<T>> {
    const apiKey = requireApiKey(
      this.config.apiKey ?? process.env.ANTHROPIC_API_KEY,
      this.id,
      "ANTHROPIC_API_KEY",
    );
    const modelId =
      request.modelId ??
      this.config.defaultModelId ??
      "claude-3-5-haiku-latest";
    const maxTokens = request.maxTokens ?? 2_000;
    const promptText = `${request.system}\n${request.user}`;
    assertRequestWithinBudget(request.budget, promptText, maxTokens);
    try {
      const client = new Anthropic({ apiKey });
      const create = client.messages.create.bind(
        client.messages,
      ) as unknown as MessagesCreate;
      const raw = await create(
        {
          model: modelId,
          system: request.system,
          messages: [{ role: "user", content: request.user }],
          max_tokens: maxTokens,
          temperature: request.temperature,
        },
        { signal: request.signal },
      );
      const outputText = extractText(raw);
      if (outputText === undefined || outputText === "") {
        throw new Error("Anthropic response did not contain text content");
      }
      const data = parseStructuredOutput(outputText, request.schema, this.id);
      const usageRecord = objectField(raw, "usage");
      const usage = normalizeUsage(
        numberField(usageRecord, "input_tokens"),
        numberField(usageRecord, "output_tokens"),
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
