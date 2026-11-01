---
doctype: architecture
title: Knowledge
status: draft
component: knowledge
tags: [index, search]
---

# Knowledge

`@dokkurator/knowledge` stores a derived view of parsed documents and provides
full-text and metadata search. Its SQLite implementation is available today.
Resolved semantic relationships and cross-document validation remain planned.

## Responsibilities

- Transform Loader's parsed documents into indexable documents.
- Insert, update, and remove documents with stable source IDs and paths.
- Apply incremental changes and source checkpoints atomically.
- Parse the search language and expose backend-independent query contracts.
- Keep the index rebuildable from source documents.

## Model and storage

The current document model contains content, metadata, headings, links, Markdown
link references, and source provenance. It does not contain resolved relationships,
permissions, validation findings, or the Markdown AST. Source provenance includes
source ID, path, and optional repository and revision. Local roots, working-tree
status, and author emails are not copied into the index by default.

Knowledge owns `KnowledgeIndex`, `IncrementalKnowledgeIndex`, and `SQLiteIndex`.
Consumers import them from the public package root. SQLite-specific code stays
inside Knowledge's internal backend directory. Other backends are future options,
not existing integrations.

## Indexing

`indexDocumentChanges` calculates a source diff, loads changed documents, removes
deleted entries, and persists the new checkpoint in the same transaction.
`calculateDocumentDiff` previews that comparison without changing the index.
`indexDocuments` replaces the entire index and clears incremental checkpoints;
it is not a per-source append operation.

Current limitations:

- Malformed YAML aborts indexing for that source; tolerant indexing is planned.
- Incremental Git indexing reads committed content, unlike working-tree loading and validation.
- Include/exclude changes do not yet reliably reconcile existing entries.

## Queries and search

`index.query` supports type/source filters and pagination. For metadata queries,
use the implemented search language through `searchKnowledge`:

```ts
import { searchKnowledge } from "@dokkurator/knowledge";

const hits = await searchKnowledge(
  index,
  "doctype:decision status:accepted authentication",
  { limit: 20 },
);
```

Unqualified terms search content and metadata. `key:value` selects a metadata
path; nested objects use dotted paths. Quoted values, parentheses, `AND`, and
`OR` are supported; adjacent terms imply `AND`. Matching uses substrings rather
than typed comparisons or exact equality. Range filters, graph queries, and
reference resolution are not implemented.

Knowledge parses the language into a search-expression tree. The index adapter
translates that tree to backend queries. CLI only forwards input and formats
results. See the [package README](../../packages/knowledge/README.md).

## Boundaries

- Consume Loader's public loading contracts and parsed models, not source implementations.
- Keep parsing of Markdown and DocTypes in Loader.
- Keep document validation in Validator; no cross-document rule integration exists yet.
- Keep authorization in the planned server integration.
- Treat repositories as authoritative and the index as disposable derived data.
