---
doctype: spec
title: Required headings rule
status: draft
component: validator
tags: [validator, rules]
tests:
  - packages/validator/src/rules/required-headings-rule/required-headings-rule.test.ts
  - packages/validator/src/rules/required-headings-rule/required-headings-rule.integration.test.ts
  - packages/validator/src/rules/required-headings-rule/required-headings-rule.configuration.test.ts
---

# Required headings rule

## Purpose

A DocType can demand that its documents contain certain headings, so that
documents of one type share a recognizable structure. The rule
`dokkurator/required-headings` reports headings that a document lacks.

User-facing usage is described in the [rule reference](../../guides/rules.md).
Each requirement names the test that verifies it. Test names start with the
requirement title. File names are shortened to the part after
`required-headings-rule.`.

## Requirements

### Declaration

- **WHEN** a DocType lists strings in `structure.requiredHeadings`, **THEN**
  each of them is a required heading.
  Verified by: `test.ts`, "Findings: reports the missing ..." cases.
- **WHEN** a DocType has no such list, **THEN** its documents have no heading
  requirements.
  Verified by: `test.ts`, "Declaration: has no requirements without
  requiredHeadings".

### Matching

- **WHEN** a heading of any level, in ATX or setext syntax, or inside a block
  quote, has the required text after trimming surrounding whitespace, **THEN**
  the requirement is met.
  Verified by: `test.ts`, "Matching: accepts headings of any level", "accepts
  setext headings", "accepts headings in block quotes".
- **WHEN** the heading text contains formatting (emphasis, a link, inline
  code), **THEN** the visible text is compared.
  Verified by: `test.ts`, "Matching: compares the visible text of ..." cases.
- **WHEN** the text appears only in a paragraph or a code block, or differs in
  case, **THEN** the requirement is not met.
  Verified by: `test.ts`, "Matching: running text is not a heading", "is
  case-sensitive", "a code block is not a heading".

### Order and repetition

- **WHEN** required headings appear in a different order than declared,
  **THEN** no finding is reported.
  Verified by: `test.ts`, "Order and repetition: ignores order and repeated
  headings".
- **WHEN** a heading appears more than once, **THEN** no finding is reported.
  Verified by: `test.ts`, "Order and repetition: ignores order and repeated
  headings".

### Findings

- **WHEN** required headings are missing,
  **THEN** one finding per heading is
  reported, in declaration order.
  **Verified by:** `test.ts`, "Findings: reports the missing ..." cases.

- **WHEN** declared entries are equal after trimming,
  **THEN** they count as
  one heading.
  **Verified by:** `test.ts`, "Findings: counts declared entries equal after
  trimming once".

- **WHEN** a finding is reported,
  **THEN** its message reads
  `DocType <name> requires heading "<heading>".`
  **Verified by:** `test.ts`, "Findings: reports the missing ..." cases
  (`messageId` and data).

### Applicability

- **WHEN** the document has no frontmatter, invalid YAML, or no known DocType,
  **THEN** the rule reports nothing. These problems belong to
  `dokkurator/doctype`.
  **Verified by:** `test.ts`, "Applicability: reports nothing ..." cases.

- **WHEN** the metadata of the document is invalid,
  **THEN** missing headings
  are still reported.
  **Verified by:** `integration.test.ts`, "Applicability: reports missing headings
  although the metadata is invalid".

### Location

- **WHEN** a finding is reported,
  **THEN** it points to the frontmatter of the
  document.
  **Verified by:** `test.ts`, "Findings: reports the missing ..." cases (line and
  column).
- **WHEN** the text has a BOM or CRLF line endings,
  **THEN** positions still refer to the original text.
  **Verified by:** `integration.test.ts`, "Location: reports the frontmatter range
  in the original BOM/CRLF text".

### Configuration

- **WHEN** the rule is set to `error`, `warn` or `off`,
  **THEN** findings have
  that severity or are not reported, and other Dokkurator rules are unaffected.
  **Verified by:** `integration.test.ts`, "Configuration: severity and off apply to
  this rule only".

- **WHEN** options are passed to the rule,
  **THEN** the configuration is
  rejected.
  **Verified by:** `configuration.test.ts`, "Configuration: rejects unsupported
  rule options ...".

- **WHEN** the rule is enabled and a DocType declares something other than a
  list of non-empty strings,
  **THEN** checking fails with a configuration error instead of reporting a finding.
  **Verified by:** `configuration.test.ts`, "Configuration: the enabled rule
  rejects invalid heading requirements".

### Isolation

- **WHEN** several documents are checked one after another,
  **THEN** each result
  depends only on that document.
  **Verified by:** `integration.test.ts`, "Isolation: repeated documents cannot
  share collected headings".

## Open questions

- The finding currently covers the whole frontmatter. See the task
  [required-headings-editor-location](../../../../../docs/task/required-headings-editor-location.md).
- Should an invalid declaration be rejected when DocTypes are prepared instead of
  when the rule runs?
- Should matching be configurable (case-insensitive, heading level)?
