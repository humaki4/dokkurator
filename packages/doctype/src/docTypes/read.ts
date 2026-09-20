import type {
  SourceAdapter,
  SourceDocument,
  SourceId,
} from "@dokkurator/source-adapters";
import { SourceNotFoundError } from "@dokkurator/source-adapters";
import {
  DEFAULT_DOCTYPES_DIRECTORY,
  type DocTypeConfig,
  type LoadedDocType,
} from "./types.js";

export async function readDocType(
  source: SourceAdapter,
  directory: SourceId,
): Promise<LoadedDocType> {
  const sourceId = (fileName: string): SourceId =>
    `${directory.replace(/\/+$/, "")}/${fileName}`;
  const [definition, template, rules] = await Promise.all([
    source.read(sourceId("definition.yml")),
    readOptionalSource(source, sourceId("template.md")),
    readOptionalSource(source, sourceId("rules.yml")),
  ]);

  return { directory, definition, template, rules };
}

export async function readDocTypes(
  source: SourceAdapter,
  config: DocTypeConfig = {},
): Promise<LoadedDocType[]> {
  const doctypesDirectory =
    config.doctypesDirectory ?? DEFAULT_DOCTYPES_DIRECTORY;
  const entries = await source.list({ prefix: doctypesDirectory });
  const definitionSuffix = "/definition.yml";
  const directories = entries
    .map((entry) => entry.id)
    .filter((id) => id.endsWith(definitionSuffix))
    .map((id) => id.slice(0, -definitionSuffix.length));

  return Promise.all(
    [...new Set(directories)]
      .sort()
      .map((directory) => readDocType(source, directory)),
  );
}

async function readOptionalSource(
  source: SourceAdapter,
  id: SourceId,
): Promise<SourceDocument | undefined> {
  try {
    return await source.read(id);
  } catch (error) {
    if (error instanceof SourceNotFoundError) return undefined;
    throw error;
  }
}
