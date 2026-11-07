# Dokkurator Core

Core orchestrates projects and sources through the public APIs of Config,
Loader, Validator and Knowledge. Domain rules and adapters remain in those packages.
Use-cases are loaded asynchronously when called and live in
`document-use-cases`, `validation-use-cases` and `index-use-cases`.

## Validate local documents

```js
import { createDokkurator } from "@dokkurator/core";

const app = createDokkurator({ root: process.cwd() });
await app.open();
try {
  const result = await app.validate();
  console.log(result);
} finally {
  await app.close();
}
```

Without configured sources, the project directory is used as source `root`.
Defaults discover Markdown recursively and DocTypes under `_dokkurator/.doctypes`.
A project path, one DocType definition and one document are enough to get started.
The [minimal example](../../examples/minimal-validation/README.md) demonstrates this flow.

`validate({ sourceId: "docs" })` restricts validation to one source.
Core loads its configuration, DocTypes and original texts, prepares schemas
and recommended rules, and calls `lint` for each document. Loading and
preparation are asynchronous; each individual rule execution remains synchronous.

The result contains `results` and `errors`. Each source entry in `results` has
`{ sourceId, documents }`. Each document contains `path`, `status`, `diagnostics`
and `suppressedDiagnostics`. Warnings alone produce `passed`. Missing sources,
invalid configuration and rule crashes appear separately in `errors` with a phase
and recovery guidance. A failed source does not prevent validation of other
sources. Invalid document YAML is reported as a parse finding.
Failure to load the project configuration itself causes `open()` to fail;
it is not attributed to an individual source.

Project configuration is resolved during `open()`; source configuration and
documents are reloaded for every validation. After changing project configuration,
close and reopen the app.

## Custom rules and schemas

The optional `dokkurator.config.mjs` uses the existing configuration resolution:

```js
import company from "./company-plugin.mjs";
import common from "./common.schema.json" with { type: "json" };

export default {
  documents: { directory: "docs" },
  validator: {
    schemas: { [common.$id]: common },
    plugins: { company },
    rules: { "company/check": "warn" },
  },
};
```

Project and repository rules and preloaded schemas are merged; repository values
override project values with the same keys. Different plugins under the same
namespace are rejected as configuration conflicts. Core knows no specific rule
IDs. Unresolved schema references fail during preparation; no resources are
loaded during rule execution.

## Lifecycle and index

`createDokkurator({ root })` creates a closed app. `open()` discovers project
configuration and reports source readiness. There is no index toggle:

| Method                                              | Knowledge index                |
| --------------------------------------------------- | ------------------------------ |
| `open`, `validate`, `listDocTypes`, `listDocuments` | not required or opened         |
| `prepare`, `sync`, `diff`, `search`                 | opened on first use and reused |

Validation and source use-case methods require an open app. Formatter loading and
formatting also work on a closed app. Repeated `open()` and `close()` calls
are harmless. `close()` waits for operations already started and closes the
index if opened. Reopening reloads project configuration and creates the index
again only when needed.

Validation and inspection do not clone or update sources. Missing checkouts must
be prepared through the existing preparation use-case. Core does not start
watchers or determine text output or process exit codes.

## Contracts and decisions

- [Core orchestration](docs/adrs/0001-coordinate-project-workflows-in-core.md)
- [Project lifecycle](docs/specs/project-lifecycle.md)

## Format validation reports

```js
const report = await app.validate();
const formatter = await app.loadFormatter(); // defaults to stylish
await app.close();
console.log(await formatter.format(report));
```

Supported built-in ESLint formats are `stylish`, `json`, `json-with-metadata`,
and `html`. Unknown names are rejected. Formatting returns `Promise<string>`,
does not validate again, and never writes output or sets exit codes. A report
can be formatted repeatedly, including after serialization or `close()`.

Validation documents additionally contain absolute `filePath` and serializable
`reporting` data: original ESLint messages, suppressed messages, deprecated-rule
usage and captured rule metadata. Normalized diagnostics retain their original
text coordinates and source identity; reporting messages use ESLint coordinates.
No configuration or rule implementation is included.

JSON output encloses ESLint's document `results` in `{ results, sources, errors }`.
`json-with-metadata` also preserves ESLint's `metadata`, including `rulesMeta`.
The `sources` extension maps source IDs to paths and normalized diagnostics;
`errors` contains separate operational failures with phase and recovery.
Text and HTML output add a labeled Operational errors section when needed.
See the [integration contract](../../docs/task/prepare-examples/validation-report-integration.md)
for metadata handling and exact field mapping.
