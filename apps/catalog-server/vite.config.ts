import { builtinModules } from "node:module";

import { defineConfig } from "vite";

export default defineConfig({
  build: {
    lib: {
      entry: "src/server.ts",
      formats: ["es"],
      fileName: () => "server.js",
    },
    rollupOptions: {
      external: [
        ...builtinModules,
        ...builtinModules.map((moduleName) => `node:${moduleName}`),
        "@fastify/swagger",
        "dotenv",
        "fastify",
      ],
    },
    sourcemap: true,
    target: "node22",
  },
});
