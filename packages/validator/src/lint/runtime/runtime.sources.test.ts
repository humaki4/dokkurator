import { execFile } from "node:child_process";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import {
  DocumentParseError,
  FileSystemSource,
  loadDocument,
  openConfiguredSource,
  type DocumentSource,
  type ParsedDocument,
} from "@dokkurator/loader";
import { Linter } from "eslint";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import {
  createLintConfig,
  lint,
  LintConfigurationError,
  prepareLintConfiguration,
} from "../../index.js";

const exec = promisify(execFile);
const text =
  "---\r\ndoctype: guide\r\ntitle: 42\r\n---\r\n\r\n# Grüße 😀\r\n\r\n# Grüße 😀\r\n";
const configuration = prepareLintConfiguration({
  docTypes: [
    {
      name: "guide",
      metadata: {
        type: "object",
        properties: { title: { type: "string" } },
      },
      structure: { requiredHeadings: ["Einstieg"] },
      rules: [],
    },
  ],
  rules: { "markdown/no-duplicate-headings": "warn" },
});

function compare(document: ParsedDocument) {
  const direct = new Linter({ configType: "flat" }).verify(
    document.originalText,
    createLintConfig(configuration),
    { filename: document.source.path },
  );
  const result = lint({
    originalText: document.originalText,
    source: document.source,
    configuration,
  });
  expect(result).not.toBeInstanceOf(Promise);
  expect(
    result.diagnostics.map(
      ({ ruleId, message, messageId, severity, location }) => ({
        ruleId,
        message,
        messageId,
        severity,
        location,
      }),
    ),
  ).toEqual(
    direct.map(
      ({
        ruleId,
        message,
        messageId,
        severity,
        line,
        column,
        endLine,
        endColumn,
      }) => ({
        ruleId,
        message,
        messageId,
        severity: severity === 1 ? "warning" : "error",
        location: { line, column, endLine, endColumn },
      }),
    ),
  );
  return result;
}

describe("prepared source snapshots through standard ESLint and the facade", () => {
  let root: string;
  beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), "dokkurator-validator-"));
  });
  afterEach(async () => {
    await rm(root, { recursive: true, force: true });
  });

  test("checks filesystem text after removing the source, preserving all local findings", async () => {
    await writeFile(join(root, "guide.md"), text);
    const source = new FileSystemSource({ root, sourceId: "local" });
    const document = await loadDocument(source, "guide.md");
    await rm(root, { recursive: true });
    const result = compare(document);
    expect(result.status).toBe("failed");
    expect(result.diagnostics.map(({ ruleId }) => ruleId)).toEqual(
      expect.arrayContaining([
        "dokkurator/metadata-schema",
        "dokkurator/required-headings",
        "markdown/no-duplicate-headings",
      ]),
    );
    expect(result.diagnostics).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          sourceId: "local",
          path: "guide.md",
          location: expect.objectContaining({ line: 3, column: 8 }),
        }),
        expect.objectContaining({
          severity: "warning",
          location: expect.objectContaining({ line: 8, column: 1 }),
        }),
      ]),
    );
  });

  test("checks committed Git text independently of a later working-tree edit", async () => {
    await exec("git", ["init", "--quiet", root]);
    await writeFile(join(root, "guide.md"), text);
    await exec("git", ["add", "guide.md"], { cwd: root });
    await exec(
      "git",
      [
        "-c",
        "user.name=Validator Test",
        "-c",
        "user.email=validator@example.com",
        "commit",
        "--quiet",
        "-m",
        "fixture",
      ],
      { cwd: root },
    );
    const { stdout } = await exec("git", ["rev-parse", "HEAD"], { cwd: root });
    const revision = stdout.trim();
    await writeFile(join(root, "guide.md"), "Changed working tree.\n");
    const source = await openConfiguredSource({ id: "committed", root });
    const document = await loadDocument(source, "guide.md", { revision });
    expect(document.originalText).toBe(text);
    expect(document.source.git).toMatchObject({
      fileRevision: revision,
      status: "clean",
    });
    await rm(root, { recursive: true });
    expect(compare(document).diagnostics).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ sourceId: "committed", revision }),
      ]),
    );
  });

  test("checks a virtual source and repeated calls without further source access or state leakage", async () => {
    let content = text;
    const source: DocumentSource = {
      list: vi.fn(async () => []),
      read: vi.fn<DocumentSource["read"]>(async (id) => ({
        id,
        path: id,
        content,
        source: { sourceId: "virtual", kind: "filesystem", path: id },
      })),
    };
    const invalid = await loadDocument(source, "virtual/invalid.md");
    content = "---\ndoctype: guide\ntitle: Anleitung\n---\n\n## Einstieg\n";
    const valid = await loadDocument(source, "virtual/valid.md");
    vi.mocked(source.read).mockRejectedValue(
      new Error("Source access after preparation"),
    );
    vi.mocked(source.list).mockRejectedValue(
      new Error("Source access after preparation"),
    );
    const first = compare(invalid);
    expect(compare(valid).diagnostics).toEqual([]);
    expect(compare(invalid)).toEqual(first);
    expect(source.read).toHaveBeenCalledTimes(2);
    expect(source.list).not.toHaveBeenCalled();
  });

  test("separates load failures, collected parse findings, and preparation errors", async () => {
    const source = new FileSystemSource({ root });
    await expect(loadDocument(source, "missing.md")).rejects.toThrow(
      "Source not found",
    );
    await writeFile(
      join(root, "broken.md"),
      "---\ndoctype: [broken\n---\n# Broken\n",
    );
    await expect(loadDocument(source, "broken.md")).rejects.toBeInstanceOf(
      DocumentParseError,
    );
    const document = await loadDocument(source, "broken.md", {
      parseErrors: "collect",
    });
    expect(document.parseDiagnostics).not.toHaveLength(0);
    expect(compare(document).diagnostics).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          phase: "parse",
          ruleId: "dokkurator/doctype",
        }),
      ]),
    );
    expect(() =>
      prepareLintConfiguration({
        docTypes: [],
        rules: { "markdown/nonexistent": "error" },
      }),
    ).toThrow(LintConfigurationError);
  });
});
