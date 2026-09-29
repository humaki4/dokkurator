import type { ResolvedConfig, ResolvedSource } from "@dokkurator/config";
import type { WriteOutput } from "../command.js";
import { syncSource } from "../sync-source.js";
import { watchPaths } from "../watch-runtime.js";

export async function watchSources(
  active: ResolvedConfig,
  writeOut: WriteOutput,
): Promise<void> {
  const synchronize = async (source: ResolvedSource, updateRemote: boolean) => {
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
