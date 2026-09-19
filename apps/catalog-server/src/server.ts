import { buildApp } from "./app.js";
import { loadConfig } from "./config.js";

const config = loadConfig();
const app = await buildApp({ logger: true });

const shutdown = async (signal: NodeJS.Signals) => {
  app.log.info({ signal }, "shutting down");
  await app.close();
};

process.once("SIGINT", () => void shutdown("SIGINT"));
process.once("SIGTERM", () => void shutdown("SIGTERM"));

try {
  await app.listen(config);
} catch (error) {
  app.log.error(error);
  process.exitCode = 1;
}
