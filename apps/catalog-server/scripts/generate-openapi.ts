import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { buildApp } from "../src/app.js";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const outputPath = resolve(projectRoot, "openapi/openapi.json");
const app = await buildApp();

try {
  await app.ready();
  const response = await app.inject({ method: "GET", url: "/openapi.json" });

  if (response.statusCode !== 200) {
    throw new Error(
      `Failed to generate OpenAPI document: ${response.statusCode}`,
    );
  }

  await mkdir(dirname(outputPath), { recursive: true });
  await writeFile(
    outputPath,
    `${JSON.stringify(response.json(), null, 2)}\n`,
    "utf8",
  );
} finally {
  await app.close();
}

console.log(`OpenAPI document written to ${outputPath}`);
