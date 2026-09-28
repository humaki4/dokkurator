# Dokkurator configuration

Dokkurator uses `.dokkurator/config.yaml`. The same format is used at two
levels: the workspace config selects repositories and operational settings;
each repository can describe its own documents and DocTypes.

```yaml
version: 1

documents:
  directory: docs
  include: ["**/*.md"]
  exclude: ["drafts/**", "**/*.generated.md"]

doctypes:
  directory: _dokkurator/.doctypes

knowledge:
  index: .dokkurator/index.db

checkouts:
  directory: .dokkurator/checkouts

watch:
  debounce: 300

sources:
  - id: application
    path: ../application
  - id: handbook
    remote:
      url: git@github.com:example/handbook.git
      branch: main
    config:
      documents:
        directory: published
```

## Scope and paths

`knowledge.index`, `checkouts.directory`, and source `path` values are
relative to the workspace root. Document and DocType directories and patterns
are relative to the corresponding repository root. A remote source without a
path is checked out below `checkouts.directory/<source-id>`.

## Resolution order

For every source, Dokkurator resolves values in this order:

1. built-in defaults;
2. workspace content defaults;
3. the repository's own `.dokkurator/config.yaml`;
4. the source's `config` override in the workspace;
5. an explicit CLI option.

Exclude patterns from workspace, repository, and source overrides are combined.
Other values use the most specific configured value.

## Defaults

| Setting               | Default                                                             |
| --------------------- | ------------------------------------------------------------------- |
| `documents.directory` | `.`                                                                 |
| `documents.include`   | `**/*.md`                                                           |
| `documents.exclude`   | `.git/**`, `.dokkurator/**`, `.nx/**`, `node_modules/**`, `dist/**` |
| `doctypes.directory`  | `_dokkurator/.doctypes`                                             |
| `knowledge.index`     | `.dokkurator/index.db`                                              |
| `checkouts.directory` | `.dokkurator/checkouts`                                             |
| `watch.debounce`      | `300` ms                                                            |

Include and exclude entries are glob patterns. An exclusion wins over an
inclusion. Repository configurations may add exclusions but cannot remove
workspace exclusions.

## Local package CLIs

`dokkurator-doctype` and `dokkurator-knowledge` search upward for the same
configuration file and use its document, DocType, and index settings. Their
command-line options and environment variables remain temporary overrides.

## Credentials

Secrets never belong in this file. Remote Git sources use the local Git
credential helper, SSH agent, and SSH configuration. CI must configure Git
credentials before invoking Dokkurator.
