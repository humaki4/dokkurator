import { readFile } from "node:fs/promises";
import { fileURLToPath, URL } from "node:url";
import {
  FileSystemSource,
  loadDocTypes,
  loadDocuments,
} from "@dokkurator/loader";
import { prepareLintConfiguration } from "@dokkurator/validator";
import customPlugin from "./custom-plugin.mjs";

export const root = fileURLToPath(new URL("../", import.meta.url));

// Load everything before entering the synchronous rule runtime.
export async function prepareExample() {
  const source = new FileSystemSource({ root, sourceId: "validator-examples" });
  const commonSchema = JSON.parse(
    await readFile(
      new URL("../schemas/common.schema.json", import.meta.url),
      "utf8",
    ),
  );
  const configuration = prepareLintConfiguration({
    docTypes: await loadDocTypes(source),
    schemas: { [commonSchema.$id]: commonSchema },
    plugins: { example: customPlugin },
    rules: {
      "example/no-todo": "warn",
      "markdown/no-duplicate-headings": "warn",
    },
  });
  return { source, configuration };
}

/** @param {import('@dokkurator/loader').DocumentSource} source */
export async function loadExamples(source, group = "all") {
  if (!["all", "valid", "invalid"].includes(group)) {
    throw new Error("Use all, valid, or invalid as the example group.");
  }
  return loadDocuments(source, {
    documentsDirectory: group === "all" ? "documents" : `documents/${group}`,
    parseErrors: "collect",
  });
}
