---
doctype: spec
title: DocType selection
status: draft
component: validator
tags: [validator, configuration]
tests:
  - packages/validator/src/doc-types/select-doc-type.test.ts
  - packages/validator/src/schemas/schemas.integration.test.ts
---

# DocType selection

## Purpose

The prepared registry selects a DocType from document metadata through
`selectDocType(metadata)`. It uses `doctype` to choose the definition and checks
an optional `$schema` annotation against that definition.

## Scope

This spec covers selection from already parsed metadata. Preparing the registry
is described in [Prepare DocTypes](prepare-doc-types.md). YAML parsing, ESLint
findings, and metadata schema validation belong to separate specs.

Unless another file is named, test references below refer to
[select-doc-type.test.ts](../../src/doc-types/select-doc-type.test.ts).
Existing tests call selection through `prepareLintConfiguration`, which uses the
same prepared registry.

## Requirements

### Frontmatter

<!--TODO andere spec? ist validierung hier schon thema? spec geht ja eher um dcotype auswahl?-->

- **WHEN** metadata is `undefined`,
  **THEN** selection returns `missing-frontmatter`.
  **Verified by:** "makes invalid association %j visible".

- **WHEN** metadata is null, a scalar, or an array,
  **THEN** selection returns `invalid-frontmatter`.
  **Verified by:** "makes invalid association %j visible" (null, string, array).
  Other scalar types have no dedicated test.

### DocType name

- **WHEN** metadata has no own `doctype` property,
  **THEN** selection returns `missing-doctype`.
  **Verified by:** "makes invalid association %j visible" and
  "allows a matching $schema but never selects a DocType through it"
  (including an inherited `doctype`).

- **WHEN** `doctype` is an empty string or is not a string,
  **THEN** selection returns `invalid-doctype`.
  **Verified by:** "makes invalid association %j visible" (empty string, number).
  Other non-string values have no dedicated test.

- **WHEN** `doctype` does not exactly match a registered name,
  **THEN** selection returns `unknown-doctype`.
  **Verified by:** "makes invalid association %j visible" (unknown name).
  Case and whitespace differences have no dedicated test.

- **WHEN** `doctype` matches a registered name and no own `$schema` is present,
  **THEN** selection returns that prepared DocType.
  **Verified by:** [schemas.integration.test.ts](../../src/schemas/schemas.integration.test.ts),
  "compiles the actual schema from a YAML-loaded ParsedDocType".

### Schema annotation

- **WHEN** metadata contains `$schema` without `doctype`,
  **THEN** selection returns `missing-doctype`.
  **Verified by:** "allows a matching $schema but never selects a DocType through it".

- **WHEN** a known DocType has an own `$schema` that is not a non-empty absolute
  URI without whitespace or a non-empty fragment,
  **THEN** selection returns `invalid-schema-annotation`.
  **Verified by:** "makes invalid association %j visible" (number, relative URI).
  Empty strings, whitespace, and non-empty fragments have no dedicated test.

- **WHEN** `$schema` ends with an empty fragment (`#`),
  **THEN** selection compares the identity without that trailing `#`.
  **Verified by:** "allows a matching $schema but never selects a DocType through it".

- **WHEN** a valid `$schema` identity differs from the selected DocType's schema identity,
  **THEN** selection returns `schema-conflict`.
  **Verified by:** "makes invalid association %j visible".

- **WHEN** `$schema` matches the selected DocType's schema identity,
  **THEN** selection returns that prepared DocType.
  **Verified by:** "allows a matching $schema but never selects a DocType through it"
  (checks successful status only).

- **WHEN** `$schema` is inherited rather than an own property,
  **THEN** selection ignores it.
  **Verified by:** no dedicated test yet.

### Result and validation order

- **WHEN** selection succeeds,
  **THEN** the result has `status: "selected"` and a `docType` entry.
  **Verified by:** [schemas.integration.test.ts](../../src/schemas/schemas.integration.test.ts),
  "compiles the actual schema from a YAML-loaded ParsedDocType".

- **WHEN** selection fails,
  **THEN** the result has `status: "invalid"`, a selection `code`, and a `message`.
  **Verified by:** "makes invalid association %j visible" checks status and code.
  The message field has no dedicated selection test.

- **WHEN** both `doctype` and `$schema` are invalid,
  **THEN** selection reports the `doctype` problem first.
  **Verified by:** no dedicated test yet.

- **WHEN** a known DocType's metadata requirements are not met but its association is valid,
  **THEN** selection still succeeds.
  **Verified by:** "allows a matching $schema but never selects a DocType through it"
  (required `title` and `status` are absent).
