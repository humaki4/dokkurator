import { loadDocuments, type DocumentConfig } from "@dokkurator/doctype";
import type { KnowledgeIndex } from "@dokkurator/index-adapter";
import type { SourceAdapter } from "@dokkurator/source-adapters";
import { buildKnowledgeDocuments } from "./documents.js";

export interface IndexDocumentsOptions extends DocumentConfig {
  readonly source: SourceAdapter;
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
