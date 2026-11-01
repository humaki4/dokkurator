---
doctype: decision
title: Validate metadata with Ajv
status: accepted
date: 2026-11-01
component: validator
tags: [validator, ajv, json-schema]
---

# Validate metadata with Ajv

## Context

The general decision
[Use JSON Schema for DocType metadata constraints](../../../../docs/adr/0002-use-json-schema-for-doctype-metadata.md)
defines Draft 7 as the normalized metadata contract and requires validation
without data mutation. The validator consumes that contract; it does not define
the DocType format.

The validator needs an implementation that evaluates these schemas, resolves
supplied schema references before checking documents and exposes structured
errors that can be mapped to frontmatter positions. Local checks run through
[ESLint](0001-run-local-checks-through-eslint.md) and need synchronous rule
execution with prepared resources.

## Decision

Use Ajv to compile and evaluate DocType metadata schemas, with `ajv-formats` for
standard format checks.

- Compile the supplied schemas and referenced resources during configuration
  preparation. Reject invalid schemas, unsupported dialects and unresolved
  references as configuration errors, separately from document findings.
- Require all schema resources to be supplied beforehand. Do not fetch resources
  or execute asynchronous schema checks during document validation.
- Collect all schema errors. Disable type coercion, default insertion and
  removal of additional properties, preserving the DocType contract's
  non-mutating validation semantics.
- Apply the prepared validator to parsed YAML frontmatter through a Dokkurator
  ESLint rule. Map Ajv errors back to the original YAML source positions using
  `yaml`; ESLint supplies rule execution, severity and suppression behavior.
- Keep schema compilation and evaluation separate from ESLint reporting so the
  metadata contract is not tied to the lint integration.

## Alternatives considered

### Implement JSON Schema evaluation in Dokkurator

This would duplicate standard validation semantics and require maintaining
reference resolution, composition and error handling. Use an existing schema
validator instead.

### Use another JSON Schema validator

Another implementation could satisfy the same contract. Ajv is already used by
Loader for DocType parsing and provides schema compilation, synchronous
validation and structured errors suitable for the current integration. Choosing
it also avoids introducing another schema-validation implementation.

### Resolve schema references while checking documents

This would make checks depend on resource availability and potentially require
asynchronous work during ESLint rule execution. Prepare a complete resource
snapshot before checking instead.

## Consequences

- Schema compilation is preparation work that can be reused across documents.
  Callers must supply all referenced resources before validation starts.
- Invalid configuration is distinguished from metadata that fails a valid
  schema. Document validation does not change the parsed values.
- Ajv, `ajv-formats` and YAML source-position mapping require compatibility
  checks and maintenance. Error mapping remains Dokkurator-owned code.
- A different schema evaluator can replace Ajv if it preserves the general
  DocType contract and the validator's supported behavior.
- This decision specifies metadata checking only. It does not determine the
  execution or configuration of cross-document checks.
