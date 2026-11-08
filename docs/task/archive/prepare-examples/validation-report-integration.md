---
doctype: concept
status: accepted
title: Validation report formatter integration
---

# Validation report formatter integration

Core uses ESLint 10.10.0's public `ESLint.loadFormatter()` for `stylish`, `json`,
`json-with-metadata`, and `html`. The executable demonstration is
`packages/core/src/reporting.test.ts`: identical findings are compared with
ESLint's own lintText/formatter output for each format.

## Captured data

Validator's `reporting` field preserves original ESLint `messages`,
`suppressedMessages`, and the metadata of rules producing those messages from
its actual prepared plugin configuration. These are serializable data, without
plugins, configuration objects, or executable rules. Normalized diagnostics
remain unchanged, including source IDs, revisions and phases.

Core adds absolute `filePath` values resolved against the source adapter root.
It computes error, warning, fatal and fixable counters from original messages.
It does not infer fatal errors from diagnostic phases. Fix ranges, suggestions,
suppressions and positions retain ESLint's original coordinates; the separate
normalized diagnostics refer to original document text, including the BOM.
Formatting does not undo or repeat the normalized BOM adjustment.

## Public metadata integration

Passing `rulesMeta` as formatter context is insufficient: ESLint's wrapper
replaces it with a lazy call to `getRulesMetaForResults()`, which normally
requires the engine's cached file configuration. Keeping that engine would
prevent a report from being serializable and independent of application state.

The adapter subclasses ESLint and overrides that public method with a lookup
of captured rule metadata. It never imports ESLint internals, reloads
configuration, accesses sources or calls lint/verify during formatting.
The formatter implementation and output still come from `loadFormatter()`.
This also works after closing the application or serializing the report.

ESLint's metadata dictionary is keyed by rule ID. As in ESLint, the last
formatted result wins when different sources supply different metadata for the
same rule ID. Per-document metadata in the structured report and the `json-with-metadata`
`sources` extension preserves each original configuration.

## Complete report output

`json` returns an object with `results`, `sources`, and `errors`. `results` is
parsed from ESLint's JSON formatter, without changes to document findings.
`json-with-metadata` preserves ESLint's `results` and `metadata`, and adds the
same `sources` and `errors` extensions. `metadata.rulesMeta` retains its ESLint
meaning; it is not source metadata.

`sources` maps source IDs to document paths, absolute file paths, normalized
diagnostics and suppressed diagnostics. In `json-with-metadata`, each document
also includes `rulesMeta` for its own configuration. `errors` preserves Core operational
errors with source ID, phase, message and recovery. Operational failures never
become artificial lint messages. The structured validation result remains
available separately, including captured per-document metadata.

`stylish` appends a labeled Operational errors section when needed. HTML uses
the unchanged built-in document report, adding an escaped Operational errors
section inside its body. HTML therefore requires no custom document formatter.
Unknown names, paths and third-party formats are rejected explicitly.

All formatting returns a promise of text and works on copies: ESLint may sort
results. Applications choose output destinations and exit codes. Core does not
write output or set process state.
