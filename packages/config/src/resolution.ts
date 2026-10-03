import { loadRepositoryConfig } from "./config-file.js";
import { loadConfig } from "./config-file.js";
import { DEFAULT_CONFIG } from "./defaults.js";
import type {
  ConfigOptions,
  RepositoryConfig,
  ResolvedConfig,
  ResolvedProjectConfig,
  ResolvedProjectSource,
  ResolvedSource,
  ValidatorConfig,
  ResolvedValidatorConfig,
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
    validator: mergeValidatorConfig(repository.validator),
  };
  validateRepositoryConfig(resolved);
  return resolved;
}

/** Loads config, applies defaults and invocation overrides, then validates. */
export async function resolveActiveConfig(
  options: ConfigOptions,
): Promise<ResolvedConfig> {
  const project = await resolveProjectConfig(options);
  const sources = await Promise.all(
    project.sources.map((source) =>
      resolveSourceConfig(project, source, options),
    ),
  );
  return { ...project, sources };
}

/** Resolves project-level config without reading configured source repos. */
export async function resolveProjectConfig(
  options: ConfigOptions,
): Promise<ResolvedProjectConfig> {
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
      : selectSources(
          options.defaultSource && project.config.sources.length === 0
            ? {
                ...project,
                config: {
                  ...project.config,
                  sources: [{ id: "root", path: "." }],
                },
              }
            : project,
          options.sourceId,
        );
  const sources = selected.map((source) => ({
    id: source.id,
    root: resolveSourcePath(project, source),
    ...(source.remote === undefined ? {} : { remote: source.remote }),
  }));
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

/** Loads and resolves the repository-local settings for one available source. */
export async function resolveSourceConfig(
  project: ResolvedProjectConfig,
  source: ResolvedProjectSource,
  options: Omit<ConfigOptions, "root"> = {},
): Promise<ResolvedSource> {
  const repositoryConfig =
    source.root === project.root
      ? project.repository
      : await loadRepositoryConfig(source.root);
  const resolved = resolveRepositoryValues(repositoryConfig, {
    root: project.root,
    ...options,
  });
  return {
    ...source,
    ...resolved,
    validator: mergeValidatorConfig(
      project.repository.validator,
      resolved.validator,
    ),
  };
}

function mergeValidatorConfig(
  base: ValidatorConfig = {},
  local: ValidatorConfig = {},
): ResolvedValidatorConfig {
  const plugins = { ...base.plugins };
  for (const [namespace, plugin] of Object.entries(local.plugins ?? {})) {
    if (Object.hasOwn(plugins, namespace) && plugins[namespace] !== plugin)
      throw new Error(
        `Conflicting validator plugins in namespace: ${namespace}`,
      );
  }
  return {
    schemas: structuredClone({ ...base.schemas, ...local.schemas }),
    plugins: { ...plugins, ...local.plugins },
    rules: structuredClone({ ...base.rules, ...local.rules }),
  };
}
