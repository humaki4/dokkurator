---
doctype: spec
title: Tolerant indexing
status: draft
component: knowledge
tags: [indexing, frontmatter]
tests:
  - packages/knowledge/src/index/index-documents.test.ts
  - packages/knowledge/src/index/incremental-index.tolerant.test.ts
  - packages/knowledge/src/index-adapter/sqlite/sqlite-index.test.ts
  - packages/core/src/index-use-cases.test.ts
  - apps/cli/src/index.test.ts
---

# Tolerant indexing

## Purpose

Knowledge indexes Markdown documents independently of validation. Invalid YAML
frontmatter does not prevent a document's Markdown content from being searched
or block indexing of other documents in the same source.

## Scope

This spec covers `indexDocuments` and `indexDocumentChanges`, including their
use through Core and the CLI. Loader owns YAML parsing and parse diagnostics;
Validator owns document validation. Indexing does not validate DocType schemas
or run validator rules.

Test references below name the file and test that verify each requirement.
Missing dedicated coverage is stated explicitly.

## Requirements

### Frontmatter and searchable content

- **WHEN** a source contains documents with valid frontmatter, YAML syntax errors,
  and YAML conversion errors such as unresolved aliases,
  **THEN** both indexing entry points index the complete collection, and each
  document's Markdown content remains searchable.
  **Verified by:** [index-documents.test.ts](../../src/index/index-documents.test.ts),
  "rebuilds mixed frontmatter but preserves the index on a read failure", and
  [incremental-index.tolerant.test.ts](../../src/index/incremental-index.tolerant.test.ts),
  "indexes mixed frontmatter and replaces stale metadata through edits and deletion".

- **WHEN** frontmatter cannot be parsed or converted,
  **THEN** the indexed document has empty metadata and no DocType; partial
  frontmatter fields must not supply metadata filter matches.
  **Verified by:** the two mixed-frontmatter tests above check empty metadata and
  absent DocTypes. The incremental test also checks removal of an old metadata
  filter match after frontmatter becomes invalid.

- **WHEN** frontmatter is invalid,
  **THEN** indexing preserves the document's source, Markdown content, headings,
  links, and references. Frontmatter text need not be searchable as body content.
  **Verified by:** the incremental mixed-frontmatter test checks headings and
  content search; "reads tolerant Git documents at the diff revision instead of
  the working tree" in the same file checks content and source revision.
  Links and references have no dedicated invalid-frontmatter indexing test.

- **WHEN** validly parsed metadata violates a DocType schema, the DocType is
  missing or unknown, or the document violates a validator rule,
  **THEN** indexing still accepts the document and preserves its parsed metadata.
  **Verified by:** the mixed-frontmatter tests index an unknown DocType; the
  incremental test checks its metadata filter match. Schema violations and
  validator rule violations have no dedicated test in these suites.

### Updates and checkpoints

- **WHEN** a document changes from valid to invalid frontmatter,
  **THEN** indexing replaces its previous metadata and DocType, including old
  metadata filter matches. When it becomes valid again, its metadata is restored.
  **Verified by:** [incremental-index.tolerant.test.ts](../../src/index/incremental-index.tolerant.test.ts),
  "indexes mixed frontmatter and replaces stale metadata through edits and deletion".

- **WHEN** an indexed document is deleted,
  **THEN** the next incremental update removes it and its search matches.
  **Verified by:** the same test deletes a document after restoring valid
  frontmatter. Deletion while frontmatter is still invalid has no dedicated test.

- **WHEN** a mixed collection has been indexed successfully and is unchanged,
  **THEN** its next diff contains no changes and another incremental index run
  indexes zero documents.
  **Verified by:** the incremental mixed-frontmatter test and
  [CLI index.test.ts](../../../../apps/cli/src/index.test.ts),
  "indexes and searches malformed frontmatter while validate still fails".

### Git revisions

- **WHEN** the source diff identifies a Git commit,
  **THEN** indexing reads documents at that revision, including documents with
  invalid frontmatter, even when the working tree contains different content.
  **Verified by:** [incremental-index.tolerant.test.ts](../../src/index/incremental-index.tolerant.test.ts),
  "reads tolerant Git documents at the diff revision instead of the working tree".

### Operational failures and atomicity

- **WHEN** reading a document fails,
  **THEN** indexing fails before replacing or updating the index. Previously
  indexed documents and the source checkpoint remain unchanged.
  **Verified by:** the complete-rebuild mixed-frontmatter test checks that
  `replaceAll` is not called and existing content remains searchable; the
  incremental mixed-frontmatter test checks existing content and checkpoint.

- **WHEN** storing a source update fails,
  **THEN** document changes and the checkpoint roll back together.
  **Verified by:** [sqlite-index.test.ts](../../src/index-adapter/sqlite/sqlite-index.test.ts),
  "rolls back document mutations and checkpoint when a source update fails".
  The test induces a metadata serialization failure inside the transaction;
  it does not inject a database engine failure.

### Core, CLI, and validation

- **WHEN** Core prepares or syncs a source containing invalid frontmatter,
  **THEN** indexing succeeds, content remains searchable, and a subsequent diff
  reflects the successful checkpoint.
  **Verified by:** [index-use-cases.test.ts](../../../core/src/index-use-cases.test.ts),
  "prepares and syncs invalid frontmatter while validation still reports it".

- **WHEN** the CLI indexes a mixed collection containing malformed frontmatter,
  **THEN** `index` succeeds, `search` finds its body, and `diff` reports no changes.
  **Verified by:** [CLI index.test.ts](../../../../apps/cli/src/index.test.ts),
  "indexes and searches malformed frontmatter while validate still fails".

- **WHEN** frontmatter has parse diagnostics,
  **THEN** Knowledge does not persist those diagnostics or report them as
  operational index errors. Validation still reports them as document errors.
  **Verified by:** the Core integration test checks parse diagnostics and no
  operational errors; the CLI test checks that validation still exits with failure.
  Absence of persisted diagnostics has no dedicated test.
