# Dokkurator

Dokkurator is an open-source toolkit for structuring, validating and making distributed documentation accessible without moving it out of its original repositories.

The project follows a docs-as-code approach: documentation remains in open formats such as Markdown and YAML, while Dokkurator adds optional structure, validation and indexing on top.

The goal is to make distributed documentation easier to maintain, search, analyze and reuse — by humans, development tools and AI agents.

> **Development status**: Concept / Early Development
>
> Dokkurator is currently in an early concept and implementation phase.
> APIs, package boundaries, data models and configuration formats are still subject to change.

This repository currently serves both as the implementation workspace and as documentation of the project's architecture, design decisions and planned development.

Further documentation and concepts can be found in [docs-folder](./docs)
The project configuration format is documented in
[docs/configuration.md](./docs/configuration.md).

## Project structure

Dokkurator is organized as a monorepo containing reusable libraries and applications.

```text
.
├── apps/
│ └── cli/
├── packages/
│ ├── loader/   # source contracts and local source implementations
│ ├── validator/
│ └── knowledge/ # index contract and storage implementations
├── docs/
├── nx.json
├── package.json
└── pnpm-workspace.yaml
```

### Packages

- **@dokkurator/loader**
  Defines the basic model for describing document types, metadata, structure and validation requirements.

- **@dokkurator/validator**
  Validates documents against DocType definitions and rules.

- **@dokkurator/knowledge**
  Provides the foundation for indexing, relationships and querying distributed documentation.

### Applications

- **@dokkurator/cli**
  Command-line interface for using Dokkurator functionality locally, in CI pipelines or from automated tooling.
  See the [CLI README](./apps/cli/README.md) and the
  [command reference](./apps/cli/docs/commands.md) for configuration and usage.

- **@dokkurator/hub**
  A prototypical server application built on top of the Dokkurator libraries. It collects documentation from distributed repositories and provides centralized access, search and navigation across the resulting knowledge base.

### Development

#### Requirements

- Node.js
- pnpm

#### Install dependencies:

`pnpm install`

#### Common commands

`pnpm build` - Build all projects

`pnpm test` - Run tests

`pnpm typecheck` - Run TypeScript checks

`pnpm lint` - Run linting

`pnpm check` - Run the main checks together

`pnpm format` - Format the repository

### Monorepo

The repository uses:

- **pnpm workspaces** for dependency and workspace management
- **Nx** for task orchestration, dependency graphs and caching
- **TypeScript** for implementation
- **Vitest** for testing
- **ESLint** for static analysis
- **Prettier** for formatting

Internal packages use workspace dependencies, for example:

```text
{
    "dependencies": {
        "@dokkurator/loader": "workspace:*"
    }
}
```

Nx derives the project dependency graph from these package relationships.

Package boundaries are strict. Cross-package imports must use the dependency's
public root API; implementation folders are not separate packages unless
explicitly extracted by an architectural decision. See [AGENTS.md](./AGENTS.md)
for package-boundary and adapter-ownership rules.

The graph can be inspected with:
pnpm nx graph

## Contributing

Dokkurator is currently in an early development phase and contribution processes are still being established.

Contribution guidelines, public APIs and release processes will be documented as the project matures.

For now, architectural decisions and open questions are intentionally documented in the repository to make the development process transparent.
