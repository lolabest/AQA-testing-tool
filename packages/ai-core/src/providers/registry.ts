import type { AiProvider } from "../types.js";
import {
  AnthropicProvider,
  type AnthropicProviderConfig,
} from "./anthropic.js";
import { GeminiProvider, type GeminiProviderConfig } from "./gemini.js";
import { MockAiProvider, type MockAiProviderConfig } from "./mock.js";
import {
  OpenAiCompatibleProvider,
  type OpenAiCompatibleProviderConfig,
} from "./openai-compatible.js";
import { OpenAiProvider, type OpenAiProviderConfig } from "./openai.js";

export type ProviderKind =
  | "mock"
  | "openai"
  | "anthropic"
  | "gemini"
  | "openai-compatible";

export interface ProviderConfigMap {
  readonly mock: MockAiProviderConfig;
  readonly openai: OpenAiProviderConfig;
  readonly anthropic: AnthropicProviderConfig;
  readonly gemini: GeminiProviderConfig;
  readonly "openai-compatible": OpenAiCompatibleProviderConfig;
}

export function createProvider<K extends ProviderKind>(
  kind: K,
  config: ProviderConfigMap[K],
): AiProvider {
  switch (kind) {
    case "mock":
      return new MockAiProvider(config as MockAiProviderConfig);
    case "openai":
      return new OpenAiProvider(config as OpenAiProviderConfig);
    case "anthropic":
      return new AnthropicProvider(config as AnthropicProviderConfig);
    case "gemini":
      return new GeminiProvider(config as GeminiProviderConfig);
    case "openai-compatible":
      return new OpenAiCompatibleProvider(
        config as OpenAiCompatibleProviderConfig,
      );
  }
}
