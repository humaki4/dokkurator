# Dokkurator configuration

Projects and source repositories can use `dokkurator.config.mjs` at their root.
The default export must be an object. JavaScript takes precedence over the legacy
`.dokkurator/config.yaml`; the two files are not implicitly merged. Existing YAML
projects continue to work. There is no user-wide global configuration layer.

```js
import company from "@example/eslint-plugin-docs";
import project from "./rules/index.mjs";

export default {
  sources: [
    { id: "root", path: "." },
    { id: "handbook", path: "../handbook" },
  ],
  validator: {
    plugins: { company, project },
    rules: {
      "company/document-title": "error",
      "project/decision-owner": "warn",
    },
  },
};
```

Importing a plugin makes its rules available; only `rules` activates them.
Rules must support Markdown. Plugins are standard ESLint objects, not filenames
or package-name strings to resolve later. Config modules and their imports are
executed during application preparation, before the synchronous lint runtime.
Module entry changes are reloaded using their timestamp and size; imported
module dependencies follow Node's normal module cache. This does not implement
live reload of rule modules.

A source repository can provide its own `dokkurator.config.mjs` with repository
settings (`documents`, `doctypes`, `validator`). Project-only settings such as
`sources`, `knowledge`, `watch` and `checkouts` remain at the owning project root.

```js
// Source repository: dokkurator.config.mjs
import handbook from "./rules/index.mjs";
export default {
  validator: {
    plugins: { handbook },
    rules: {
      "company/document-title": "off",
      "handbook/required-owner": "error",
    },
  },
};
```

For every selected source, project plugins/rules are the base. Source-local rule
entries replace entire entries by rule ID, including severity and options;
`off` explicitly disables an inherited rule. There is no merging of individual
rule-option fields. Local plugins extend the namespaces. The same plugin object
can be reused under an inherited namespace; a different plugin object under the
same namespace is an error. Shared imports preserve this identity. `markdown`
and `dokkurator` are reserved for Validator's built-in integrations.

`resolveProjectConfig` resolves project settings without loading source configs.
`resolveSourceConfig` loads repository settings after the source is available
and produces `source.validator`. `resolveActiveConfig` composes both steps.
Returned rule options are copied so source-local edits cannot alter other sources
or project defaults. Missing validator settings yield empty `plugins` and `rules`.

Applications pass the resolved settings through the owning packages' root APIs:

```js
import { resolveActiveConfig } from "@dokkurator/config";
import { openConfiguredSource, loadDocTypes } from "@dokkurator/loader";
import { prepareLintConfiguration } from "@dokkurator/validator";

const config = await resolveActiveConfig({ root: process.cwd() });
for (const source of config.sources) {
  const adapter = await openConfiguredSource(source);
  const docTypes = await loadDocTypes(adapter, {
    doctypesDirectory: source.doctypes.directory,
  });
  const prepared = prepareLintConfiguration({
    ...source.validator,
    docTypes,
    // Supply any fully loaded external schema resources here as `schemas`.
  });
}
```

Config validates the structure and severity values. Validator preparation owns
rule-ID/option validation and schema compilation. Resolving config does not
activate lint in CLI commands; application wiring remains subsequent work.
Validator's synchronous lint facade uses the complete recommended Markdown
profile by default, with resolved rule entries taking precedence.
DocType definitions remain YAML; nonempty legacy DocType rules
are still rejected by Validator preparation.

## Source administration

For JavaScript projects, `updateSources` writes an array of source declarations
to `.dokkurator/sources.yaml`. When present, that array replaces the module's
`sources` list, including when empty. `readSources` and configuration resolution
use this effective list. Source commands never serialize or overwrite executable
JavaScript configuration. To resume using the module's declarations, remove the
sidecar. For legacy YAML projects, source commands continue updating
`.dokkurator/config.yaml` as before. Direct serialization of a JavaScript config
is rejected.

## Decisions

- [JavaScript project configuration](docs/adrs/0001-use-javascript-project-configuration.md)
