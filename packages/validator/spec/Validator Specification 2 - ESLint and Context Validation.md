# Validator Specification 2: ESLint and Context Validation

## Status and purpose

Alternative draft, dated 2026-10-03. This document is a proposal, not an
architecture decision. The original [Validator Specification](./Validator%20Specification.md)
remains unchanged. API examples below are proposed contracts, not existing APIs.

This alternative uses established libraries for document-local checks and keeps
Dokkurator-specific orchestration and contextual semantics in Dokkurator.
The intended outcome is compatibility with normal ESLint workflows without
making Knowledge, storage, or a local filesystem mandatory for validation.

## Comparison with the original specification

| Concern                             | Original proposal                       | This alternative                                                             |
| ----------------------------------- | --------------------------------------- | ---------------------------------------------------------------------------- |
| Local rule execution                | Dokkurator rule engine                  | ESLint and `@eslint/markdown`                                                |
| Local plugins and rule registration | Custom `ValidationRule` and registry    | Standard ESLint plugins and rules                                            |
| Metadata constraints                | Generic built-in rules and shorthand    | JSON Schema evaluated by Ajv through an ESLint integration                   |
| Metadata conditions                 | Custom condition language               | JSON Schema `if`/`then`, `allOf`, `anyOf`, and `not` where applicable        |
| Content rules                       | Custom validation rules                 | Existing Markdown rules plus a small Dokkurator ESLint plugin                |
| External context                    | Optional context on every rule          | Explicit asynchronous context-validation phase                               |
| Editor integration                  | Later reporter/integration work         | Standard ESLint configuration for local checks                               |
| Parsing                             | Loader supplies parsed documents        | Loader supplies models and original text; ESLint initially parses text again |
| Diagnostics                         | Dokkurator diagnostics                  | Common envelope preserving ESLint identifiers and details                    |
| Main cost                           | Maintaining a general local rule system | Maintaining adapters and two clearly scoped execution models                 |

The original design remains attractive if one uniform asynchronous rule API and
AST-only execution are priorities. This alternative favors ecosystem reuse and
direct ESLint compatibility, accepting a separate contextual rule contract.

## Terminology: lint and context validation

The boundary is the information required by a check, not the number of files
passed to a command.

**Lint** checks one document against already resolved configuration, schemas,
and rules. It does not inspect other documents, query Knowledge, or perform
resource lookups during rule execution. Loading configuration and schema
dependencies beforehand does not turn a local constraint into a contextual rule.

**Context validation** checks a document or collection using information outside
that document. It can use other documents, a resource resolver, or an external
catalog. Knowledge is one possible context provider, not a requirement.

**Validation** can still be the umbrella term for the complete process. The
specific phase should be named `context` or `context validation` in APIs and
diagnostics to avoid implying that lint does not validate anything.

| Check                                              | Phase   |
| -------------------------------------------------- | ------- |
| Frontmatter has a string title                     | Lint    |
| Accepted documents require an acceptance date      | Lint    |
| Required heading exists                            | Lint    |
| Link scheme is permitted                           | Lint    |
| Fragment refers to a heading in the same document  | Lint    |
| Link target in another file exists                 | Context |
| Service reference points to a service document     | Context |
| Document IDs are unique in the selected collection | Context |
| Relationship graph contains no cycles              | Context |

Linting 100 independent documents is still linting. Checking one document's
reference against a repository is context validation.

## Package ownership and dependencies

Keep both phases inside `@dokkurator/validator`, in separable internal directories.
Do not introduce additional workspace packages merely to organize these phases.

- Loader owns source contracts, source adapters, parsing, and normalized models.
- Validator owns lint orchestration, its ESLint integration, contextual rule
  contracts, and normalized diagnostics.
- Knowledge owns indexing and queries. Applications adapt its public root API
  to the narrow context interfaces accepted by Validator.
- CLI/server applications load plugins, resolve configuration, select sources,
  prepare context, and choose reporting and persistence behavior.

Validator consumes Loader only through `@dokkurator/loader`. It does not import
source adapter implementations. It has no direct Knowledge dependency. Supported
Validator integrations are exported from `@dokkurator/validator`, without export
subpaths or imports of another package's internals.

