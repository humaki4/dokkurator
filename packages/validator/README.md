# @dokkurator/validator

`@dokkurator/validator` checks Markdown documents with ESLint. It validates YAML
frontmatter against loaded DocTypes and supports structural rules such as
required headings. ESLint configuration and rule severities are defined in
JavaScript.

The package is currently private and used from this pnpm workspace; it is not
published to npm. For an end-to-end example, see the
[validator example project](../../examples/validator/README.md).

## Quick start

Create an `eslint.config.mjs` file in an ESM project:

```js
import { loadDocTypes } from "@dokkurator/loader";
import { createLintConfig } from "@dokkurator/validator";

const docTypes = await loadDocTypes(process.cwd());

export default createLintConfig({
  docTypes,
  rules: {
    "dokkurator/required-headings": "warn",
    "markdown/no-duplicate-headings": "warn",
  },
});
```

`createLintConfig` returns an ESLint flat configuration with Markdown support
and the recommended Dokkurator rules. The `rules` option can override rule
severities or add rules from other Markdown-compatible ESLint plugins.

## Built-in rules

- `dokkurator/doctype` checks YAML frontmatter and selects a known DocType.
- `dokkurator/metadata-schema` validates frontmatter against that DocType's
  JSON Schema.
- `dokkurator/required-headings` checks headings declared by the DocType.

The recommended configuration enables these rules as errors. See the
[rule reference](./docs/guides/rules.md) for behavior and configuration details.

## Public API

The package root, `@dokkurator/validator`, is the supported import path. Its
main entry points are:

- `createLintConfig` for ESLint flat configuration.
- `prepareLintConfiguration` and `lint` for preparing and synchronously linting
  a document with already-loaded resources.
- `prepareDocTypes` and `dokkuratorEslintPlugin` for direct ESLint plugin
  integration.

See [direct ESLint plugin integration](./docs/guides/eslint-plugin.md) for the plugin
setup. Project-level validation is also available through
[`@dokkurator/core`](../core/README.md).

## Documentation

- [Rule reference](./docs/guides/rules.md)
- [Direct ESLint plugin integration](./docs/guides/eslint-plugin.md)
- [Validator example project](../../examples/validator/README.md)
- [Loader metadata schemas](../loader/README.md#metadata-compact-fields-or-json-schema)
  - [Loader metadata schemas](../loader/README.md#metadata-compact-fields-or-json-schema)

## Runtime specifications

- [Shared ESLint configuration](docs/specs/lint-configuration.md)
- [Synchronous lint contract](docs/specs/synchronous-lint.md)
