import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { simpleGit } from "simple-git";
import { afterEach, describe, expect, test } from "vitest";
import {
  DocumentParseError,
  FileSystemSource,
  openConfiguredSource,
  loadDocument,
  loadDocuments,
  type DocumentSource,
  type SourceDocument,
} from "../index.js";

const temporaryDirectories: string[] = [];
afterEach(async () => {
  await Promise.all(
    temporaryDirectories
      .splice(0)
      .map((root) => rm(root, { recursive: true, force: true })),
  );
});

function source(content: string, sourceId = "first"): DocumentSource {
  const document: SourceDocument = {
    id: "docs/example.md",
    path: "docs/example.md",
    content,
    source: { sourceId, kind: "filesystem", path: "docs/example.md" },
  };
  return {
    list: async () => [document],
    read: async () => document,
  };
}

describe("original source text", () => {
  test("reads identical original text from filesystem and a committed Git revision", async () => {
    const root = await mkdtemp(join(tmpdir(), "dokkurator-original-text-"));
    temporaryDirectories.push(root);
    const git = simpleGit(root);
    await git.init(["--initial-branch=main"]);
    await git.addConfig("user.name", "Dokkurator Test");
    await git.addConfig("user.email", "test@example.com");
    await git.addConfig("core.autocrlf", "false");
    const originalText =
      "\uFEFF---\r\ntitle: Grüße 😀\r\n---\r\n# Grüße 😀\r\n";
    await writeFile(join(root, "example.md"), originalText);
    const filesystem = await loadDocument(
      new FileSystemSource({ root, sourceId: "files" }),
      "example.md",
    );
    await git.add("example.md");
    await git.commit("add original document");
    const revision = (await git.revparse(["HEAD"])).trim();
    await writeFile(join(root, "example.md"), "# Working tree changed\n");
    const gitSource = await openConfiguredSource({ id: "git", root });
    const committed = await loadDocument(gitSource, "example.md", { revision });
    expect(filesystem.originalText).toBe(originalText);
    expect(committed.originalText).toBe(originalText);
    expect(committed.headings).toEqual(filesystem.headings);
    expect(committed.source).toMatchObject({
      sourceId: "git",
      path: "example.md",
      git: { fileRevision: revision },
    });
  });
  test.each(["\n", "\r\n", "\r"])(
    "preserves %j line endings and Unicode positions",
    async (newline) => {
      const text = ["---", "title: Grüße 😀", "---", "", "# Grüße 😀", ""].join(
        newline,
      );
      const parsed = await loadDocument(source(text), "docs/example.md");
      expect(parsed.originalText).toBe(text);
      expect(parsed.content).toBe(`${newline}# Grüße 😀${newline}`);
      expect(parsed.parseDiagnostics).toEqual([]);
      const position = parsed.headings[0]!.position!;
      expect(position.start).toEqual({
        line: 5,
        column: 1,
        offset: text.indexOf("#"),
      });
      expect(text.slice(position.start.offset, position.end.offset)).toBe(
        "# Grüße 😀",
      );
    },
  );

  test("preserves BOM and adjusts AST offsets to the original text", async () => {
    const text = "\uFEFF---\r\ntitle: Grüße\r\n---\r\n\r\n# Grüße 😀\r\n";
    const parsed = await loadDocument(source(text), "docs/example.md");
    expect(parsed.originalText).toBe(text);
    expect(parsed.content).toBe("\r\n# Grüße 😀\r\n");
    expect(parsed.metadata).toEqual({ title: "Grüße" });
    const position = parsed.headings[0]!.position!;
    expect(position.start.offset).toBe(text.indexOf("#"));
    expect(text.slice(position.start.offset, position.end.offset)).toBe(
      "# Grüße 😀",
    );
  });

  test("retains full text when there is no frontmatter", async () => {
    const text = "\uFEFF# Grüße 😀\r\n";
    const parsed = await loadDocument(source(text), "docs/example.md");
    expect(parsed.originalText).toBe(text);
    expect(parsed.content).toBe(text);
    expect(parsed.headings[0]!.position!.start).toEqual({
      line: 1,
      column: 2,
      offset: 1,
    });
  });

  test("keeps equal paths in separate sources distinct", async () => {
    const first = await loadDocument(source("# A", "first"), "docs/example.md");
    const second = await loadDocument(
      source("# B", "second"),
      "docs/example.md",
    );
    expect(first.source.path).toBe(second.source.path);
    expect(first.source.sourceId).toBe("first");
    expect(second.source.sourceId).toBe("second");
  });

  test("parses GFM tables, task lists, strikethrough and autolinks", async () => {
    const text =
      "| Name |\n| --- |\n| Value |\n\n- [x] done\n\n~~old~~\n\nhttps://example.com\n";
    const parsed = await loadDocument(source(text), "docs/example.md");
    expect(parsed.ast.children[0]!.type).toBe("table");
    expect(parsed.ast.children[1]).toMatchObject({
      type: "list",
      children: [{ checked: true }],
    });
    expect(parsed.ast.children[2]).toMatchObject({
      type: "paragraph",
      children: [{ type: "delete" }],
    });
    expect(parsed.links).toEqual([
      expect.objectContaining({ url: "https://example.com" }),
    ]);
  });
});

