---
doctype: task
title: Git checkout and update semantics
status: open
---

# Git checkout and update semantics

Status: draft, not yet implemented

Dependency: [Core lifecycle](../../packages/core/docs/specs/project-lifecycle.md)

## Goal

Define an unambiguous Loader contract for opening, preparing and updating
configured Git sources. In particular, no operation may unexpectedly overwrite
existing local state, use a remote other than the configured one or delegate
Git-specific decisions to Core or the CLI.

This document describes target behavior. It does not change any public API or
claim that the current implementation already satisfies this contract.

## Scope and terminology

A **local source** has no `remote` in project configuration. Its path is opened
only as an existing local source. Even if the path is a Git repository,
Dokkurator neither clones nor updates it.

A **managed checkout** belongs to a source with a configured `remote.url`.
Dokkurator prepares its target path and updates it during explicit sync.
The remote, branch and update rules below apply only to this source type.

A **valid checkout** is an existing Git working-tree root at exactly the
configured path. A subdirectory of a parent repository is not a valid checkout.
Git worktrees are valid if Git reports the configured path itself as the top
level. Bare repositories are not valid checkouts because documents are read
from a working tree.

The configured **checkout identity** consists of source ID, normalized
`remote.url` and optional `remote.branch`. Source ID continues to determine
domain identity in the index; remote and branch determine the permitted local
Git state for it.

## Ownership model and use cases

The decisive boundary is who controls a directory's state, rather than whether
it uses Git:

> Without `remote`, local state belongs to the user. With `remote`, the checkout
> belongs to Dokkurator.

| Source type                  | Typical use case                                             | Owner of local state | Dokkurator behavior                                                    |
| ---------------------------- | ------------------------------------------------------------ | -------------------- | ---------------------------------------------------------------------- |
| Local filesystem without Git | Manually maintained documents, export or generated directory | User                 | Read and index files                                                   |
| Local Git repository         | Active development directory                                 | Developer            | Read the working tree and use Git metadata, but never change Git state |
| Managed remote Git           | Retrieve external documentation automatically                | Dokkurator           | Create, validate and synchronize the checkout                          |

Local filesystem and local Git are not different configuration types. Both
are declared with a local `path` and without `remote`. Loader detects Git only
to provide richer metadata and suitable change detection. Users do not need
to configure this technical distinction.

A managed remote Git checkout is deliberately not a development directory.
Its path is restricted to `checkouts.directory/<source-id>` and is treated as
a recoverable cache. Users and other processes may read it but must not modify
it. A user may delete the entire checkout and recreate it through `prepare`;
Dokkurator still must not delete or replace it without an explicit repair request.

## Principles

1. `open` reads only existing local state. It does not clone, fetch, switch
   branches or modify Git configuration.
2. `prepare` creates a missing managed checkout by cloning. An existing valid
   checkout is only validated, not updated.
3. `sync` updates only an existing valid managed checkout. It does not clone
   a missing checkout.
4. Dokkurator does not merge, rebase, reset, stash or clean.
5. An update is exclusively a fast-forward of the intended local branch to
   the explicitly fetched remote branch.
6. Validation errors are detected before the first mutating Git operation
   whenever possible using local state.
7. Loader owns validation, Git commands and error classification. Core only
   orchestrates `prepare` and `sync`; CLI presents structured errors.
8. For local sources, `sync` only captures and indexes current filesystem or
   working-tree state. It is not Git synchronization.

## Operations

### Opening

A local source path can be opened if it is a directory. Loader selects a Git
or filesystem adapter based on local state as before. A missing path produces
`missing-local-source`.

For local Git repositories, all ordinary developer states are permitted:
another branch, detached HEAD, local commits, index and working-tree changes,
and non-ignored files. Dokkurator never performs clone, fetch, pull, checkout,
reset, stash, clean or changes to remotes and branches there.

Reading and indexing a local Git source must use the same visible truth:
the current working tree, including non-ignored local changes. Commit-based
Git diffs may be used as an optimization, but must not cause `list` or `read`
to show a different version from the Knowledge index. The specific incremental
strategy for uncommitted and untracked files will be coordinated with the
already planned source-diff work during implementation.

