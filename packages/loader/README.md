# @dokkurator/loader

Core library for loading and parsing Dokkurator DocTypes and Markdown
documents.

The package provides two complete workflows:

- `loadDocTypes` discovers, reads, parses, normalizes, and validates DocType
  definitions.
- `loadDocuments` discovers, reads, and parses Markdown documents and their
  YAML Frontmatter without validating document content.

Both workflows access files through DocType's public `DocumentSource`
contract. `FileSystemSource` reads a local directory, while `GitSource` reads a
local Git working tree and adds normalized Git metadata. These implementations
are owned by DocType and exported from its package root.

## Usage

```ts
import { loadDocTypes, loadDocuments } from "@dokkurator/loader";
import { FileSystemSource } from "@dokkurator/loader";

const source = new FileSystemSource({ root: process.cwd() });

const docTypes = await loadDocTypes(source);
const documents = await loadDocuments(source);
```

DocTypes are discovered below `_dokkurator/.doctypes` by default. Each DocType
directory contains a required `definition.yml` and optional `rules.yml` and
`template.md` files.

Documents are discovered recursively across the complete source by default.
The search can be narrowed to a directory:

```ts
const documents = await loadDocuments(source, {
  documentsDirectory: "docs",
});
```

DocType templates and common dependency or generated directories are excluded
from document discovery.

## Parsed DocTypes

`loadDocTypes` returns `ParsedDocType[]`. Each entry contains:

- `name`: unique DocType name from `definition.yml`.
- `description`: optional human-readable description.
- `metadata`: the JSON Schema-compatible definition for document Frontmatter.
- `structure`: optional structural expectations such as required headings.
- `rules`: normalized rule definitions; always present and empty when no
  `rules.yml` exists.

DocType definitions are validated while loading because they are a prerequisite
for validating documents.

### Metadata: compact fields or JSON Schema

`definition.yml` accepts a compact field map for common metadata requirements:

```yaml
name: decision
metadata:
  doctype:
    type: string
    required: true
  title:
    type: string
    required: true
    pattern: '^[A-Z]'
  status:
    type: string
    enum: [draft, accepted]
  tags:
    type: array
    items:
      type: string
```

The Loader expands the map into an object JSON Schema: field definitions become
`properties`, and `required: true` becomes an entry in the object's `required`
array. Fields are optional otherwise; additional fields remain allowed. Each
field accepts JSON Schema keywords such as `pattern`, `enum`, `items`, or `$ref`.
Nested object schemas use the standard `properties` and `required: [field]`
syntax; compact expansion only applies to the top-level field map.

For conditions across fields, `additionalProperties`, or other object-level
constraints, use a complete JSON Schema Draft 7 instead:

```yaml
name: decision
metadata:
  type: object
  required: [doctype, title]
  properties:
    doctype: { const: decision }
    title: { type: string, pattern: '^[A-Z]' }
    status: { type: string, enum: [draft, accepted] }
    component: { type: string }
  additionalProperties: false
  if:
    required: [status]
    properties:
      status: { const: accepted }
  then:
    required: [component]
```

Complete schemas are preserved. Both forms produce the same JSON Schema
contract for consumers and are validated by the same Validator rule. Do not mix
compact fields with object-level schema keywords. For field names that are also
object-level keywords, such as `properties` or `required`, use the full schema's
`properties` map. `type` can be a regular compact field when its value is a field
schema, but the document's DocType selector remains `doctype`.

## Parsed documents

`loadDocuments` returns `ParsedDocument[]`. Each entry contains:

- `type`: the string value of `frontmatter.doctype`, or `undefined` when it is
  absent or not a string.
- `metadata`: parsed YAML Frontmatter as `unknown`. Its validity is deliberately
  left to `@dokkurator/validator`.
- `content`: the Markdown body as source text without YAML Frontmatter.
- `ast`: the complete remark/mdast syntax tree used for structural validation
  and analysis.
- `headings`: normalized heading depth, text, and source position.
- `links`: inline Markdown links with URL, text, optional title, and position.
- `references`: Markdown link references with identifier, label, text, reference
  kind, and position.
- `source`: normalized source information such as path, repository, revision,
  branch, working-tree status, commit timestamp, and author.

Missing or structurally invalid Frontmatter does not make a Markdown document
unparseable. Only malformed YAML produces a `DocumentParseError`; semantic
findings belong to the Validator.

## Public API

The package root is the supported integration boundary. It exports:

- `loadDocType`, `loadDocTypes`
- `loadDocument`, `loadDocuments`
- `FileSystemSource`, `GitSource`, `createLocalSource`, and `DocumentSource`
- `ParsedDocType`, `ParsedDocument`, and their supporting types
- parse error types and default directory constants

Raw reading and parser helpers are internal implementation details.
