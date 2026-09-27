import { existsSync } from "node:fs";
import { relative, resolve } from "node:path";
import { SQLiteIndex } from "@dokkurator/knowledge";
import { saveConfig, type LoadedConfig, type SourceConfig } from "../config.js";
import { indexFilename } from "../project.js";
import type { WriteOutput } from "../command.js";

export interface SourceActionPrompts {
  ask(question: string): Promise<string>;
  confirm(question: string): Promise<boolean>;
}

export function listSources(
  loaded: LoadedConfig,
  json: boolean,
  writeOut: WriteOutput,
): void {
  if (json)
    return writeOut(`${JSON.stringify(loaded.config.sources, null, 2)}\n`);
  if (loaded.config.sources.length === 0)
    return writeOut("No sources configured.\n");
  for (const item of loaded.config.sources)
    writeOut(`${item.id}\t${item.path ?? item.remote?.url}\n`);
}

export async function addSource(
  loaded: LoadedConfig,
  input: {
    path?: string;
    id?: string;
    remote?: string;
    branch?: string;
  },
  prompts: Pick<SourceActionPrompts, "ask">,
): Promise<SourceConfig> {
  const path =
    input.path ??
    (input.remote === undefined
      ? await prompts.ask("Repository path: ")
      : undefined);
  const absolutePath =
    path === undefined ? undefined : resolve(loaded.projectRoot, path);
  if (absolutePath !== undefined && !existsSync(absolutePath))
    throw new Error(`Source path does not exist: ${absolutePath}`);
  const suggestedId = defaultId(absolutePath ?? input.remote ?? "source");
  const enteredId =
    input.id ?? (await prompts.ask(`Source id (${suggestedId}): `));
  const id = enteredId || suggestedId;
  if (loaded.config.sources.some((item) => item.id === id))
    throw new Error(`Source id already exists: ${id}`);
  const configuredPath =
    absolutePath === undefined
      ? undefined
      : relative(loaded.projectRoot, absolutePath) || ".";
  const item: SourceConfig = {
    id,
    ...(configuredPath === undefined ? {} : { path: configuredPath }),
    ...(input.remote === undefined
      ? {}
      : {
          remote: {
            url: input.remote,
            ...(input.branch === undefined ? {} : { branch: input.branch }),
          },
        }),
  };
  await saveConfig({
    ...loaded,
    config: { sources: [...loaded.config.sources, item] },
  });
  return item;
}

export async function removeSource(
  loaded: LoadedConfig,
  input: {
    id?: string;
    yes?: boolean;
    keepIndex?: boolean;
    index: string;
  },
  prompts: SourceActionPrompts,
): Promise<{ removed: boolean; id: string; deletedIndex: boolean }> {
  const id = input.id ?? (await prompts.ask("Source id: "));
  if (!loaded.config.sources.some((item) => item.id === id))
    throw new Error(`Unknown source: ${id}`);
  if (
    !input.yes &&
    !(await prompts.confirm(`Remove ${id} from the configuration?`))
  )
    return { removed: false, id, deletedIndex: false };
  const deleteIndex =
    input.keepIndex !== true &&
    (input.yes === true ||
      (await prompts.confirm(`Delete ${id} from the Knowledge index?`)));
  if (deleteIndex) {
    const filename = indexFilename(loaded, input.index);
    if (existsSync(filename)) {
      const index = new SQLiteIndex({ filename });
      try {
        await index.deleteSource(id);
      } finally {
        index.close();
      }
    }
  }
  await saveConfig({
    ...loaded,
    config: {
      sources: loaded.config.sources.filter((item) => item.id !== id),
    },
  });
  return { removed: true, id, deletedIndex: deleteIndex };
}

function defaultId(path: string): string {
  return path.split(/[\\/]/u).filter(Boolean).at(-1) ?? "source";
}
