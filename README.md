# Dokkurator

Dokkurator is an early-stage toolkit for working with documentation distributed across repositories. It keeps Markdown and YAML in their source repositories and adds loading, DocType definitions, indexing, and search.

The project follows a docs-as-code approach: repositories remain the source of truth, while a local Knowledge index provides a derived view for querying documents across sources.

> **Development status**: Early development. APIs, package boundaries, data models, and configuration behavior may change. Some workspace applications are scaffolds, and document validation is not yet integrated into indexing.

## Getting started

- [Validation and Knowledge/Search example](./examples/documentation/README.md): validate and search the same document collection.
- [Project configuration](./docs/configuration.md): sources, paths, JavaScript configuration, and defaults.
- [CLI reference](./apps/cli/docs/commands.md): currently available commands.

## Concepts and architecture

- [Vision](./docs/concept/vision.md), [problem](./docs/concept/problem-statement.md), and [scope](./docs/concept/scope.md).
- [Core concepts](./docs/concept/coreconcepts.md) and [glossary](./docs/concept/glossary.md).
- [Architecture overview](./docs/architecture/overview.md): package responsibilities and implemented versus planned flows.
- [Core API](./packages/core/README.md): project workflows and validation.

## Decisions and development

- [Project decisions](./docs/adr/), [Loader decisions](./packages/loader/docs/adr/), and [Validator decisions](./packages/validator/docs/adrs/).
- [Development tasks](./docs/task/): implementation plans; an open task does not imply the feature is available.
- [Research](./docs/research/): exploratory notes, not API contracts or product promises.
- [Validator proposals](./packages/validator/docs/proposals/): designs under discussion; current usage is documented in the [Validator README](./packages/validator/README.md).

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
│   ├── documentation/
│   ├── minimal-validation/
│   └── eslint/
├── examples/
│   ├── documentation/
│   ├── minimal-validation/
│   └── eslint/
└── docs/
```

### Packages

- **@dokkurator/config** loads and validates `dokkurator.config.mjs` or `.dokkurator/config.yaml`, resolves project and source settings, and supports source configuration updates.
- **@dokkurator/core** orchestrates project validation, loading and index operations. `validate()` uses the Validator without opening a Knowledge index; see the [Core README](./packages/core/README.md).
- **@dokkurator/loader** owns source contracts and adapters, and loads/parses Markdown documents and DocType definitions. A DocType describes document metadata and structure; its definition may also provide rules and a template.
- **@dokkurator/knowledge** builds and updates the derived document index, provides SQLite storage, and exposes document queries and search.
- **@dokkurator/validator** provides synchronous Markdown validation through ESLint: DocType association, metadata schemas, required headings, and recommended Markdown rules. It is not yet connected to Knowledge indexing.

Each package can be consumed through its public package root. Package responsibilities and dependency rules are described in [AGENTS.md](./AGENTS.md).

Runnable [validation and search examples](./examples/documentation/README.md) demonstrate eight
DocTypes, compact and full JSON Schemas, valid and invalid documents, a custom
rule, Knowledge indexing and search, and direct ESLint integration. See [examples](./examples/README.md) for the
example collection.

### Applications

- **@dokkurator/cli** is the current local project interface. It manages and prepares configured sources and offers commands for indexing, diffing, searching, inspecting DocTypes/documents, and watching sources. Validation is available through the CLI, Core, and ESLint. See the [CLI README](./apps/cli/README.md) and [command reference](./apps/cli/docs/commands.md).
- **@dokkurator/catalog-server** is the scaffold for a Fastify server as a show case. Catalog routes are not implemented yet; see the [server README](./apps/catalog-server/README.md).
- **explorer-ui** is the placeholder for the show case ui, currently a React/Vite starter. It is not yet connected to Dokkurator catalog workflows.

## Project configuration

The CLI discovers project configuration from the current directory upwards or accepts a project root with `--project`. `dokkurator.config.mjs` takes precedence over `.dokkurator/config.yaml`; JavaScript configuration supports imported plugins and rules. Source-management commands persist source overrides in `.dokkurator/sources.yaml` for JavaScript projects. The configuration describes local or remote sources, document and DocType directories, the Knowledge index, and watch settings. See [docs/configuration.md](./docs/configuration.md) for the current format and defaults.

## Development

Requirements: Node.js `>=22.13.0 <23` or `>=24.0.0`, and pnpm `>=10 <11`.

```sh
pnpm install
pnpm build       # build all workspace projects
pnpm test        # run tests
pnpm typecheck   # run TypeScript checks
pnpm lint        # validate Dokkurator's own documentation and run workspace ESLint
pnpm lint:docs   # validate Dokkurator's own project documentation
pnpm check       # typecheck, lint, and test
pnpm format:check
```

Dokkurator uses its own Validator to check its project documentation. The root ESLint configuration applies the Validator's recommended plugin profile to `docs/**/*.md`, using the DocTypes in `_dokkurator/.doctypes`. It checks DocType association, metadata schemas, required headings, and recommended Markdown rules. `lint:docs` builds the Validator and its dependencies before running these checks; `lint` and `check` include them as well. Findings in the documentation fail these commands and can be addressed in the documents or DocType definitions. The root `lint:docs` command covers `docs/**/*.md`; package lint commands also check their own `docs/` directories. READMEs, templates, and example fixtures are outside this documentation profile.

Nx derives the project graph from workspace package relationships. To inspect it:

```sh
pnpm nx graph
```

Architectural decisions and open questions are documented in [`docs/`](./docs/).

## License

[MIT](./LICENSE), copyright 2026 Dokkurator contributors.
