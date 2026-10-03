import console from "node:console";
import process from "node:process";
import { lint } from "@dokkurator/validator";
import { loadExamples, prepareExample } from "./setup.mjs";

const { source, configuration } = await prepareExample();
const documents = await loadExamples(source, process.argv[2] ?? "all");

// Each document is an independent synchronous call; no cross-document checks.
const results = documents.map((document) => ({
  path: document.source.path,
  result: lint({
    originalText: document.originalText,
    source: document.source,
    configuration,
  }),
}));

for (const { path, result } of results) {
  console.log(`${result.status === "failed" ? "FAIL" : "PASS"} ${path}`);
  for (const diagnostic of result.diagnostics) {
    const position = diagnostic.location
      ? `${diagnostic.location.line}:${diagnostic.location.column}`
      : "?";
    console.log(
      `  ${position} ${diagnostic.severity} ${diagnostic.ruleId ?? "parser"}: ${diagnostic.message}`,
    );
  }
}

const failed = results.filter(
  ({ result }) => result.status === "failed",
).length;
console.log(`\n${results.length} documents, ${failed} failed.`);
process.exitCode = failed ? 1 : 0;
