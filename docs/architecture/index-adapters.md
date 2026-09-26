---
doctype: architecture
title: Index Adapters
status: draft
component: index-adapters
tags: [storage, adapters]
---

# Index Adapters

`Index Adapters` persist and query the derived Knowledge model.

They hide concrete storage technology behind a common interface for document
and search operations. The contract and initial SQLite implementation are
currently owned by `@dokkurator/knowledge`, with SQLite code kept in a
separable internal adapter directory. A backend may be extracted as a separate
library only through a deliberate package-boundary decision.

## Technology

- TypeScript / Node.js
- adapter-based persistence
- storage-independent interface
- initial implementation can use SQLite
- later adapters may target PostgreSQL or OpenSearch
- relational data model for documents
- optional full-text index depending on backend
- database-specific access is confined to the Knowledge-owned backend

## Responsibilities

- store and update indexed documents
- remove deleted documents
- provide document lookup
- provide structured queries
- provide full-text search
- support incremental updates
- keep storage-specific logic inside the backend implementation boundary

## Common interface

```ts
interface IndexAdapter {
  replaceAll(documents: readonly KnowledgeDocument[]): Promise<void>;

  upsertDocument(document: KnowledgeDocument): Promise<void>;

  removeDocument(id: DocumentId): Promise<void>;

  getDocument(id: DocumentId): Promise<KnowledgeDocument | undefined>;

  query(query: KnowledgeQuery): Promise<QueryResult>;

  search(query: SearchQuery): Promise<SearchResult>;
}
```

## Data model

The exact schema depends on the backend, but the logical model should stay stable.

```text
Document
   │
   ├── Metadata
   ├── Headings / Links / References
   │
   └── Search Content
```

A relational implementation could use the following core tables.

## Documents

Stores the indexed representation of a source document.

```text
documents
---------
id
doctype
source_id
repository
path
revision
title
content
created_at
updated_at
indexed_at
```

Example TypeScript model:

```ts
type DocumentRecord = {
  id: string;
  doctype: string;

  sourceId: string;
  repository?: string;
  path: string;
  revision?: string;

  title?: string;
  content: string;

  createdAt?: Date;
  updatedAt?: Date;
  indexedAt: Date;
};
```

## Metadata

Document-specific Frontmatter values can initially be stored as JSON.

```text
document_metadata
-----------------
document_id
data
```

Example:

```json
{
  "status": "accepted",
  "owner": "team-platform",
  "date": "2026-09-19"
}
```

For SQLite or PostgreSQL this may be represented as JSON / JSONB.

Frequently queried fields may later be indexed separately.

Entities and semantic relations are outside the first adapter version. They
remain a later Knowledge task once concrete identity and ownership semantics
are available.

## References

Unresolved references may need to be stored separately.

```text
references
----------
id
document_id
reference
type
resolved_entity_id
status
```

Possible states:

```text
resolved
unresolved
ambiguous
```

This is useful for:

- validation
- broken-reference detection
- later re-resolution when new documents are indexed

## Search index

Searchable text can either remain in `documents.content` or be stored in a backend-specific full-text index.

For SQLite:

```text
documents
      ↓
SQLite FTS
```

For PostgreSQL:

```text
documents
      ↓
tsvector / GIN
```

For OpenSearch:

```text
KnowledgeDocument
      ↓
OpenSearch document
```

The public Knowledge API should not expose these implementation differences.

SQLite keeps two derived FTS5 structures: one for document content and one for
metadata values. Metadata objects are flattened to dotted paths, and arrays
produce multiple entries for the same path.

```text
document_metadata_search
------------------------
document_id
key          # for example owner.team or tags
value        # one scalar value per row
```

This intentionally denormalizes metadata for fast field-specific and substring
searches. The JSON value in `documents.metadata` remains the representation used
to restore a `KnowledgeDocument`; the FTS rows are disposable projections that
are replaced atomically with their document.

Search-expression parsing belongs to Knowledge. Each adapter only translates
the resulting backend-neutral expression tree into its native query language
and ranking implementation.

## Possible SQLite schema

A lightweight initial implementation could roughly use:

```sql
CREATE TABLE documents (
  id TEXT PRIMARY KEY,
  doctype TEXT NOT NULL,
  source_id TEXT NOT NULL,
  repository TEXT,
  path TEXT NOT NULL,
  revision TEXT,
  title TEXT,
  content TEXT NOT NULL,
  metadata TEXT,
  indexed_at TEXT NOT NULL
);

```

Additional indexes:

```sql
CREATE INDEX idx_documents_doctype
  ON documents(doctype);

CREATE INDEX idx_documents_source
  ON documents(source_id);

```

## Update model

Index updates should be atomic per document where possible.

```text
ParsedDocument
      ↓
build KnowledgeDocument
      ↓
begin update
      ↓
replace document
replace metadata
replace search entry
      ↓
commit
```

Conceptually:

```ts
await index.transaction(async () => {
  await index.removeDerivedData(document.id);
  await index.upsertDocument(document);
  await index.replaceSearchEntry(document);
});
```

This prevents stale search content from surviving document changes.

## Incremental synchronization

The adapter supports updates based on stable source IDs.

```ts
await index.upsertDocument(document);

await index.removeDocument(sourceId);
```

Typical flow:

```text
Source change
    ↓
SourceAdapter
    ↓
ParsedDocument
    ↓
Knowledge
    ↓
IndexAdapter
    ↓
INSERT / UPDATE / DELETE
```

A complete rebuild must also remain possible:

```ts
await index.clear();
await reindexAllSources();
```

## Backend implementations

Possible adapters:

```text
MemoryIndexAdapter
SQLiteIndexAdapter
PostgresIndexAdapter
OpenSearchIndexAdapter
```

### Memory

Useful for:

- unit tests
- small CLI operations

### SQLite

Good initial default for:

- local CLI
- prototypes
- single-user setups
- embedded Catalog Server deployments

### PostgreSQL

Possible later backend for:

- central server
- concurrent access
- richer relational queries
- JSONB metadata

### OpenSearch

Useful when:

- full-text search becomes dominant
- large document volumes are indexed
- faceting and aggregations are required

OpenSearch may complement rather than necessarily replace the relational model.
