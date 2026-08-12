import { describe, expect, it, vi } from "vitest";
import { analyzeRequirements } from "../operations/analyze-requirements.js";
import type {
  AiCapabilities,
  AiProvider,
  AiStructuredResponse,
} from "../types.js";

class InvalidProvider implements AiProvider {
  readonly id = "invalid";
  readonly capabilities: AiCapabilities = {
    structuredOutput: true,
    toolCalling: false,
    streaming: false,
    usage: true,
  };

  async generateStructured<T>(): Promise<AiStructuredResponse<T>> {
    return {
      data: { unexpected: true } as T,
      providerId: this.id,
      modelId: "invalid-model",
      usage: { inputTokens: 1, outputTokens: 1, totalTokens: 2 },
      estimatedCost: { currency: "USD", input: 0, output: 0, total: 0 },
    };
  }
}

describe("AI operations", () => {
  it("rejects provider data that does not match the operation schema", async () => {
    await expect(
      analyzeRequirements(
        { requirements: "Customers can sign in." },
        { provider: new InvalidProvider(), retries: 0 },
      ),
    ).rejects.toMatchObject({
      code: "VALIDATION",
      retryable: false,
    });
  });

  it("emits a redacted audit record after successful validation", async () => {
    const onAudit = vi.fn();
    const { MockAiProvider } = await import("../providers/mock.js");
    await analyzeRequirements(
      { requirements: "Customers can sign in and check out." },
      {
        provider: new MockAiProvider(),
        correlationId: "correlation-123",
        onAudit,
      },
    );

    expect(onAudit).toHaveBeenCalledWith(
      expect.objectContaining({
        provider: "mock",
        promptVersion: "analyze-requirements.v1",
        validationOk: true,
        correlationId: "correlation-123",
        redacted: true,
      }),
    );
  });
});
