# @dokkurator/doctype

Core library for loading and parsing Dokkurator DocTypes and Markdown
documents.

The package provides two complete workflows:

- `loadDocTypes` discovers, reads, parses, normalizes, and validates DocType
  definitions.
- `loadDocuments` discovers, reads, and parses Markdown documents and their
  YAML Frontmatter without validating document content.

Both workflows access files through the `SourceAdapter` contract from the
internal `@dokkurator/source-adapters` package. Its `FileSystemSource` reads a
local directory, while `GitSource` reads a local Git working tree and adds
normalized Git metadata.

## Usage

```ts
import { loadDocTypes, loadDocuments } from "@dokkurator/doctype";
import { FileSystemSource } from "@dokkurator/source-adapters";

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
- `ParsedDocType`, `ParsedDocument`, and their supporting types
- parse error types and default directory constants

Raw reading and parser helpers are internal implementation details.
