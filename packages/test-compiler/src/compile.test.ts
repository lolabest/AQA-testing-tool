import { describe, expect, it } from "vitest";
import { compileTestIntent, COMPILER_VERSION } from "../compile.js";

const intent = {
  schemaVersion: "1.0.0",
  id: "login-happy",
  title: "User can sign in",
  businessObjective: "Authenticated users reach the dashboard",
  requirementRefs: ["REQ-1"],
  riskLevel: "HIGH",
  tags: ["auth"],
  preconditions: [],
  requiredData: { email: "user@example.com", password: "Password1!" },
  environmentAssumptions: [],
  actions: [
    { type: "navigate", url: "/login" },
    {
      type: "fill",
      target: { strategy: "label", value: "Email" },
      value: "{{email}}",
    },
    {
      type: "click",
      target: { strategy: "role", value: "button", name: "Sign in" },
    },
  ],
  assertions: [
    { type: "assertUrl", expected: "**/dashboard" },
    {
      type: "assertVisible",
      target: { strategy: "role", value: "heading", name: "Dashboard" },
    },
  ],
  cleanupActions: [],
  destructive: false,
  expectedOutcome: "User lands on dashboard",
  traceability: {},
};

describe("compiler", () => {
  it("is deterministic", () => {
    const a = compileTestIntent(intent);
    const b = compileTestIntent(intent);
    expect(a.code).toBe(b.code);
    expect(a.checksum).toBe(b.checksum);
    expect(a.compilerVersion).toBe(COMPILER_VERSION);
    expect(a.code).toContain("getByLabel");
    expect(a.code).toContain("getByRole");
    expect(a.code).not.toContain("waitForTimeout");
  });
});
