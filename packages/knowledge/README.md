# @dokkurator/knowledge

Core library for indexing a complete documentation directory into Dokkurator's
derived Knowledge model.

Knowledge consumes the public `ParsedDocument` model from
`@dokkurator/doctype`. It does not read or parse Markdown itself and does not
depend on DocType implementation details.

## Usage

```ts
import { indexDocuments } from "@dokkurator/knowledge";

const result = await indexDocuments({
  source,
  index,
  documentsDirectory: "docs",
});
```

`indexDocuments` is the single public indexing operation. It recursively loads
the complete configured directory, transforms every parsed document and
atomically replaces the index contents.

The Knowledge document preserves normalized metadata, a stable source
reference, Markdown content, headings, links, and references. Transient adapter
metadata and the parser-specific Markdown AST are deliberately not part of the
index model. Entity and relation extraction will be added as a separate
Knowledge concern.

## CLI

The package also provides the same operation as a command:

```text
dokkurator-knowledge \
  --root <directory> \
  --documents-directory <directory> \
  --index .dokkurator/index.db \
  index
```

`--documents-directory` and `--index` are relative to `--root`. The defaults
index the complete root into `.dokkurator/index.db`.
