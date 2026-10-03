import { loadDocTypes, loadDocuments } from "@dokkurator/loader";
import { sourceStage } from "./source-errors.js";
import {
  documentConfig,
  openProjectSource,
  processProjectSources,
} from "./source-operations.js";
import type {
  DocTypesSourceResult,
  DocumentsSourceResult,
  SourceOperationResult,
  SourceSelection,
} from "./types.js";

import type { ApplicationContext } from "./application-context.js";

export async function listProjectDocTypes(
  context: ApplicationContext,
  options: SourceSelection = {},
): Promise<SourceOperationResult<DocTypesSourceResult>> {
  return processProjectSources(context.project, options, async (source) => {
    const { adapter, config } = await openProjectSource(
      context.project,
      source,
    );
    const doctypes = await sourceStage("load", "retry-operation", () =>
      loadDocTypes(adapter, {
        doctypesDirectory: config.doctypes.directory,
      }),
    );
    return { sourceId: source.id, doctypes };
  });
}

export async function listProjectDocuments(
  context: ApplicationContext,
  options: SourceSelection = {},
): Promise<SourceOperationResult<DocumentsSourceResult>> {
  return processProjectSources(context.project, options, async (source) => {
    const { adapter, config } = await openProjectSource(
      context.project,
      source,
    );
    const documents = await sourceStage("load", "retry-operation", () =>
      loadDocuments(adapter, documentConfig(config)),
    );
    return { sourceId: source.id, documents };
  });
}
