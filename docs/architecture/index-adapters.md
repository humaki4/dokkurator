---
doctype: architecture
title: Index Adapters
status: draft
component: index-adapters
tags: [storage, adapters]
---

# Index Adapters

Index contracts and the implemented SQLite backend belong to
`@dokkurator/knowledge`. Supported integrations are exported from its public
package root; SQLite implementation files stay internal.

## Responsibilities

- Persist documents, metadata, and source checkpoints.
- Support lookup, filtered queries, and search expressions.
- Update document data and derived search projections atomically.
- Remove stale entries when documents or sources are deleted.

## Current contracts

`KnowledgeIndex` provides `replaceAll`, `upsert`, `remove`, `get`, `query`,
`search`, and `clear`. `IncrementalKnowledgeIndex` adds `getSourceState`,
`applySourceUpdate`, and `deleteSource`. See the
[Knowledge README](../../packages/knowledge/README.md) for root imports.

The search contract uses a backend-independent expression tree. Parsing the
user-facing search language belongs to Knowledge, not the adapter.

## SQLite implementation

`SQLiteIndex` uses Node.js `node:sqlite` with Kysely and FTS5. The current tables
are:

| Table                      | Contents                                                                   |
| -------------------------- | -------------------------------------------------------------------------- |
| `documents`                | Content, metadata JSON, headings, links, references, and source provenance |
| `source_states`            | Serialized incremental source checkpoints                                  |
| `document_search`          | Derived content search projection                                          |
| `document_metadata_search` | Derived scalar metadata values under dotted paths                          |

Metadata arrays produce multiple entries for a path. The JSON in `documents`
remains the representation used to restore the document model. Search projections
are replaced together with their document. Incremental source updates and their
checkpoints commit in a single transaction.

Schema-version changes currently discard and recreate the derived index tables.
The next indexing run rebuilds them from sources. Persistent user-authored data
must not be stored in this index.

## Future backends

Memory, PostgreSQL, and OpenSearch implementations are possible extensions, not
currently shipped adapters. Resolved relationships, permission data, and quality
reports require deliberate model changes before backend support is added.

## Boundaries

- Knowledge owns both contracts and supported implementations.
- Keep backend details inside the owning package's internal adapter area.
- Do not parse source documents or implement validation rules in adapters.
- Do not decide user authorization inside the storage backend.
