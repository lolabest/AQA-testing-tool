import { fileURLToPath } from "node:url";
import { config as loadDotEnv } from "dotenv";
import { z } from "zod";

loadDotEnv({ path: fileURLToPath(new URL("../../../.env", import.meta.url)) });

const booleanFromString = z
  .enum(["true", "false"])
  .transform((value) => value === "true");

const EnvSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  LOG_LEVEL: z
    .enum(["fatal", "error", "warn", "info", "debug", "trace", "silent"])
    .default("info"),
  API_HOST: z.string().default("0.0.0.0"),
  API_PORT: z.coerce.number().int().min(1).max(65535).default(3001),
  API_PUBLIC_URL: z.string().url().default("http://localhost:3001"),
  CORS_ORIGIN: z.string().default("http://localhost:3000"),
  JWT_SECRET: z.string().min(32),
  SESSION_TTL_SECONDS: z.coerce.number().int().positive().default(86_400),
  DATABASE_URL: z.string().min(1),
  REDIS_URL: z.string().url().default("redis://localhost:6379"),
  AI_DEFAULT_PROVIDER: z.string().default("mock"),
  AI_DEFAULT_MODEL: z.string().default("mock-v1"),
  ENCRYPTION_KEY: z.string().regex(/^[\da-fA-F]{64}$/).optional(),
  S3_ENDPOINT: z.string().url().optional(),
  S3_REGION: z.string().default("us-east-1"),
  S3_ACCESS_KEY_ID: z.string().optional(),
  S3_SECRET_ACCESS_KEY: z.string().optional(),
  S3_BUCKET: z.string().default("testpilot-artifacts"),
  S3_FORCE_PATH_STYLE: booleanFromString.default("false"),
});

export type ApiConfig = z.infer<typeof EnvSchema>;

export function readConfig(
  overrides: Partial<Record<keyof ApiConfig, unknown>> = {},
): ApiConfig {
  return EnvSchema.parse({ ...process.env, ...overrides });
}
