import { Queue } from "bullmq";
import { Redis } from "ioredis";
import type { ApiConfig } from "../config.js";

export const QUEUE_NAME = "testpilot-jobs";

export type JobName =
  | "generate-plan"
  | "compile-tests"
  | "execute-run"
  | "triage-failure"
  | "propose-healing"
  | "discovery";

let connection: Redis | null = null;
let queue: Queue | null = null;

export function getRedis(config: ApiConfig): Redis {
  if (!connection) {
    connection = new Redis(config.REDIS_URL, {
      maxRetriesPerRequest: null,
    });
  }
  return connection;
}

export function getQueue(config: ApiConfig): Queue {
  if (!queue) {
    queue = new Queue(QUEUE_NAME, { connection: getRedis(config) });
  }
  return queue;
}

export async function enqueueJob(
  config: ApiConfig,
  name: JobName,
  data: Record<string, unknown>,
  opts?: { jobId?: string },
) {
  return getQueue(config).add(name, data, {
    jobId: opts?.jobId,
    removeOnComplete: 100,
    removeOnFail: 200,
    attempts: 3,
    backoff: { type: "exponential", delay: 2000 },
  });
}

export async function publishRunEvent(
  config: ApiConfig,
  runId: string,
  event: Record<string, unknown>,
) {
  const redis = getRedis(config);
  await redis.publish(
    `run:${runId}`,
    JSON.stringify({ ...event, at: new Date().toISOString() }),
  );
}