describe("recoverable frontmatter errors", () => {
  test("treats unresolved aliases as document errors in both parse policies", async () => {
    const text = "---\ndoctype: guide\ndetails: *missing\n---\n# Body\n";
    await expect(
      loadDocument(source(text), "docs/example.md"),
    ).rejects.toBeInstanceOf(DocumentParseError);
    const parsed = await loadDocument(source(text), "docs/example.md", {
      parseErrors: "collect",
    });
    expect(parsed.metadata).toBeUndefined();
    expect(parsed.parseDiagnostics).toEqual([
      expect.objectContaining({
        phase: "parse",
        code: "YAML_CONVERSION_ERROR",
        message: expect.stringContaining("Unresolved alias"),
        position: {
          start: { line: 2, column: 1, offset: 4 },
          end: { line: 4, column: 1, offset: 37 },
        },
      }),
    ]);
    expect(parsed.headings[0]!.text).toBe("Body");
  });
  test("still throws by default", async () => {
    await expect(
      loadDocument(source("---\ntitle: [\n---\n"), "docs/example.md"),
    ).rejects.toBeInstanceOf(DocumentParseError);
  });

  test.each(["\n", "\r\n", "\r"])(
    "positions duplicate keys in the original %j text",
    async (newline) => {
      const text = [
        "\uFEFF---",
        "title: Grüße 😀",
        "title: duplicate",
        "---",
        "",
        "# Still parsed",
        "",
      ].join(newline);
      const parsed = await loadDocument(source(text), "docs/example.md", {
        parseErrors: "collect",
      });
      expect(parsed.metadata).toBeUndefined();
      expect(parsed.type).toBeUndefined();
      expect(parsed.originalText).toBe(text);
      expect(parsed.headings[0]!.text).toBe("Still parsed");
      expect(parsed.parseDiagnostics).toEqual([
        expect.objectContaining({
          phase: "parse",
          severity: "error",
          code: "DUPLICATE_KEY",
          source: parsed.source,
          position: expect.objectContaining({
            start: {
              line: 3,
              column: 1,
              offset: text.indexOf("title: duplicate"),
            },
          }),
        }),
      ]);
    },
  );

  test("collects syntax errors without aborting a document batch", async () => {
    const documents = [
      {
        id: "a.md",
        path: "a.md",
        content: "---\ntitle: [\n---\n# Broken\n",
        source: { sourceId: "test", kind: "filesystem" as const, path: "a.md" },
      },
      {
        id: "b.md",
        path: "b.md",
        content: "# Valid\n",
        source: { sourceId: "test", kind: "filesystem" as const, path: "b.md" },
      },
    ];
    const batch: DocumentSource = {
      list: async () => documents,
      read: async (id) => documents.find((document) => document.id === id)!,
    };
    const parsed = await loadDocuments(batch, { parseErrors: "collect" });
    expect(parsed).toHaveLength(2);
    expect(parsed[0]!.parseDiagnostics.length).toBeGreaterThan(0);
    expect(parsed[0]!.headings[0]!.text).toBe("Broken");
    expect(parsed[1]!.parseDiagnostics).toEqual([]);
  });
});
