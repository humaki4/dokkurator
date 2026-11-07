import { mkdtemp, mkdir, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expect, test, vi } from "vitest";
import type {
  DocumentSource,
  SourceDocument,
} from "../source-adapter/index.js";
import { SourceNotFoundError } from "../source-adapter/index.js";
import { loadDocType, loadDocTypes } from "./index.js";

test("loadDocType reads, parses, and validates a DocType", async () => {
  const source = sourceWithDefinition("types/decision", "decision");

  await expect(loadDocType(source, "types/decision")).resolves.toEqual({
    name: "decision",
    metadata: { type: "object" },
    rules: [],
  });
});

test("loadDocTypes exposes the complete workflow at the public boundary", async () => {
  const source = sourceWithDefinition("types/concept", "concept");
  source.list.mockResolvedValue([
    {
      id: "types/concept/definition.yml",
      path: "types/concept/definition.yml",
      source: {
        sourceId: "test",
        kind: "filesystem",
        path: "types/concept/definition.yml",
      },
    },
  ]);

  await expect(
    loadDocTypes(source, { doctypesDirectory: "types" }),
  ).resolves.toEqual([
    {
      name: "concept",
      metadata: { type: "object" },
      rules: [],
    },
  ]);
});

function sourceWithDefinition(
  directory: string,
  name: string,
): DocumentSource & {
  list: ReturnType<typeof vi.fn<DocumentSource["list"]>>;
} {
  const definition = document(
    `${directory}/definition.yml`,
    `name: ${name}\nmetadata:\n  type: object\n`,
  );

  return {
    list: vi.fn(async () => []),
    read: vi.fn(async (id) => {
      if (id === definition.id) return definition;
      throw new SourceNotFoundError(id);
    }),
  };
}

function document(path: string, content: string): SourceDocument {
  return {
    id: path,
    path,
    content,
    source: { sourceId: "test", kind: "filesystem", path },
  };
}

test("loadDocTypes accepts a project root and custom DocType directory", async () => {
  const root = await mkdtemp(join(tmpdir(), "dokkurator-doctypes-"));
  try {
    await mkdir(join(root, "types", "guide"), { recursive: true });
    await writeFile(
      join(root, "types", "guide", "definition.yml"),
      "name: guide\nmetadata:\n  type: object\n",
    );
    await expect(
      loadDocTypes(root, { doctypesDirectory: "types" }),
    ).resolves.toEqual([
      { name: "guide", metadata: { type: "object" }, rules: [] },
    ]);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
