import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";
import type { KnowledgeDocument } from "../index.js";
import { afterEach, describe, expect, test } from "vitest";
import { SQLiteIndex } from "./sqlite-index.js";

const temporaryDirectories: string[] = [];

afterEach(async () => {
  await Promise.all(
    temporaryDirectories
      .splice(0)
      .map((directory) => rm(directory, { recursive: true })),
  );
});

describe("SQLiteIndex", () => {
  test("treats a read-only legacy index without source states as unindexed", async () => {
    const directory = await mkdtemp(join(tmpdir(), "dokkurator-index-"));
    temporaryDirectories.push(directory);
    const filename = join(directory, "legacy.db");
    const database = new DatabaseSync(filename);
    database.exec("CREATE TABLE documents (id TEXT PRIMARY KEY)");
    database.close();

    const index = new SQLiteIndex({ filename, readOnly: true });
    await expect(index.getSourceState("docs")).resolves.toBeUndefined();
    index.close();
  });

  test("persists and restores complete documents", async () => {
    const { index, filename } = await createIndex();
    const document = exampleDocument();

    await index.upsert(document);

    await expect(index.get(document.id)).resolves.toEqual(document);
    expect(index.filename).toBe(filename);
    index.close();

    const reopened = new SQLiteIndex({ filename });
    await expect(reopened.get(document.id)).resolves.toEqual(document);
    reopened.close();
  });

  test("replaces a document and its search entry atomically", async () => {
    const { index } = await createIndex();
    const document = exampleDocument();
    await index.upsert(document);

    await index.upsert({
      ...document,
      metadata: { title: "SQLite search" },
      content: "# SQLite search\nThe replacement uses FTS5.",
    });

    await expect(index.search({ text: "authentication" })).resolves.toEqual([]);
    const results = await index.search({ text: "replacement FTS5" });
    expect(results).toHaveLength(1);
    expect(results[0]?.document.content).toContain("replacement");
    index.close();
  });

  test("atomically replaces the complete index", async () => {
    const { index } = await createIndex();
    await index.upsert(exampleDocument());
    const replacement = exampleDocument({
      id: "handbook:docs/guide.md",
      type: "guide",
      sourceId: "handbook",
      path: "docs/guide.md",
    });

    await index.replaceAll([replacement]);

    await expect(index.query()).resolves.toEqual([replacement]);
    await expect(
      index.search({ text: "authentication" }),
    ).resolves.toHaveLength(1);
    index.close();
  });

  test("rolls back a failed complete replacement", async () => {
    const { index } = await createIndex();
    const original = exampleDocument();
    await index.upsert(original);
    const duplicatePath = exampleDocument({
      id: "different-id",
    });

    await expect(index.replaceAll([original, duplicatePath])).rejects.toThrow();

    await expect(index.query()).resolves.toEqual([original]);
    await expect(
      index.search({ text: "authentication" }),
    ).resolves.toHaveLength(1);
    index.close();
  });

  test("filters structured and full-text queries", async () => {
    const { index } = await createIndex();
    await index.upsert(exampleDocument());
    await index.upsert(
      exampleDocument({
        id: "handbook:docs/guide.md",
        type: "guide",
        sourceId: "handbook",
        path: "docs/guide.md",
      }),
    );

    await expect(index.query({ type: "decision" })).resolves.toHaveLength(1);
    await expect(index.query({ sourceId: "handbook" })).resolves.toHaveLength(
      1,
    );
    await expect(
      index.search({ text: "authentication", types: ["guide"] }),
    ).resolves.toHaveLength(1);
    await expect(
      index.search({ text: "authentication", sourceId: "handbook" }),
    ).resolves.toMatchObject([
      { document: { source: { sourceId: "handbook" } } },
    ]);
    index.close();
  });

  test("searches partial strings in content and flattened metadata", async () => {
    const { index } = await createIndex();
    const document = {
      ...exampleDocument(),
      metadata: {
        title: "Identity",
        status: "accepted",
        owner: { team: "platform" },
        tags: ["security", "oauth"],
      },
    };
    await index.upsert(document);

    await expect(
      index.search({ expression: term("thenti") }),
    ).resolves.toHaveLength(1);
    await expect(
      index.search({ expression: term("latfor", "owner.team") }),
    ).resolves.toHaveLength(1);
    await expect(
      index.search({ expression: term("ecur", "tags") }),
    ).resolves.toHaveLength(1);
    await expect(
      index.search({ expression: term("accepted", "owner.team") }),
    ).resolves.toEqual([]);
    index.close();
  });

  test("combines search expressions and ranks metadata above one content hit", async () => {
    const { index } = await createIndex();
    const metadataHit = {
      ...exampleDocument({ id: "docs:metadata.md", path: "metadata.md" }),
      metadata: { topic: "authentication" },
      content: "Unrelated body.",
    };
    const contentHit = {
      ...exampleDocument({ id: "docs:content.md", path: "content.md" }),
      metadata: { topic: "other" },
      content: "Authentication appears once.",
    };
    const repeatedContentHit = {
      ...exampleDocument({ id: "docs:repeated.md", path: "repeated.md" }),
      metadata: { topic: "other" },
      content: "Authentication, authentication, authentication.",
    };
    const draft = {
      ...exampleDocument({ id: "docs:draft.md", path: "draft.md" }),
      metadata: { status: "draft" },
      content: "Unrelated body.",
    };
    await index.replaceAll([
      metadataHit,
      contentHit,
      repeatedContentHit,
      draft,
    ]);

    const ranked = await index.search({ expression: term("authentication") });
    expect(ranked.map((hit) => hit.document.id)).toEqual([
      metadataHit.id,
      repeatedContentHit.id,
      contentHit.id,
    ]);
    await expect(
      index.search({
        expression: {
          type: "or",
          operands: [term("authentication"), term("draft", "status")],
        },
      }),
    ).resolves.toHaveLength(4);
    await expect(
      index.search({
        expression: {
          type: "and",
          operands: [term("authentication"), term("other", "topic")],
        },
      }),
    ).resolves.toHaveLength(2);
    index.close();
  });

  test("removes and clears documents from storage and search", async () => {
    const { index } = await createIndex();
    const document = exampleDocument();
    await index.upsert(document);
    await index.remove(document.id);

    await expect(index.get(document.id)).resolves.toBeUndefined();
    await expect(index.search({ text: "authentication" })).resolves.toEqual([]);

    await index.upsert(document);
    await index.clear();
    await expect(index.query()).resolves.toEqual([]);
    index.close();
  });

  test("atomically deletes only documents and state for one source", async () => {
    const { index } = await createIndex();
    const docs = exampleDocument();
    const handbook = exampleDocument({
      id: "handbook:guide.md",
      sourceId: "handbook",
      path: "guide.md",
    });
    await index.upsert(docs);
    await index.upsert(handbook);
    await index.applySourceUpdate({
      state: {
        sourceId: "docs",
        revision: { type: "content-hash", id: "one" },
        files: [],
      },
      upsert: [],
      remove: [],
    });

    await index.deleteSource("docs");

    await expect(index.get(docs.id)).resolves.toBeUndefined();
    await expect(index.get(handbook.id)).resolves.toEqual(handbook);
    await expect(index.getSourceState("docs")).resolves.toBeUndefined();
    index.close();
  });
});

