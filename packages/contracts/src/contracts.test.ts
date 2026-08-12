import { describe, expect, it } from "vitest";
import { CreateProjectSchema, SignInSchema } from "../schemas.js";

describe("contracts", () => {
  it("validates sign-in", () => {
    expect(
      SignInSchema.parse({
        email: "qa@testpilot.local",
        password: "TestPilot1!",
      }).email,
    ).toBe("qa@testpilot.local");
  });

  it("rejects invalid project keys", () => {
    expect(() =>
      CreateProjectSchema.parse({ name: "Demo", key: "bad" }),
    ).toThrow();
  });
});
