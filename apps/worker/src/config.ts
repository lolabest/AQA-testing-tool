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
  artifactDirectory: string;
  s3?: {
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
  const accessKeyId = process.env.S3_ACCESS_KEY_ID;
  const secretAccessKey = process.env.S3_SECRET_ACCESS_KEY;
  const bucket = process.env.S3_BUCKET;
  const hasAnyS3Setting = Boolean(
    process.env.S3_ENDPOINT || accessKeyId || secretAccessKey || bucket,
  );
  if (hasAnyS3Setting && !(accessKeyId && secretAccessKey && bucket)) {
    throw new Error(
      "S3_ACCESS_KEY_ID, S3_SECRET_ACCESS_KEY, and S3_BUCKET must be set together",
    );
  }
  const s3 =
    accessKeyId && secretAccessKey && bucket
      ? {
          endpoint: process.env.S3_ENDPOINT || undefined,
          region: process.env.S3_REGION ?? "us-east-1",
          accessKeyId,
          secretAccessKey,
          bucket,
          forcePathStyle: booleanValue("S3_FORCE_PATH_STYLE"),
        }
      : undefined;
  return {
    redisUrl: required("REDIS_URL"),
    concurrency: integerValue("WORKER_CONCURRENCY", 2),
    demoSutUrl: process.env.DEMO_SUT_URL ?? "http://127.0.0.1:3002",
    allowPrivateNetworkTargets: booleanValue(
      "ALLOW_PRIVATE_NETWORK_TARGETS",
    ),
    allowLocalhost: booleanValue("SSRF_ALLOW_LOCALHOST"),
    artifactDirectory:
      process.env.ARTIFACT_FS_DIRECTORY ?? "/tmp/testpilot-artifacts",
    ...(s3 ? { s3 } : {}),
  };
}
