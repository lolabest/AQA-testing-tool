import { GoogleGenerativeAI } from "@google/generative-ai";
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

export interface GeminiProviderConfig extends ProviderPricing {
  readonly apiKey?: string;
  readonly defaultModelId?: string;
}

type GenerateContent = (
  request: Record<string, unknown>,
  options?: { signal?: AbortSignal },
) => Promise<unknown>;

function extractResponseText(result: unknown): string | undefined {
  const response = objectField(result, "response");
  const textFunction = response?.text;
  return typeof textFunction === "function"
    ? (textFunction.call(response) as string)
    : undefined;
}

export class GeminiProvider implements AiProvider {
  readonly id = "gemini";
  readonly capabilities: AiCapabilities = {
    structuredOutput: true,
    toolCalling: true,
    streaming: true,
    usage: true,
  };
  private readonly config: GeminiProviderConfig;

  constructor(config: GeminiProviderConfig = {}) {
    this.config = config;
  }

  async generateStructured<T>(
    request: AiGenerateStructuredRequest<T>,
  ): Promise<AiStructuredResponse<T>> {
    const apiKey = requireApiKey(
      this.config.apiKey ?? process.env.GEMINI_API_KEY,
      this.id,
      "GEMINI_API_KEY",
    );
    const modelId =
      request.modelId ?? this.config.defaultModelId ?? "gemini-2.0-flash";
    const maxTokens = request.maxTokens ?? 2_000;
    const promptText = `${request.system}\n${request.user}`;
    assertRequestWithinBudget(request.budget, promptText, maxTokens);
    try {
      const client = new GoogleGenerativeAI(apiKey);
      const model = client.getGenerativeModel({
        model: modelId,
        systemInstruction: request.system,
      });
      const generate = model.generateContent.bind(
        model,
      ) as unknown as GenerateContent;
      const raw = await generate(
        {
          contents: [
            { role: "user", parts: [{ text: request.user }] },
          ],
          generationConfig: {
            maxOutputTokens: maxTokens,
            temperature: request.temperature,
            responseMimeType: "application/json",
          },
        },
        { signal: request.signal },
      );
      const outputText = extractResponseText(raw);
      if (outputText === undefined || outputText === "") {
        throw new Error("Gemini response did not contain text content");
      }
      const response = objectField(raw, "response");
      const usageRecord = objectField(response, "usageMetadata");
      const usage = normalizeUsage(
        numberField(usageRecord, "promptTokenCount"),
        numberField(usageRecord, "candidatesTokenCount"),
        promptText,
        outputText,
      );
      const estimatedCost = calculateCost(usage, this.config);
      assertUsageWithinBudget(request.budget, usage, estimatedCost);
      const data = parseStructuredOutput(outputText, request.schema, this.id);
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
