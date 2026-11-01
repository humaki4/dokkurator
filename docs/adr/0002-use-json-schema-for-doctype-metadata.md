---
doctype: decision
title: Use JSON Schema for DocType metadata constraints
status: accepted
date: 2026-10-31
component: doctypes
tags: [doctype, json-schema]
---

# Use JSON Schema for DocType metadata constraints

## Context

DocTypes describe the metadata expected in a document's YAML frontmatter.
Constraints include required properties, value types, allowed values and
conditions between properties. A Dokkurator-specific constraint language would
require defining and maintaining those semantics and their composition.

DocTypes are a general document contract. Their metadata requirements must be
understandable independently of the library that loads them or the engine that
reports validation findings. Document structure and checks requiring other
documents or external information are outside this decision's scope.

## Decision

Use JSON Schema Draft 7 as the normalized contract for DocType metadata
constraints.

- Authoring supports full object or boolean schemas and the existing compact
  YAML field-map notation. Compact fields, including field-level boolean
  `required` markers, are expanded into JSON Schema before consumers receive
  the metadata definition. Loader currently owns this normalization.
- Express metadata constraints through schema keywords such as `required`,
  `type`, `enum`, `if`/`then` and composition, rather than duplicating them in a
  Dokkurator-specific metadata rule language.
- Draft 7 defines the supported dialect. It provides the required conditional
  and composed constraints. Changing that dialect requires an explicit
  compatibility decision.
- Schema constraints describe valid parsed metadata. Validation must not coerce
  types, insert defaults or remove properties; invalid data is reported rather
  than repaired.
- This contract does not prescribe an execution engine, rule configuration
  format or document-structure model. It does not remove the existing `rules`
  field from Loader's public API.

## Alternatives considered

### Dokkurator-specific metadata rules and condition language

This would allow a tailored syntax but require maintaining constraint semantics,
composition and tooling. JSON Schema already expresses the required metadata
constraints in a standard format.

### Accept only full JSON Schema at authoring time

This would avoid normalization but remove the existing compact authoring
notation. Retain that notation as input convenience while keeping one normalized
schema contract for consumers.

### Adopt a newer JSON Schema dialect

A newer dialect could provide additional features but would require a different
compatibility contract and corresponding consumer support. Use Draft 7 for the
current requirements.

## Consequences

- Metadata requirements use a standard constraint language independently of
  ESLint or a particular validation library. YAML parsing and schema validation
  remain separate concerns.
- Compact notation and full schemas converge on one consumer-facing model.
  Normalization must preserve the declared constraints consistently.
- Defaults do not populate documents during validation. Authors must supply
  values required by the schema.
- Consumers must support the selected dialect; schemas cannot assume features
  from newer dialects.
- Document structure and other validation requirements remain separate concerns.
- The validator's implementation choice is recorded in
  [Validate metadata with Ajv](../../packages/validator/docs/adrs/0002-validate-metadata-with-ajv.md).
