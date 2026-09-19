---
doctype: architecture
title: Index Adapters
status: draft
component: index-adapters
tags: [storage, adapters]
---

# Index Adapters

`Index Adapters` persist and query the derived Knowledge model.

They hide the concrete storage technology from `Knowledge` and provide a common interface for document, entity, relation and search operations.

## Technology

- TypeScript / Node.js
- adapter-based persistence
- storage-independent interface
- initial implementation can use SQLite
- later adapters may target PostgreSQL or OpenSearch
- relational data model for documents, entities and relations
- optional full-text index depending on backend
- no direct database access from Knowledge

## Responsibilities

- store and update indexed documents
- remove deleted documents
- persist entities and relations
- provide document lookup
- provide structured queries
- provide full-text search
- support incremental updates
- keep storage-specific logic outside Knowledge

## Common interface

```ts
interface IndexAdapter {
  upsertDocument(document: KnowledgeDocument): Promise<void>;

  removeDocument(id: DocumentId): Promise<void>;

  getDocument(id: DocumentId): Promise<KnowledgeDocument | undefined>;

  query(query: KnowledgeQuery): Promise<QueryResult>;

  search(query: SearchQuery): Promise<SearchResult>;
}
```

Optional lower-level operations may be exposed where required:

```ts
interface IndexAdapter {
  // ...

  getEntity?(id: EntityId): Promise<Entity | undefined>;

  getRelations?(entity: EntityId): Promise<Relation[]>;
}
```

## Data model

The exact schema depends on the backend, but the logical model should stay stable.

```text
Document
   │
   ├── Metadata
   │
   ├── Entity
   │      │
   │      └── Relation ────── Entity
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

## Entities

Entities represent identifiable objects referenced by documents.

```text
entities
--------
id
type
key
name
document_id
data
```

Example:

```text
id:        service:payment
type:      service
key:       payment
name:      Payment Service
document:  architecture/payment.md
```

An entity may originate from a document but has its own stable identity.

## Relations

Relations connect documents and entities.

```text
relations
---------
id
source_entity_id
type
target_entity_id
source_document_id
```

Example:

```text
ADR-001
    --supersedes-->
ADR-000
```

or:

```text
ADR-001
    --affects-->
service:payment
```

Conceptually:

```ts
type RelationRecord = {
  source: EntityId;
  type: string;
  target: EntityId;

  documentId?: DocumentId;
};
```

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

The Knowledge API should not expose these implementation differences.

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

CREATE TABLE entities (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL,
  key TEXT NOT NULL,
  name TEXT,
  document_id TEXT,
  data TEXT,
  FOREIGN KEY (document_id) REFERENCES documents(id)
);

CREATE TABLE relations (
  id TEXT PRIMARY KEY,
  source_entity_id TEXT NOT NULL,
  type TEXT NOT NULL,
  target_entity_id TEXT NOT NULL,
  source_document_id TEXT,
  FOREIGN KEY (source_document_id) REFERENCES documents(id)
);
```

Additional indexes:

```sql
CREATE INDEX idx_documents_doctype
  ON documents(doctype);

CREATE INDEX idx_documents_source
  ON documents(source_id);

CREATE INDEX idx_entities_type
  ON entities(type);

CREATE INDEX idx_relations_source
  ON relations(source_entity_id);

CREATE INDEX idx_relations_target
  ON relations(target_entity_id);
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
replace entities
replace relations
      ↓
commit
```

Conceptually:

```ts
await index.transaction(async () => {
  await index.removeDerivedData(document.id);
  await index.upsertDocument(document);
  await index.insertEntities(document.entities);
  await index.insertRelations(document.relations);
});
```

This prevents stale relations from surviving document changes.

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
