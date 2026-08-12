import { describe, expect, it } from "vitest";

import { sanitizeNextPath } from "./session-cookie";

describe("sanitizeNextPath", () => {
  it("defaults to home", () => {
    expect(sanitizeNextPath(null)).toBe("/");
    expect(sanitizeNextPath("https://evil.example")).toBe("/");
  });

  it("rejects sign-in loops and corrupted paths", () => {
    expect(sanitizeNextPath("/sign-in:?_ingress_token=abc", "abc")).toBe(
      "/?_ingress_token=abc",
    );
    expect(sanitizeNextPath("/sign-in", "tok")).toBe("/?_ingress_token=tok");
  });

  it("preserves safe destinations and ingress tokens", () => {
    expect(sanitizeNextPath("/projects/123", "tok")).toBe(
      "/projects/123?_ingress_token=tok",
    );
    expect(sanitizeNextPath("/?_ingress_token=tok")).toBe("/?_ingress_token=tok");
  });
});
