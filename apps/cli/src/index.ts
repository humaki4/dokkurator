#!/usr/bin/env node
import type { DocType } from "@dokkurator/doctype";
import { validateDocument } from "@dokkurator/validator";

const docType: DocType = {
  name: "example",
  requiredFields: ["title", "status"],
};
const document = { title: "Dokkurator smoke test" };

console.log(JSON.stringify(validateDocument(docType, document), null, 2));
