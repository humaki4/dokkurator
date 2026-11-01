---
doctype: spec
title: Core project lifecycle
status: accepted
component: core
---

# Core project lifecycle

## Scope

This describes the implemented public Core contract. It does not introduce
configuration overrides, an interactive host or the proposed Git repair API.

## Lifecycle

- `createDokkurator({ root })` creates a closed app without I/O. `root` is the
  starting point for Config discovery, not a configuration override.
- `open()` resolves project configuration through Config and reports readiness
  per source. Missing checkouts do not themselves prevent opening. Invalid
  project configuration fails opening. No checkout, update or index is created.
- A repeated `open()` returns the existing open state. Use-cases require an open
  app. `close()` waits for started operations and closes the optional index;
  repeated closing is harmless. Reopening reloads project configuration.
- Concurrent mutating operations on one instance are rejected. Core does not
  implement cross-process locking or start watchers.

## Source workflows

`prepare({ sourceId? })` clones missing configured remote checkouts, leaves
existing checkouts unupdated, then initializes sources without an index checkpoint.
An empty successfully indexed source also receives a checkpoint. Missing local
sources are errors. Available source configuration is resolved through Config.

`sync({ sourceId? })` updates existing managed remote sources and delegates
incremental indexing to Knowledge. It never clones a missing checkout.
`diff({ sourceId? })` uses existing sources and does not update Git or persist a
new index checkpoint. `search(query, { sourceId?, limit? })` queries the index.

`listDocTypes`, `listDocuments` and `validate` use existing sources without
cloning, updating or requiring an index. `validate` collects document parse
findings, prepares Validator configuration and calls synchronous `lint` per
document. Source configuration and documents are reloaded for each validation;
project configuration changes require reopening.

Without configured sources, the project directory is the source `root`. An
optional `sourceId` restricts operations to one configured source; otherwise
all configured sources are considered.

## Results and resources

Source operations return `results` and `errors`; each operational error retains
source ID, phase, message and recovery guidance. Failure of one source does not
undo successful work for another. Search returns hits directly.

Validation results contain each source's documents with path, status, diagnostics
and suppressed diagnostics. Warnings alone pass. Operational failures are not
fabricated document findings. Output, formatting and exit codes belong to hosts.

The index is opened lazily for `prepare`, `sync`, `diff` and `search` and reused
until close. Validation and inspection do not require it. Indexing remains
independent of Validator findings; tolerant indexing of malformed YAML remains
an [open task](../../../../docs/task/index-invalid-documents.md).

## Verification

Existing tests: [lifecycle](../../src/lifecycle.test.ts),
[index workflows](../../src/index-use-cases.test.ts),
[validation](../../src/validation-use-cases.test.ts) and
[validation configuration](../../src/validation-use-cases.configuration.test.ts).
The [public types](../../src/types.ts) define the supported signatures.
