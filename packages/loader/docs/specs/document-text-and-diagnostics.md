---
doctype: spec
title: Loader contract for original text and parse diagnostics
status: accepted
component: loader
---

# Loader contract for original text and parse diagnostics

This contract describes implemented Loader behavior.

## Public document contract

`loadDocument` and `loadDocuments` from `@dokkurator/loader` also return:

- `originalText`: the complete original text, including frontmatter, BOM,
  Unicode and original line endings.
- `parseDiagnostics`: structured parse errors; an empty array for valid text.

`content` remains the Markdown body without frontmatter or the immediately
following line break. AST, heading, link and reference positions refer to
`originalText`. Positions are 1-based, offsets count JavaScript UTF-16 code units,
and end positions are exclusive. A leading BOM remains in the text and counts
in Loader offsets and first-line columns. ESLint/Micromark ignores the BOM in
its first-line columns; lint normalization adds a column there when needed.
Subsequent lines are directly comparable.

`source` retains all existing `SourceMetadata`, particularly `sourceId`, the
source-relative `path` and any Git revisions. Identical paths in different
sources remain distinguishable. The third parameter of `loadDocument` still
accepts `revision`; parse options are not forwarded to the source adapter.

`DocumentParseOptions`, `DocumentParseDiagnostic`, `DocumentParseError`,
`SourceDocument` and `SourceMetadata` are available through the package root API.
Manually constructed `ParsedDocument` objects must provide the two additional
required fields; existing callers of loading functions receive them automatically.

## Syntax and parsers

Loader continues to use Remark/MDAST with `remark-gfm` 4.0.1:
CommonMark plus GFM tables, task lists, strikethrough, autolinks and YAML
frontmatter. ESLint preparation accordingly uses `language: "markdown/gfm"`
and `languageOptions: { frontmatter: "yaml" }`. Math, TOML and JSON frontmatter
extensions are not enabled.

YAML is read from the original text span so the normalized MDAST YAML value
does not shift CRLF offsets. Standalone CR line endings are converted to LF
without changing length, solely for the YAML parser. Original text and body
are not normalized. The YAML library provides error codes and ranges; Loader
maps them to the complete original text.

## Error handling and ownership

Existing behavior remains the default: invalid YAML throws `DocumentParseError`.
Validator applications can explicitly collect errors:

```ts
import { loadDocuments } from "@dokkurator/loader";

const documents = await loadDocuments(source, { parseErrors: "collect" });
```

For YAML syntax errors or duplicate keys, the affected document receives parse
diagnostics with code, severity, message, source metadata and original position.
`metadata` and `type` are then `undefined`; partially parsed values are not
exposed as valid metadata. Markdown body, AST and original text remain available.
Other documents in the batch are still parsed. I/O errors and unexpected runtime
errors remain operational failures rather than being disguised as document findings.

In the combined Loader/lint flow, a YAML parse error has one diagnostic owner:
Validator checks original text; Loader diagnostics are not appended again.
There is no public field-position API or persisted YAML CST.

## Verification

Loader tests cover text and positions for frontmatter, LF/CRLF/CR, Unicode,
BOM, separate sources, GFM, syntax errors and duplicate YAML keys.
One test loads identical text from the filesystem and a fixed Git revision despite
changes in the working directory. The Validator compatibility test compares
heading positions through the public Loader root API with ESLint for frontmatter,
BOM, CRLF and Unicode.
