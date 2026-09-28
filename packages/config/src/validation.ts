import type { DokkuratorConfig, SourceConfig } from "./model.js";

/**
 * Validates an untrusted value against the Dokkurator configuration model.
 *
 * @param value - Value produced by a YAML parser or another external source.
 * @returns The validated configuration. Missing `sources` are normalized to an
 * empty array; other defaults are applied later by the resolution functions.
 * @throws {Error} If the root structure, version, nested settings, source IDs,
 * source locations, or source overrides are invalid.
 */
export function validateConfig(value: unknown): DokkuratorConfig {
  const raw = record(value, "config");
  if (raw.version !== undefined && raw.version !== 1)
    throw new Error("Config version must be 1");

  //first level documents and doctypes folders
  validateContent(raw);

  //knowledge config
  optionalObject(raw.knowledge, "knowledge", (v) =>
    optionalString(v.index, "knowledge.index"),
  );

  //checkouts config
  optionalObject(raw.checkouts, "checkouts", (v) =>
    optionalString(v.directory, "checkouts.directory"),
  );

  //watch config
  optionalObject(raw.watch, "watch", (v) => {
    if (
      v.debounce !== undefined &&
      (!Number.isSafeInteger(v.debounce) || Number(v.debounce) < 1)
    )
      throw new Error("watch.debounce must be a positive integer");
  });

  //config of sources
  const sources = raw.sources ?? [];
  if (!Array.isArray(sources)) throw new Error("sources must be an array");
  const ids = new Set<string>();
  const parsed = sources.map((item, index) => {
    //single source configuration
    const source = record(item, `sources[${index}]`);

    //validate source id
    if (
      typeof source.id !== "string" ||
      !/^[a-zA-Z0-9][a-zA-Z0-9._-]*$/u.test(source.id)
    )
      throw new Error(`sources[${index}].id must be safe`);

    //validate source path
    optionalString(source.path, `sources[${index}].path`);
    //validate source remote
    optionalObject(source.remote, `sources[${index}].remote`, (v) => {
      requiredString(v.url, "remote.url");
      optionalString(v.branch, "remote.branch");
    });

    //validate source config
    optionalObject(source.config, `sources[${index}].config`, validateContent);
    if (source.path === undefined && source.remote === undefined)
      throw new Error(`Source ${source.id} requires path or remote`);
    if (ids.has(source.id))
      throw new Error(`Duplicate source id: ${source.id}`);
    ids.add(source.id);
    return source as unknown as SourceConfig;
  });
  return { ...(raw as unknown as DokkuratorConfig), sources: parsed };
}

//validate documents and docType folders
function validateContent(value: Record<string, unknown>): void {
  //validate documents folder
  optionalObject(value.documents, "documents", (v) => {
    optionalString(v.directory, "documents.directory");
    optionalStrings(v.include, "documents.include");
    optionalStrings(v.exclude, "documents.exclude");
  });

  //validate doctypes folder
  optionalObject(value.doctypes, "doctypes", (v) =>
    optionalString(v.directory, "doctypes.directory"),
  );
}

//helper
function record(v: unknown, name: string): Record<string, unknown> {
  if (v === null || typeof v !== "object" || Array.isArray(v))
    throw new Error(`${name} must be an object`);
  return v as Record<string, unknown>;
}
function optionalObject(
  v: unknown,
  name: string,
  check: (v: Record<string, unknown>) => void,
): void {
  if (v === undefined) return;
  check(record(v, name));
}
function optionalString(v: unknown, name: string): void {
  if (v !== undefined) requiredString(v, name);
}
function requiredString(v: unknown, name: string): void {
  if (typeof v !== "string" || v.trim() === "")
    throw new Error(`${name} must be a non-empty string`);
}
function optionalStrings(v: unknown, name: string): void {
  if (
    v !== undefined &&
    (!Array.isArray(v) || v.some((x) => typeof x !== "string" || x === ""))
  )
    throw new Error(`${name} must be an array of strings`);
}
