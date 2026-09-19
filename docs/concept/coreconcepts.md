# Core Concepts

Dokkurator is built around three main concepts: DocType, Validator, and Knowledge.

## DocType

A DocType describes the expected structure and semantics of a document.

It can define:

- metadata in YAML Frontmatter,
- an optional Markdown template,
- optional validation rules,
- identifiers and references.

DocTypes are domain-specific and can be created independently of Dokkurator.

## Validator

The Validator checks documents against their DocType and configured rules.

The rule system should be extensible, similar to linting tools such as ESLint or Spectral.

## Knowledge

Knowledge turns distributed documents into a searchable and connected representation.

It provides:

- indexing and queries,
- document relationships and reference resolution,
- navigation across repository boundaries.

The index is derived data. Markdown files and their repositories remain the source of truth.

## CLI

The CLI exposes the core functionality without requiring a graphical application.

Typical use cases include:

- validating documentation locally,
- validation in CI pipelines,
- building or updating an index,
- querying documentation,
- providing structured context to scripts and AI agents.

## Hub

The Hub is a reference application built on top of the reusable components.

It collects documentation from distributed repositories and provides central access for humans through search, navigation, relationships, and documentation health information.

Initially, it can operate on local repositories. Later integrations may connect remote Git platforms and reuse their authentication and permissions.

The Hub is not the source of truth for documentation; it provides a view over the underlying repositories.

## Composition

```text
                    ┌─────────┐
                    │ DocType │
                    └────┬────┘
                         │
                ┌────────┴────────┐
                ▼                 ▼
           Validator          Knowledge
                │                 │
                └────────┬────────┘
                         │
                  ┌──────┴──────┐
                  ▼             ▼
                 CLI           Hub
```

Libraries can also be integrated directly into other applications, editor plugins, CI workflows, or AI tooling.