For a managed checkout, `open` checks only that:

- The path exists as a directory.
- The path itself is the root of a non-bare Git working tree.
- `origin` exists and its fetch URL matches the configured URL.
- If a branch is configured, exactly that branch is checked out.
- If no branch is configured, the checked-out branch matches the remote default
  branch recorded during clone.

`open` requires no network access. It therefore checks neither remote
reachability nor whether the local branch is current. Local changes are allowed
when merely opening: listing and reading must continue to reflect the working
tree, including non-ignored changes.

An identity error must not be reported as a missing checkout. The path exists
but cannot safely be attributed to the configured source; preserve the specific
cause of failure.

### Preparation

`prepare` distinguishes target-path states:

| Target path state                                      | Behavior                                       |
| ------------------------------------------------------ | ---------------------------------------------- |
| Path missing                                           | Clone the remote into the target path          |
| Empty directory                                        | Treat as missing; clone may use this directory |
| Nonempty non-Git directory                             | Abort; neither delete nor overwrite contents   |
| File or other non-directory entry                      | Abort                                          |
| Valid matching checkout                                | Open unchanged                                 |
| Git repository with incorrect/missing `origin`         | Abort; do not automatically rewrite the remote |
| Matching checkout on the wrong branch or detached HEAD | Abort; do not switch branches in `prepare`     |

Cloning with a configured branch checks out exactly that branch. If it does
not exist on the remote, `prepare` fails with a configuration or remote error.
Without a configured branch, Git uses the remote's default branch. The default
branch identified during clone remains authoritative for all later updates to
this checkout; a branch subsequently checked out externally does not become
the new default. The result must be an attached local branch with an upstream
pointing to the corresponding `origin` branch.

A failed clone must not leave an apparently valid partial checkout. If Git
has created a new target directory that clearly belongs to the current clone,
Loader should clean it up. Previously existing paths or contents are never
cleaned up.

### Updating

Before updating, `sync` asks Loader to perform the same identity checks as
`open`. The working tree must additionally be completely clean. Local changes
include modifications in the index or working tree and non-ignored untracked
files. Ignored files do not block updates.

The following order then applies:

1. Determine the intended branch: the configured branch or the remote default
   branch identified during clone.
2. Ensure HEAD is not detached and exactly that branch is checked out.
3. Ensure `origin` matches the configured URL.
4. Fetch only the intended branch from `origin`.
5. Ensure the remote branch exists.
6. Determine the relationship between local HEAD and `origin/<branch>`.
7. Fast-forward the local branch only if it is strictly behind.

The outcome depends on the revision relationship:

| Revision relationship                | Outcome                       |
| ------------------------------------ | ----------------------------- |
| Local and remote are identical       | Success without change        |
| Local is an ancestor of remote       | Fast-forward to remote state  |
| Remote is an ancestor of local       | Abort: local branch is ahead  |
| Both sides contain their own commits | Abort: branches have diverged |
| Relationship cannot be determined    | Abort with Git cause          |

A general `git pull` is therefore outside the target semantics. In particular,
user-specific or repository-specific pull configuration must not trigger merge
or rebase. Nor is an arbitrary tracking branch used: the update source is
always the `origin` branch derived from configuration and the branch defined above.

If fast-forward fails after a successful fetch, the local branch remains
unchanged; updated remote-tracking refs are permitted as an unavoidable local
fetch effect. After a successful update, the working tree must remain clean
and HEAD must match the fetched remote commit.

Other processes may read a managed checkout. Concurrent writes during
`prepare`, `sync` or repair are unsupported. The implementation must serialize
these writing operations at least within one Dokkurator instance; whether
an additional cross-process lock is required remains a detailed design decision.

## Force-push detection and repair

A failed fast-forward does not automatically identify a force-push. The same
revision relationship can result from local commits or rewritten remote
history. Diagnosis therefore uses three revisions:

- Local HEAD before fetch.
- The state of `origin/<branch>` before fetch.
- The state of `origin/<branch>` after fetch.

