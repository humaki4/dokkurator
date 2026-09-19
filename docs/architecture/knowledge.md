# Knowledge

`Knowledge` builds and queries the derived knowledge model created from parsed documents.

It consumes `ParsedDocument` objects from DocType and transforms them into indexable documents, entities and relationships.

## Technology

- TypeScript / Node.js
- storage-independent core
- adapter-based persistence
- explicit query API instead of direct database access
- graph-like relations represented in the domain model
- local development can start with SQLite or an in-memory adapter
- server deployments can later use PostgreSQL, OpenSearch or another index implementation

## Responsibilities

- index parsed documents
- update and remove indexed documents
- derive entities and relationships
- resolve document references
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
extract
 ┌────┴─────┐
Entities  Relations
 └────┬─────┘
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
  type: string;

  metadata: Record<string, unknown>;

  source: SourceReference;

  entities: Entity[];
  relations: Relation[];

  content: SearchableContent;
};
```

Relations are explicit rather than hidden inside Markdown or metadata.

```ts
type Relation = {
  from: EntityReference;
  type: string;
  to: EntityReference;
};
```

Example:

```text
ADR-001
  ├─ supersedes → ADR-000
  ├─ relates-to → API-42
  └─ belongs-to → payment-service
```

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
await knowledge.index(parsedDocument);
```

Conceptually:

```ts
async function index(document: ParsedDocument) {
  const knowledgeDocument = buildKnowledgeDocument(document);

  await indexAdapter.upsert(knowledgeDocument);
}
```

Incremental updates should be supported:

```ts
await knowledge.upsert(document);
await knowledge.remove(documentId);
```

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

  relations: {
    relatedTo: "service:payment",
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
  text: "authentication",
  types: ["decision", "architecture"],
  limit: 20,
});
```

The concrete implementation may map this to:

- SQLite FTS
- PostgreSQL full-text search
- OpenSearch

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
