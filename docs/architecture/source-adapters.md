---
doctype: architecture
title: Source Adapters
status: draft
component: source-adapters
tags: [sources, adapters]
---

# Source Adapters

`Source Adapters` provide documents and source metadata to Dokkurator without exposing filesystem, Git or provider-specific APIs to the core libraries.

The source contract and local filesystem/Git implementations are owned by
`@dokkurator/doctype` and exported from its public package root. They are
organized under a dedicated source-adapter directory so the implementation can
be extracted deliberately later without creating an incidental package
boundary. Knowledge consumes DocType's generic loading contract and parsed
document model, not concrete source implementations.

They normalize different sources into a common input model for DocType, Validator and Knowledge.

## Technology

- TypeScript / Node.js
- adapter-based architecture
- common source interface
- provider-specific implementations
- local filesystem and Git as initial adapters
- remote providers such as GitLab and GitHub as separate integrations
- no parsing of Markdown or DocType semantics inside adapters

## Responsibilities

- discover documents
- read file content
- expose source metadata
- expose Git metadata where available
- detect changed, added and removed files
- provide stable source identifiers
- hide provider-specific APIs from core libraries

## Common interface

```ts
interface SourceAdapter {
  list(options?: ListOptions): Promise<SourceEntry[]>;

  read(id: SourceId): Promise<SourceDocument>;

  changes?(since: SourceRevision): Promise<SourceChanges>;
}
```

A source document is normalized before it reaches DocType:

```ts
type SourceDocument = {
  id: SourceId;
  path: string;
  content: string;

  source: SourceMetadata;
};
```

## Source metadata

Common metadata should stay independent of the concrete provider.

```ts
type SourceMetadata = {
  sourceId: string;
  kind: "filesystem" | "git" | "gitlab" | "github";

  repository?: string;
  path: string;

  git?: {
    root: string;
    headRevision?: string;
    branch?: string;
    fileRevision?: string;
    status:
      | "clean"
      | "modified"
      | "added"
      | "deleted"
      | "renamed"
      | "untracked"
      | "conflicted";
    committedAt?: Date;
    author?: {
      name?: string;
      email?: string;
    };
  };
};
```

`sourceId` identifies the configured source independently of a file path. It
can be supplied explicitly. Local adapters otherwise derive it from the
resolved root directory or the Git remote, falling back to the repository
root.

Repository-wide and file-specific Git revisions are deliberately distinct.
Provider implementations map their output to these Dokkurator-owned types and
do not expose library-specific models.

## Local filesystem adapter

Reads files directly from a directory.

```ts
const source = new FileSystemSource({
  root: "./docs",
});
```

Typical capabilities:

- recursive file discovery
- glob filtering
- file content
- path metadata
- modification timestamps

```text
docs/
├── decisions/
├── architecture/
└── requirements/
        ↓
FileSystemSource
        ↓
SourceDocument[]
```

## Local Git adapter

Uses the local repository in addition to filesystem access.

```ts
const source = new GitSource({
  root: process.cwd(),
});
```

Additional metadata includes:

```text
repository root
branch
commit SHA
last modifying commit
author
commit timestamp
working-tree state
```

The adapter uses `simple-git` internally. It lists tracked files and non-ignored
untracked files from the working tree. The architectural decision and evaluated
alternatives are documented in
[`ADR 0001`](../adr/0001-use-simple-git-for-local-git-access.md).

Core libraries only see normalized `SourceMetadata`.

## GitLab adapter

The GitLab adapter accesses repositories through the GitLab API.

```ts
const source = new GitLabSource({
  projectId,
  ref: "main",
  token,
});
```

Typical responsibilities:

- list repository files
- fetch file content
- resolve branches and commits
- retrieve commit metadata
- detect repository changes
- map GitLab project information to `SourceMetadata`

```text
GitLab API
    ↓
GitLabSource
    ↓
SourceDocument
    ↓
DocType
```

Authentication is provided by the consuming application.

The adapter receives a token but does not implement OAuth itself.

```ts
new GitLabSource({
  projectId,
  token: accessToken,
});
```

OAuth and user sessions belong to the Catalog Server.

## Change detection

Adapters may optionally support incremental synchronization.

```ts
type SourceChanges = {
  added: SourceId[];
  modified: SourceId[];
  removed: SourceId[];

  revision: SourceRevision;
};
```

Example:

```ts
const changes = await source.changes(previousRevision);
```

This allows the Catalog Server or CLI to update only affected documents.

```text
previous revision
      ↓
SourceAdapter.changes()
      ↓
added / modified / removed
      ↓
incremental re-index
```

Different adapters can implement this differently:

| Adapter    | Possible mechanism                          |
| ---------- | ------------------------------------------- |
| Filesystem | timestamps / file hashes                    |
| Local Git  | Git diff                                    |
| GitLab     | commits / compare API / webhook information |
| GitHub     | commits / compare API / webhook information |

## Stable source identity

Documents need a stable identifier independent of the local checkout path.

For example:

```ts
type SourceId = {
  source: string;
  repository: string;
  path: string;
};
```

Conceptually:

```text
gitlab:group/project:docs/architecture/auth.md
```

This identifier can be used by Knowledge for updates and deletions.

## Source adapters vs authentication

Source access and authentication are separate concerns.

```text
Catalog Server
   ├── OAuth / Session
   │       ↓
   │   Access Token
   │
   └── GitLabSource
           ↓
       GitLab API
```

The Catalog Server decides:

- which user is authenticated
- which credentials are used
- which repositories can be accessed

The adapter only performs source operations with the provided credentials.

## Extension model

Additional adapters implement the same interface.

```ts
class MySourceAdapter implements SourceAdapter {
  async list() {
    // ...
  }

  async read(id: SourceId) {
    // ...
  }
}
```

Possible future adapters:

```text
GitHub
Gitea
Forgejo
S3-compatible storage
Nextcloud
generic HTTP sources
```

## Boundaries

Source adapters do not:

- parse Markdown
- parse DocType definitions
- validate documents
- build the Knowledge model
- decide authorization policies
- maintain the index

Their responsibility ends once source content and normalized source metadata have been provided.