ESLint, `@eslint/markdown`, and the chosen schema integration are runtime
dependencies when Validator runs them programmatically. Ajv and `yaml` belong
in Validator's dependencies if its own integration uses them directly; Loader's
dependency declarations cannot be treated as Validator's public API.

## Local lint execution

```text
Original document text + ParsedDocument + resolved ParsedDocType
    -> prepare ESLint configuration and schema dependencies
    -> ESLint Markdown rules + schema rule + Dokkurator content rules
    -> normalize lint messages
    -> LintResult
```

Use documented ESLint APIs. `ESLint.lintText(text, { filePath })` is a suitable
Node.js entry point for text already read through a source adapter. Evaluate
`Linter.verify` if fully in-memory configuration is preferable. Explicitly set
configuration and logical paths; do not accidentally apply the application's
code-lint configuration to remote documentation.

There is no second general-purpose local rule registry. Rule options, registration,
severity, local suppression directives, and rule tests use ESLint conventions.
Unknown rules and invalid options produce configuration failures, distinguished
from document findings.

The Validator root API should expose its ESLint plugin and a configuration helper,
so equivalent local checks can run in an ordinary `eslint.config.js`. The exact
helper name and signature remain open. DocType selection must have the same
semantics in direct ESLint and Dokkurator execution; a resolved registry can be
prepared before execution and selected by the document's `doctype` value.

Do not claim arbitrary ESLint plugins support Markdown: rules must support its
language and AST, or run on extracted code blocks with the appropriate language.
Markdown and code-block checks currently require separate ESLint runs.

## Metadata and conditional constraints

The current Loader already accepts JSON Schema Draft 7 in DocType `metadata`.
Make that schema authoritative. Do not reimplement `required`, `type`, `enum`,
`pattern`, or length/range checks as independent Dokkurator rules.

Example metadata schema:

```yaml
metadata:
  type: object
  required: [doctype, title, status]
  properties:
    doctype: { const: decision }
    title: { type: string, minLength: 1 }
    status: { enum: [draft, accepted, deprecated] }
    acceptedAt: { type: string }
  if:
    required: [status]
    properties:
      status: { const: accepted }
  then:
    required: [acceptedAt]
```

The `required` condition prevents a missing status from accidentally matching
the conditional branch. Date formats need an explicitly selected format validator.
Schema validation must not silently coerce values, insert defaults, or remove
fields. Loader normalization and validation have distinct responsibilities.

Retain Draft 7 initially. Specify Ajv options, supported formats, YAML value
semantics, schema identity, and `$ref` resolution consistently. Prepare schema
dependencies through source-aware application loading; do not assume a logical
document path is a local filesystem path. A document `$schema` annotation must
not silently override the authoritative DocType schema. Its policy is an open
decision and conflicting associations must be visible.

If a convenience syntax is added later, translate it into JSON Schema. Conditions
for content or context rules may need separate options, but do not build a generic
condition language before a concrete requirement demonstrates the need.

## Frontmatter integration: decision remains open

`eslint-plugin-markdown-frontmatter-schema` is a candidate, not a mandatory
architectural dependency. Its README describes active development and unsettled
schema loading. Issue #1 reports inaccurate positions and a discrepancy between
the documented schema path and the expected configuration object. PR #2 proposes
position and dependency/type fixes; closure alone does not establish publication
or compatibility with Dokkurator's installed ESLint version.

Evaluate these alternatives using the same acceptance cases:

1. Reuse the plugin unchanged if it accepts resolved schemas and supports the
   required source and diagnostic semantics.
2. Contribute a focused upstream improvement if a small public API gap blocks it.
3. Implement a thin ESLint rule using Ajv and `yaml`, retaining standard JSON
   Schema and ESLint configuration compatibility.

The third option supplies integration behavior, not a replacement schema engine.
Do not copy upstream internals or invent custom schema validation keywords to
reimplement ordinary JSON Schema constraints.

