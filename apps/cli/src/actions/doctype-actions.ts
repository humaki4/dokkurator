import {
  createConfiguredSource,
  loadDocTypes,
  loadDocuments,
} from "@dokkurator/doctype";
import { type ActiveConfig } from "@dokkurator/config";

export async function inspectDocTypes(active: ActiveConfig) {
  return Promise.all(
    active.sources.map(async (source) => {
      return {
        sourceId: source.id,
        doctypes: await loadDocTypes(
          await createConfiguredSource(source, false),
          { doctypesDirectory: source.doctypes.directory },
        ),
      };
    }),
  );
}

export async function inspectDocuments(active: ActiveConfig) {
  return Promise.all(
    active.sources.map(async (source) => {
      return {
        sourceId: source.id,
        documents: await loadDocuments(
          await createConfiguredSource(source, false),
          {
            documentsDirectory: source.documents.directory,
            include: source.documents.include,
            exclude: source.documents.exclude,
          },
        ),
      };
    }),
  );
}