If local HEAD before fetch matches the previous remote state and the new remote
state is not its descendant, published history has been reset or rewritten.
Classify this as `remote-history-rewritten`. If local HEAD already differs
from the previous remote state, the managed checkout was changed locally;
depending on the revision relationship, the error is `local-commits` or
`diverged`. If the previous remote state is unavailable on the first verifiable
sync, the cause cannot be reliably distinguished and remains `diverged`.

Loader should additionally record the last successfully synchronized commit
as managed checkout metadata. This keeps diagnosis stable even if remote-tracking
refs have since been modified or deleted. This technical metadata belongs to
checkout state, not to the domain source ID or Knowledge index.

Rewritten remote history is not automatically adopted through reset. An
explicit **repair mode** is planned for this purpose, with these semantics:

1. Verify the target path is under the resolved `checkouts.directory` and maps
   exactly to the selected source ID.
2. Verify this is a managed checkout; abort if identity is unclear or the path
   is outside the checkout directory.
3. Fully create and validate a new checkout of the configured URL and intended
   branch at a temporary sibling path.
4. Replace the existing checkout only after successful validation.
5. On failure, leave the existing checkout unchanged and remove the temporary
   checkout in a controlled manner.

Repair mode discards all manual changes and local commits in the previous
managed checkout. It must therefore be triggered by a dedicated explicit
Core/CLI operation or clearly named repair flag; normal `prepare` or `sync`
must never enable it implicitly. CLI and documentation must warn about data
loss and show source ID and target path. The final API and confirmation design
will be defined during implementation; libraries and non-interactive hosts
need explicit opt-in without hidden prompts.

## URL and origin validation

Comparison may normalize obviously equivalent spellings but must not guess
network identity. At minimum, the following are permitted:

- Removing a trailing `/`.
- Treating a trailing `.git` as equivalent.
- Normalizing local filesystem paths and `file://` URLs to an absolute canonical
  path where locally resolvable.

Different hosts, users, ports or repository paths remain distinct. The
implementation only needs to normalize SCP-style SSH URLs and `ssh://` as
equivalent when this is unambiguous without losing host, user, port or path.
Credentials and tokens must not appear in errors.

If `origin` is missing or its fetch URL does not match, abort the operation.
Dokkurator does not automatically add or change remotes. A different push URL
is irrelevant to reading and updating.

## Branch rules

An explicitly configured branch is binding. Dokkurator does not silently switch
from another branch during `prepare` or `sync`, because that could alter local
work or the view selected by the user. The error directs users to check out
the branch manually or correct configuration.

Without a configured branch, the remote default is determined during clone
and recorded as the checkout's managed branch. Later changes to the remote
default or currently checked-out branch do not automatically alter this choice.
The managed branch must have a branch of the same name on `origin`; a differently
named or missing upstream is not automatically created. Detached HEAD prevents
opening or updating managed checkouts. It remains valid for local sources
because Dokkurator does not manage them.

## Unexpected changes in managed checkouts

Local changes in a managed checkout block only Git updates, not opening or
reading. This also applies when fast-forward would technically be possible
without file conflicts. Dokkurator does not decide whether local changes
should be discarded, committed or stashed. In a local source, the same changes
are ordinary user state and are indexed.

A clean local branch with additional local commits is likewise not updated.
Even if the remote is unchanged, `sync` reports the branch as ahead so a
managed checkout cannot silently become a local publishing or development branch.

## Error contract

Git lifecycle errors should be public, machine-readable Loader errors with
`sourceId`, a cause safe to display and a stable reason code. Planned reasons:

