import { Queue } from "bullmq";
import { Redis } from "ioredis";

export const JOB_QUEUE_NAME = "testpilot-jobs";
export const JOB_TYPES = [
  "generate-plan",
  "compile-tests",
  "execute-run",
  "triage-failure",
  "propose-healing",
  "discovery",
] as const;

export type JobType = (typeof JOB_TYPES)[number];
export type RunEventListener = (event: string) => void;

export interface JobQueue {
  add(
    type: JobType,
    payload: Record<string, unknown>,
    jobId?: string,
  ): Promise<void>;
  remove(jobId: string): Promise<void>;
  publishRunEvent(
    runId: string,
    payload: Record<string, unknown>,
  ): Promise<void>;
  subscribeToRun(
    runId: string,
    listener: RunEventListener,
  ): Promise<() => Promise<void>>;
  ping(): Promise<void>;
  close(): Promise<void>;
}

function runChannel(runId: string): string {
  return `run:${runId}`;
}

export class RedisJobQueue implements JobQueue {
  private readonly redis: Redis;
  private readonly queue: Queue;
  private readonly subscribers = new Set<Redis>();

  constructor(redisUrl: string) {
    this.redis = new Redis(redisUrl, {
      lazyConnect: true,
      maxRetriesPerRequest: null,
    });
    this.queue = new Queue(JOB_QUEUE_NAME, { connection: this.redis });
  }

  async add(
    type: JobType,
    payload: Record<string, unknown>,
    jobId?: string,
  ): Promise<void> {
    await this.queue.add(type, payload, {
      ...(jobId ? { jobId } : {}),
      attempts: 3,
      backoff: { type: "exponential", delay: 1_000 },
      removeOnComplete: 500,
      removeOnFail: 1_000,
    });
  }

  async remove(jobId: string): Promise<void> {
    const job = await this.queue.getJob(jobId);
    if (job) await job.remove();
  }

  async publishRunEvent(
    runId: string,
    payload: Record<string, unknown>,
  ): Promise<void> {
    await this.redis.publish(runChannel(runId), JSON.stringify(payload));
  }

  async subscribeToRun(
    runId: string,
    listener: RunEventListener,
  ): Promise<() => Promise<void>> {
    const subscriber = this.redis.duplicate();
    const channel = runChannel(runId);
    this.subscribers.add(subscriber);
    subscriber.on("message", (incomingChannel: string, message: string) => {
      if (incomingChannel === channel) listener(message);
    });
    await subscriber.subscribe(channel);
    return async () => {
      this.subscribers.delete(subscriber);
      await subscriber.unsubscribe(channel);
      subscriber.disconnect();
    };
  }

  async ping(): Promise<void> {
    const response = await this.redis.ping();
    if (response !== "PONG") throw new Error("Redis did not return PONG");
  }

  async close(): Promise<void> {
    for (const subscriber of this.subscribers) subscriber.disconnect();
    this.subscribers.clear();
    await this.queue.close();
    this.redis.disconnect();
  }
}

export class InMemoryJobQueue implements JobQueue {
  readonly jobs: Array<{
    type: JobType;
    payload: Record<string, unknown>;
    jobId?: string;
  }> = [];
  private readonly listeners = new Map<string, Set<RunEventListener>>();

  async add(
    type: JobType,
    payload: Record<string, unknown>,
    jobId?: string,
  ): Promise<void> {
    this.jobs.push({ type, payload, ...(jobId ? { jobId } : {}) });
  }

  async remove(jobId: string): Promise<void> {
    const index = this.jobs.findIndex((job) => job.jobId === jobId);
    if (index >= 0) this.jobs.splice(index, 1);
  }

  async publishRunEvent(
    runId: string,
    payload: Record<string, unknown>,
  ): Promise<void> {
    const encoded = JSON.stringify(payload);
    for (const listener of this.listeners.get(runId) ?? []) listener(encoded);
  }

  async subscribeToRun(
    runId: string,
    listener: RunEventListener,
  ): Promise<() => Promise<void>> {
    const listeners = this.listeners.get(runId) ?? new Set();
    listeners.add(listener);
    this.listeners.set(runId, listeners);
    return async () => {
      listeners.delete(listener);
    };
  }

  async ping(): Promise<void> {}
  async close(): Promise<void> {}
}
