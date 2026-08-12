import { Queue, Worker, type Job } from "bullmq";
import { Redis } from "ioredis";
import { prisma } from "@testpilot/database";
import { workerConfigFromEnv } from "./config.js";
import { processCompileTests } from "./jobs/compile-tests.js";
import { processDiscovery } from "./jobs/discovery.js";
import { processExecuteRun } from "./jobs/execute-run.js";
import { processGeneratePlan } from "./jobs/generate-plan.js";
import { processProposeHealing } from "./jobs/propose-healing.js";
import { processTriageFailure } from "./jobs/triage-failure.js";
import { ArtifactStorage } from "./storage.js";
import {
  QUEUE_NAME,
  type CompileTestsJob,
  type DiscoveryJob,
  type ExecuteRunJob,
  type GeneratePlanJob,
  type ProposeHealingJob,
  type TestPilotJobData,
  type TriageFailureJob,
} from "./types.js";

const config = workerConfigFromEnv();
const redis = new Redis(config.redisUrl, {
  maxRetriesPerRequest: null,
  enableReadyCheck: true,
});
const queueConnection = redis.duplicate();
const workerConnection = redis.duplicate();
const queue = new Queue<TestPilotJobData>(QUEUE_NAME, {
  connection: queueConnection,
  defaultJobOptions: {
    removeOnComplete: 500,
    removeOnFail: 1_000,
    attempts: 1,
    backoff: { type: "exponential", delay: 1_000 },
  },
});
const storage = new ArtifactStorage(config.s3);

async function processJob(job: Job<TestPilotJobData>): Promise<unknown> {
  switch (job.name) {
    case "generate-plan": {
      const data = job.data as GeneratePlanJob;
      const generated = await processGeneratePlan(prisma, data);
      await queue.add(
        "compile-tests",
        {
          workspaceId: data.workspaceId,
          projectId: data.projectId,
          testCaseIds: generated.testCaseIds,
        },
        { jobId: `compile-plan-${generated.testPlanId}` },
      );
      return generated;
    }
    case "compile-tests":
      return processCompileTests(prisma, job.data as CompileTestsJob);
    case "execute-run":
      return processExecuteRun(
        prisma,
        queue,
        storage,
        config,
        async (event) => {
          await Promise.all([
            redis.publish(`run:${event.runId}`, JSON.stringify(event)),
            job.updateProgress(event),
          ]);
        },
        job.data as ExecuteRunJob,
      );
    case "triage-failure":
      return processTriageFailure(
        prisma,
        queue,
        job.data as TriageFailureJob,
      );
    case "propose-healing":
      return processProposeHealing(prisma, job.data as ProposeHealingJob);
    case "discovery":
      return processDiscovery(prisma, config, job.data as DiscoveryJob);
    default:
      throw new Error(`Unsupported TestPilot job: ${job.name}`);
  }
}

const worker = new Worker<TestPilotJobData>(QUEUE_NAME, processJob, {
  connection: workerConnection,
  concurrency: config.concurrency,
});

worker.on("completed", (job) => {
  console.info(`[worker] completed ${job.name} (${job.id ?? "unidentified"})`);
});
worker.on("failed", (job, error) => {
  console.error(
    `[worker] failed ${job?.name ?? "unknown"} (${job?.id ?? "unidentified"})`,
    error,
  );
});
worker.on("error", (error) => {
  console.error("[worker] BullMQ error", error);
});

let shuttingDown = false;
async function shutdown(signal: string): Promise<void> {
  if (shuttingDown) return;
  shuttingDown = true;
  console.info(`[worker] received ${signal}; shutting down`);
  await worker.close();
  await queue.close();
  await Promise.all([
    queueConnection.quit(),
    workerConnection.quit(),
    redis.quit(),
    prisma.$disconnect(),
  ]);
}

process.once("SIGINT", () => {
  void shutdown("SIGINT");
});
process.once("SIGTERM", () => {
  void shutdown("SIGTERM");
});

console.info(
  `[worker] listening on ${QUEUE_NAME} with concurrency ${config.concurrency}`,
);
