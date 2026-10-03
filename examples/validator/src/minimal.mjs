import console from "node:console";
import process from "node:process";
import { fileURLToPath, URL } from "node:url";
import {
  FileSystemSource,
  loadDocTypes,
  loadDocuments,
} from "@dokkurator/loader";
import { lint, prepareLintConfiguration } from "@dokkurator/validator";

const source = new FileSystemSource({
  root: fileURLToPath(new URL("../minimal/", import.meta.url)),
});
const configuration = prepareLintConfiguration({
  docTypes: await loadDocTypes(source),
});
const documents = await loadDocuments(source, {
  documentsDirectory: "documents",
});

const results = documents.map((document) =>
  lint({
    originalText: document.originalText,
    source: document.source,
    configuration,
  }),
);
for (const result of results) console.log(JSON.stringify(result, null, 2));
process.exitCode = results.some((result) => result.status === "failed") ? 1 : 0;
