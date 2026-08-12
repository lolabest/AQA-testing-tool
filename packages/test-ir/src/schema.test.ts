import { describe, expect, it } from "vitest";
import { validateTestIntent, isSafeTestIntent } from "../schema.js";

const valid = {
  schemaVersion: "1.0.0",
  id: "login-happy",
  title: "User can sign in",
  businessObjective: "Authenticated users reach the dashboard",
  requirementRefs: ["REQ-1"],
  riskLevel: "HIGH",
  tags: ["auth"],
  preconditions: ["User exists"],
  requiredData: { email: "user@example.com", password: "Password1!" },
  environmentAssumptions: ["Demo SUT running"],
  actions: [
    { type: "navigate", url: "/login" },
    {
      type: "fill",
      target: { strategy: "label", value: "Email" },
      value: "{{email}}",
    },
    {
      type: "fill",
      target: { strategy: "label", value: "Password" },
      value: "{{password}}",
    },
    {
      type: "click",
      target: { strategy: "role", value: "button", name: "Sign in" },
    },
  ],
  assertions: [
    {
      type: "assertUrl",
      expected: "**/dashboard",
    },
    {
      type: "assertVisible",
      target: { strategy: "role", value: "heading", name: "Dashboard" },
    },
  ],
  cleanupActions: [],
  destructive: false,
  expectedOutcome: "User lands on dashboard",
  traceability: { source: "requirements" },
};

describe("TestIntent", () => {
  it("accepts valid intents", () => {
    expect(validateTestIntent(valid).id).toBe("login-happy");
    expect(isSafeTestIntent(valid)).toBe(true);
  });

  it("rejects unsafe constructs", () => {
    expect(
      isSafeTestIntent({
        ...valid,
        actions: [{ type: "navigate", url: "javascript:alert(1)" }],
      }),
    ).toBe(false);
  });
});
