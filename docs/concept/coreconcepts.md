---
doctype: concept
title: Core Concepts
status: draft
audience: [contributors, users]
tags: [concepts]
---

# Core Concepts

Dokkurator is built around three main concepts: DocType, Validator, and Knowledge.
These describe the product model. See the [README status table](../../README.md#current-status)
for the implemented scope. Loader owns source access and parsing; Core coordinates
the libraries and project configuration.

## DocType

A DocType describes the expected structure and semantics of a document.

It can define:

- metadata in YAML Frontmatter,
- an optional Markdown template,
- required headings and metadata constraints,
- identifiers and references.

DocTypes are domain-specific and can be created independently of Dokkurator.
Templates and semantic reference handling are planned. Executable ESLint rules
are currently configured in JavaScript outside the DocType definition.

## Validator

The Validator checks documents against their DocType and configured rules.

The current rule system uses ESLint and imported ESLint plugins. Cross-document
checks are planned.

## Knowledge

Knowledge turns distributed documents into a searchable and connected representation.

It currently provides indexing, full-text search, and metadata queries across
sources. Resolved relationships, reference resolution, and graphical navigation
are planned.

The index is derived data. Markdown files and their repositories remain the source of truth.

## CLI

The CLI exposes the core functionality without requiring a graphical application.

Typical use cases include:

- validating documentation locally,
- validation in CI pipelines,
- building or updating an index,
- querying documentation,
- providing structured context to scripts and AI agents.

## Central reference application

Catalog Server and Explorer UI form the planned central reference application
built on the reusable components. Earlier notes call it “Hub”. Both applications
are currently scaffolds; the following describes their intended behavior.

It collects documentation from distributed repositories and provides central access for humans through search, navigation, relationships, and documentation health information.

Initially, it can operate on local repositories. Later integrations may connect remote Git platforms and reuse their authentication and permissions.

The central application provides a view over the underlying repositories; they
remain the source of truth.

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
                 CLI       Catalog + Explorer (planned)
```

Libraries can also be integrated directly into other applications, editor plugins, CI workflows, or AI tooling.
