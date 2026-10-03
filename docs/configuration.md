---
doctype: guide
title: Dokkurator configuration
status: accepted
tags: [configuration]
---

# Dokkurator configuration

each repository can describe its own documents and DocTypes.
Dokkurator uses `.dokkurator/config.yaml`. The project-root file contains
project-wide settings and selects repositories. A repository's own config file
contains only its document and DocType settings. The root file may also contain
`documents` and `doctypes` when the project root itself is a repository.

```yaml
version: 1

knowledge:
  index: .dokkurator/index.db

checkouts:
  directory: .dokkurator/checkouts

watch:
  debounce: 300

sources:
  - id: project
    path: .
  - id: handbook
    remote:
      url: git@github.com:example/handbook.git
      branch: main
```

Repository-local config in `../application/.dokkurator/config.yaml` or
`<checkout>/.dokkurator/config.yaml` can set `documents` and `doctypes`:

```yaml
documents:
  directory: docs
  include: ["**/*.md"]
  exclude: ["drafts/**", "**/*.generated.md"]

doctypes:
  directory: _dokkurator/.doctypes
```

## Scope and paths

`knowledge.index`, `checkouts.directory`, and source `path` values are
relative to the project root. Document and DocType directories and patterns
are relative to their repository root. A remote source without a path is
checked out below `checkouts.directory/<source-id>`.

## Resolution order

For repository settings, the central Dokkurator application resolves values in
this order:

1. built-in defaults;
2. the active repository's `.dokkurator/config.yaml`.

For project-wide settings, the root config replaces built-in defaults.
Repository settings from the project-root file apply only when that root is
itself the active repository. More-specific values replace defaults; exclude
patterns are not implicitly combined. The central `dokkurator` CLI does not
override these settings with command-line options.

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
inclusion.

## Library packages

Loader and Knowledge do not expose standalone CLIs. The global `dokkurator`
CLI reads this configuration through Core and does not provide temporary
overrides for these settings.

## Credentials

Secrets never belong in this file. Remote Git sources use the local Git
credential helper, SSH agent, and SSH configuration. CI must configure Git
credentials before invoking Dokkurator.

## Core validation

`createDokkurator({ root })` resolves configuration through this package. Core
uses the project directory as source `root` when no sources are configured; the
low-level resolver enables this explicitly with `defaultSource: true`.
`open()` and `validate()` do not open a Knowledge index.

In `dokkurator.config.mjs`, `validator` accepts imported `plugins`, JavaScript
`rules` and preloaded `schemas` keyed by absolute URI. Project values are merged
with repository values; repository rule and schema entries override matching
project entries. Different plugin instances under one namespace are rejected.
See the [Core README](../packages/core/README.md) for a complete example.
