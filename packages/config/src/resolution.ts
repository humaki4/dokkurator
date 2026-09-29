import { loadRepositoryConfig } from "./config-file.js";
import { loadConfig } from "./config-file.js";
import { DEFAULT_CONFIG } from "./defaults.js";
import type {
  ConfigOptions,
  RepositoryConfig,
  ResolvedConfig,
} from "./model.js";
import { resolveIndexPath, resolveSourcePath } from "./paths.js";
import { selectSources } from "./sources.js";
import { validateConfig, validateRepositoryConfig } from "./validation.js";

function resolveRepositoryValues(
  repository: RepositoryConfig,
  options: ConfigOptions,
) {
  const resolved = {
    documents: {
      ...DEFAULT_CONFIG.documents,
      ...repository.documents,
      ...(options.documentsDirectory === undefined
        ? {}
        : { directory: options.documentsDirectory }),
      ...(options.include === undefined ? {} : { include: options.include }),
      ...(options.exclude === undefined ? {} : { exclude: options.exclude }),
    },
    doctypes: {
      ...DEFAULT_CONFIG.doctypes,
      ...repository.doctypes,
      ...(options.doctypesDirectory === undefined
        ? {}
        : { directory: options.doctypesDirectory }),
    },
  };
  validateRepositoryConfig(resolved);
  return resolved;
}

/** Loads config, applies defaults and invocation overrides, then validates. */
export async function resolveActiveConfig(
  options: ConfigOptions,
): Promise<ResolvedConfig> {
  const loaded = await loadConfig(options.root);
  const projectConfig = validateConfig({
    ...loaded.config,
    knowledge: {
      ...DEFAULT_CONFIG.knowledge,
      ...loaded.config.knowledge,
      ...(options.index === undefined ? {} : { index: options.index }),
    },
    checkouts: {
      ...DEFAULT_CONFIG.checkouts,
      ...loaded.config.checkouts,
    },
    watch: {
      ...DEFAULT_CONFIG.watch,
      ...loaded.config.watch,
      ...(options.debounce === undefined ? {} : { debounce: options.debounce }),
    },
  });
  const project = { ...loaded, config: projectConfig };
  const selected =
    options.includeSources === false
      ? []
      : selectSources(project, options.sourceId);
  const sources = await Promise.all(
    selected.map(async (source) => {
      const root = resolveSourcePath(project, source);
      const repositoryConfig =
        root === project.projectRoot
          ? project.config
          : await loadRepositoryConfig(root);
      const repository = resolveRepositoryValues(repositoryConfig, options);
      return {
        id: source.id,
        root,
        ...(source.remote === undefined ? {} : { remote: source.remote }),
        ...repository,
      };
    }),
  );
  return {
    root: project.projectRoot,
    repository: resolveRepositoryValues(project.config, options),
    sources,
    knowledge: { index: resolveIndexPath(project) },
    watch: {
      debounce: project.config.watch?.debounce ?? DEFAULT_CONFIG.watch.debounce,
    },
  };
}
