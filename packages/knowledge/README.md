# @dokkurator/knowledge

Core library for indexing a complete documentation directory into Dokkurator's
derived Knowledge model.

Knowledge consumes the public `ParsedDocument` model from
`@dokkurator/loader`. It does not read or parse Markdown itself and does not
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

`indexDocuments` performs a complete rebuild. `indexDocumentChanges` and
`calculateDocumentDiff` provide the incremental workflow used by Core.

The Knowledge document preserves normalized metadata, a stable source
reference, Markdown content, headings, links, and references. Transient adapter
metadata and the parser-specific Markdown AST are deliberately not part of the
index model. Entity and relation extraction will be added as a separate
Knowledge concern.

Search expressions are parsed by Knowledge and passed to the configured index
as a storage-independent expression tree. `KnowledgeIndex` and the initial
`SQLiteIndex` implementation are both owned and exported by Knowledge; the
SQLite implementation lives in a separable internal adapter directory. Search
terms match partial strings in content and metadata. `key:value` limits a term
to one metadata path; `AND`, `OR`, parentheses, and quoted values can be
combined.

Consumers can import `SQLiteIndex`, `KnowledgeIndex`, and the document/query
types from `@dokkurator/knowledge`. Source implementations are provided by
`@dokkurator/loader`; indexing accepts only Loader's generic `DocumentSource`
contract and does not depend on a concrete source adapter.

Knowledge is a library package and has no standalone CLI. User-facing index,
diff and search commands are provided by the global `dokkurator` CLI through
`@dokkurator/core`.

Indexing is independent of validation. Both indexing entry points tolerate YAML
syntax and conversion errors in frontmatter: Markdown content and source data
remain searchable, but the document has empty metadata and no DocType. Metadata
filters therefore cannot match fields from invalid frontmatter. Parse diagnostics
are not persisted in the index; use `validate` to inspect them. Validly parsed
metadata is indexed even when it violates a DocType schema. Source, read, and
database failures remain operational errors.

The [Knowledge/Search example](../../examples/documentation/search.md) demonstrates
indexing, metadata filters, and incremental updates on the same collection used
by the [validation example](../../examples/documentation/validation.md).
