import type {
  DokkuratorConfig,
  RepositoryConfig,
  SourceConfig,
} from "./model.js";

const PROJECT_FIELDS = [
  "version",
  "knowledge",
  "checkouts",
  "watch",
  "sources",
];
const REPOSITORY_FIELDS = ["documents", "doctypes", "validator"];
const DOCUMENT_FIELDS = ["directory", "include", "exclude"];
const DOCTYPE_FIELDS = ["directory"];

/** Validates a complete project config after defaults and CLI options are merged. */
export function validateConfig(
  value: unknown,
): DokkuratorConfig & { readonly sources: readonly SourceConfig[] } {
  const raw = object(value, "config");
  keys(raw, [...PROJECT_FIELDS, ...REPOSITORY_FIELDS], "config");
  version(raw.version);
  repositoryFields(raw, "config");

  optionalObject(raw.knowledge, "knowledge", (settings) => {
    keys(settings, ["index"], "knowledge");
    optionalString(settings.index, "knowledge.index");
  });
  optionalObject(raw.checkouts, "checkouts", (settings) => {
    keys(settings, ["directory"], "checkouts");
    optionalString(settings.directory, "checkouts.directory");
  });
  optionalObject(raw.watch, "watch", (settings) => {
    keys(settings, ["debounce"], "watch");
    if (
      settings.debounce !== undefined &&
      (!Number.isSafeInteger(settings.debounce) ||
        Number(settings.debounce) < 1)
    )
      throw new Error("watch.debounce must be a positive integer");
  });

  const sources = raw.sources ?? [];
  if (!Array.isArray(sources)) throw new Error("sources must be an array");
  const ids = new Set<string>();
  const parsed = sources.map((value, index): SourceConfig => {
    const source = object(value, `sources[${index}]`);
    keys(source, ["id", "path", "remote", "config"], `sources[${index}]`);
    if (source.config !== undefined)
      throw new Error(
        `sources[${index}].config is no longer supported; configure documents and doctypes in the repository config`,
      );
    if (
      typeof source.id !== "string" ||
      !/^[a-zA-Z0-9][a-zA-Z0-9._-]*$/u.test(source.id)
    )
      throw new Error(`sources[${index}].id must be safe`);
    optionalString(source.path, `sources[${index}].path`);
    optionalObject(source.remote, `sources[${index}].remote`, (remote) => {
      keys(remote, ["url", "branch"], `sources[${index}].remote`);
      string(remote.url, "remote.url");
      optionalString(remote.branch, "remote.branch");
    });
    if (source.path === undefined && source.remote === undefined)
      throw new Error(`Source ${source.id} requires path or remote`);
    if (ids.has(source.id))
      throw new Error(`Duplicate source id: ${source.id}`);
    ids.add(source.id);
    return source as unknown as SourceConfig;
  });

  return { ...(raw as unknown as DokkuratorConfig), sources: parsed };
}

/** Validates repository-only settings loaded from a source repository. */
export function validateRepositoryConfig(value: unknown): RepositoryConfig {
  const raw = object(value, "repository config");
  for (const key of Object.keys(raw)) {
    if (REPOSITORY_FIELDS.includes(key)) continue;
    if (PROJECT_FIELDS.includes(key))
      throw new Error(
        `${key} is only supported in the project-root Dokkurator config`,
      );
    throw new Error(`repository config.${key} is not supported`);
  }
  version(raw.version);
  repositoryFields(raw, "repository config");
  return raw as RepositoryConfig;
}

function repositoryFields(
  value: Record<string, unknown>,
  prefix: string,
): void {
  optionalObject(value.validator, `${prefix}.validator`, (validator) => {
    keys(validator, ["plugins", "rules", "schemas"], "validator");
    optionalObject(validator.schemas, "validator.schemas", (schemas) => {
      for (const [id, schema] of Object.entries(schemas)) {
        if (typeof schema !== "boolean")
          object(schema, `validator.schemas.${id}`);
      }
    });
    optionalObject(validator.plugins, "validator.plugins", (plugins) => {
      for (const [name, plugin] of Object.entries(plugins)) {
        if (!name || name === "markdown" || name === "dokkurator")
          throw new Error(
            `Reserved or empty validator plugin namespace: ${name}`,
          );
        object(plugin, `validator.plugins.${name}`);
      }
    });
    optionalObject(validator.rules, "validator.rules", (rules) => {
      for (const [name, entry] of Object.entries(rules)) {
        const severity = Array.isArray(entry) ? entry[0] : entry;
        if (
          !name ||
          ![0, 1, 2, "off", "warn", "error"].includes(
            severity as string | number,
          )
        )
          throw new Error(`Invalid validator rule severity: ${name}`);
      }
    });
  });
  optionalObject(value.documents, `${prefix}.documents`, (documents) => {
    keys(documents, DOCUMENT_FIELDS, `${prefix}.documents`);
    optionalString(documents.directory, "documents.directory");
    optionalStrings(documents.include, "documents.include");
    optionalStrings(documents.exclude, "documents.exclude");
  });
  optionalObject(value.doctypes, `${prefix}.doctypes`, (doctypes) => {
    keys(doctypes, DOCTYPE_FIELDS, `${prefix}.doctypes`);
    optionalString(doctypes.directory, "doctypes.directory");
  });
}

function object(value: unknown, label: string): Record<string, unknown> {
  if (value === null || typeof value !== "object" || Array.isArray(value))
    throw new Error(`${label} must be an object`);
  return value as Record<string, unknown>;
}

function optionalObject(
  value: unknown,
  label: string,
  validate: (value: Record<string, unknown>) => void,
): void {
  if (value !== undefined) validate(object(value, label));
}

function keys(
  value: Record<string, unknown>,
  allowed: readonly string[],
  label: string,
): void {
  for (const key of Object.keys(value))
    if (!allowed.includes(key))
      throw new Error(`${label}.${key} is not supported`);
}

function version(value: unknown): void {
  if (value !== undefined && value !== 1)
    throw new Error("Config version must be 1");
}

function string(value: unknown, label: string): void {
  if (typeof value !== "string" || value.trim() === "")
    throw new Error(`${label} must be a non-empty string`);
}

function optionalString(value: unknown, label: string): void {
  if (value !== undefined) string(value, label);
}

function optionalStrings(value: unknown, label: string): void {
  if (
    value !== undefined &&
    (!Array.isArray(value) ||
      value.some((item) => typeof item !== "string" || item === ""))
  )
    throw new Error(`${label} must be an array of strings`);
}
