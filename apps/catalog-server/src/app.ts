import swagger from "@fastify/swagger";
import Fastify, { type FastifyServerOptions } from "fastify";

export async function buildApp(options: FastifyServerOptions = {}) {
  const app = Fastify(options);

  await app.register(swagger, {
    openapi: {
      openapi: "3.1.0",
      info: {
        title: "Dokkurator Catalog API",
        description: "API contract for the Dokkurator catalog service.",
        version: "0.0.0",
      },
    },
  });

  app.get(
    "/openapi.json",
    {
      schema: {
        hide: true,
      },
    },
    async () => app.swagger(),
  );

  return app;
}
