import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { config as loadDotEnv } from "dotenv";

loadDotEnv({
  path: resolve(fileURLToPath(new URL("../../../.env", import.meta.url))),
});

function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required environment variable ${name}`);
  return value;
}

function booleanValue(name: string, fallback = false): boolean {
  const value = process.env[name];
  if (value === undefined) return fallback;
  return value.toLowerCase() === "true" || value === "1";
}

function integerValue(name: string, fallback: number): number {
  const parsed = Number.parseInt(process.env[name] ?? String(fallback), 10);
  if (!Number.isSafeInteger(parsed) || parsed < 1) {
    throw new Error(`${name} must be a positive integer`);
  }
  return parsed;
}

export interface WorkerConfig {
  redisUrl: string;
  concurrency: number;
  demoSutUrl: string;
  allowPrivateNetworkTargets: boolean;
  allowLocalhost: boolean;
  s3: {
    endpoint?: string;
    region: string;
    accessKeyId: string;
    secretAccessKey: string;
    bucket: string;
    forcePathStyle: boolean;
  };
}

export function workerConfigFromEnv(): WorkerConfig {
  // Prisma reads DATABASE_URL itself. Reading these values here fails early
  // instead of allowing a job to start with incomplete security settings.
  required("DATABASE_URL");
  required("ENCRYPTION_KEY");
  return {
    redisUrl: required("REDIS_URL"),
    concurrency: integerValue("WORKER_CONCURRENCY", 2),
    demoSutUrl: required("DEMO_SUT_URL"),
    allowPrivateNetworkTargets: booleanValue(
      "ALLOW_PRIVATE_NETWORK_TARGETS",
    ),
    allowLocalhost: booleanValue("SSRF_ALLOW_LOCALHOST"),
    s3: {
      endpoint: process.env.S3_ENDPOINT || undefined,
      region: process.env.S3_REGION ?? "us-east-1",
      accessKeyId: required("S3_ACCESS_KEY_ID"),
      secretAccessKey: required("S3_SECRET_ACCESS_KEY"),
      bucket: required("S3_BUCKET"),
      forcePathStyle: booleanValue("S3_FORCE_PATH_STYLE"),
    },
  };
}
