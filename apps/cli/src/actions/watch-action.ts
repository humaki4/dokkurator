import type { ActiveConfig, ActiveSourceConfig } from "@dokkurator/config";
import type { WriteOutput } from "../command.js";
import { syncSource } from "../sync-source.js";
import { watchPaths } from "../watch-runtime.js";

export async function watchSources(
  active: ActiveConfig,
  writeOut: WriteOutput,
): Promise<void> {
  const synchronize = async (
    source: ActiveSourceConfig,
    updateRemote: boolean,
  ) => {
    const result = await syncSource(
      source,
      active.knowledge.index,
      updateRemote,
    );
    writeOut(
      `${source.id}: ${result.indexedDocuments} indexed, ${result.removedDocuments} removed\n`,
    );
  };
  for (const source of active.sources) await synchronize(source, false);
  writeOut(`Watching ${active.sources.map(({ id }) => id).join(", ")}...\n`);
  await watchPaths(
    active.sources.map((source) => ({
      key: source.id,
      path: source.root,
      onChange: () => synchronize(source, false),
    })),
    active.watch.debounce,
  );
}
