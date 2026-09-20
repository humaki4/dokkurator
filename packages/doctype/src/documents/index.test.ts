import { describe, expect, test, vi } from "vitest";
import {
  DEFAULT_DOCUMENTS_DIRECTORY,
  DocumentParseError,
  loadDocument,
  loadDocuments,
} from "./index.js";
import { parseDocument, parseDocuments } from "./parse.js";
import { readDocument, readDocuments } from "./read.js";
import type {
  SourceAdapter,
  SourceDocument,
  SourceEntry,
} from "../source-adapters/index.js";

describe("document loading", () => {
  test("loads one document through the source adapter", async () => {
    const sourceDocument = document("docs/example.md", "# Example\n");
    const source: SourceAdapter = {
      list: vi.fn(),
      read: vi.fn(async () => sourceDocument),
    };

    await expect(readDocument(source, sourceDocument.id)).resolves.toBe(
      sourceDocument,
    );
    expect(source.read).toHaveBeenCalledWith("docs/example.md");
  });

  test("loads markdown documents from the whole source in path order by default", async () => {
    const source = sourceWithEntries([
      document("README.md", "readme"),
      document("docs/z-last.md", "last"),
      document("docs/assets/logo.svg", "svg"),
      document("docs/a-first.MD", "first"),
      document("docs/nested/middle.md", "middle"),
    ]);

    const result = await readDocuments(source);

    expect(result.map((entry) => entry.id)).toEqual([
      "README.md",
      "docs/a-first.MD",
      "docs/nested/middle.md",
      "docs/z-last.md",
    ]);
    expect(source.list).toHaveBeenCalledWith({
      prefix: DEFAULT_DOCUMENTS_DIRECTORY,
    });
  });

  test("uses a configured documents directory", async () => {
    const source = sourceWithEntries([
      document("handbook/intro.md", "# Intro"),
    ]);

    const result = await readDocuments(source, {
      documentsDirectory: "handbook",
    });

    expect(result.map((entry) => entry.id)).toEqual(["handbook/intro.md"]);
    expect(source.list).toHaveBeenCalledWith({ prefix: "handbook" });
  });

  test("does not load DocType templates as documentation", async () => {
    const source = sourceWithEntries([
      document("docs/guide.md", "# Guide"),
      document("docs/.doctypes/guide/template.md", "# Template"),
    ]);

    await expect(readDocuments(source)).resolves.toEqual([
      expect.objectContaining({ id: "docs/guide.md" }),
    ]);
    expect(source.read).toHaveBeenCalledTimes(1);
  });

  test("ignores generated and dependency directories", async () => {
    const source = sourceWithEntries([
      document("README.md", "readme"),
      document("node_modules/package/README.md", "dependency"),
      document("packages/example/dist/README.md", "generated"),
      document(".git/README.md", "internal"),
    ]);

    await expect(readDocuments(source)).resolves.toEqual([
      expect.objectContaining({ id: "README.md" }),
    ]);
  });
});

describe("public document workflow", () => {
  test("loadDocument reads and parses one document", async () => {
    const sourceDocument = document(
      "docs/guide.md",
      "---\ndoctype: guide\n---\n\n# Guide\n",
    );
    const source: SourceAdapter = {
      list: vi.fn(),
      read: vi.fn(async () => sourceDocument),
    };

    await expect(
      loadDocument(source, sourceDocument.id),
    ).resolves.toMatchObject({
      type: "guide",
      content: "\n# Guide\n",
      ast: { type: "root" },
      headings: [{ text: "Guide" }],
      source: sourceDocument.source,
    });
  });

  test("loadDocuments reads and parses all discovered documents", async () => {
    const source = sourceWithEntries([
      document("README.md", "# Repository\n"),
      document("docs/guide.md", "---\ndoctype: guide\n---\n\n# Guide\n"),
    ]);

    const result = await loadDocuments(source);

    expect(result.map(({ type }) => type)).toEqual([undefined, "guide"]);
    expect(result.map(({ source: { path } }) => path)).toEqual([
      "README.md",
      "docs/guide.md",
    ]);
  });
});

