import type {
  ResolvedProjectConfig,
  ResolvedProjectSource,
  ResolvedSource,
} from "@dokkurator/config";
import {
  calculateDocumentDiff,
  indexDocumentChanges,
  searchKnowledge,
  type IndexDocumentChangesResult,
  type IncrementalKnowledgeIndex,
} from "@dokkurator/knowledge";
import {
  loadDocTypes,
  loadDocuments,
  openConfiguredSource,
  prepareConfiguredSource,
  SourcePreparationRequiredError,
  updateConfiguredSource,
  type SourceAdapter,
} from "@dokkurator/loader";
import { sourceStage } from "./source-errors.js";
import {
  documentConfig,
  openProjectSource,
  processProjectSources,
  resolveProjectSource,
  selectProjectSources,
} from "./source-operations.js";
import type {
  DiffSourceResult,
  DocTypesSourceResult,
  DocumentsSourceResult,
  PrepareSourceResult,
  SearchOptions,
  SourceOperationResult,
  SourceSelection,
  SyncSourceResult,
} from "./types.js";

/** Resources available while a Dokkurator application is open. */
export interface ApplicationContext {
  readonly project: ResolvedProjectConfig;
  readonly index: IncrementalKnowledgeIndex;
}

export async function prepareSources(
  context: ApplicationContext,
  options: SourceSelection = {},
): Promise<SourceOperationResult<PrepareSourceResult>> {
  return processProjectSources(context.project, options, (source) =>
    prepareSource(context, source),
  );
}

export async function syncSources(
  context: ApplicationContext,
  options: SourceSelection = {},
): Promise<SourceOperationResult<SyncSourceResult>> {
  return processProjectSources(context.project, options, (source) =>
    syncSource(context, source),
  );
}

export async function diffSources(
  context: ApplicationContext,
  options: SourceSelection = {},
): Promise<SourceOperationResult<DiffSourceResult>> {
  return processProjectSources(context.project, options, async (source) => {
    const { adapter, config } = await openProjectSource(
      context.project,
      source,
    );
    const diff = await sourceStage("diff", "retry-operation", () =>
      calculateDocumentDiff({
        source: adapter,
        index: context.index,
        documents: documentConfig(config),
      }),
    );
    return { sourceId: source.id, diff };
  });
}

export async function searchDocuments(
  context: ApplicationContext,
  query: string,
  options: SearchOptions = {},
) {
  selectProjectSources(context.project, options);
  return searchKnowledge(context.index, query, options);
}

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

async function prepareSource(
  context: ApplicationContext,
  source: ResolvedProjectSource,
): Promise<PrepareSourceResult> {
  let checkout: PrepareSourceResult["checkout"] =
    source.remote === undefined ? "local" : "existing";
  try {
    await openConfiguredSource(source);
  } catch (error) {
    if (!(error instanceof SourcePreparationRequiredError)) throw error;
    checkout = source.remote === undefined ? "local" : "created";
  }
  const adapter = await sourceStage("preparation", "check-source", () =>
    prepareConfiguredSource(source),
  );
  const resolved = await resolveProjectSource(context.project, source);
  const previous = await sourceStage("index", "retry-index", () =>
    context.index.getSourceState(source.id),
  );
  if (previous !== undefined)
    return {
      sourceId: source.id,
      checkout,
      index: "existing",
      indexedDocuments: 0,
      removedDocuments: 0,
    };
  const result = await indexSourceChanges(context, adapter, resolved);
  return {
    sourceId: source.id,
    checkout,
    index: "initialized",
    indexedDocuments: result.indexedDocuments,
    removedDocuments: result.removedDocuments,
  };
}

async function syncSource(
  context: ApplicationContext,
  source: ResolvedProjectSource,
): Promise<SyncSourceResult> {
  const adapter = await sourceStage("sync", "run-prepare", () =>
    updateConfiguredSource(source),
  );
  const resolved = await resolveProjectSource(context.project, source);
  const result = await indexSourceChanges(context, adapter, resolved);
  return { sourceId: source.id, ...result };
}

async function indexSourceChanges(
  context: ApplicationContext,
  source: SourceAdapter,
  config: ResolvedSource,
): Promise<IndexDocumentChangesResult> {
  return sourceStage("index", "retry-index", () =>
    indexDocumentChanges({
      source,
      index: context.index,
      documents: documentConfig(config),
    }),
  );
}
