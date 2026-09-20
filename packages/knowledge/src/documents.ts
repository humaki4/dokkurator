import type { ParsedDocument } from "@dokkurator/doctype";
import type {
  KnowledgeDocument,
  SourceReference,
} from "@dokkurator/index-adapter";
import type { SourceMetadata } from "@dokkurator/source-adapters";

export function buildKnowledgeDocument(
  document: ParsedDocument,
): KnowledgeDocument {
  const source = buildSourceReference(document.source);
  return {
    id: `${source.sourceId}:${source.path}`,
    ...(document.type === undefined ? {} : { type: document.type }),
    metadata: isRecord(document.metadata) ? document.metadata : {},
    source,
    content: document.content,
    headings: document.headings,
    links: document.links,
    references: document.references,
  };
}

export function buildSourceReference(source: SourceMetadata): SourceReference {
  return {
    sourceId: source.sourceId,
    path: source.path,
    ...(source.git?.fileRevision === undefined
      ? {}
      : { revision: source.git.fileRevision }),
    ...(source.repository === undefined
      ? {}
      : { repository: source.repository }),
  };
}

export function buildKnowledgeDocuments(
  documents: readonly ParsedDocument[],
): KnowledgeDocument[] {
  return documents.map(buildKnowledgeDocument);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