Required evaluation cases include missing/scalar frontmatter, YAML syntax errors,
duplicate YAML keys, nested field positions, unknown DocTypes, `$ref` resolution,
virtual source paths, committed Git revisions, and ESLint 10 compatibility.
Check the published release separately from the repository's default branch.

## Loader changes needed by this alternative

Preserve the complete original text alongside the Markdown body. Today
`ParsedDocument.content` excludes frontmatter while AST positions refer to the
complete source. Do not redefine `content` silently; add an explicit original-text
contract through Loader's public model or supply the original source separately.

Retain source identity as well as path so equal paths in different repositories
remain distinct. Preserve YAML locations if metadata diagnostics are to identify
individual fields. Align CommonMark/GFM and enabled extensions across both parsers.

Keep remark/MDAST parsing initially. `@eslint/markdown` uses the same underlying
MDAST ecosystem. Parsing twice is an accepted initial cost; verify equivalent
syntax and position semantics. Sharing a prebuilt AST through an ESLint language
integration is a later optimization, not an assumed standard API feature.

Loader continues validating DocType definition syntax and schema structure.
Document metadata validation belongs to lint. Recoverable document parse errors
must reach the diagnostic pipeline rather than abort an entire batch. The current
Loader throws on invalid YAML; define how the caller captures this failure and
avoids reporting it again through ESLint. No unrelated parser replacement is required.

## Context validation

```text
Loaded collection + resolved DocTypes + prepared context
    -> select context rules
    -> asynchronous document and collection checks
    -> ContextValidationResult
```

Context rules have a deliberately small asynchronous API independent of ESLint.
They can evaluate a single document or a whole collection. Collection-wide rules
such as uniqueness and cycles run once per selected scope, not once per document.
References and resources are qualified by source identity where necessary.

The caller supplies an explicit scope and a consistent context snapshot, or
resolvers whose revision/consistency contract is declared. Knowledge is optional:
an in-memory collection can satisfy the same checks.

```ts
// Conceptual API; concrete context query types remain to be designed.
interface ContextRule {
  id: string;
  scope: "document" | "collection";
  requirements: readonly string[];
  validate(input: ContextRuleInput): Promise<readonly Diagnostic[]>;
}
```

Keep resolver interfaces narrow and source-independent. Rule code does not clone
repositories, inspect filesystem paths directly, or query a Knowledge implementation.
Applications load context-rule modules explicitly. ESLint plugins and context-rule
modules are different contracts and must be named clearly in configuration.

Missing context is an incomplete check, not evidence of a broken reference.
Distinguish an authoritative negative lookup from an unavailable or incomplete
scope. Report executed and skipped checks. A successful lint result does not imply
successful context validation.

Invalid documents can still provide limited context, but rules must specify their
prerequisites. Do not produce misleading uniqueness/reference errors from missing
or malformed identifiers. Define whether the selected scope covers one source,
several sources, or a catalog before evaluating collection constraints.

## Public facade and diagnostics

Proposed operations on one Validator instance:

```ts
interface Validator {
  lint(input: LintInput): Promise<CheckResult>;
  validateContext(input: ContextInput): Promise<CheckResult>;
  validate(input: FullValidationInput): Promise<CheckResult>;
}
```

`lint` accepts one document; applications may batch it. `validateContext` accepts
the selected collection or document plus external context. `validate` composes
both phases. Do not expose these examples as implemented APIs until types and
source contracts are settled.

```ts
interface CheckResult {
  status: "passed" | "failed" | "incomplete";
  diagnostics: readonly Diagnostic[];
  skippedChecks: readonly { ruleId: string; reason: string }[];
}

interface Diagnostic {
  phase: "parse" | "lint" | "context";
  ruleId: string;
  severity: "error" | "warning" | "info";
  message: string;
  sourceId?: string;
  path?: string;
  location?: {
    line: number;
    column: number;
    endLine?: number;
    endColumn?: number;
  };
  fieldPath?: string;
  relatedLocations?: readonly DiagnosticLocation[];
}
```

