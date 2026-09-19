import { builtinModules } from "node:module";

import { defineConfig } from "vite";

export default defineConfig({
  build: {
    lib: {
      entry: {
        server: "src/server.ts",
        "features/openapi/index": "src/features/openapi/index.ts",
      },
      formats: ["es"],
      fileName: (_format, entryName) => `${entryName}.js`,
    },
    rollupOptions: {
      external: [
        ...builtinModules,
        ...builtinModules.map((moduleName) => `node:${moduleName}`),
        "@fastify/autoload",
        "@fastify/swagger",
        "dotenv",
        "fastify",
      ],
    },
    sourcemap: true,
    target: "node22",
  },
});
