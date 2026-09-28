import { loadConfig } from "./config-file.js";
import { DEFAULT_CONFIG } from "./defaults.js";
import type {
  ContentConfig,
  ActiveConfig,
  ActiveConfigOptions,
  EffectiveContentConfig,
  LoadedConfig,
  ResolvedSourceConfig,
  SourceConfig,
} from "./model.js";
import { resolveIndexPath, resolveSourcePath } from "./paths.js";
import { selectSources } from "./sources.js";

export type EffectiveDocumentsConfig = EffectiveContentConfig["documents"];
export type EffectiveDoctypesConfig = EffectiveContentConfig["doctypes"];

//TODO: wird nirgends mehr verwendet??
export function resolveDocumentsConfig(
  config: ContentConfig,
): EffectiveDocumentsConfig {
  return {
    directory:
      config.documents?.directory ?? DEFAULT_CONFIG.documents.directory,
    include: config.documents?.include ?? DEFAULT_CONFIG.documents.include,
    exclude: config.documents?.exclude ?? DEFAULT_CONFIG.documents.exclude,
  };
}

//TODO: wird nirgends mehr verwendet??
export function resolveDoctypesConfig(
  config: ContentConfig,
): EffectiveDoctypesConfig {
  return {
    directory: config.doctypes?.directory ?? DEFAULT_CONFIG.doctypes.directory,
  };
}
/**
 * Completes partial document and DocType settings with built-in defaults.
 *
 * @param config - Partial content settings from a workspace or repository.
 * @returns A complete content configuration with document directory, include
 * and exclude patterns, and DocType directory.
 */

//TODO: wird nur noch in doctype und knowledge cli verwendet??
export function resolveContent(config: ContentConfig): EffectiveContentConfig {
  return {
    documents: resolveDocumentsConfig(config),
    doctypes: resolveDoctypesConfig(config),
  };
}
/**
 * Resolves the effective content settings for one configured source.
 *
 * The function loads the source repository's own configuration and applies
 * the precedence `defaults -> workspace -> repository -> source override`.
 * Exclude patterns are combined and deduplicated instead of replaced.
 *
 * @param loaded - Loaded workspace configuration containing global defaults.
 * @param source - Source whose repository configuration and overrides should
 * be resolved.
 * @returns The complete document-selection and DocType settings for the source.
 * @throws {Error} If the repository configuration exists but cannot be read,
 * parsed, or validated.
 */

//TODO: wird nur noch in tests verwendet??
export async function resolveSourceContent(
  loaded: LoadedConfig,
  source: SourceConfig,
): Promise<EffectiveContentConfig> {
  const repository = (await loadConfig(resolveSourcePath(loaded, source)))
    .config;
  const workspace = resolveContent(loaded.config);
  const override = source.config;
  return {
    documents: {
      directory:
        override?.documents?.directory ??
        repository.documents?.directory ??
        workspace.documents.directory,
      include:
        override?.documents?.include ??
        repository.documents?.include ??
        workspace.documents.include,
      exclude: [
        ...new Set([
          ...workspace.documents.exclude,
          ...(repository.documents?.exclude ?? []),
          ...(override?.documents?.exclude ?? []),
        ]),
      ],
    },
    doctypes: {
      directory:
        override?.doctypes?.directory ??
        repository.doctypes?.directory ??
        workspace.doctypes.directory,
    },
  };
}

//Wird nur noch in projects verwendet. Aber kann dort auch weg, wenn createconfiguredSource dort überflüssig ist.
export function resolveSourceConfig(
  loaded: LoadedConfig,
  source: SourceConfig,
): ResolvedSourceConfig {
  return {
    id: source.id,
    root: resolveSourcePath(loaded, source),
    ...(source.remote === undefined ? {} : { remote: source.remote }),
  };
}

//TODO: diese wird aktiv verwendet in cli projekt
/** Resolves every value needed by an invocation before it enters an action. */
export async function resolveActiveConfig(
  loaded: LoadedConfig,
  options: ActiveConfigOptions = {},
): Promise<ActiveConfig> {
  const selected =
    options.includeSources === false
      ? []
      : selectSources(loaded, options.sourceId);
  const sources = await Promise.all(
    selected.map(async (source) => {
      const content = await resolveSourceContent(loaded, source);
      return {
        id: source.id,
        root: resolveSourcePath(loaded, source),
        ...(source.remote === undefined ? {} : { remote: source.remote }),
        documents: {
          ...content.documents,
          directory: options.documentsDirectory ?? content.documents.directory,
        },
        doctypes: {
          ...content.doctypes,
          directory: options.doctypesDirectory ?? content.doctypes.directory,
        },
      };
    }),
  );
  return {
    loaded,
    sources,
    knowledge: { index: resolveIndexPath(loaded, options.index) },
    watch: {
      debounce:
        options.debounce ??
        loaded.config.watch?.debounce ??
        DEFAULT_CONFIG.watch.debounce,
    },
  };
}
