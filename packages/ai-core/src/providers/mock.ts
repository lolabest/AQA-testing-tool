import {
  assertRequestWithinBudget,
  assertUsageWithinBudget,
  estimateTokens,
} from "../budget.js";
import type { AiOperationName } from "../prompts.js";
import {
  AiError,
  type AiCapabilities,
  type AiGenerateStructuredRequest,
  type AiProvider,
  type AiStructuredResponse,
  type EstimatedCost,
  type TokenUsage,
} from "../types.js";
import { parseStructuredOutput } from "./shared.js";

export interface MockAiProviderConfig {
  readonly modelId?: string;
  readonly latencyMs?: number;
  readonly responses?: Partial<Record<AiOperationName, unknown>>;
}

const demoResponses: Record<AiOperationName, unknown> = {
  analyzeRequirements: {
    summary:
      "The demo shop requires authenticated shopping, product checkout, and form validation.",
    requirements: [
      {
        id: "REQ-LOGIN",
        title: "Customer login",
        description: "Registered customers can sign in with valid credentials.",
        priority: "critical",
        acceptanceCriteria: [
          "Valid credentials open the product catalog",
          "Invalid credentials show a clear error without signing in",
        ],
        risks: ["Authentication failures block all protected shopping flows"],
      },
      {
        id: "REQ-CHECKOUT",
        title: "Product checkout",
        description: "A signed-in customer can purchase an in-stock product.",
        priority: "critical",
        acceptanceCriteria: [
          "Items can be added to the cart",
          "Valid customer information completes the order",
        ],
        risks: ["Incorrect totals or failed order creation cause revenue loss"],
      },
      {
        id: "REQ-VALIDATION",
        title: "Checkout validation",
        description: "Required checkout fields reject missing or invalid values.",
        priority: "high",
        acceptanceCriteria: ["Validation identifies each invalid required field"],
        risks: ["Bad customer data can make fulfillment impossible"],
      },
    ],
    ambiguities: ["Payment authorization behavior is not specified"],
  },
  generateTestPlan: {
    title: "Demo Shop Critical Journey Plan",
    objective: "Verify login, checkout, and validation behavior end to end.",
    scope: {
      included: ["Login", "Product cart", "Checkout", "Required-field validation"],
      excluded: ["Third-party payment settlement", "Load testing"],
    },
    testCases: [
      {
        id: "SHOP-001",
        title: "Login with a registered customer",
        priority: "critical",
        type: "functional",
        preconditions: ["A registered demo customer exists"],
        steps: [
          "Open the login page",
          "Enter valid credentials",
          "Submit the login form",
        ],
        expectedResult: "The product catalog is displayed for the customer.",
      },
      {
        id: "SHOP-002",
        title: "Complete product checkout",
        priority: "critical",
        type: "functional",
        preconditions: ["The customer is signed in", "A product is in stock"],
        steps: [
          "Add the product to the cart",
          "Open checkout",
          "Enter valid customer information",
          "Submit the order",
        ],
        expectedResult: "An order confirmation is shown with the correct product.",
      },
      {
        id: "SHOP-003",
        title: "Reject missing checkout information",
        priority: "high",
        type: "negative",
        preconditions: ["The customer has an item in the cart"],
        steps: ["Open checkout", "Leave required fields empty", "Submit the order"],
        expectedResult: "Required fields show validation errors and no order is placed.",
      },
    ],
  },
  generateTestIntents: {
    intents: [
      {
        id: "INTENT-LOGIN",
        name: "Customer logs in",
        goal: "Authenticate a registered demo-shop customer.",
        preconditions: ["The customer account is active"],
        actions: [
          { action: "navigate", target: "login page" },
          { action: "fill", target: "username", value: "standard_user" },
          { action: "fill", target: "password", value: "secret_sauce" },
          { action: "click", target: "login submit" },
        ],
        assertions: ["The product catalog is visible"],
        tags: ["smoke", "login"],
      },
      {
        id: "INTENT-CHECKOUT",
        name: "Customer checks out a product",
        goal: "Complete an order for an in-stock item.",
        preconditions: ["The customer is authenticated"],
        actions: [
          { action: "click", target: "add product to cart" },
          { action: "click", target: "cart" },
          { action: "click", target: "checkout" },
          { action: "fill", target: "customer details", value: "valid demo data" },
          { action: "click", target: "finish order" },
        ],
        assertions: ["The order confirmation is visible"],
        tags: ["smoke", "checkout"],
      },
    ],
  },
  discoverCoverageGaps: {
    coverageScore: 75,
    gaps: [
      {
        requirementId: "REQ-VALIDATION",
        description: "Boundary values for postal-code validation are not covered.",
        severity: "medium",
        suggestedTest: "Verify empty, malformed, minimum, and maximum postal codes.",
      },
    ],
    coveredRequirementIds: ["REQ-LOGIN", "REQ-CHECKOUT"],
  },
  classifyFailure: {
    category: "test_defect",
    confidence: 0.88,
    rationale:
      "The checkout control appears to have changed while the user journey remains available.",
    evidence: ["The selector was not found", "The page loaded without server errors"],
    recommendedActions: [
      "Inspect the checkout control's accessible role and label",
      "Update the locator only after confirming behavior is unchanged",
    ],
  },
  proposeHealing: {
    shouldHeal: true,
    confidence: 0.91,
    diagnosis: "The checkout button locator changed but its accessible name is stable.",
    changes: [
      {
        kind: "selector",
        before: "[data-test=checkout]",
        after: "role=button[name='Checkout']",
        reason: "Use the stable user-visible role and accessible name.",
      },
    ],
    risks: ["A similarly named button could make the locator ambiguous"],
    requiresReview: true,
  },
  summarizeRun: {
    headline: "Demo shop critical journeys passed with one validation risk.",
    status: "passed_with_risk",
    totals: { passed: 8, failed: 0, skipped: 1 },
    highlights: ["Login and product checkout passed", "No product defects detected"],
    risks: ["Postal-code boundary validation remains untested"],
    nextActions: ["Add postal-code boundary tests", "Run the skipped payment test"],
  },
};