| Reason                     | Meaning                                         | Recommended action                                   |
| -------------------------- | ----------------------------------------------- | ---------------------------------------------------- |
| `missing-checkout`         | Managed checkout is missing                     | Run `prepare` for the source                         |
| `missing-local-source`     | Local source is missing                         | Correct the path or configuration                    |
| `checkout-path-conflict`   | Target is a file or nonempty non-Git directory  | Resolve the path manually                            |
| `invalid-checkout`         | Path is not a suitable Git working-tree root    | Resolve checkout/path manually                       |
| `missing-origin`           | `origin` is missing                             | Add the remote manually or prepare again             |
| `origin-mismatch`          | `origin` does not match the configured URL      | Correct configuration or checkout                    |
| `branch-mismatch`          | Another branch is checked out                   | Switch branches manually or correct configuration    |
| `detached-head`            | Managed checkout has detached HEAD              | Check out the branch manually                        |
| `dirty-worktree`           | Local changes prevent update                    | Commit, stash or discard changes                     |
| `missing-remote-branch`    | Intended branch does not exist on remote        | Correct branch/remote configuration                  |
| `local-commits`            | Local branch is ahead of remote                 | Publish commits manually or repair checkout          |
| `diverged`                 | Local and remote histories have diverged        | Deliberately merge/rebase/reset manually             |
| `remote-history-rewritten` | Published remote history was reset or rewritten | Use explicit repair mode or correct the remote       |
| `authentication-failed`    | Remote access was denied                        | Check credential helper, SSH agent or CI credentials |
| `remote-unavailable`       | Remote could not be reached                     | Check network/remote and sync again                  |
| `git-command-failed`       | Other Git error                                 | Show the safe original cause and check Git state     |

Core forwards this classification per source in structured `prepare`/`sync`
results. It derives no Git actions from it. CLI may add brief recovery guidance
but must not start interactive repair. Output must redact credentials from URLs
and Git error messages.

## Result contract

For successful operations, Loader should return a structured result alongside
the adapter so Core need not infer what happened from Git state:

- `open`: existing source opened.
- `prepare`: `local`, `existing` or `created`.
- `sync`: `unchanged` or `fast-forwarded`; fast-forward additionally includes
  old and new revisions.
- Repair: `recreated`, plus old revision, new revision and repaired target path.

The exact TypeScript representation belongs to later implementation. These
terms define semantics; existing Core results must be mapped to them during
implementation.

## Non-goals

- Automatically repairing or replacing incorrect checkouts; explicitly
  requested, guarded repair remains permitted.
- Supporting freely configurable remote names instead of `origin`.
- Push, merge, rebase, reset, stash, clean or conflict resolution.
- Updating local sources without a configured remote.
- Switching branches in an existing checkout.
- Shallow or partial clone strategies as part of this contract.
- Arbitrary placement of managed remote checkouts outside
  `checkouts.directory/<source-id>`.

## Planned internal refactoring

The current implementation partly combines reading local Git sources and
managing remote checkout lifecycle in `git-source.ts`. The ownership model
suggests internal separation without new workspace packages or public export
subpaths. All source contracts and implementations remain in
`@dokkurator/loader`, respecting package boundaries, and continue to be exported
only through its public root API.

One possible internal structure:

```text
source-adapter/
  filesystem/
    file-system-source.ts
  git/
    git-source.ts
    git-working-tree.ts
  remote-git/
    managed-checkout.ts
    checkout-metadata.ts
    remote-url.ts
  source-adapter.ts
  source-diff.ts
```

`git/` owns only reading and describing an existing working tree.
`remote-git/` owns clone, validation, fetch, fast-forward, force-push diagnosis
and repair. `filesystem/` owns reading local directories without Git.
Shared contracts stay at the `source-adapter/` level; a remote implementation
must not be coupled to Core through a new package export.

Moving directories is not an end in itself. Before implementation, check which
files actually have independent responsibilities. Small helpers can remain
in their module. Separate responsibilities and testable operations matter,
rather than maximizing file count.

## Test matrix

Implementation requires at least the following focused Loader tests:

### Opening

- Missing managed checkout and missing local source.
- A local non-Git directory opens as a filesystem source.
- A local Git repository opens without mutation regardless of remote, branch,
  detached HEAD, local commits or dirty state.
- Repository exactly at the path versus a subdirectory of another repository.
- Bare repository and file at the checkout path.
- Matching, missing and mismatched `origin`.
- Explicitly matching/wrong branch and detached HEAD.
- A dirty working tree remains readable and unchanged by `open`.

### Preparation

- Clone into a missing path and an existing empty directory.
- Abort on a nonempty non-Git directory without changing contents.
- Clone with an explicit branch and with the remote default branch.
- The default branch identified during clone remains binding for later syncs,
  even if the remote default or locally checked-out branch changes.
