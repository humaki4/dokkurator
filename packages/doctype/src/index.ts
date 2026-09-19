import type {
  SourceAdapter,
  SourceDocument,
  SourceId,
} from "./source-adapter.js";

export * from "./source-adapter.js";

export const DEFAULT_DOCTYPES_DIRECTORY = "_dokkurator/.doctypes";

export interface DocTypeConfig {
  doctypesDirectory: SourceId;
}

export const DEFAULT_DOCTYPE_CONFIG: Readonly<DocTypeConfig> = {
  doctypesDirectory: DEFAULT_DOCTYPES_DIRECTORY,
};

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

export async function loadDocTypes(
  source: SourceAdapter,
  config: DocTypeConfig = DEFAULT_DOCTYPE_CONFIG,
): Promise<LoadedDocType[]> {
  const entries = await source.list({ prefix: config.doctypesDirectory });
  const definitionSuffix = "/definition.yml";
  const directories = entries
    .map((entry) => entry.id)
    .filter((id) => id.endsWith(definitionSuffix))
    .map((id) => id.slice(0, -definitionSuffix.length));

  return Promise.all(
    [...new Set(directories)]
      .sort()
      .map((directory) => loadDocType(source, directory)),
  );
}
