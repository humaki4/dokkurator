import { Command } from "commander";
import type { WriteOutput } from "../command.js";
import { withDokkurator, writeSourceErrors } from "../core-runtime.js";

export function addPrepareCommand(
  command: Command,
  writeOut: WriteOutput,
  writeErr: WriteOutput,
): void {
  command.command("prepare [source-id]").action(async (sourceId?: string) => {
    await withDokkurator(
      command.opts<{ project: string }>().project,
      writeErr,
      async (app) => {
        const result = await app.prepare({ sourceId });
        for (const source of result.results)
          writeOut(
            `${source.sourceId}: checkout ${source.checkout}, index ${source.index} (${source.indexedDocuments} indexed, ${source.removedDocuments} removed)\n`,
          );
        writeSourceErrors(result.errors, writeErr);
      },
      { sourceId, reportReadiness: false },
    );
  });
}
