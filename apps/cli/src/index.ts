#!/usr/bin/env node
import type { DocType } from "@dokkurator/doctype";
import { exampleDocType } from "@dokkurator/knowledge";
import { validateDocument } from "@dokkurator/validator";

const docType: DocType = { ...exampleDocType };
const document = { title: "Dokkurator smoke test" };

console.log(JSON.stringify(validateDocument(docType, document), null, 2));
