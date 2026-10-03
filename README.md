# Dokkurator

Dokkurator is an early-stage toolkit for working with documentation distributed across repositories. It keeps Markdown and YAML in their source repositories and adds loading, DocType definitions, indexing, and search.

The project follows a docs-as-code approach: repositories remain the source of truth, while a local Knowledge index provides a derived view for querying documents across sources.

> **Development status**: Early development. APIs, package boundaries, data models, and configuration behavior may change. Some workspace applications are scaffolds, and document validation is not yet integrated into indexing.

This repository contains the implementation workspace as well as architecture notes, decisions, and development plans. Browse the [documentation](./docs/) or read the [project configuration guide](./docs/configuration.md).

## Workspace

The repository is a pnpm monorepo orchestrated with Nx.

```text
.
├── apps/
│   ├── catalog-server/
│   ├── cli/
│   └── explorer-ui/
├── packages/
│   ├── config/
│   ├── core/
│   ├── knowledge/
│   ├── loader/
│   └── validator/
├── examples/
│   └── validator/
└── docs/
```

### Packages

- **@dokkurator/config** loads and validates `.dokkurator/config.yaml`, resolves project and source settings, and supports source configuration updates.
- **@dokkurator/core** orchestrates project validation, loading and index operations. `validate()` uses the Validator without opening a Knowledge index; see the [Core README](./packages/core/README.md).
- **@dokkurator/loader** owns source contracts and adapters, and loads/parses Markdown documents and DocType definitions. A DocType describes document metadata and structure; its definition may also provide rules and a template.
- **@dokkurator/knowledge** builds and updates the derived document index, provides SQLite storage, and exposes document queries and search.
- **@dokkurator/validator** provides synchronous Markdown validation through ESLint: DocType association, metadata schemas, required headings, and recommended Markdown rules. It is not yet connected to Knowledge indexing.

Each package can be consumed through its public package root. Package responsibilities and dependency rules are described in [AGENTS.md](./AGENTS.md).

Runnable [Validator examples](./examples/validator/README.md) demonstrate eight
DocTypes, compact and full JSON Schemas, valid and invalid documents, a custom
rule, and direct ESLint integration. See [examples](./examples/README.md) for the
example collection; Knowledge examples are planned separately.

### Applications

- **@dokkurator/cli** is the current local project interface. It manages and prepares configured sources and offers commands for indexing, diffing, searching, inspecting DocTypes/documents, and watching sources. See the [CLI README](./apps/cli/README.md) and [command reference](./apps/cli/docs/commands.md).
- **@dokkurator/catalog-server** is a Fastify service that currently exposes its OpenAPI contract. Catalog routes are not implemented yet; see the [server README](./apps/catalog-server/README.md).
- **explorer-ui** is currently the React/Vite starter application. It is not yet connected to Dokkurator catalog workflows.

## Project configuration

The CLI discovers `.dokkurator/config.yaml` from the current directory or accepts a project root with `--project`. The configuration describes local or remote sources, document and DocType directories, the Knowledge index, and watch settings. See [docs/configuration.md](./docs/configuration.md) for the current format and defaults.

## Development

Requirements: Node.js `>=22.13.0 <23` or `>=24.0.0`, and pnpm `>=10 <11`.

```sh
pnpm install
pnpm build       # build all workspace projects
pnpm test        # run tests
pnpm typecheck   # run TypeScript checks
pnpm lint        # validate project docs and run workspace ESLint
pnpm lint:docs   # validate only the project documentation
pnpm check       # typecheck, lint, and test
pnpm format:check
```

The root ESLint configuration uses the Validator's recommended plugin profile
for `docs/**/*.md`, with DocTypes loaded from `_dokkurator/.doctypes`. It checks
DocType association, metadata schemas, required headings, and recommended
Markdown rules. `lint:docs` builds the Validator and its dependencies first;
`lint` and `check` include this documentation validation. Existing documentation
findings fail these commands and can be corrected in the documents or DocType
definitions. Package READMEs, templates, and example fixtures are outside this
project documentation scope.

Nx derives the project graph from workspace package relationships. To inspect it:

```sh
pnpm nx graph
```

Architectural decisions and open questions are documented in [`docs/`](./docs/).
