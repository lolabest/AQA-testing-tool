import OpenAI from "openai";
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
  stringField,
  type ProviderPricing,
} from "./shared.js";

export interface OpenAiProviderConfig extends ProviderPricing {
  readonly apiKey?: string;
  readonly organization?: string;
  readonly project?: string;
  readonly defaultModelId?: string;
}

type ResponsesCreate = (
  body: Record<string, unknown>,
  options?: { signal?: AbortSignal },
) => Promise<unknown>;

export class OpenAiProvider implements AiProvider {
  readonly id = "openai";
  readonly capabilities: AiCapabilities = {
    structuredOutput: true,
    toolCalling: true,
    streaming: true,
    usage: true,
  };
  private readonly config: OpenAiProviderConfig;

  constructor(config: OpenAiProviderConfig = {}) {
    this.config = config;
  }

  async generateStructured<T>(
    request: AiGenerateStructuredRequest<T>,
  ): Promise<AiStructuredResponse<T>> {
    const apiKey = requireApiKey(
      this.config.apiKey ?? process.env.OPENAI_API_KEY,
      this.id,
      "OPENAI_API_KEY",
    );
    const modelId =
      request.modelId ?? this.config.defaultModelId ?? "gpt-4.1-mini";
    const maxTokens = request.maxTokens ?? 2_000;
    const promptText = `${request.system}\n${request.user}`;
    assertRequestWithinBudget(request.budget, promptText, maxTokens);
    try {
      const client = new OpenAI({
        apiKey,
        organization: this.config.organization,
        project: this.config.project,
      });
      const create = client.responses.create.bind(
        client.responses,
      ) as unknown as ResponsesCreate;
      const raw = await create(
        {
          model: modelId,
          instructions: request.system,
          input: request.user,
          max_output_tokens: maxTokens,
          temperature: request.temperature,
          text: { format: { type: "json_object" } },
        },
        { signal: request.signal },
      );
      const outputText = stringField(raw, "output_text");
      if (outputText === undefined) {
        throw new Error("OpenAI response did not contain output_text");
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
