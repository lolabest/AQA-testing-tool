import { describe, expect, it } from "vitest";
import { generateTestPlan } from "../operations/generate-test-plan.js";
import { MockAiProvider } from "../providers/mock.js";

describe("MockAiProvider", () => {
  it("returns deterministic demo-shop test plans without credentials", async () => {
    const provider = new MockAiProvider();
    const input = {
      requirements: "Test login, product checkout, and required-field validation.",
    };

    const first = await generateTestPlan(input, { provider });
    const second = await generateTestPlan(input, { provider });

    expect(second).toEqual(first);
    expect(first.testCases.map((testCase) => testCase.title)).toEqual(
      expect.arrayContaining([
        "Login with a registered customer",
        "Complete product checkout",
        "Reject missing checkout information",
      ]),
    );
  });

  it("supports cancellation through AbortSignal", async () => {
    const provider = new MockAiProvider({ latencyMs: 50 });
    const controller = new AbortController();
    const operation = generateTestPlan(
      { requirements: "Test the shop." },
      { provider, signal: controller.signal, retries: 0 },
    );
    controller.abort();

    await expect(operation).rejects.toMatchObject({ code: "ABORTED" });
  });
});
