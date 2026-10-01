import {
  loadDocuments,
  type DocumentConfig,
  type DocumentSource,
} from "@dokkurator/loader";
import type { KnowledgeIndex } from "../index-adapter/index.js";
import { buildKnowledgeDocuments } from "./documents.js";

export interface IndexDocumentsOptions extends DocumentConfig {
  readonly source: DocumentSource;
  readonly index: Pick<KnowledgeIndex, "replaceAll">;
}

export interface IndexDocumentsResult {
  readonly indexedDocuments: number;
}

/** Loads a complete document directory and atomically replaces the index. */
export async function indexDocuments({
  source,
  index,
  documentsDirectory,
  excludeDirectories,
}: IndexDocumentsOptions): Promise<IndexDocumentsResult> {
  const parsedDocuments = await loadDocuments(source, {
    ...(documentsDirectory === undefined ? {} : { documentsDirectory }),
    ...(excludeDirectories === undefined ? {} : { excludeDirectories }),
  });
  const documents = buildKnowledgeDocuments(parsedDocuments);

  await index.replaceAll(documents);

  return { indexedDocuments: documents.length };
}
