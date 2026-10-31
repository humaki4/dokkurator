---
doctype: guides
title: Built in Rules
---

# Built-in Rules

The recommended Dokkurator ESLint configuration enables three rules, each
independently configurable with the standard ESLint severities `"error"`,
`"warn"`, and `"off"`.

## `dokkurator/doctype`

Checks that a Markdown document has valid YAML frontmatter and can be associated
with a known DocType using the `doctype` field. YAML parsing and DocType
association findings are reported by this rule.

## `dokkurator/metadata-schema`

Validates frontmatter against the JSON Schema of the selected DocType. It runs
only when YAML parsing succeeds and a DocType can be selected. Metadata schema
definitions are loaded with the DocTypes; schema validation does not load
resources during linting.

JSON Schema `$ref` is supported for references within the same schema and for
resources that have already been loaded and registered. Referenced files are not
read automatically, and URLs are not fetched. Provide external resources through
the `schemas` configuration option, or as the second argument to `prepareDocTypes`
when using the plugin directly. An unresolved reference fails during
configuration preparation, before document linting. See the
[direct plugin integration guide](./eslint-plugin.md) for details.

DocTypes may use the Loader's compact metadata syntax or a complete JSON Schema
Draft 7 definition. See the [Loader metadata documentation](../../loader/README.md#metadata-compact-fields-or-json-schema)
for the syntax and its limits.

## `dokkurator/required-headings`

Checks that a selected DocType's required headings appear in the Markdown
document. Configure the headings in `structure.requiredHeadings`:

```yaml
name: decision
metadata:
  type: object
  required: [doctype]
  properties:
    doctype:
      const: decision
structure:
  requiredHeadings: [Context, Decision]
```

Heading text is compared after trimming leading and trailing whitespace. Matching
is case-sensitive, and heading order is not enforced. The rule skips documents
with invalid YAML or no valid DocType association. A missing required heading is
reported even when the selected document has other metadata schema findings.

## Rule configuration

The rules are independent. For example, turning off DocType association checks
does not turn off metadata or heading checks; those rules run when they can
select a DocType from the document.

```js
export default createLintConfig({
  docTypes,
  rules: {
    "dokkurator/doctype": "error",
    "dokkurator/metadata-schema": "warn",
    "dokkurator/required-headings": "off",
  },
});
```

The Dokkurator rules do not accept rule-specific options. Rules from
`@eslint/markdown`, such as `markdown/no-duplicate-headings`, are separate and
can be enabled through the same ESLint configuration.
