---
doctype: architecture
title: Validator
status: draft
component: validator
tags: [validation]
---

# Validator

`@dokkurator/validator` checks Markdown synchronously through ESLint and
`@eslint/markdown`. Ajv validates Frontmatter against JSON Schema Draft 7.
It has no runtime dependency on Knowledge and performs no cross-document queries.

## Validation flow

1. Loader provides DocType definitions; Core or the integrating application loads additional schemas and plugins.
2. `prepareLintConfiguration` prepares DocTypes, compiles schemas, and validates the ESLint configuration.
3. `lint` checks the original Markdown text with the prepared configuration and source metadata.
4. The result contains normalized diagnostics, severity, and original document positions.

`createDokkurator` and `app.validate()` coordinate these steps for a project
without opening a Knowledge index. Direct ESLint integration is also supported.
The [Validator README](../../packages/validator/README.md) documents the public
APIs; the [examples](../../examples/documentation/README.md) demonstrate both paths.

## Responsibilities

- Associate documents with DocTypes through the `doctype` Frontmatter field.
- Report malformed Frontmatter and unknown or missing DocTypes.
- Check metadata schemas and required headings.
- Execute recommended Markdown rules and imported custom ESLint rules.
- Return diagnostics with document positions for integrations and CI.

## Rules and configuration

DocTypes define metadata schemas and required headings in YAML. Compact field
maps normalize to JSON Schema. Conditions between metadata fields use JSON Schema
features such as `if`/`then`, rather than a separate rule language.

ESLint plugins, rule settings, and preloaded schemas belong in JavaScript
configuration. Legacy `rules.yml` definitions can still be parsed by Loader but
are rejected during Validator preparation. Templates are not processed yet.
See the [rule guide](../../packages/validator/docs/guides/rules.md).

## Planned work

Cross-document checks, resolved references, freshness checks, and indexed quality
reports require additional design and integration. They are not part of the
current synchronous validation contract. CLI validation and its runnable example
are also planned; project validation is already available through Core.

## Boundaries

- Validator receives loaded resources; it does not discover repositories or download schemas.
- Loader owns source access and document loading.
- Core owns project configuration and orchestration.
- Knowledge owns indexing and search; validation currently runs independently.
- Custom rules use the ESLint rule API, not a separate Dokkurator plugin contract.
