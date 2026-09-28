import { loadDocTypes, loadDocuments } from "@dokkurator/doctype";
import { resolveSourceContent, type LoadedConfig } from "@dokkurator/config";
import { configuredSource, selectSources } from "../project.js";

export async function inspectDocTypes(
  loaded: LoadedConfig,
  sourceId: string | undefined,
  directory?: string,
) {
  return Promise.all(
    selectSources(loaded, sourceId).map(async (source) => {
      const content = await resolveSourceContent(loaded, source);
      return {
        sourceId: source.id,
        doctypes: await loadDocTypes(await configuredSource(loaded, source), {
          doctypesDirectory: directory ?? content.doctypes.directory,
        }),
      };
    }),
  );
}

export async function inspectDocuments(
  loaded: LoadedConfig,
  sourceId: string | undefined,
  directory?: string,
) {
  return Promise.all(
    selectSources(loaded, sourceId).map(async (source) => {
      const content = await resolveSourceContent(loaded, source);
      return {
        sourceId: source.id,
        documents: await loadDocuments(await configuredSource(loaded, source), {
          documentsDirectory: directory ?? content.documents.directory,
          include: content.documents.include,
          exclude: content.documents.exclude,
        }),
      };
    }),
  );
}