Preserve ESLint rule IDs, message IDs, suggestions, and suppressed messages where
supported; the exact additional fields remain open. Related locations allow a
duplicate-ID finding to identify both documents. ESLint warning/error severities
map directly; ESLint `off` is disabled, never `info`. Informational findings are
available to contextual checks and orchestration.

Failures take precedence over incomplete status; skipped checks remain visible
even when failures exist. A complete result passes only when required checks ran
without errors. Configuration/runtime failures are separate operational failures.
Reporting and document modification remain caller responsibilities. No automatic
fixes are applied by the validation facade.

## CLI behavior and incremental execution

Proposed commands:

```text
dokkurator lint <path>       document-local checks, even for many files
dokkurator validate <path>   lint plus required context checks
```

An explicit context-only mode may be added later. A missing required context must
not make `validate` silently behave like `lint`. Proposed exit codes are 0 for a
complete pass, 1 for document violations, and 2 for operational failure or missing
required context. Warning thresholds remain a reporting/application policy.

Local incremental checks depend on document content, DocType/schema dependencies,
configuration, and engine/plugin versions. ESLint's file cache does not apply to
`lintText`; application-level caching is needed for source-loaded texts.

Context checks also depend on scope membership and referenced document/context
revisions. A changed or deleted target can require rechecking unchanged referring
documents. Until those dependencies are tracked, rerun context checks for the
selected scope rather than treating a single-file cache as sufficient.

ESLint suppression comments apply to local rules. Do not pretend they automatically
suppress separate context findings. A contextual suppression policy remains open.

## MVP and acceptance criteria

First establish lint using the real `ParsedDocType` metadata schema, selected
`@eslint/markdown` rules, and one Dokkurator rule for required headings. Export
the plugin/configuration integration from the existing Validator package root.

Then demonstrate context validation with reference existence and collection ID
uniqueness using an in-memory context provider. This proves the boundary without
requiring Knowledge or a database.

Acceptance requires:

- Equivalent local findings through direct ESLint and the Dokkurator facade.
- Correct positions with frontmatter, CRLF, and non-ASCII content.
- Identical source text behavior for filesystem and committed Git revisions.
- Explicit configuration failure for unknown rules or invalid options.
- Distinct incomplete-context and missing-reference outcomes.
- Collection-wide duplicate reporting with related locations.
- No mutation, hidden source-adapter assumptions, or internal package imports.
- Focused tests, package typechecks/builds, and aligned manifests/lockfile if implemented.

## Decisions intentionally left open

1. Adopt the split, retain the original uniform API, or adopt JSON Schema reuse
   first while deferring the rule-engine decision.
2. Use the Frontmatter plugin, contribute upstream, or write a thin Ajv adapter.
3. Prefer `ESLint.lintText` or `Linter.verify` for embedded execution.
4. Define exact original-text and YAML-location contracts in Loader.
5. Choose DocType selection and document `$schema` precedence for direct ESLint.
6. Decide contextual configuration, suppression, and context consistency contracts.

No package split, parser replacement, or third-party plugin adoption is approved
by this draft. A small compatibility experiment should inform those decisions.

## Research references

Checked on 2026-10-03. Public search did not identify a concrete proposal to adopt
the Frontmatter schema plugin into ESLint core or `@eslint/markdown`; this is not
proof that no discussion exists. Official Frontmatter parsing support is distinct
from schema validation. Do not base implementation timing on anticipated adoption.

- [ESLint Markdown documentation](https://github.com/eslint/markdown)
- [Official Frontmatter parsing PR #328](https://github.com/eslint/markdown/pull/328)
- [ESLint Node.js integration API](https://eslint.org/docs/latest/integrate/nodejs-api)
- [ESLint custom rule API](https://eslint.org/docs/latest/extend/custom-rules)
- [Frontmatter schema plugin](https://github.com/JulianCataldo/eslint-plugin-markdown-frontmatter-schema)
- [Plugin issue #1: positions and schema configuration](https://github.com/JulianCataldo/eslint-plugin-markdown-frontmatter-schema/issues/1)
- [Plugin PR #2: position and dependency fixes](https://github.com/JulianCataldo/eslint-plugin-markdown-frontmatter-schema/pull/2)
