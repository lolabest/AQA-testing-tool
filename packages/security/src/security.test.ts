import { describe, expect, it } from "vitest";
import { SecretBox, fingerprintSecret } from "./encryption.js";
import { redactHeaders, redactText, redactObject } from "./redaction.js";
import { assertSafeUrl, isPrivateIp, SsrfError } from "./ssrf.js";
import { signWebhookPayload, verifyWebhookSignature } from "./webhooks.js";

const KEY = "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";

describe("encryption", () => {
  it("round-trips secrets", () => {
    const box = new SecretBox(KEY);
    const payload = box.encrypt("super-secret");
    expect(box.decrypt(payload)).toBe("super-secret");
    expect(fingerprintSecret("super-secret")).toHaveLength(12);
  });
});

describe("redaction", () => {
  it("redacts auth headers and tokens", () => {
    expect(redactHeaders({ Authorization: "Bearer abc.def.ghi" }).Authorization).toBe(
      "[REDACTED]",
    );
    expect(redactText("token Bearer abcdef123456")).toContain("[REDACTED]");
    expect(redactObject({ password: "x", ok: "y" })).toEqual({
      password: "[REDACTED]",
      ok: "y",
    });
  });
});

describe("ssrf", () => {
  it("detects private IPs", () => {
    expect(isPrivateIp("127.0.0.1")).toBe(true);
    expect(isPrivateIp("8.8.8.8")).toBe(false);
  });

  it("blocks non-http schemes", async () => {
    await expect(
      assertSafeUrl("file:///etc/passwd", {
        allowLocalhost: false,
        allowPrivateNetwork: false,
      }),
    ).rejects.toBeInstanceOf(SsrfError);
  });

  it("allows localhost when configured", async () => {
    const url = await assertSafeUrl("http://127.0.0.1:3002/health", {
      allowLocalhost: true,
      allowPrivateNetwork: true,
    });
    expect(url.hostname).toBe("127.0.0.1");
  });
});

describe("webhooks", () => {
  it("signs and verifies payloads", () => {
    const header = signWebhookPayload('{"a":1}', "secret", 1_700_000_000_000);
    // tolerance may fail if clock skew - use current timestamp
    const now = Date.now();
    const h = signWebhookPayload('{"a":1}', "secret", now);
    expect(verifyWebhookSignature('{"a":1}', h, "secret")).toBe(true);
    expect(verifyWebhookSignature('{"a":2}', h, "secret")).toBe(false);
    expect(header).toContain("v1=");
  });
});
