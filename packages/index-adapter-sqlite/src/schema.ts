// Kept for API compatibility. The rebuildable index no longer runs migrations.
export const SCHEMA_VERSION = 1;

export interface DocumentsTable {
  id: string;
  type: string | null;
  source_id: string;
  path: string;
  repository: string | null;
  revision: string | null;
  metadata: string;
  content: string;
  headings: string;
  links: string;
  references_: string;
  indexed_at: string;
}

export interface DocumentSearchTable {
  document_id: string;
  title: string;
  content: string;
}

export interface IndexDatabase {
  documents: DocumentsTable;
  document_search: DocumentSearchTable;
}

export const schema = `
  CREATE TABLE IF NOT EXISTS documents (
    id          TEXT PRIMARY KEY,
    type        TEXT,
    source_id   TEXT NOT NULL,
    path        TEXT NOT NULL,
    repository  TEXT,
    revision    TEXT,
    metadata    TEXT NOT NULL CHECK (json_valid(metadata)),
    content     TEXT NOT NULL,
    headings    TEXT NOT NULL CHECK (json_valid(headings)),
    links       TEXT NOT NULL CHECK (json_valid(links)),
    references_ TEXT NOT NULL CHECK (json_valid(references_)),
    indexed_at  TEXT NOT NULL,
    UNIQUE (source_id, path)
  ) STRICT;

  CREATE INDEX IF NOT EXISTS documents_by_type
    ON documents(type);

  CREATE INDEX IF NOT EXISTS documents_by_source
    ON documents(source_id);

  CREATE INDEX IF NOT EXISTS documents_by_repository
    ON documents(repository);

  CREATE VIRTUAL TABLE IF NOT EXISTS document_search USING fts5(
    document_id UNINDEXED,
    title,
    content,
    tokenize = 'unicode61 remove_diacritics 2',
    prefix = '2 3 4'
  );
`;
