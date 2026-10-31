---
doctype: guide
title: Direct ESlint Plugin Integration
---

# Direct ESLint Plugin Integration

Use the exported plugin directly when composing your own ESLint flat
configuration. The plugin's recommended profile enables the Dokkurator rules,
but DocType data must also be prepared and supplied through
`settings.dokkurator`.

```js
import markdown from "@eslint/markdown";
import { loadDocTypes } from "@dokkurator/loader";
import { dokkuratorEslintPlugin, prepareDocTypes } from "@dokkurator/validator";

const docTypes = await loadDocTypes(process.cwd());
const preparedDocTypes = prepareDocTypes(docTypes);

export default [
  ...markdown.configs.recommended,
  ...dokkuratorEslintPlugin.configs.recommended,
  {
    files: ["**/*.[mM][dD]"],
    language: "markdown/gfm",
    languageOptions: { frontmatter: "yaml" },
    plugins: { markdown },
    settings: { dokkurator: preparedDocTypes },
  },
];
```

`prepareDocTypes` prepares the DocType definitions and their metadata schemas;
it does not create an ESLint configuration or enable rules. If the schemas use
external `$ref` resources, load those resources before linting and pass them as
the second argument, keyed by schema URI.

For a complete configuration that includes Markdown setup and the recommended
Dokkurator profile, use [`createLintConfig`](../README.md#quick-start) instead.
For an executable integration, see the
[validator example](../../../examples/validator/eslint-plugin.config.mjs).
