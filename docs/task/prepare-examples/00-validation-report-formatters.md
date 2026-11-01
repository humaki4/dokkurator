---
doctype: task
title: Validation reports with ESLint formatters
status: open
---

# Validation reports with ESLint formatters

Status: planned; not yet implemented.

Dependency: [Core project validation](../../../packages/core/README.md#validate-local-documents).

## Goal

Expose validation results as a readable report or JSON through a small public
API. Format names and output follow ESLint conventions. Reuse existing ESLint
formatters through its public API rather than reimplementing their presentation.

Document findings, suppressed findings and operational source errors remain
distinguishable. Formatting does not run validation again.

## Comparison with ESLint

Checked on 2026-10-03 against the official documentation and ESLint 10.10.0
installed in the workspace.

ESLint provides four built-in formats. Its CLI selects them through `--format`;
the Node API loads them through `eslint.loadFormatter(name)`. The loaded formatter
accepts `ESLint.LintResult[]` and returns a string or a promise of a string through
`format(results)`. Writing to the terminal or files remains the caller's
responsibility. Sources: [formatter overview](https://eslint.org/docs/latest/use/formatters/),
[Node API](https://eslint.org/docs/latest/integrate/nodejs-api#-eslintloadformatternameorpath).

| Format               | ESLint behavior                                                                 | Planned scope                                                                              |
| -------------------- | ------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| `stylish`            | Readable terminal output with files, positions, severities, rules and a summary | Implement; default format                                                                  |
| `json`               | JSON array of file results                                                      | Implement; document findings in ESLint structure, Core extensions defined separately       |
| `json-with-metadata` | JSON with `results` and `metadata`, including rule metadata                     | Implement; preserve metadata from the rule configuration actually used                     |
| `html`               | HTML report for browser display                                                 | Evaluate reuse; defer initially if it requires additional work and document the limitation |

`json-with-metadata` is more than the Dokkurator result list with additional
source details. In particular, ESLint includes metadata for the rules involved.
JSON structures must preserve this meaning; necessary Dokkurator extensions
must be documented explicitly.
Source: [format description](https://eslint.org/docs/latest/use/formatters/#json-with-metadata).

## Target API and asynchronous flow

Calls follow ESLint's separation of validation, formatter loading and formatting.
`validate()` continues to return structured data; no `format` method on the
result and no modified promise contract:

```js
const report = await app.validate();
const formatter = await app.loadFormatter("stylish");
const text = await formatter.format(report);
console.log(text);
```

`app.loadFormatter()` defaults to `stylish`. The Dokkurator wrapper consistently
uses `format(report): Promise<string>`. A report can be output repeatedly and
in different formats.

The loaded Dokkurator formatter is a thin adapter: it accepts the complete Core
report and passes its document findings to the loaded ESLint formatter in the
appropriate format. An equivalent calling structure does not mean the Core
result itself is an `ESLint.LintResult[]`.

Output settings do not belong in `dokkurator.config.mjs`: format selection,
terminal/file output and exit codes remain the calling application's responsibility.
Formatting an existing report must also work after `app.close()`. The formatter
must obtain the necessary data from the report without requiring an open
application or further source access.

## How closely should this follow ESLint?

Following ESLint makes sense for calls, format names and document findings:
our rules already run in ESLint and produce standard messages. Rule ID, message,
severity, position, fixes and suggestions have the same domain meaning.
Dokkurator only normalizes their representation and adds source identity and phase.

The complete Core report has a broader scope: it groups documents by source
and includes operational errors with phase and recovery. ESLint's file result
has no equivalent contract for these errors. Preserve the structured API and
adapt only document findings. Do not turn source errors into apparent lint
findings merely to reuse a formatter.

Format names follow ESLint. Exact output compatibility applies to the document
findings portion; extensions for the complete Core report are defined and
documented separately. In particular, `json` is not automatically an unchanged
ESLint array when operational errors also need to be represented.

## Direct ESLint plugin usage

The existing Dokkurator plugin needs no custom formatter. Its rules report
through ESLint's `context.report`; ESLint creates standard file results with
rule metadata. Built-in formatters already work with these results:

```sh
pnpm exec eslint --config eslint-plugin.config.mjs --format stylish documents
pnpm exec eslint --config eslint-plugin.config.mjs --format json documents
pnpm exec eslint --config eslint-plugin.config.mjs --format json-with-metadata documents
```

With direct plugin usage, `--format html` is likewise already ESLint's
responsibility; deferring HTML in Dokkurator affects only the new Core report
API. The proposed adapter is needed only for Dokkurator results returned by
`app.validate()`. The plugin remains a standard ESLint plugin.

## Responsibilities and reuse

- Validator retains synchronous document checking. If needed, it captures
  original ESLint data and rule metadata required by formatters during the
  preparation/checking that already takes place.
- Core owns the report result and a separate internal reporting module.
  `app.loadFormatter` delegates there and returns a formatter adapter;
  formatting does not become part of Validator rule execution or lifecycle logic.
- The reporting integration loads ESLint formatters through the public root API
  `import { ESLint } from "eslint"` and `loadFormatter`. No imports from
  `eslint/lib/...`, copies of built-in formatters or export subpaths.
- Adapters and metadata handling stay within existing packages. No new reporting
  package. If Core imports ESLint directly, add the matching direct dependency
  and lockfile entry without a version upgrade.
- Keep public exports small. `app.loadFormatter` must not require another
  mandatory function import. Review necessary result types individually.

ESLint itself separates rule execution, formatter loading and output. Its
formatters reside internally under `lib/cli-engine/formatters`; that path is
mentioned only to explain architecture and is not an allowed import path.

## Resolve and demonstrate before implementation

### Adapter to the ESLint result format

Existing Dokkurator diagnostics are not `ESLint.LintResult[]`. Define their
translation or the selective preservation of original data:

- Absolute `filePath` values based on each source root and document path;
  documents with identical names in different sources must not collapse.
- `messages`, `suppressedMessages`, numeric severities and source positions.
- Error, warning, fatal and fixable counters, plus fixes and suggestions.
- Preserve actual ESLint fatal information. Dokkurator's `parse` phase does
  not automatically imply a fatal ESLint parser error.
- Account for existing BOM corrections and the original-text reference of
  Dokkurator diagnostics. Do not correct positions twice when translating back.
- Preserve source ID and revision for the existing structured API.

The exact ESLint contract is described in the
[Node API](https://eslint.org/docs/latest/integrate/nodejs-api#-lintresult-type).
Do not replace missing information with invented values.

### Rule metadata without reloading or checking again

The current normalized Validator output contains no rule metadata. Preserve it
from the configuration actually used, including Dokkurator, Markdown and custom
plugin rules.

In ESLint 10.10.0, the wrapper created by `loadFormatter` obtains `rulesMeta`
through `getRulesMetaForResults`. Simply passing an additional metadata object
to `format` therefore cannot be assumed to solve this. Public integration must
work with suitable, already prepared configuration; do not fall back to private
formatter modules.
Source: [rule metadata API](https://eslint.org/docs/latest/integrate/nodejs-api#-eslintgetrulesmetaforresultsresults).

First demonstrate focused integration for all three required formats and
different source configurations. If the public API is insufficient, document
the specific limitation and an alternative before deciding to implement a
custom formatter.

### Operational errors in the complete report

Source, loading, configuration and unexpected runtime errors are currently
separate Core errors. ESLint's file result format has no equivalent source
error contract.

Before implementation, define how the separate `errors` are output:
text formats may add a section explicitly labeled as operational errors.
JSON requires a documented extension or enclosing report contract, without
appended text that would invalidate JSON. Document-check JSON results must
still come from the ESLint formatter. Source ID, phase and recovery must also
be preserved.

Record the final mapping in the integration demonstration. Do not invent rule
IDs, file positions or artificial ESLint parser errors for source failures.
Errors must not be lost even when a source fails.

## Implementation steps

1. Demonstrate public ESLint formatter integration, metadata and error mapping;
   document the data contract and assess the work required for `html`.
2. Preserve necessary formatter data during validation and provide
   `app.loadFormatter` with a thin asynchronous formatter adapter. The report
   result retains its data contract.
3. Integrate the reporting module with `stylish`, `json` and `json-with-metadata`;
   add `html` if reuse is straightforward, otherwise explicitly omit it.
4. Update examples to use shared report output. Preserve group filters for
   the detailed collection without losing metadata or operational errors.
5. Add guidance, API documentation and focused tests. Place tests alongside
   their source files following the repository naming convention.

## Acceptance criteria

- The three required formats use built-in ESLint formatters through a supported
  public API. Standard ESLint and Dokkurator produce equivalent reports for
  identical document findings.
- JSON contracts, rule metadata and Dokkurator extensions are documented and
  checked automatically. Metadata remains correct across different sources.
- Positions, fixes, suggestions, suppressed findings, parser errors, warning-only
  runs, empty successful runs and operational errors are covered.
- Formatting changes no findings or counters, does not lint again and requires
  no further source/schema/project access or index.
- Repeated formatting, format changes and formatting after `close()` work.
  Formatters receive copies when needed because ESLint sorts results.
- Unknown formats produce a clear formatter error rather than silently using
  another format. If `html` is deferred, report it as unsupported and document
  that in the example.
- Neither report generation nor formatting writes to the console or filesystem
  or sets a process exit code. Examples handle those concerns.
- Existing structured `results`/`errors` remain accessible and serializable as
  data; internal configuration does not leak into output.
- Package boundaries, direct dependencies, focused tests, affected builds,
  typechecks, linting and formatting are checked.

## Scope boundary

This task plans the report API and its later implementation. Creating this
document does not implement a formatter. No new CLI, Knowledge features,
publication or additional formats such as Markdown, SARIF or JUnit. Third-party
formatters are initially outside the public Dokkurator API.
