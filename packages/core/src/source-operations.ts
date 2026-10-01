import {
  resolveSourceConfig,
  type ResolvedProjectConfig,
  type ResolvedProjectSource,
} from "@dokkurator/config";
import {
  openConfiguredSource,
  SourcePreparationRequiredError,
  type ConfiguredSourceLocation,
  type DocumentConfig,
  type SourceAdapter,
} from "@dokkurator/loader";
import { sourceStage, toSourceOperationError } from "./source-errors.js";
import type {
  OpenSourceStatus,
  SourceOperationError,
  SourceOperationResult,
  SourceSelection,
} from "./types.js";

/** Selects one configured source or all sources from an opened project. */
export function selectProjectSources(
  project: ResolvedProjectConfig,
  { sourceId }: SourceSelection,
): readonly ResolvedProjectSource[] {
  if (sourceId === undefined) return project.sources;
  const source = project.sources.find(({ id }) => id === sourceId);
  if (source === undefined) throw new Error(`Unknown source: ${sourceId}`);
  return [source];
}

/** Processes selected sources sequentially and retains per-source failures. */
export async function processProjectSources<T>(
  project: ResolvedProjectConfig,
  options: SourceSelection,
  operation: (source: ResolvedProjectSource) => Promise<T>,
): Promise<SourceOperationResult<T>> {
  const results: T[] = [];
  const errors: SourceOperationError[] = [];
  for (const source of selectProjectSources(project, options)) {
    try {
      results.push(await operation(source));
    } catch (error) {
      errors.push(toSourceOperationError(source.id, error));
    }
  }
  return { results, errors };
}

/** Loads the repository-local configuration for an available source. */
export async function resolveProjectSource(
  project: ResolvedProjectConfig,
  source: ResolvedProjectSource,
) {
  return sourceStage("configuration", "check-config", () =>
    resolveSourceConfig(project, source),
  );
}

/** Existing source adapter together with its repository-local configuration. */
export interface OpenedProjectSource {
  readonly adapter: SourceAdapter;
  readonly config: Awaited<ReturnType<typeof resolveSourceConfig>>;
}

/** Opens an existing source and resolves its repository-local configuration. */
export async function openProjectSource(
  project: ResolvedProjectConfig,
  source: ResolvedProjectSource,
): Promise<OpenedProjectSource> {
  const adapter = await sourceStage("preparation", "run-prepare", () =>
    openConfiguredSource(source),
  );
  const config = await resolveProjectSource(project, source);
  return { adapter, config };
}

/** Maps resolved Config document settings to the Loader contract. */
export function documentConfig(source: {
  readonly documents: {
    readonly directory: string;
    readonly include: readonly string[];
    readonly exclude: readonly string[];
  };
}): DocumentConfig {
  return {
    documentsDirectory: source.documents.directory,
    include: source.documents.include,
    exclude: source.documents.exclude,
  };
}

/** Reads source readiness without cloning or updating it. */
export async function sourceStatus(
  source: ConfiguredSourceLocation,
): Promise<OpenSourceStatus> {
  try {
    await openConfiguredSource(source);
    return { sourceId: source.id, status: "ready" };
  } catch (error) {
    if (error instanceof SourcePreparationRequiredError)
      return {
        sourceId: error.sourceId,
        status: "preparation-required",
        reason: error.reason,
      };
    throw error;
  }
}
