import type {
  SourceAdapter,
  SourceDocument,
  SourceId,
} from "./source-adapter.js";

export * from "./source-adapter.js";

export interface DocType {
  name: string;
  requiredFields: readonly string[];
}

export interface LoadedDocType {
  directory: SourceId;
  definition: SourceDocument;
  template: SourceDocument;
  rules: SourceDocument;
}

export async function loadDocType(
  source: SourceAdapter,
  directory: SourceId,
): Promise<LoadedDocType> {
  const sourceId = (fileName: string): SourceId =>
    `${directory.replace(/\/+$/, "")}/${fileName}`;
  const [definition, template, rules] = await Promise.all([
    source.read(sourceId("definition.yml")),
    source.read(sourceId("template.md")),
    source.read(sourceId("rules.yml")),
  ]);

  return {
    directory,
    definition,
    template,
    rules,
  };
}
