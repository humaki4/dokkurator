import type { ResolvedProjectConfig } from "@dokkurator/config";
import type { DokkuratorApp } from "@dokkurator/core";
import type { WriteOutput } from "../command.js";
import { writeSourceErrors } from "../core-runtime.js";
import { watchPaths } from "../watch-runtime.js";

export async function watchSources(
  app: DokkuratorApp,
  project: ResolvedProjectConfig,
  writeOut: WriteOutput,
  writeErr: WriteOutput,
): Promise<void> {
  const synchronize = async (sourceId: string) => {
    const result = await app.sync({ sourceId });
    for (const source of result.results)
      writeOut(
        `${source.sourceId}: ${source.indexedDocuments} indexed, ${source.removedDocuments} removed\n`,
      );
    writeSourceErrors(result.errors, writeErr);
  };
  for (const source of project.sources) await synchronize(source.id);
  writeOut(`Watching ${project.sources.map(({ id }) => id).join(", ")}...\n`);
  await watchPaths(
    project.sources.map((source) => ({
      key: source.id,
      path: source.root,
      onChange: () => synchronize(source.id),
    })),
    project.watch.debounce,
  );
}
