import type { ParsedDocument } from "@dokkurator/doctype";
import { describe, expect, test } from "vitest";
import {
  buildKnowledgeDocument,
  buildKnowledgeDocuments,
  buildSourceReference,
} from "./documents.js";

describe("buildKnowledgeDocument", () => {
  test("builds an indexable document from the public DocType model", () => {
    const parsed = document({
      type: "decision",
      metadata: { title: "Choose an index", status: "draft" },
    });

    const result = buildKnowledgeDocument(parsed);

    expect(result).toEqual({
      id: "test:docs/decision.md",
      type: "decision",
      metadata: { title: "Choose an index", status: "draft" },
      source: { sourceId: "test", path: "docs/decision.md" },
      content: "# Choose an index\n",
      headings: parsed.headings,
      links: parsed.links,
      references: parsed.references,
    });
    expect(result).not.toHaveProperty("ast");
  });

  test.each([undefined, "metadata", ["metadata"]])(
    "normalizes non-object metadata %j to an empty object",
    (metadata) => {
      const result = buildKnowledgeDocument(document({ metadata }));

      expect(result.metadata).toEqual({});
      expect(result).not.toHaveProperty("type");
    },
  );
});

test("keeps stable provenance and omits transient Git metadata", () => {
  const source = buildSourceReference({
    sourceId: "platform/docs",
    kind: "git",
    path: "architecture/index.md",
    repository: "https://example.com/platform/docs.git",
    git: {
      root: "/work/docs",
      branch: "feature/local-change",
      headRevision: "head-revision",
      fileRevision: "file-revision",
      status: "modified",
      author: { name: "Example", email: "private@example.com" },
    },
  });

  expect(source).toEqual({
    sourceId: "platform/docs",
    path: "architecture/index.md",
    revision: "file-revision",
    repository: "https://example.com/platform/docs.git",
  });
});

test("buildKnowledgeDocuments preserves document order", () => {
  const first = document({ path: "docs/first.md" });
  const second = document({ path: "docs/second.md" });

  expect(buildKnowledgeDocuments([first, second]).map(({ id }) => id)).toEqual([
    "test:docs/first.md",
    "test:docs/second.md",
  ]);
});

function document(
  options: {
    readonly path?: string;
    readonly type?: string;
    readonly metadata?: unknown;
  } = {},
): ParsedDocument {
  const path = options.path ?? "docs/decision.md";
  return {
    type: options.type,
    metadata: options.metadata,
    content: "# Choose an index\n",
    ast: { type: "root", children: [] },
    headings: [{ depth: 1, text: "Choose an index" }],
    links: [{ url: "./context.md", text: "Context" }],
    references: [
      {
        identifier: "source",
        text: "source",
        referenceType: "full",
      },
    ],
    source: { sourceId: "test", kind: "filesystem", path },
  };
}
