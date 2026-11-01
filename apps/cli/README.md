# @dokkurator/cli

The central command-line application for a Dokkurator project. It manages
configured documentation repositories and combines the public functionality
of DocType and Knowledge under the `dokkurator` command.

## Quick start

In the workspace:

```bash
pnpm install
pnpm --filter @dokkurator/cli build
pnpm --filter @dokkurator/cli start -- --help
```

Configure and index a project with two local repositories:

```bash
dokkurator source add . --id project
dokkurator source add ../shared-docs --id shared-docs
dokkurator source list
dokkurator prepare
dokkurator index
dokkurator search "architecture decision"
```

## Project configuration

The CLI supports `dokkurator.config.mjs` at the project root for imported
plugins and Validator rules. This file takes precedence over the legacy YAML file:

```text
<project-root>/.dokkurator/config.yaml
```

Project and repository rules and their merge behavior are described in the
[Config documentation](../../packages/config/README.md). For JavaScript projects,
source administration commands store the effective source list in
`.dokkurator/sources.yaml` without overwriting JavaScript code.

Unless explicitly specified, the CLI searches upward from the working directory
for configuration. The global `--project <directory>` option explicitly selects
the root:

```bash
dokkurator --project /work/documentation source list
```

Configuration contains stable source IDs and paths relative to the project root:

```yaml
sources:
  - id: project
    path: .
  - id: shared-docs
    path: ../shared-docs
```

The derived Knowledge index is stored by default at:

```text
<project-root>/.dokkurator/index.db
```

`.dokkurator/config.yaml` is user configuration. `index.db` and its SQLite
companion files are generated data and should normally not be versioned.

Document and DocType directories, the index path and watch debounce are controlled
only through project or repository configuration. The CLI offers no temporary
override options for these settings.

## Documentation

The complete reference for commands, arguments, options, defaults and effects
is in [docs/commands.md](./docs/commands.md). It also describes using existing
Git/SSH credentials for remote sources.

The decision on shared project orchestration is documented in
[Core orchestration](../../packages/core/docs/adrs/0001-coordinate-project-workflows-in-core.md).

## Development

```bash
pnpm --filter @dokkurator/cli typecheck
pnpm --filter @dokkurator/cli lint
pnpm --filter @dokkurator/cli test
pnpm --filter @dokkurator/cli build
```

Tests live alongside the source file they cover, for example
`src/command.test.ts` next to `src/command.ts`.
