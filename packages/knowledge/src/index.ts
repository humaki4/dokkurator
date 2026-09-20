/** Public API for building the derived Knowledge model. */

import type { DocType } from "@dokkurator/doctype";

export {
  buildKnowledgeDocument,
  buildKnowledgeDocuments,
  buildSourceReference,
} from "./documents.js";
export type {
  DocumentId,
  Entity,
  EntityId,
  EntityReference,
  KnowledgeDocument,
  Relation,
  SourceReference,
} from "./model.js";

/** @deprecated Temporary compatibility value for the unfinished application CLI. */
export const exampleDocType: DocType = {
  name: "example",
  requiredFields: ["title", "status"],
};
