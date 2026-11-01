---
doctype: spec
title: Prepare DocTypes
status: draft
component: validator
tags: [validator, configuration]
tests:
  - packages/validator/src/doc-types/doc-types.errors.test.ts
  - packages/validator/src/schemas/schemas.integration.test.ts
  - packages/validator/src/eslintPlugin/eslintPlugin.integration.test.ts
---

# Prepare DocTypes

## Purpose

`prepareDocTypes(definitions, schemas?)` turns parsed DocType definitions into a
reusable registry. It prepares configuration before documents are checked.

Usage is described in the [ESLint plugin guide](../guides/eslint-plugin.md).
This spec describes current behavior. Test references below use paths relative
to `src/`; most existing tests exercise preparation through
`prepareLintConfiguration`, which calls `prepareDocTypes`.

## Scope

This spec covers the registry, definition snapshots, schema identities, and
preparation failures. Keep two related behaviors in separate specs:

- **Metadata schemas:** supported schema syntax, references, validation results,
  and whether validation changes document metadata.
- **DocType selection:** selecting by `doctype`, checking `$schema`, and selection
  errors for missing or invalid frontmatter.

ESLint rule configuration and document findings are outside this spec.

## Requirements

### Registry

- **WHEN** definitions are prepared,
  **THEN** the registry contains one entry per definition.
  **Verified by:** [schemas.integration.test.ts](../../src/schemas/schemas.integration.test.ts),
  "compiles the actual schema from a YAML-loaded ParsedDocType" (one definition).

- **WHEN** several definitions are prepared,
  **THEN** registry entries follow the input order.
  **Verified by:** no dedicated test yet. <!--TODO-->

- **WHEN** an entry is prepared,
  **THEN** it provides `definition`, `schemaId`, and `validateMetadata`.
  **Verified by:** [schemas.integration.test.ts](../../src/schemas/schemas.integration.test.ts),
  "compiles the actual schema from a YAML-loaded ParsedDocType".

- **WHEN** definitions are prepared,
  **THEN** the registry provides `selectDocType` for document association.
  **Verified by:** [schemas.integration.test.ts](../../src/schemas/schemas.integration.test.ts),
  "compiles the actual schema from a YAML-loaded ParsedDocType".

- **WHEN** no definitions are supplied,
  **THEN** the registry has no entries.
  **Verified by:** no dedicated test yet.

- **WHEN** the registry is supplied as `settings.dokkurator`,
  **THEN** the public ESLint plugin can use it to check documents.
  **Verified by:** [eslintPlugin.integration.test.ts](../../src/eslintPlugin/eslintPlugin.integration.test.ts),
  "manual root-import configuration, helper and facade agree".

### Stable definitions

- **WHEN** preparation succeeds,
  **THEN** the registry holds deeply frozen copies of the definitions.
  **Verified by:** [schemas.integration.test.ts](../../src/schemas/schemas.integration.test.ts),
  "keeps prepared schemas independent of later input changes" (metadata schema
  freezing only; other fields have no dedicated test).

<!--TODO muss das so tief spezifiziert werden?-->

- **WHEN** input definitions change after preparation,
  **THEN** prepared behavior stays unchanged.
  **Verified by:** [schemas.integration.test.ts](../../src/schemas/schemas.integration.test.ts),
  "keeps prepared schemas independent of later input changes" (metadata schema
  changes only; other fields have no dedicated test).

<!--TODO muss das so tief spezifiert werden?-->

- **WHEN** preparation succeeds,
  **THEN** the registry, its entry list, and each entry are frozen.
  **Verified by:** no dedicated test yet.

### Schema identities

The generated HTTPS identity identifies a schema; it does not promise a
downloadable schema at that address.

- **WHEN** a definition declares a metadata schema `$id`,
  **THEN** that identity is used for its prepared schema.
  **Verified by:** [schemas.integration.test.ts](../../src/schemas/schemas.integration.test.ts),
  "compiles the actual schema from a YAML-loaded ParsedDocType".

- **WHEN** a definition has no metadata schema `$id`,
  **THEN** its identity is
  `https://dokkurator.dev/doctypes/<encoded-name>/metadata.schema.json`.
  `<encoded-name>` is the name encoded with `encodeURIComponent`.
  **Verified by:** [schemas.integration.test.ts](../../src/schemas/schemas.integration.test.ts),
  "keeps prepared schemas independent of later input changes" (name `decision`
  only; encoded names have no dedicated test).

  <!--TODO-->

### Preparation failures

- **WHEN** a definition has an empty name,
  **THEN** preparation throws `LintConfigurationError`.
  **Verified by:** no dedicated test yet.

- **WHEN** DocType names repeat or a definition contains legacy `rules`,
  **THEN** preparation throws `LintConfigurationError`.
  **Verified by:** [doc-types.errors.test.ts](../../src/doc-types/doc-types.errors.test.ts),
  "rejects conflicting identities and legacy rule definitions".

- **WHEN** a DocType schema or a supplied schema resource cannot be prepared,
  **THEN** preparation throws `LintConfigurationError` before documents are checked.
  **Verified by:** [doc-types.errors.test.ts](../../src/doc-types/doc-types.errors.test.ts),
  "rejects invalid or unresolved schemas before rule execution: %j" and
  "rejects conflicting identities and legacy rule definitions".

- **WHEN** an unused supplied schema resource cannot be prepared,
  **THEN** preparation still throws `LintConfigurationError`.
  **Verified by:** [doc-types.errors.test.ts](../../src/doc-types/doc-types.errors.test.ts),
  "also compiles unused supplied resources".

- **WHEN** preparation wraps an error,
  **THEN** the message starts with `Invalid DocType or schema configuration:`.
  **Verified by:** no dedicated test yet.

- **WHEN** preparation wraps an error,
  **THEN** the original error is available as `cause`.
  **Verified by:** no dedicated test yet.

<!--TODO kann das nicht zusammengefasst werden?-->
