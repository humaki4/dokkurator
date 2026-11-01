import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    projects: [
      "apps/*",
      "packages/*",
      "examples/validator",
      "examples/validator-eslint",
    ],
    coverage: {
      provider: "v8",
      reporter: ["text", "html", "json-summary"],
      thresholds: {
        statements: 80,
        branches: 70,
        functions: 75,
        lines: 80,
      },
    },
  },
});
