import { Worker } from "bullmq";
import { Redis } from "ioredis";
import { prisma } from "@testpilot/database";
import { loadConfig } from "./config.js";
import { handleCompileTests } from "./jobs/compile-tests.js";
import { handleDiscovery } from "./jobs/discovery.js";
import { handleExecuteRun } from "./jobs/execute-run.js";
import { handleGeneratePlan } from "./jobs/generate-plan.js";
import { handleProposeHealing } from "./jobs/propose-healing.js";
import { handleTriageFailure } from "./jobs/triage-failure.js";
import { QUEUE_NAME, type TestPilotJobName } from "./types.js";

const config = loadConfig();
const connection = new Redis(config.redisUrl, { maxRetriesPerRequest: null });

async function publishProgress(runId: string, event: Record<string, unknown>) {
  await connection.publish(
    `run:${runId}`,
    JSON.stringify({ ...event, at: new Date().toISOString() }),
  );
}

const worker = new Worker(
  QUEUE_NAME,
  async (job) => {
    const name = job.name as TestPilotJobName;
    switch (name) {
      case "generate-plan":
        return handleGeneratePlan(prisma, job.data as never);
      case "compile-tests":
        return handleCompileTests(prisma, job.data as never);
      case "execute-run":
        return handleExecuteRun({
          prisma,
          config,
          data: job.data as never,
          publishProgress,
          queue: worker.opts.connection as never,
        });
      case "triage-failure":
        return handleTriageFailure(prisma, job.data as never);
      case "propose-healing":
        return handleProposeHealing(prisma, job.data as never);
      case "discovery":
        return handleDiscovery(prisma, config, job.data as never);
      default:
        throw new Error(`Unknown job type: ${name}`);
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

async function shutdown(signal: string) {
  console.log(`Shutting down worker (${signal})`);
  await worker.close();
  await connection.quit();
  await prisma.$disconnect();
  process.exit(0);
}

process.once("SIGTERM", () => void shutdown("SIGTERM"));
process.once("SIGINT", () => void shutdown("SIGINT"));
