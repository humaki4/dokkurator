# @dokkurator/knowledge

Core library for transforming parsed Markdown documents into Dokkurator's
derived Knowledge model.

Knowledge consumes the public `ParsedDocument` model from
`@dokkurator/doctype`. It does not read or parse Markdown itself and does not
depend on DocType implementation details.

## Usage

```ts
import { loadDocuments } from "@dokkurator/doctype";
import { FileSystemSource } from "@dokkurator/source-adapters";
import { buildKnowledgeDocuments } from "@dokkurator/knowledge";

const source = new FileSystemSource({ root: process.cwd() });
const parsedDocuments = await loadDocuments(source);
const knowledgeDocuments = buildKnowledgeDocuments(parsedDocuments);
```

The Knowledge document preserves normalized metadata, a stable source
reference, Markdown content, headings, links, and references. Transient adapter
metadata and the parser-specific Markdown AST are deliberately not part of the
index model. Entity and relation extraction will be added as a separate
Knowledge concern.

## Internal CLI

The package includes an internal CLI for inspecting the transformation:

```text
dokkurator-knowledge [--root <directory>]
  [--documents-directory <directory>] loadDocuments
```

`DOKKURATOR_DOCUMENTS_DIRECTORY` provides the same environment-based directory
configuration as the DocType CLI.
