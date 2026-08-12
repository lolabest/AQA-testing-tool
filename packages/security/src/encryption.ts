import { createCipheriv, createDecipheriv, randomBytes, createHash } from "node:crypto";

/**
 * Local authenticated encryption (AES-256-GCM).
 *
 * Production deployments should replace SecretBox with a managed KMS
 * (AWS KMS, GCP Cloud KMS, Azure Key Vault) by implementing the same
 * encrypt/decrypt interface and routing key IDs through envelope encryption.
 */
export interface EncryptedPayload {
  ciphertext: string; // base64
  iv: string; // base64
  tag: string; // base64
  keyId: string;
  alg: "AES-256-GCM";
}

export class SecretBox {
  private readonly key: Buffer;
  readonly keyId: string;

  constructor(hexKey: string, keyId = "local-v1") {
    if (!/^[0-9a-fA-F]{64}$/.test(hexKey)) {
      throw new Error("ENCRYPTION_KEY must be 32 bytes hex (64 chars)");
    }
    this.key = Buffer.from(hexKey, "hex");
    this.keyId = keyId;
  }

  encrypt(plaintext: string): EncryptedPayload {
    const iv = randomBytes(12);
    const cipher = createCipheriv("aes-256-gcm", this.key, iv);
    const encrypted = Buffer.concat([
      cipher.update(plaintext, "utf8"),
      cipher.final(),
    ]);
    const tag = cipher.getAuthTag();
    return {
      ciphertext: encrypted.toString("base64"),
      iv: iv.toString("base64"),
      tag: tag.toString("base64"),
      keyId: this.keyId,
      alg: "AES-256-GCM",
    };
  }

  decrypt(payload: EncryptedPayload): string {
    if (payload.alg !== "AES-256-GCM") {
      throw new Error(`Unsupported algorithm: ${payload.alg}`);
    }
    const decipher = createDecipheriv(
      "aes-256-gcm",
      this.key,
      Buffer.from(payload.iv, "base64"),
    );
    decipher.setAuthTag(Buffer.from(payload.tag, "base64"));
    const decrypted = Buffer.concat([
      decipher.update(Buffer.from(payload.ciphertext, "base64")),
      decipher.final(),
    ]);
    return decrypted.toString("utf8");
  }
}

export function fingerprintSecret(value: string): string {
  return createHash("sha256").update(value).digest("hex").slice(0, 12);
}
