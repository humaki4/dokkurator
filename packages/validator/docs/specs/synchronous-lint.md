---
doctype: spec
title: Synchronous lint facade and recommended Markdown profile
status: accepted
---

# Synchronous lint facade and recommended Markdown profile

This specification describes the implemented synchronous lint facade.

## Usage

```js
import { loadDocument } from "@dokkurator/loader";
import { lint, prepareLintConfiguration } from "@dokkurator/validator";

// Sources, DocTypes, plugins and external schemas are loaded beforehand.
const document = await loadDocument(sourceAdapter, path, {
  parseErrors: "collect",
});
const configuration = prepareLintConfiguration({
  docTypes,
  ...resolvedSource.validator,
});

// No await: Linter.verify and all local rules run synchronously.
const result = lint({
  originalText: document.originalText,
  source: document.source,
  configuration,
});
```

The root API exports `lint` and `LintRuntimeError`. Input and result types can be
derived through `Parameters<typeof lint>[0]` and `ReturnType<typeof lint>`.
The removed `validateDocument` API is no longer supported.

## Profile and result

Shared preparation enables all rules from
`@eslint/markdown.configs.recommended` in installed version 8.0.3, plus
`dokkurator/doctype`, the separate `dokkurator/metadata-schema` rule and
`dokkurator/required-headings`. This also applies to direct ESLint usage through
`createLintConfig`. Custom `rules` entries take precedence, including `warn` and
`off`. Config merges project and repository overrides beforehand.
Code blocks are not linted as separate JavaScript files.

`lint` synchronously returns `status`, `diagnostics` and `suppressedDiagnostics`.
Unsuppressed errors produce `failed`; warnings alone produce `passed`.
Suppressed findings do not affect status. ESLint suppression reasons and
justifications are preserved. `off` does not produce an informational finding.

Diagnostics contain `phase`, `sourceId`, `path`, optional `revision`, `ruleId`
(possibly null for parser messages), `messageId` when available, `severity`,
`message` and available positions. Fatal parser messages and the metadata rule's
YAML syntax message receive `phase: "parse"`; other messages receive `phase: "lint"`.

Positions are 1-based; end positions are exclusive. For a leading BOM, first-line
columns and edit offsets are mapped to original text. Suggestions and offered
fixes remain data only: edits have `{ range: [startOffset, endOffset], text }`;
suggestions additionally have `description` and optionally `messageId`.
No fixes are applied and no documents are changed.

An explicit `source.revision` is preserved. For directly supplied Loader sources,
`git.fileRevision` is used for a clean Git state. Modified working-tree content
is not labeled as text from a committed revision. Identical paths in different
sources remain distinguishable through `sourceId`.

## Errors and boundaries

Complete original text, nonempty source identity, a relative POSIX Markdown path
and prepared configuration are required. Absolute paths, URLs, Windows paths,
traversal segments, unmatched extensions and paths excluded by ESLint throw
`LintConfigurationError` rather than reporting an unchecked run as successful.
A configuration probe detects such paths and checks rule IDs and options before
actual rule visitors run.

Invalid input or explicit configuration throws `LintConfigurationError` with
`cause` and available source identity. Rule crashes or unexpected engine errors
throw `LintRuntimeError` with these details; no partial document result is returned.
Inline configuration errors that ESLint reports as document messages remain
document findings.

Each run receives a new Linter instance and copied config containers and rule
options. Suppressions and document state are not shared. The runtime does not
load files, access the network or use Knowledge. Imported plugins must likewise
provide local synchronous rules without I/O; arbitrary plugin code is not sandboxed.

Loader parse diagnostics are not appended: original text is authoritative and
each YAML parse error appears once. Field-level schema diagnostics belong to
the separate `dokkurator/metadata-schema` rule. Context validation, persistence
and CLI integration are outside this contract.

## Verification

Tests cover the complete recommended profile, warning/off overrides, suppressions
with justification, independent calls, BOM/CRLF/Unicode positions, suggestions
and fixes without text changes, source identity and revisions. Further cases
cover equivalence with direct ESLint, nonduplicated parse diagnostics, unmatched
or excluded paths, invalid configuration and rule crashes.
