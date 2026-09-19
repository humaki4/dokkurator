import { expect, test, vi } from "vitest";
import { loadDocType } from "./index.js";
import type { SourceAdapter, SourceDocument } from "./source-adapter.js";

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

  await expect(loadDocType(source, "decision")).resolves.toEqual({
    directory: "decision",
    definition: documents.get("decision/definition.yml"),
    template: documents.get("decision/template.md"),
    rules: documents.get("decision/rules.yml"),
  });
  expect(source.read).toHaveBeenCalledTimes(3);
});

function document(path: string, content: string): SourceDocument {
  return {
    id: path,
    path,
    content,
    source: { kind: "filesystem", path },
  };
}
