import type {
  DocumentSource,
  ReadOptions,
  SourceDocument,
  SourceId,
} from "../source-adapter/source-adapter.js";
import {
  DEFAULT_DOCUMENTS_DIRECTORY,
  DEFAULT_EXCLUDED_DOCUMENT_DIRECTORIES,
  type DocumentConfig,
} from "./types.js";

export async function readDocument(
  source: DocumentSource,
  id: SourceId,
  options?: ReadOptions,
): Promise<SourceDocument> {
  return options === undefined ? source.read(id) : source.read(id, options);
}

export async function readDocuments(
  source: DocumentSource,
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

export function isDocumentationFile(
  id: SourceId,
  excludedDirectories: readonly SourceId[] = DEFAULT_EXCLUDED_DOCUMENT_DIRECTORIES,
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