- Missing remote branch and authentication/network errors.
- Repeated `prepare` on a matching checkout without fetch or HEAD changes.
- An existing incorrect checkout is neither reconfigured nor replaced.
- Failed clone protects previously existing paths and cleans up only its own
  incomplete target path.

### Updating

- Identical state produces `unchanged`.
- A clean branch that is behind is only fast-forwarded.
- Index changes, working-tree changes and untracked files block updates;
  ignored files alone do not.
- Local commits and diverged history produce different reasons.
- Remote history rewritten between two fetches produces
  `remote-history-rewritten`; a HEAD that already differed locally is not
  incorrectly diagnosed as a force-push.
- Wrong branch, detached HEAD and missing remote branch.
- Merge/rebase pull configuration does not affect the outcome.
- Failure after fetch does not change HEAD or working tree.
- URL errors contain no credentials.

### Repair

- Repair is possible only for the exact managed path under
  `checkouts.directory/<source-id>`.
- Local sources and paths outside the checkout directory are never deleted
  or replaced.
- Dirty state and local commits are discarded only after explicit repair requests.
- A fully validated temporary clone replaces the old checkout.
- Failed clone or validation leaves the existing checkout unchanged and removes
  only its own temporary path.
- After successful repair, origin, branch, HEAD and stored checkout metadata
  are consistent.

### Core integration

- `open` and read-only use-cases cause no Git network or checkout side effects.
- `prepare` clones only missing managed checkouts and does not update existing ones.
- `sync` updates existing checkouts and does not clone missing ones.
- Local-source `sync` performs no Git network or working-tree mutations and
  indexes visible file state.
- Repair requires explicit opt-in and is reported as `recreated`.
- A source error does not prevent processing other sources; reason and recovery
  guidance remain in the structured result.

## User documentation

Implementation is complete only when public documentation explains the
ownership model. At minimum, update `docs/configuration.md`, Loader documentation
and CLI documentation or command help consistently.

User documentation must explain at least:

- When to configure only `path` and when to configure `remote`.
- That local filesystem and local Git use the same configuration type.
- That Dokkurator never updates a local Git repository or changes its branch
  or working tree.
- That a remote checkout lives exclusively under
  `checkouts.directory/<source-id>`, is managed by Dokkurator and is not a
  development directory.
- That managed checkouts can be deleted as caches and recreated through `prepare`.
- Which operations `open`, `prepare`, `sync` and repair perform.
- Why dirty state, local commits, branch mismatches and force-pushes cause
  operations on managed checkouts to abort.
- That repair replaces the existing managed checkout including manual changes
  and must therefore be explicitly confirmed or requested.
- How credentials are supplied and that they must appear neither in
  configuration nor error output.

A short configuration example should illustrate the normal case:

```yaml
sources:
  - id: local-docs
    path: ../my-project

  - id: external-docs
    remote:
      url: https://example.com/docs.git
      branch: main
```

The first entry may be an ordinary directory or developer checkout and remains
entirely under user control. Dokkurator manages the second entry at
`checkouts.directory/external-docs`.

## Detailed decisions open before implementation

- Whether Loader prevents failed clone directories atomically through a
  temporary sibling directory or cleans them up in a controlled manner.
- Whether updates need protection against concurrent processes through a
  Dokkurator lock.
- Which URL normalizations beyond the guaranteed minimum above are supported.
- Where and in which format the default branch selected during clone and last
  successfully synchronized revision are stored atomically.
- Whether a managed branch additionally needs a matching Git upstream, or the
  recorded branch together with `origin/<branch>` is sufficient. The update
  source remains explicit in either case.
- Whether repair is offered as a dedicated Core/CLI operation or an explicit
  `prepare` option, and how CLI confirmation works.

## Work plan

### 1. Finalize public semantics and types

- Represent ownership in Loader types without introducing a second
  configuration source.
- Define structured results for opening, preparation, sync and repair.
- Define stable Loader errors with safe causes and reason codes.
- Decide storage location and format for branch and last-sync metadata.

