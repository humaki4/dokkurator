---
doctype: decision
title: Run local document checks through ESLint
status: accepted
date: 2026-10-31
component: validator
tags: [validator, eslint]
---

# Run local document checks through ESLint

## Context

The validator must check Markdown documents against their DocType: frontmatter
metadata, document structure, and further project rules. A Dokkurator-owned rule
engine would require maintaining rule registration, configuration, execution and
editor integration.

Checks that need only one document, its DocType and prepared configuration can
use an existing linting ecosystem. Checks that need other documents or external
information are outside the scope of this decision.

## Decision

Document-local checks run as ESLint rules on Markdown.

- `@eslint/markdown` provides Markdown parsing and generic rules. Dokkurator
  provides rules for DocType association, metadata validation and required
  headings.
- Configuration uses ESLint flat config. Rule severity, options and suppression
  comments follow ESLint conventions. Other plugins can be added if they support
  the configured Markdown language.
- DocTypes continue to declare validation requirements through metadata schemas
  and document structure. ESLint rules implement the checks; their activation,
  severity and options are configured through ESLint. The validator rejects
  non-empty legacy DocType `rules` arrays. Loader still reads that format and
  exposes it in its public model; this decision does not remove that API.
- Metadata constraints follow the separate decision
  [Use JSON Schema for DocType metadata constraints](../../../../docs/adr/0002-use-json-schema-for-doctype-metadata.md);
  its validator implementation is described in
  [Validate metadata with Ajv](0002-validate-metadata-with-ajv.md).
- Document-local rule execution is synchronous, matching ESLint's execution
  model. DocTypes, referenced schemas and plugin modules are supplied before
  checking; the validator does not resolve external resources during a check.
- Unknown rules, invalid options and unresolved schema references are
  configuration errors, separate from findings in a document.
- Direct ESLint usage and the validator API share configuration construction.
  Given the same original text, document path, prepared DocTypes and rule
  configuration, they must produce equivalent findings.

This decision does not specify the execution model, configuration, suppression
mechanism or API for cross-document or external-information checks.

## Alternatives considered

### Dokkurator-owned rule engine

A dedicated engine could define its own rule contract for local and
cross-document checks. It would also require maintaining rule configuration,
execution and editor integration. Rejected for document-local checks because
ESLint already provides these capabilities and an established plugin ecosystem.

### Existing frontmatter schema plugin

Reusing an existing frontmatter schema plugin would reduce custom code. The
current implementation instead uses a Dokkurator rule to connect prepared
DocTypes and schemas to ESLint and to map YAML schema errors to source
positions. This keeps the integration under Dokkurator's control, at the cost
of maintaining that mapping and its tests.

## Consequences

- Users can configure local checks through familiar ESLint conventions and use
  compatible editor and CI integrations.
- Validation requirements remain in DocTypes; the previous DocType rule format
  is not executed by the validator. Existing non-empty rule arrays must be
  migrated before those DocTypes can be used with it.
- When a document is first parsed by Loader and then checked by the validator,
  its Markdown is parsed again by ESLint. The current validator receives
  original text rather than reusing Loader's AST. Direct ESLint usage does not
  require a preceding Loader parse.
- The combined path incurs additional Markdown and YAML frontmatter parsing.
  Parser configuration and interpretation must remain compatible. Diagnostics
  and fixes must refer to the unchanged original text, including its line
  endings and BOM. The runtime cost has not been quantified here.
- ESLint version upgrades can require integration changes and compatibility
  checks. Custom rules and source-position mapping remain maintenance work.
- Cross-document validation requires a separate design decision. No conclusions
  about asynchronous execution or support for suppression comments follow from
  choosing ESLint for local checks.
