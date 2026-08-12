import { buildApp } from "./app.js";
import { readConfig } from "./config.js";

const config = readConfig();
const app = await buildApp({ config });

async function shutdown(signal: string): Promise<void> {
  app.log.info({ signal }, "Shutting down API");
  await app.close();
  process.exit(0);
}

process.once("SIGTERM", () => void shutdown("SIGTERM"));
process.once("SIGINT", () => void shutdown("SIGINT"));

try {
  await app.listen({ host: config.API_HOST, port: config.API_PORT });
  app.log.info({ port: config.API_PORT }, "TestPilot API listening");
} catch (error) {
  app.log.fatal({ err: error }, "Failed to start API");
  await app.close();
  process.exit(1);
}
