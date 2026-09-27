import { loadDocTypes, loadDocuments } from "@dokkurator/doctype";
import type { LoadedConfig } from "../config.js";
import { configuredSource, selectSources } from "../project.js";

export async function inspectDocTypes(
  loaded: LoadedConfig,
  sourceId: string | undefined,
  directory: string,
) {
  return Promise.all(
    selectSources(loaded, sourceId).map(async (source) => ({
      sourceId: source.id,
      doctypes: await loadDocTypes(await configuredSource(loaded, source), {
        doctypesDirectory: directory,
      }),
    })),
  );
}

export async function inspectDocuments(
  loaded: LoadedConfig,
  sourceId: string | undefined,
  directory: string,
) {
  return Promise.all(
    selectSources(loaded, sourceId).map(async (source) => ({
      sourceId: source.id,
      documents: await loadDocuments(await configuredSource(loaded, source), {
        documentsDirectory: directory,
      }),
    })),
  );
}
