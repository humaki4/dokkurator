import type { KnowledgeDocument } from "@dokkurator/index-adapter";
import type { DocumentsTable } from "./schema.js";

export const documentColumns = [
  "id",
  "type",
  "source_id",
  "path",
  "repository",
  "revision",
  "metadata",
  "content",
  "headings",
  "links",
  "references_",
] as const;

type DocumentRow = Pick<DocumentsTable, (typeof documentColumns)[number]>;

export function toDocument(row: DocumentRow): KnowledgeDocument {
  return {
    id: row.id,
    ...(row.type === null ? {} : { type: row.type }),
    metadata: deserialize(row.metadata),
    source: {
      sourceId: row.source_id,
      path: row.path,
      ...(row.revision === null ? {} : { revision: row.revision }),
      ...(row.repository === null ? {} : { repository: row.repository }),
    },
    content: row.content,
    headings: deserialize(row.headings),
    links: deserialize(row.links),
    references: deserialize(row.references_),
  };
}

export function toDocumentRow(document: KnowledgeDocument): DocumentsTable {
  return {
    id: document.id,
    type: document.type ?? null,
    source_id: document.source.sourceId,
    path: document.source.path,
    repository: document.source.repository ?? null,
    revision: document.source.revision ?? null,
    metadata: serialize(document.metadata),
    content: document.content,
    headings: serialize(document.headings),
    links: serialize(document.links),
    references_: serialize(document.references),
    indexed_at: new Date().toISOString(),
  };
}

export function titleOf(document: KnowledgeDocument): string {
  const title = document.metadata.title;
  if (typeof title === "string") return title;
  return document.headings[0]?.text ?? "";
}

function serialize(value: unknown): string {
  const result = JSON.stringify(value);
  if (result === undefined)
    throw new TypeError("Index data must be JSON serializable");
  return result;
}

function deserialize<T>(value: string): T {
  return JSON.parse(value) as T;
}
