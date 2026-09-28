import { loadConfig } from "./config-file.js";
import { DEFAULT_CONFIG } from "./defaults.js";
import type {
  ContentConfig,
  EffectiveContentConfig,
  LoadedConfig,
  SourceConfig,
} from "./model.js";
import { resolveSourcePath } from "./paths.js";
/**
 * Completes partial document and DocType settings with built-in defaults.
 *
 * @param config - Partial content settings from a workspace or repository.
 * @returns A complete content configuration with document directory, include
 * and exclude patterns, and DocType directory.
 */
export function resolveContent(config: ContentConfig): EffectiveContentConfig {
  return {
    documents: {
      directory:
        config.documents?.directory ?? DEFAULT_CONFIG.documents.directory,
      include: config.documents?.include ?? DEFAULT_CONFIG.documents.include,
      exclude: config.documents?.exclude ?? DEFAULT_CONFIG.documents.exclude,
    },
    doctypes: {
      directory:
        config.doctypes?.directory ?? DEFAULT_CONFIG.doctypes.directory,
    },
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
