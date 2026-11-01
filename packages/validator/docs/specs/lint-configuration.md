---
doctype: spec
title: Shared ESLint configuration
status: accepted
component: validator
---

# Shared ESLint configuration

## Scope

`prepareLintConfiguration` synchronously prepares fully loaded DocTypes, schemas,
plugins and rule settings. `createLintConfig` accepts those inputs or prepared
configuration and returns a flat config for direct ESLint usage. Both paths use
the same registry, DocType selection and schema validation.

The detailed contracts are specified in [Prepare DocTypes](prepare-doc-types.md),
[DocType selection](doc-type-selection.md), [Metadata schemas](metadata-schemas.md)
and [Synchronous lint](synchronous-lint.md).

## Configuration contract

- Use `markdown/gfm` and YAML frontmatter with Markdown extensions `.md`, `.MD`,
  `.Md` and `.mD`. Enable the installed recommended Markdown profile and the
  Dokkurator `doctype`, `metadata-schema` and `required-headings` rules by default.
- Explicit rules override defaults, including severity `warn` and `off`.
  `markdown` and `dokkurator` are reserved plugin namespaces.
- `plugin` exposes ordinary ESLint rules and `configs.recommended`. Prepared
  DocTypes are supplied through `settings.dokkurator`; direct plugin execution
  does not load or prepare resources.
- Reject nonempty legacy DocType `rules` arrays. Loader may still read them;
  Validator neither executes them nor translates them into another DSL.
- Rule IDs and options are validated before actual rule creation or visitors,
  including configured `off` entries. Invalid configuration throws
  `LintConfigurationError` with the original cause.
- Copy DocType/schema data and configuration containers so later input changes
  and individual document runs cannot alter prepared behavior or other runs.
  Imported plugin modules remain trusted objects and must not be redefined.
- Do not search configuration files, resolve plugin imports, fetch schemas or
  run asynchronous validators during linting. Host preparation supplies resources.
  Do not run codeblock processors or `verifyAndFix`.

## Schema compilation settings

Ajv enables `allErrors`, `strictSchema`, `strictNumbers`, `validateSchema`,
`validateFormats` and `ownProperties`. It disables `coerceTypes`, `useDefaults`,
`removeAdditional`, `strictTypes`, `strictTuples` and `strictRequired`.
`ajv-formats` uses full mode without additional format-limit keywords or custom
format callbacks. Unknown keywords and formats remain configuration errors.
`password` and `binary` are annotations without value checks.

Schema IDs are logical identities, not resource download locations. Supplied
resource IDs must agree with their keys. All supplied resources, including unused
ones, are compiled before document checks. Details of schema identity and DocType
association remain in the linked preparation and selection specifications.

## Compatibility and verification

The original compatibility check used ESLint 10.10.0 and `@eslint/markdown` 8.0.3
on Node.js 22.23.1. This records the checked combination, not a guarantee for every
version allowed by package engine ranges. Runtime dependencies belong directly
to Validator, independently of root development dependencies.

See [runtime compatibility tests](../../src/lint/runtime/runtime.compatibility.test.ts)
and the [plugin guide](../guides/eslint-plugin.md). The runtime is not a sandbox
for third-party plugin code.
