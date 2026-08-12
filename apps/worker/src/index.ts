import { Queue, Worker } from "bullmq";
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
  type TestPilotJobName,
  type TriageFailureJob,
} from "./types.js";

const config = workerConfigFromEnv();
const connection = new Redis(config.redisUrl, { maxRetriesPerRequest: null });
const queue = new Queue(QUEUE_NAME, { connection });
const storage = new ArtifactStorage(config.s3, config.artifactDirectory);

async function publishProgress(event: {
  runId: string;
  status: string;
  message: string;
  timestamp: string;
}): Promise<void> {
  await connection.publish(
    `run:${event.runId}`,
    JSON.stringify({ ...event, type: "run.status", at: event.timestamp }),
  );
}

const worker = new Worker(
  QUEUE_NAME,
  async (job) => {
    const name = job.name as TestPilotJobName;
    switch (name) {
      case "generate-plan":
        return processGeneratePlan(prisma, job.data as GeneratePlanJob);
      case "compile-tests":
        return processCompileTests(prisma, job.data as CompileTestsJob);
      case "execute-run":
        return processExecuteRun(
          prisma,
          queue,
          storage,
          config,
          publishProgress,
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
      default: {
        const exhaustive: never = name;
        throw new Error(`Unknown job type: ${String(exhaustive)}`);
      }
    }
  },
  {
    connection,
    concurrency: config.concurrency,
  },
);

worker.on("completed", (job) => {
  console.log(`job completed name=${job.name} id=${job.id}`);
});
worker.on("failed", (job, error) => {
  console.error(`job failed name=${job?.name} id=${job?.id}`, error);
});

console.log(`TestPilot worker listening on queue=${QUEUE_NAME}`);

async function shutdown(signal: string): Promise<void> {
  console.log(`Shutting down worker (${signal})`);
  await worker.close();
  await queue.close();
  await connection.quit();
  await prisma.$disconnect();
  process.exit(0);
}

process.once("SIGTERM", () => void shutdown("SIGTERM"));
process.once("SIGINT", () => void shutdown("SIGINT"));