### 2. Separate Loader internals by responsibility

- Decouple filesystem reading, local Git reading and managed checkout lifecycle
  according to the proposed internal structure.
- Keep existing public Loader root exports compatible or deliberately migrate
  them through a documented API change.
- Continue respecting workspace dependencies and package boundaries; in
  particular, do not import internal Loader paths from Core.

### 3. Correct and protect local sources

- Keep filesystem/Git detection entirely local and non-mutating.
- Align working-tree semantics across `list`, `read`, `diff` and indexing,
  including uncommitted and untracked files.
- Never modify local sources through Git commands in `prepare` or `sync`.

### 4. Implement managed checkout lifecycle

- Validate target path, origin, branch and checkout metadata.
- Implement clone with an explicit branch or remote default determined once.
- Implement fetch and explicit fast-forward without `git pull`.
- Classify dirty state, local commits, divergence and rewritten remote history
  separately.

### 5. Implement guarded repair

- Restrict repair to the exact managed checkout path.
- Fully validate a temporary clone before replacing the existing checkout.
- Handle failures without losing the existing checkout.
- Add explicit Core/CLI invocation and data-loss warnings.

### 6. Integrate Core and CLI

- Integrate Core only through the public Loader root API.
- Forward per-source results and errors without changing their structure.
- Add CLI output and recovery guidance without moving Git decisions or
  automatic repair into the CLI.

### 7. Complete tests and documentation

- Implement this document's complete test matrix at Loader and Core levels.
- Run focused tests, typechecks and builds for affected packages.
- Search for moved implementations and stale imports.
- Update user documentation and CLI help according to the section above.

## Acceptance criteria

| ID    | Criterion                                                                                                                                            |
| ----- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| AK-01 | A source without `remote` is treated as a user-managed local source; Git detection changes neither repository nor working tree.                      |
| AK-02 | For local filesystem and Git sources, `sync` indexes visible file state without fetch, pull, checkout or other Git mutations.                        |
| AK-03 | A source with `remote` resides exclusively under resolved `checkouts.directory/<source-id>` and is treated as a Dokkurator-managed cache.            |
| AK-04 | `open` performs no network access, cloning or updating and reports distinct identity errors.                                                         |
| AK-05 | `prepare` clones only a missing managed checkout; an existing matching checkout is neither fetched nor modified.                                     |
| AK-06 | Clone without a configured branch uses the remote default at that time and records that choice for later syncs.                                      |
| AK-07 | `sync` uses fetch plus explicit fast-forward and is unaffected by Git pull, merge or rebase configuration.                                           |
| AK-08 | Dirty state, local commits ahead of remote, divergence and demonstrably rewritten remote history produce distinct stable reason codes.               |
| AK-09 | Force-push is detected by comparing the known old remote/sync state with post-fetch state; ambiguous cases are not incorrectly labeled force-pushes. |
| AK-10 | Normal `prepare` and `sync` never delete, reset, stash or overwrite an existing checkout.                                                            |
| AK-11 | Repair requires explicit opt-in and is possible only for the exact assigned managed checkout; local sources are excluded.                            |
| AK-12 | Failed repair preserves the existing checkout; successful repair returns `recreated` and a fully validated new checkout.                             |
| AK-13 | Other processes may read managed checkouts; concurrent Dokkurator writes are prevented at least within one instance.                                 |
| AK-14 | Git-specific decisions and implementations remain in `@dokkurator/loader`; Core and CLI import only its public root API.                             |
| AK-15 | Error output contains no credentials or tokens and offers clear recovery guidance for each reason.                                                   |
| AK-16 | Focused Loader/Core tests, typechecks and builds pass, with no stale internal imports after refactoring.                                             |
| AK-17 | Configuration, Loader and CLI documentation consistently explain the three use cases, ownership, cache behavior and destructive effects of repair.   |

## Expected outcome of later implementation

- Public Loader operations without hidden clone/update side effects.
- A deterministic, nondestructive contract Core can use for `prepare()` and `sync()`.
- No Git-specific decision logic in Core or CLI.
- Machine-readable errors and results instead of callers interpreting Git messages.