function operationFromSystem(system: string): AiOperationName | undefined {
  return (Object.keys(demoResponses) as AiOperationName[]).find((operation) =>
    system.includes(`Operation: ${operation}`),
  );
}

async function waitForLatency(
  latencyMs: number,
  signal: AbortSignal | undefined,
): Promise<void> {
  if (signal?.aborted === true) {
    throw new AiError("Mock AI request was aborted", {
      code: "ABORTED",
      providerId: "mock",
      retryable: false,
      cause: signal.reason,
    });
  }
  if (latencyMs <= 0) {
    return;
  }
  await new Promise<void>((resolve, reject) => {
    const timer = setTimeout(resolve, latencyMs);
    signal?.addEventListener(
      "abort",
      () => {
        clearTimeout(timer);
        reject(
          new AiError("Mock AI request was aborted", {
            code: "ABORTED",
            providerId: "mock",
            retryable: false,
            cause: signal.reason,
          }),
        );
      },
      { once: true },
    );
  });
}

export class MockAiProvider implements AiProvider {
  readonly id = "mock";
  readonly capabilities: AiCapabilities = {
    structuredOutput: true,
    toolCalling: true,
    streaming: false,
    usage: true,
  };
  private readonly modelId: string;
  private readonly latencyMs: number;
  private readonly responses: Partial<Record<AiOperationName, unknown>>;

  constructor(config: MockAiProviderConfig = {}) {
    this.modelId = config.modelId ?? "testpilot-demo-shop-v1";
    this.latencyMs = config.latencyMs ?? 0;
    this.responses = config.responses ?? {};
  }

  async generateStructured<T>(
    request: AiGenerateStructuredRequest<T>,
  ): Promise<AiStructuredResponse<T>> {
    const maxTokens = request.maxTokens ?? 2_000;
    assertRequestWithinBudget(
      request.budget,
      `${request.system}\n${request.user}`,
      maxTokens,
    );
    await waitForLatency(this.latencyMs, request.signal);
    const operation = operationFromSystem(request.system);
    if (operation === undefined) {
      throw new AiError("Mock provider could not identify the requested operation", {
        code: "CONFIGURATION",
        providerId: this.id,
        retryable: false,
      });
    }
    const raw = this.responses[operation] ?? demoResponses[operation];
    const data = parseStructuredOutput(raw, request.schema, this.id);
    const output = JSON.stringify(data);
    const usage: TokenUsage = {
      inputTokens: estimateTokens(`${request.system}\n${request.user}`),
      outputTokens: estimateTokens(output),
      totalTokens:
        estimateTokens(`${request.system}\n${request.user}`) +
        estimateTokens(output),
    };
    const estimatedCost: EstimatedCost = {
      currency: "USD",
      input: 0,
      output: 0,
      total: 0,
    };
    assertUsageWithinBudget(request.budget, usage, estimatedCost);
    return {
      data,
      providerId: this.id,
      modelId: request.modelId ?? this.modelId,
      usage,
      estimatedCost,
      raw,
    };
  }
}
