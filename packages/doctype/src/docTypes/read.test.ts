import { expect, test, vi } from "vitest";
import { DEFAULT_DOCTYPES_DIRECTORY } from "./types.js";
import { readDocType, readDocTypes } from "./read.js";
import type {
  SourceAdapter,
  SourceDocument,
  SourceEntry,
} from "@dokkurator/source-adapters";
import { SourceNotFoundError } from "@dokkurator/source-adapters";

test("loads all DocType files through the source adapter without parsing", async () => {
  const documents = new Map<string, SourceDocument>([
    [
      "decision/definition.yml",
      document("decision/definition.yml", "name: decision\n"),
    ],
    [
      "decision/template.md",
      document("decision/template.md", "# {{ title }}\n"),
    ],
    ["decision/rules.yml", document("decision/rules.yml", "rules: []\n")],
  ]);
  const source: SourceAdapter = {
    list: vi.fn(),
    read: vi.fn(async (id) => {
      const result = documents.get(id);
      if (!result) throw new Error(`Missing source: ${id}`);
      return result;
    }),
  };

  await expect(readDocType(source, "decision")).resolves.toEqual({
    directory: "decision",
    definition: documents.get("decision/definition.yml"),
    template: documents.get("decision/template.md"),
    rules: documents.get("decision/rules.yml"),
  });
  expect(source.read).toHaveBeenCalledTimes(3);
});

test("loads a DocType without optional template and rules", async () => {
  const definition = document(
    "decision/definition.yml",
    "name: decision\nmetadata:\n  type: object\n",
  );
  const source: SourceAdapter = {
    list: vi.fn(),
    read: vi.fn(async (id) => {
      if (id === definition.id) return definition;
      throw new SourceNotFoundError(id);
    }),
  };

  await expect(readDocType(source, "decision")).resolves.toEqual({
    directory: "decision",
    definition,
    template: undefined,
    rules: undefined,
  });
});

test("loads every DocType from the default directory", async () => {
  const source = sourceWithDocTypes(DEFAULT_DOCTYPES_DIRECTORY, [
    "architecture",
    "concept",
  ]);

  const result = await readDocTypes(source);

  expect(result.map((docType) => docType.directory)).toEqual([
    "_dokkurator/.doctypes/architecture",
    "_dokkurator/.doctypes/concept",
  ]);
  expect(source.list).toHaveBeenCalledWith({
    prefix: DEFAULT_DOCTYPES_DIRECTORY,
  });
  expect(source.read).toHaveBeenCalledTimes(6);
});

test("loads DocTypes from a configured directory", async () => {
  const source = sourceWithDocTypes("config/types", ["decision"]);

  const result = await readDocTypes(source, {
    doctypesDirectory: "config/types",
  });

  expect(result).toHaveLength(1);
  expect(result[0]?.directory).toBe("config/types/decision");
  expect(source.list).toHaveBeenCalledWith({ prefix: "config/types" });
});

function document(path: string, content: string): SourceDocument {
  return {
    id: path,
    path,
    content,
    source: { sourceId: "test", kind: "filesystem", path },
  };
}

function sourceWithDocTypes(
  root: string,
  names: string[],
): SourceAdapter & {
  list: ReturnType<typeof vi.fn<SourceAdapter["list"]>>;
  read: ReturnType<typeof vi.fn<SourceAdapter["read"]>>;
} {
  const documents = new Map<string, SourceDocument>();
  const entries: SourceEntry[] = [];

  for (const name of names) {
    for (const [fileName, content] of [
      ["definition.yml", `name: ${name}\n`],
      ["template.md", `# ${name}\n`],
      ["rules.yml", "rules: []\n"],
    ] as const) {
      const path = `${root}/${name}/${fileName}`;
      const sourceDocument = document(path, content);
      documents.set(path, sourceDocument);
      entries.push(sourceDocument);
    }
  }

  return {
    list: vi.fn(async () => entries),
    read: vi.fn(async (id) => {
      const result = documents.get(id);
      if (!result) throw new Error(`Missing source: ${id}`);
      return result;
    }),
  };
}
