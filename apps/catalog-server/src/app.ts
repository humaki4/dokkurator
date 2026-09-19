import autoLoad from "@fastify/autoload";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import Fastify, { type FastifyServerOptions } from "fastify";

export async function buildApp(options: FastifyServerOptions = {}) {
  const app = Fastify(options);

  await app.register(autoLoad, {
    dir: join(dirname(fileURLToPath(import.meta.url)), "features"),
    dirNameRoutePrefix: false,
  });

  return app;
}
