---
doctype: architecture
title: Knowledge
status: draft
component: knowledge
tags: [index, search]
---

# Knowledge

`Knowledge` builds and queries the derived knowledge model created from parsed documents.

It consumes `ParsedDocument` objects from DocType and transforms them into indexable documents.

## Technology

- TypeScript / Node.js
- storage-independent core
- adapter-based persistence
- explicit query API instead of direct database access
- local development can start with SQLite or an in-memory adapter
- server deployments can later use PostgreSQL, OpenSearch or another index implementation

## Responsibilities

- index parsed documents
- update and remove indexed documents
- provide search and query APIs
- support Validator queries across documents
- expose document relationships for CLI and Catalog Server
- keep the knowledge model independent of the concrete storage technology

## Data flow

```text
ParsedDocument
      ↓
 normalize / enrich
      ↓
KnowledgeDocument
      ↓
 Index Adapter
      ↓
   Storage
```

## Knowledge model

The internal model is derived from the source documents.

```ts
type KnowledgeDocument = {
  id: DocumentId;
  type?: string;

  metadata: Record<string, unknown>;

  source: SourceReference;

  content: string;
  headings: Heading[];
  links: Link[];
  references: Reference[];
};
```

Knowledge stores a deliberately smaller source model than the source adapter:

```ts
type SourceReference = {
  sourceId: string;
  path: string;
  revision?: string;
  repository?: string;
};
```

Transient or sensitive adapter details such as a local root, working-tree
status, branch and author email remain available on `ParsedDocument`, but are
not copied into the derived index by default. They can later be introduced as
an explicit provenance or document-state model when required by a concrete UI
or assessment feature.

Entities and semantic relations are deliberately deferred. They will be added
when their identity, ownership and extraction rules are defined by a concrete
use case.

## Index adapter

Knowledge does not access SQLite, PostgreSQL or OpenSearch directly.

```ts
interface KnowledgeIndex {
  upsert(document: KnowledgeDocument): Promise<void>;

  remove(id: DocumentId): Promise<void>;

  get(id: DocumentId): Promise<KnowledgeDocument | undefined>;

  query(query: KnowledgeQuery): Promise<QueryResult>;
}
```

Possible implementations:

```text
MemoryIndex
SQLiteIndex
PostgresIndex
OpenSearchIndex
```

The initial implementation can stay lightweight while keeping the API stable.

## Indexing

```ts
await indexDocuments({ source, index, documentsDirectory: "docs" });
```

`indexDocuments` is the single public indexing operation. Loading, transforming
and writing individual documents remain implementation details. The first
version atomically replaces the complete index. Incremental updates may be
added later without widening this public API.

A full rebuild must always remain possible.

## Query API

The internal query API should be structured and independent of the storage backend.

```ts
const result = await knowledge.query({
  type: "decision",
  where: {
    status: "accepted",
  },
});
```

More complex queries can later add:

```ts
const result = await knowledge.query({
  type: "decision",

  where: {
    status: { equals: "accepted" },
  },

  sort: [{ field: "date", direction: "desc" }],

  limit: 20,
});
```

A user-facing query DSL can be built on top of this API later.

## Search

Full-text search is exposed through the same abstraction.

```ts
await knowledge.search({
  expression: {
    type: "term",
    value: "authentication",
  },
  types: ["decision", "architecture"],
  limit: 20,
});
```

The concrete implementation may map this to:

- SQLite FTS
- PostgreSQL full-text search
- OpenSearch

The public search model is a storage-independent expression tree. Terms can
search content and all metadata, or target one metadata path. `and` and `or`
nodes combine expressions. A user-facing query language is parsed by Knowledge
into this model; neither CLI syntax nor database expressions cross the index
adapter boundary.

```text
CLI input
    ↓
Knowledge query parser
    ↓
SearchExpression
    ↓
Index adapter
```

The initial query language supports unqualified terms, `key:value`, quoted
values, parentheses, and `AND`/`OR`. Adjacent terms imply `AND`, and `AND` binds
more strongly than `OR`.

## Validator integration

Validator can use Knowledge for rules that require information beyond the current document.

```ts
const existing = await knowledge.query({
  type: "decision",
  where: {
    id: document.metadata.id,
  },
});
```

Examples:

- reference target exists
- ID is unique
- related document has an expected type
- required relationship exists
- referenced document has a compatible status

Knowledge itself does not decide whether such conditions are valid. It only provides the data.

## Boundaries

Knowledge does not:

- parse Markdown
- parse DocType definitions
- define validation rules
- access GitLab directly
- decide user authorization
- own the original documents

Repositories remain the source of truth. The Knowledge index is derived and rebuildable.
