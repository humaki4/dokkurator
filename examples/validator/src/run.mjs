import console from "node:console";
import process from "node:process";
import { fileURLToPath, URL } from "node:url";
import { createDokkurator } from "@dokkurator/core";

const group = process.argv[2] ?? "all";
if (!["all", "valid", "invalid"].includes(group)) {
  throw new Error("Use all, valid, or invalid as the example group.");
}

const app = createDokkurator({
  root: fileURLToPath(new URL("../", import.meta.url)),
});
await app.open();
try {
  const { results, errors } = await app.validate();
  // Validate the collection once; the argument selects which findings to display.
  const documents = results
    .flatMap(({ documents }) => documents)
    .filter(
      ({ path }) => group === "all" || path.startsWith(`documents/${group}/`),
    );

  for (const { path, status, diagnostics } of documents) {
    console.log(`${status === "failed" ? "FAIL" : "PASS"} ${path}`);
    for (const diagnostic of diagnostics) {
      const position = diagnostic.location
        ? `${diagnostic.location.line}:${diagnostic.location.column}`
        : "?";
      console.log(
        `  ${position} ${diagnostic.severity} ${diagnostic.ruleId ?? "parser"}: ${diagnostic.message}`,
      );
    }
  }
  for (const { sourceId, phase, message } of errors) {
    console.error(`ERROR ${sourceId} (${phase}): ${message}`);
  }
  const failed = documents.filter(({ status }) => status === "failed").length;
  console.log(`\n${documents.length} documents, ${failed} failed.`);
  process.exitCode = failed || errors.length ? 1 : 0;
} finally {
  await app.close();
}