test("rolls back document mutations and checkpoint when a source update fails", async () => {
  const { index } = await createIndex();
  try {
    const document = exampleDocument();
    const state = {
      sourceId: "docs",
      revision: { type: "content-hash" as const, id: "before" },
      files: [],
    };
    await index.applySourceUpdate({ state, upsert: [document], remove: [] });
    await expect(
      index.applySourceUpdate({
        state: { ...state, revision: { type: "content-hash", id: "after" } },
        remove: [document.id],
        upsert: [
          { ...document, id: "docs:broken.md", metadata: { unsupported: 1n } },
        ],
      }),
    ).rejects.toThrow();
    expect(await index.get(document.id)).toEqual(document);
    expect(await index.get("docs:broken.md")).toBeUndefined();
    expect(await index.getSourceState("docs")).toEqual(state);
    expect(await index.search({ text: "authentication" })).toHaveLength(1);
  } finally {
    index.close();
  }
});

async function createIndex(): Promise<{
  index: SQLiteIndex;
  filename: string;
}> {
  const directory = await mkdtemp(join(tmpdir(), "dokkurator-index-"));
  temporaryDirectories.push(directory);
  const filename = join(directory, "nested", "index.db");
  return { index: new SQLiteIndex({ filename }), filename };
}

function term(value: string, metadataKey?: string) {
  return {
    type: "term" as const,
    value,
    ...(metadataKey === undefined ? {} : { metadataKey }),
  };
}

function exampleDocument(
  overrides: Partial<{
    id: string;
    type: string;
    sourceId: string;
    path: string;
  }> = {},
): KnowledgeDocument {
  return {
    id: overrides.id ?? "docs:decisions/authentication.md",
    type: overrides.type ?? "decision",
    metadata: { title: "Choose authentication", status: "accepted" },
    source: {
      sourceId: overrides.sourceId ?? "docs",
      path: overrides.path ?? "decisions/authentication.md",
      repository: "https://example.com/docs.git",
      revision: "abc123",
    },
    content: "# Choose authentication\nUse OAuth 2.0.",
    headings: [{ depth: 1, text: "Choose authentication" }],
    links: [{ url: "./context.md", text: "Context" }],
    references: [
      { identifier: "source", text: "source", referenceType: "full" },
    ],
  };
}
