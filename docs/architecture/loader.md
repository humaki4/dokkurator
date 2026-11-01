---
doctype: architecture
title: Loader
status: draft
component: loader
tags: [markdown, metadata]
---

# Loader

`@dokkurator/loader` is the core library for loading, parsing and representing
document type definitions and for parsing Markdown documents independently of validation. It was renamed from `@dokkurator/doctype` to distinguish the
library component from the `DocType` domain concept; public domain types and
function names remain unchanged.

It therefore has two distinct responsibilities:

1. **DocType parsing** — load and parse DocType definitions.
2. **Document parsing** — parse Markdown and Frontmatter without requiring a resolved DocType.

Loader also owns the source contracts and filesystem/Git adapters described in
[source adapters](source-adapters.md).

## Technology

The library is implemented in TypeScript and targets Node.js environments.

Implemented building blocks include:

- YAML parsing for DocType definitions and Frontmatter
- Markdown parsing based on the unified / remark ecosystem [remarkjs](https://github.com/remarkjs/remark)
- schema validation for DocType definitions [ajv](https://github.com/ajv-validator/ajv) and [yaml](https://github.com/eemeli/yaml)
- JSON Schema-compatible validation for structured metadata where applicable
- plain TypeScript models as the integration boundary to Validator and Knowledge
- extensible parsing for links, references and embedded content

The library uses the local Git client through `simple-git`; it has no GitLab/GitHub API integration and no dependency on databases or the Catalog Server.

## Responsibilities

### DocType loading and parsing

DocType definitions describe the expected structure and metadata of a document type.
Each DocType is stored in its own directory:

```text
decision/
├── definition.yml  # required
├── rules.yml       # optional
└── template.md     # optional
```

`definition.yml` contains the DocType definition and its metadata schema.
When `rules.yml` is absent, the normalized DocType contains an empty rule list.
`template.md` is reserved for document templates and is not parsed yet. Legacy
`rules.yml` files are parsed, but the current Validator rejects nonempty legacy
rule lists. Configure executable rules as ESLint rules in JavaScript instead.

The library is responsible for:

- loading DocType definitions from configuration files
- parsing YAML into a normalized DocType model
- validating the structure of DocType definitions
- resolving defaults and shorthand definitions
- exposing the parsed definition to other components

Conceptually:

```text
DocType directory
    ↓
load through SourceAdapter
    ↓
parse definition.yml and optional rules.yml
    ↓
validate against JSON Schema
    ↓
ParsedDocType
```

Public API:

```ts
const docType = await loadDocType(source, "_dokkurator/.doctypes/decision");

const docTypes = await loadDocTypes(source);
```

Loading is the public operation and includes reading, parsing, normalization,
and validation of the DocType definition. Raw source loading and parsing are
internal implementation steps.

### Document parsing

The library also loads and parses actual documentation files. Document
validation remains a separate Validator responsibility.

It is responsible for:

- parsing Frontmatter
- parsing Markdown
- extracting headings, links and references
- normalizing metadata and document content
- producing a common document representation for downstream components

Conceptually:

```text
Markdown source
      ↓
load through SourceAdapter
      ↓
parse Frontmatter and Markdown
      ↓
ParsedDocument
```

Example API:

```ts
const document = await loadDocument(source, "docs/decision.md");
const documents = await loadDocuments(source);
```

`loadDocuments` searches the complete source recursively by default. A
directory can be configured to narrow the search. DocType templates and common
generated or dependency directories are excluded.

## Input and output

DocType parsing transforms a configuration file into a normalized definition:

```ts
type ParsedDocType = {
  name: string;
  description?: string;
  metadata: MetadataDefinition;
  structure?: StructureDefinition;
  rules: RuleDefinition[];
};
```

`rules` is always present in the normalized model. It is an empty array when
the DocType has no `rules.yml` file. The optional template is deliberately not
part of `ParsedDocType` until template processing is implemented.

Document parsing consumes source content:

```ts
type SourceDocument = {
  content: string;
  path: string;
  source: SourceMetadata;
};
```

and produces a normalized document:

```ts
type ParsedDocument = {
  type: string | undefined;
  metadata: unknown;
  content: string;
  ast: MarkdownDocument;
  headings: Heading[];
  links: Link[];
  references: Reference[];
  source: SourceMetadata;
};
```

`ParsedDocType` and `ParsedDocument` form the main integration points to Validator and Knowledge.

`metadata` deliberately remains `unknown` at this boundary. Missing, scalar,
or otherwise invalid Frontmatter is still a parseable document and is reported
by Validator rather than rejected by DocType.

## Boundaries

Loader handles parsing and normalization.

It does not:

- execute complex validation rules
- perform cross-document queries
- maintain an index
- access GitLab or GitHub directly
- persist documents

These responsibilities belong to Validator, Knowledge and the corresponding adapters.