describe("parseDocument", () => {
  test("parses frontmatter and preserves the Markdown syntax tree", () => {
    const result = parseDocument(
      document(
        "docs/decision.md",
        `---
doctype: decision
title: Choose a parser
tags: [markdown, parser]
---

# Choose a *parser*

Read the [architecture](./architecture.md "Architecture").

See [the source][source].

[source]: https://example.com/source
`,
      ),
    );

    expect(result.type).toBe("decision");
    expect(result.metadata).toEqual({
      doctype: "decision",
      title: "Choose a parser",
      tags: ["markdown", "parser"],
    });
    expect(result.content).toBe(
      `
# Choose a *parser*

Read the [architecture](./architecture.md "Architecture").

See [the source][source].

[source]: https://example.com/source
`,
    );
    expect(result.ast.type).toBe("root");
    expect(result.ast.children[0]).toMatchObject({
      type: "yaml",
      value: expect.stringContaining("doctype: decision"),
    });
    expect(result.headings).toEqual([
      expect.objectContaining({ depth: 1, text: "Choose a parser" }),
    ]);
    expect(result.links).toEqual([
      expect.objectContaining({
        url: "./architecture.md",
        text: "architecture",
        title: "Architecture",
      }),
    ]);
    expect(result.references).toEqual([
      expect.objectContaining({
        identifier: "source",
        label: "source",
        text: "the source",
        referenceType: "full",
      }),
    ]);
  });

  test("keeps missing frontmatter as an unvalidated parser result", () => {
    const result = parseDocument(document("docs/plain.md", "# Plain\n"));

    expect(result.type).toBeUndefined();
    expect(result.metadata).toBeUndefined();
    expect(result.content).toBe("# Plain\n");
    expect(result.headings).toEqual([
      expect.objectContaining({ depth: 1, text: "Plain" }),
    ]);
  });

  test("keeps non-object frontmatter for the validator", () => {
    const result = parseDocument(
      document("docs/scalar.md", "---\njust a scalar\n---\n\nText\n"),
    );

    expect(result.metadata).toBe("just a scalar");
    expect(result.type).toBeUndefined();
  });

  test("does not treat a non-string doctype as a parse error", () => {
    const result = parseDocument(
      document("docs/type.md", "---\ndoctype: 42\n---\n"),
    );

    expect(result.metadata).toEqual({ doctype: 42 });
    expect(result.type).toBeUndefined();
  });

  test("reports invalid YAML frontmatter with its source path", () => {
    expect(() =>
      parseDocument(document("docs/broken.md", "---\ntitle: [\n---\n")),
    ).toThrowError(
      new DocumentParseError("Invalid YAML frontmatter", "docs/broken.md"),
    );
  });

  test("preserves source metadata", () => {
    const source: SourceDocument = {
      ...document("docs/example.md", "# Example\n"),
      source: {
        kind: "git",
        path: "docs/example.md",
        repository: "group/project",
        revision: "abc123",
        branch: "main",
      },
    };

    expect(parseDocument(source).source).toBe(source.source);
  });
});

test("parseDocuments parses documents in input order", () => {
  const result = parseDocuments([
    document("docs/b.md", "# B\n"),
    document("docs/a.md", "# A\n"),
  ]);

  expect(result.map((entry) => entry.headings[0]?.text)).toEqual(["B", "A"]);
});

function document(path: string, content: string): SourceDocument {
  return {
    id: path,
    path,
    content,
    source: { kind: "filesystem", path },
  };
}

function sourceWithEntries(entries: SourceEntry[]): SourceAdapter & {
  list: ReturnType<typeof vi.fn<SourceAdapter["list"]>>;
  read: ReturnType<typeof vi.fn<SourceAdapter["read"]>>;
} {
  const documents = new Map(
    entries.map((entry) => [entry.id, entry as SourceDocument]),
  );

  return {
    list: vi.fn(async () => entries),
    read: vi.fn(async (id) => {
      const result = documents.get(id);
      if (!result) throw new Error(`Missing source: ${id}`);
      return result;
    }),
  };
}
