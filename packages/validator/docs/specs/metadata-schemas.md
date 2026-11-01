---
doctype: spec
title: Metadata schemas
status: draft
component: validator
tags: [validator, configuration, metadata]
tests:
  - packages/validator/src/schemas/schemas.integration.test.ts
  - packages/validator/src/doc-types/doc-types.errors.test.ts
---

# Metadata schemas

## Purpose

A DocType's `metadata` schema defines which document metadata is valid.
Preparation compiles the schema into a reusable, synchronous
`validateMetadata(metadata)` function.

## Scope

This spec covers schema support, supplied resources, and validation results.
Registry preparation is described in [Prepare DocTypes](prepare-doc-types.md).
Association is described in [DocType selection](doc-type-selection.md).
YAML parsing and findings from `dokkurator/metadata-schema` are outside this spec.

## Requirements

### Supported schemas

- **WHEN** a DocType provides an object schema without `$schema`,
  **THEN** it is interpreted as JSON Schema Draft 7.
  **Verified by:** `schemas.integration.test.ts`,
  "compiles the actual schema from a YAML-loaded ParsedDocType".

- **WHEN** a schema explicitly declares Draft 7 through the HTTP or HTTPS
  `json-schema.org/draft-07/schema` URI, with or without a trailing `#`,
  **THEN** preparation accepts that declaration.
  **Verified by:** no dedicated test yet.
  <!--TODO zu fein-->

- **WHEN** a schema declares another draft,
  **THEN** preparation throws `LintConfigurationError`.
  **Verified by:** `doc-types.errors.test.ts`,
  "rejects invalid or unresolved schemas before rule execution: %j" (Draft 2020-12).

- **WHEN** the metadata schema is `true`,
  **THEN** validation accepts any metadata.
  **Verified by:** `schemas.integration.test.ts`,
  "supports Draft 7 boolean schemas: %j" (empty object only).

<!--TODOzu fein?-->

- **WHEN** the metadata schema is `false`,
  **THEN** validation rejects any metadata.
  **Verified by:** `schemas.integration.test.ts`,
  "supports Draft 7 boolean schemas: %j" (empty object only).
  <!--TODO zu fein?-->

- **WHEN** a schema is invalid or uses an unknown keyword or format,
  **THEN** preparation throws `LintConfigurationError`.
  **Verified by:** `doc-types.errors.test.ts`,
  "rejects invalid or unresolved schemas before rule execution: %j".

- **WHEN** a schema requests asynchronous validation through `$async: true`,
  **THEN** preparation throws `LintConfigurationError`.
  **Verified by:** `doc-types.errors.test.ts`,
  "rejects invalid or unresolved schemas before rule execution: %j".

### Resources and references

- **WHEN** a schema references a supplied resource or a definition inside it,
  **THEN** validation uses that referenced schema.
  **Verified by:** `schemas.integration.test.ts`,
  "resolves supplied relative and internal references without resource loading".

- **WHEN** a `$ref` is relative,
  **THEN** it is resolved against the containing schema's base URI.
  **Verified by:** `schemas.integration.test.ts`,
  "resolves supplied relative and internal references without resource loading".

- **WHEN** a reference cannot be resolved from registered schemas,
  **THEN** preparation throws `LintConfigurationError` without fetching the resource.
  **Verified by:** `doc-types.errors.test.ts`,
  "rejects invalid or unresolved schemas before rule execution: %j" checks rejection.
  Absence of resource fetching has no dedicated test.

- **WHEN** registered schema identities repeat,
  **THEN** preparation throws `LintConfigurationError`.
  **Verified by:** `doc-types.errors.test.ts`,
  "rejects conflicting identities and legacy rule definitions" (two DocType schemas).

- **WHEN** a supplied resource's `$id` differs from its registration identity,
  **THEN** preparation throws `LintConfigurationError`.
  **Verified by:** `doc-types.errors.test.ts`,
  "rejects conflicting identities and legacy rule definitions".

### Validation

<!--TODO andere spec? ist validierung hier schon thema? es gibt ja eher um doctype validierung-->

- **WHEN** metadata satisfies the schema,
  **THEN** validation returns `valid: true` and an empty `errors` list.
  **Verified by:** `schemas.integration.test.ts`,
  "does not coerce values, inject defaults, remove fields or reuse error arrays".

- **WHEN** metadata violates the schema,
  **THEN** validation returns `valid: false` with structured schema errors.
  **Verified by:** `schemas.integration.test.ts`,
  "compiles the actual schema from a YAML-loaded ParsedDocType"
  (checks `keyword` and `params` for a missing required property).

- **WHEN** metadata has several schema violations,
  **THEN** validation collects multiple errors rather than stopping at the first.
  **Verified by:** `schemas.integration.test.ts`,
  "does not coerce values, inject defaults, remove fields or reuse error arrays"
  (two violations).

- **WHEN** a schema contains conditional requirements,
  **THEN** validation applies the matching condition's requirements.
  **Verified by:** `schemas.integration.test.ts`,
  "compiles the actual schema from a YAML-loaded ParsedDocType" (`if`/`then`).

- **WHEN** a schema declares a supported `format`,
  **THEN** validation checks that format.
  **Verified by:** `schemas.integration.test.ts`,
  "compiles the actual schema from a YAML-loaded ParsedDocType" (valid and invalid dates).

### Input and result isolation

<!--TODO andere spec? ist validierung hier schon thema? es gibt ja eher um doctype validierung-->

- **WHEN** a value has the wrong type,
  **THEN** validation does not convert it to the expected type.
  **Verified by:** `schemas.integration.test.ts`,
  "does not coerce values, inject defaults, remove fields or reuse error arrays".

- **WHEN** a property has a schema default,
  **THEN** validation does not insert the default into metadata.
  **Verified by:** `schemas.integration.test.ts`,
  "does not coerce values, inject defaults, remove fields or reuse error arrays".

- **WHEN** metadata contains disallowed additional properties,
  **THEN** validation leaves those properties in place.
  **Verified by:** `schemas.integration.test.ts`,
  "does not coerce values, inject defaults, remove fields or reuse error arrays".

- **WHEN** metadata contains inherited properties,
  **THEN** validation considers only its own properties.
  **Verified by:** `schemas.integration.test.ts`,
  "does not coerce values, inject defaults, remove fields or reuse error arrays"
  (inherited property is ignored for `additionalProperties`).

- **WHEN** the validator is called again,
  **THEN** previously returned error lists stay unchanged.
  **Verified by:** `schemas.integration.test.ts`,
  "does not coerce values, inject defaults, remove fields or reuse error arrays"
  checks the earlier list before the next call only; preservation after that call
  has no dedicated assertion.
