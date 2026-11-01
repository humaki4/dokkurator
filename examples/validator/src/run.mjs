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
  const report = await app.validate();
  // Keep the complete source result while selecting documents for display.
  const selected = {
    ...report,
    results: report.results.map((source) => ({
      ...source,
      documents: source.documents.filter(
        ({ path }) => group === "all" || path.startsWith(`documents/${group}/`),
      ),
    })),
  };
  const format = process.argv[3] ?? "stylish";
  const formatter = await app.loadFormatter(format);
  console.log(await formatter.format(selected));
  const documents = selected.results.flatMap(({ documents }) => documents);
  const { errors } = selected;
  const failed = documents.filter(({ status }) => status === "failed").length;
  if (format === "stylish")
    console.log(`\n${documents.length} documents, ${failed} failed.`);
  process.exitCode = failed || errors.length ? 1 : 0;
} finally {
  await app.close();
}
