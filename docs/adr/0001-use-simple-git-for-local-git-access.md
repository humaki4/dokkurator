---
doctype: decision
title: Use simple-git for local Git access
status: accepted
date: 2026-09-20
component: source-adapters
tags: [git, source-adapters, dependencies]
---

# Use simple-git for local Git access

## Context

Dokkurator loads DocTypes and documents through a `SourceAdapter`. In addition
to plain directories, the CLI must recognize local Git working trees and expose
repository and per-file Git metadata. Core loading and parsing code must remain
independent of the concrete adapter.

The source adapter contract and its local implementations are owned by
`@dokkurator/loader`, which exports the supported source API from its package
root. DocType loading and parsing still depend only on the generic source
contract. The local adapter needs to:

- detect a Git working tree and find its repository root;
- enumerate tracked and untracked, but non-ignored, files;
- read the current branch and HEAD revision;
- obtain the last commit, author and commit time for a file; and
- determine the working-tree status of a file.

## Decision

Use `simple-git` as the implementation dependency of the local `GitSource`.
DocType uses it to determine whether the supplied directory belongs to a Git
working tree and selects either `GitSource` or `FileSystemSource`. Core loading
functions continue to receive only the `DocumentSource` interface.

`simple-git` delegates to the locally installed Git executable. This matches the
semantics developers already observe in the same checkout, including Git
configuration, ignore rules, worktrees and repository formats. It provides a
typed asynchronous API for common operations and permits narrowly scoped raw
Git commands where no suitable high-level operation exists.

The adapter maps Git output to Dokkurator-owned metadata types. No `simple-git`
type crosses the public `SourceAdapter` boundary. This keeps replacement of the
Git implementation localized.

## Alternatives considered

### Invoke Git directly with child processes

This has no additional runtime dependency, but Dokkurator would need to own
process execution, argument handling, concurrency, error normalization and the
parsing of several Git responses. `simple-git` already provides these concerns
and still allows use of Git's stable machine-readable commands.

### isomorphic-git

`isomorphic-git` is a pure JavaScript Git implementation and can run without a
Git executable, including in browsers. Dokkurator's adapter is explicitly local
and CLI-based, so browser support is not required. Reimplementing Git behavior
in JavaScript also adds complexity where matching the installed Git client is
preferable.

### @napi-rs/simple-git

The native implementation offers high performance and direct repository access,
but introduces platform-specific binary packages. The expected documentation
repositories do not currently justify that deployment cost. It can be
reconsidered if measurements show Git process startup to be a bottleneck.

## Consequences

- A compatible `git` executable must be available to use `GitSource`.
- Local Git behavior follows the installed Git version and configuration.
- Ignored untracked files are not exposed by `GitSource`; non-ignored untracked
  documents remain visible and carry the `untracked` status.
- Branch is absent for detached HEAD checkouts.
- File history is queried separately from working-tree state. `fileRevision`
  therefore describes the latest commit touching the path, while `status`
  describes local changes to the content being read.
- Git metadata remains normalized and implementation-independent at the public
  adapter boundary.
