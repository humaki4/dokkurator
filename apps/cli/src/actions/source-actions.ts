import { existsSync } from "node:fs";
import { relative, resolve } from "node:path";
import { SQLiteIndex } from "@dokkurator/knowledge";
import {
  resolveActiveConfig,
  readSources,
  updateSources,
} from "@dokkurator/config";
import type { WriteOutput } from "../command.js";
import type { Prompts } from "../prompts.js";

export async function listSources(
  root: string,
  json: boolean,
  writeOut: WriteOutput,
): Promise<void> {
  const sources = await readSources(root);
  if (json) return writeOut(`${JSON.stringify(sources, null, 2)}\n`);
  if (sources.length === 0) return writeOut("No sources configured.\n");
  for (const item of sources)
    writeOut(`${item.id}\t${item.path ?? item.remote?.url}\n`);
}

export async function addSource(
  root: string,
  input: {
    path?: string;
    id?: string;
    remote?: string;
    branch?: string;
  },
  prompts: Pick<Prompts, "ask">,
) {
  const path =
    input.path ??
    (input.remote === undefined
      ? await prompts.ask("Repository path: ")
      : undefined);
  const absolutePath = path === undefined ? undefined : resolve(root, path);
  if (absolutePath !== undefined && !existsSync(absolutePath))
    throw new Error(`Source path does not exist: ${absolutePath}`);
  const suggestedId = defaultId(absolutePath ?? input.remote ?? "source");
  const enteredId =
    input.id ?? (await prompts.ask(`Source id (${suggestedId}): `));
  const id = enteredId || suggestedId;
  const sources = await readSources(root);
  if (sources.some((item) => item.id === id))
    throw new Error(`Source id already exists: ${id}`);
  const configuredPath =
    absolutePath === undefined
      ? undefined
      : relative(root, absolutePath) || ".";
  const item = {
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
  await updateSources(root, (current) => [...current, item]);
  return item;
}

export async function removeSource(
  root: string,
  input: {
    id?: string;
    yes?: boolean;
    keepIndex?: boolean;
  },
  prompts: Prompts,
): Promise<{ removed: boolean; id: string; deletedIndex: boolean }> {
  const sources = await readSources(root);
  const id = input.id ?? (await prompts.ask("Source id: "));
  if (!sources.some((item) => item.id === id))
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
    const { knowledge } = await resolveActiveConfig({
      root,
      includeSources: false,
    });
    const filename = knowledge.index;
    if (existsSync(filename)) {
      const index = new SQLiteIndex({ filename });
      try {
        await index.deleteSource(id);
      } finally {
        index.close();
      }
    }
  }
  await updateSources(root, (current) =>
    current.filter((item) => item.id !== id),
  );
  return { removed: true, id, deletedIndex: deleteIndex };
}

function defaultId(path: string): string {
  return path.split(/[\\/]/u).filter(Boolean).at(-1) ?? "source";
}
