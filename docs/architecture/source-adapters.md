---
doctype: architecture
title: Source Adapters
status: draft
component: source-adapters
tags: [sources, adapters]
---

# Source Adapters

`@dokkurator/loader` owns source contracts and the implemented filesystem/Git
adapters. Consumers import supported integrations through Loader's public root.
Knowledge uses generic loading contracts, not concrete adapters.

## Responsibilities

- List and read source files.
- Normalize source identity and provenance.
- Expose Git revisions and working-tree metadata where available.
- Calculate added, modified, and deleted files from a source checkpoint.

## Contracts

`DocumentSource` provides `list` and `read`, the minimum contract for loading.
`SourceAdapter` extends it with `getSourceId` and checkpoint-based `diff`.
`read` optionally accepts a committed revision. All types are exported from
`@dokkurator/loader`.

A `SourceDocument` contains `id`, `path`, `content`, and normalized `source`
metadata. `SourceId` is a string file identifier; `source.sourceId` identifies
the containing source. Knowledge combines source ID and path for index identity.

## Implemented adapters

`FileSystemSource` recursively lists regular files and reads their content.
Diffs use content hashes. Document filtering is applied by Loader's document
loading workflow; adapters do not interpret Markdown or DocTypes.

`GitSource` uses `simple-git` to list tracked and non-ignored untracked files,
read the working tree or committed revisions, and expose repository, branch,
commit, author, and working-tree status metadata. See
[Loader ADR 0001](../../packages/loader/docs/adr/0001-use-simple-git-for-local-git-access.md).

Git diffs currently compare committed revisions. Incremental indexing therefore
omits uncommitted and untracked changes, even though ordinary loading and
validation see those files. A repository without a first commit cannot supply
such a diff.

## Configured source lifecycle

Loader exposes `openConfiguredSource`, `prepareConfiguredSource`, and
`updateConfiguredSource`. Local sources are opened without updating Git.
Remote sources can be cloned into a managed checkout during preparation and
updated during sync using the local Git client and existing credentials.

Remote identity checks and update semantics still need hardening. The
[Git lifecycle task](../task/git-checkout-and-update-semantics.md) describes the
target contract; it is not the current implementation contract.

## Planned integrations

GitLab/GitHub API adapters and provider-specific permission metadata are not
implemented. Remote Git cloning today uses the Git client, not a provider API.
OAuth, sessions, and permission decisions belong to the consuming server;
adapters supply source operations and normalized metadata.

## Boundaries

- Do not parse Markdown, DocTypes, or validation rules inside adapters.
- Do not build or maintain the Knowledge index inside adapters.
- Keep provider-specific dependencies and behavior out of Knowledge.
- Keep authentication flows and authorization policy in the consuming application.
