---
doctype: architecture
title: DocType
status: draft
component: doctype
tags: [markdown, metadata]
---

# DocType

`DocType` is the core library for loading, parsing and representing document type definitions and for parsing documents according to those definitions.

It therefore has two distinct responsibilities:

1. **DocType parsing** — load and parse DocType definitions.
2. **Document parsing** — parse Markdown documents using a resolved DocType.

## Technology

The library is implemented in TypeScript and targets Node.js environments.

Planned building blocks include:

- YAML parsing for DocType definitions and Frontmatter
- Markdown parsing based on the unified / remark ecosystem [remarkjs](https://github.com/remarkjs/remark)
- schema validation for DocType definitions [ajv](https://github.com/ajv-validator/ajv) and [yaml](https://github.com/eemeli/yaml)
- JSON Schema-compatible validation for structured metadata where applicable
- plain TypeScript models as the integration boundary to Validator and Knowledge
- extensible parsing for links, references and embedded content

The library has no dependency on Git providers, databases or the Catalog Server.

## Responsibilities

### DocType loading and parsing

DocType definitions describe the expected structure and metadata of a document type.

The library is responsible for:

- loading DocType definitions from configuration files
- parsing YAML into a normalized DocType model
- validating the structure of DocType definitions
- resolving defaults and shorthand definitions
- exposing the parsed definition to other components

Conceptually:

```text
doctype.yaml
    ↓
load
    ↓
parse
    ↓
validate definition
    ↓
NormalizedDocType
```

Example API:

```ts
const docType = await loadDocType("./doctypes/decision.yaml");
```

### Document parsing

Once a DocType is available, the library parses actual documentation files.

It is responsible for:

- parsing Frontmatter
- parsing Markdown
- extracting headings, links and references
- applying the DocType's structural information
- normalizing metadata and document content
- producing a common document representation for downstream components

Conceptually:

```text
document.md + NormalizedDocType
              ↓
            parse
              ↓
        ParsedDocument
```

Example API:

```ts
const document = await parseDocument({
  source,
  docType,
});
```

## Input and output

DocType parsing transforms a configuration file into a normalized definition:

```ts
type ParsedDocType = {
  name: string;
  metadata: MetadataDefinition;
  structure?: StructureDefinition;
  rules?: RuleDefinition[];
};
```

Document parsing consumes this definition together with source content:

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
  type: string;
  metadata: Record<string, unknown>;
  content: MarkdownDocument;
  headings: Heading[];
  links: Link[];
  references: Reference[];
  source: SourceMetadata;
};
```

`ParsedDocType` and `ParsedDocument` form the main integration points to Validator and Knowledge.

## Boundaries

DocType handles parsing and normalization.

It does not:

- execute complex validation rules
- perform cross-document queries
- maintain an index
- access GitLab or GitHub directly
- persist documents

These responsibilities belong to Validator, Knowledge and the corresponding adapters.
