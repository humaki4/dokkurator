import {
  DEFAULT_DOCUMENTS_DIRECTORY,
  DEFAULT_EXCLUDED_DOCUMENT_DIRECTORIES,
  isDocumentationFile,
  loadDocument,
  type DocumentConfig,
  type SourceAdapter,
  type SourceChange,
  type SourceDiff,
  type SourceId,
} from "@dokkurator/doctype";
import type { IncrementalKnowledgeIndex } from "../index-adapter/index.js";
import { buildKnowledgeDocument } from "./documents.js";

export interface CalculateDocumentDiffOptions extends DocumentConfig {
  readonly source: SourceAdapter;
  readonly index: Pick<IncrementalKnowledgeIndex, "getSourceState">;
}

export interface IndexDocumentChangesOptions extends DocumentConfig {
  readonly source: SourceAdapter;
  readonly index: Pick<
    IncrementalKnowledgeIndex,
    "getSourceState" | "applySourceUpdate"
  >;
}

export interface IndexDocumentChangesResult {
  readonly indexedDocuments: number;
  readonly removedDocuments: number;
  readonly diff: SourceDiff;
}

/** Calculates document-relevant changes without updating index state. */
export async function calculateDocumentDiff({
  source,
  index,
  documentsDirectory,
  excludeDirectories,
  include,
  exclude,
}: CalculateDocumentDiffOptions): Promise<SourceDiff> {
  const sourceId = await source.getSourceId();
  const previous = await index.getSourceState(sourceId);
  const diff = await source.diff(previous, {
    prefix: documentsDirectory ?? DEFAULT_DOCUMENTS_DIRECTORY,
    excludeDirectories:
      excludeDirectories ?? DEFAULT_EXCLUDED_DOCUMENT_DIRECTORIES,
  });
  return {
    ...diff,
    changes: diff.changes.filter((change) =>
      isIndexedDocument(
        change.path,
        documentsDirectory,
        excludeDirectories,
        include,
        exclude,
      ),
    ),
  };
}

/** Applies a source diff and its new checkpoint as one index operation. */
export async function indexDocumentChanges(
  options: IndexDocumentChangesOptions,
): Promise<IndexDocumentChangesResult> {
  const { source, index } = options;
  const diff = await calculateDocumentDiff(options);
  const changed = diff.changes.filter(
    (change): change is Exclude<SourceChange, { readonly type: "deleted" }> =>
      change.type !== "deleted",
  );
  const documents = await Promise.all(
    changed.map(async (change) =>
      buildKnowledgeDocument(
        await loadDocument(
          source,
          change.path,
          diff.state.revision.type === "git-commit"
            ? { revision: diff.state.revision.id }
            : undefined,
        ),
      ),
    ),
  );
  const removed = diff.changes
    .filter((change) => change.type === "deleted")
    .map((change) => `${diff.sourceId}:${change.path}`);

  await index.applySourceUpdate({
    state: diff.state,
    upsert: documents,
    remove: removed,
    replaceSource: diff.fromRevision === undefined,
  });
  return {
    indexedDocuments: documents.length,
    removedDocuments: removed.length,
    diff,
  };
}

function isIndexedDocument(
  path: string,
  documentsDirectory = DEFAULT_DOCUMENTS_DIRECTORY,
  excludeDirectories: readonly SourceId[] = DEFAULT_EXCLUDED_DOCUMENT_DIRECTORIES,
  include?: readonly string[],
  exclude?: readonly string[],
): boolean {
  const directory = documentsDirectory.replace(/^\/+|\/+$/gu, "");
  const belowDirectory =
    directory === "" || path === directory || path.startsWith(`${directory}/`);
  return (
    belowDirectory &&
    isDocumentationFile(path, excludeDirectories, include, exclude)
  );
}
