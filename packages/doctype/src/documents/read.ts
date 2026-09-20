import type {
  SourceAdapter,
  SourceDocument,
  SourceId,
} from "@dokkurator/source-adapters";
import {
  DEFAULT_DOCUMENTS_DIRECTORY,
  DEFAULT_EXCLUDED_DOCUMENT_DIRECTORIES,
  type DocumentConfig,
} from "./types.js";

export async function readDocument(
  source: SourceAdapter,
  id: SourceId,
): Promise<SourceDocument> {
  return source.read(id);
}

export async function readDocuments(
  source: SourceAdapter,
  config: DocumentConfig = {},
): Promise<SourceDocument[]> {
  const documentsDirectory =
    config.documentsDirectory ?? DEFAULT_DOCUMENTS_DIRECTORY;
  const excludedDirectories =
    config.excludeDirectories ?? DEFAULT_EXCLUDED_DOCUMENT_DIRECTORIES;
  const entries = await source.list({ prefix: documentsDirectory });
  const ids = entries
    .map((entry) => entry.id)
    .filter((id) => isDocumentationFile(id, excludedDirectories))
    .sort();

  return Promise.all(ids.map((id) => readDocument(source, id)));
}

function isDocumentationFile(
  id: SourceId,
  excludedDirectories: readonly SourceId[],
): boolean {
  const segments = id.split("/");

  return (
    id.toLowerCase().endsWith(".md") &&
    !segments.includes(".doctypes") &&
    !excludedDirectories.some((directory) =>
      segments.includes(directory.replace(/^\/+|\/+$/g, "")),
    )
  );
}
