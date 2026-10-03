---
doctype: architecture
title: Source Diff and Incremental Indexing
status: draft
component: doctype, knowledge, cli
tags: [diff, index, source]
---

# Source Diff and Incremental Indexing

Dokkurator compares the current source with the state used by the last
successful index run. Source-specific comparison belongs to DocType; checkpoint
persistence and index updates belong to Knowledge.

## Responsibilities

- identify added, modified, and deleted documents between source states;
- apply affected document changes to the Knowledge index;
- persist the new checkpoint only after the index update succeeds.

## Boundaries

- DocType owns source-specific comparison and revision semantics;
- Knowledge persists source state and applies changes without interpreting adapter-specific revisions;
- Core and the CLI expose these workflows without owning diff or storage logic.

```text
Knowledge loads the last SourceState
        ↓
DocType SourceAdapter.diff(previousState)
        ↓
SourceDiff: added / modified / deleted
        ↓
Knowledge parses and applies relevant document changes
        ↓
Knowledge atomically stores the new SourceState
```

## DocType ownership

Every `SourceAdapter` exposes `getSourceId()` and `diff(previous, options)`.
The returned `SourceState` is serializable. Knowledge persists it but does not
interpret adapter-specific revision semantics.

Diffs are scoped to the configured documents directory and excluded directory
names. The state records that scope and cannot be compared with a differently
scoped state. Changes are ordered by path and contain content hashes.

Renames are deliberately represented as deletion plus addition. This is enough
to produce the correct index and avoids ambiguous hash-based rename guesses.

### Filesystem

The filesystem adapter hashes every file in scope with SHA-256. Its state
contains the path and hash of every file, plus a deterministic aggregate
revision. A single aggregate hash can show that something changed, but the
per-file hashes are required to identify additions, modifications, and
deletions.

Filesystem reads cannot provide historical isolation. If files are mutated
concurrently between diffing and parsing, the run can fail or observe the newer
content. The checkpoint is stored only after the complete index update succeeds,
so such a run never advances the successful state prematurely.

### Git

Git state contains one commit ID for the complete source. DocType compares the
file trees of the previous commit and current `HEAD`. Per-file Git blob IDs are
returned as change hashes but do not need to be persisted in the checkpoint.

Only commits participate in Git incremental indexing:

- uncommitted modifications are ignored;
- staged but uncommitted modifications are ignored;
- untracked files are ignored;
- changed documents are read directly from the selected commit, not from the
  working tree.

A Git repository without a commit cannot produce a diff. Existing general
`GitSource.list()` and `read()` calls retain their working-tree behavior for
interactive document inspection; incremental indexing passes the commit
revision explicitly to `read()`.

## Knowledge ownership

`calculateDocumentDiff()` loads the stored state, asks DocType for a source
diff, and filters changes to Markdown documents using DocType's shared document
selection rules. It is read-only.

`indexDocumentChanges()` additionally:

1. reads and parses added and modified documents;
2. maps them to `KnowledgeDocument` objects;
3. derives IDs for deleted documents from source ID and path;
4. applies upserts, removals, and the new source state in one index operation.

SQLite stores checkpoints in `source_states`. `SQLiteIndex.applySourceUpdate()`
updates search rows, documents, and the checkpoint in one transaction. Parsing
is completed before that transaction starts. Any parsing or database failure
therefore leaves both the old index and old checkpoint valid.

The older `indexDocuments()` API remains available as a complete rebuild. A
complete replacement clears incremental checkpoints so the following
incremental run cannot assume an unrelated state was indexed.

## CLI behavior

The global CLI exposes the Core workflows:

```bash
dokkurator diff [source-id]
dokkurator index [source-id]
```

Without a Source ID both commands process all configured Sources. Core delegates
the underlying comparison to `calculateDocumentDiff()`.

`diff` never stores the newly calculated state. If no checkpoint exists, it
compares the source with an empty state. Execution and configuration failures
are reported per Source.

`index` applies the diff and advances the checkpoint only on success. Repeating
`diff` before indexing reports the same changes; repeating `index` without
source changes performs an empty transactional checkpoint update.

## Deferred work

- remote source adapters and archives;
- arbitrary `--from` and `--to` revisions;
- Git rename detection;
- semantic document diffs;
- similarity-based changes;
- filesystem snapshot isolation;
- multiple independently configured document scopes in one index.
