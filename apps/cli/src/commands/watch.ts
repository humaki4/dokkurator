import { Command } from "commander";
import { watchSources } from "../actions/watch-action.js";
import type { WriteOutput } from "../command.js";
import { prepareConfig, type ConfirmCheckout } from "../project.js";
import { positiveInteger } from "./options.js";

export function addWatchCommand(
  command: Command,
  writeOut: WriteOutput,
  confirmCheckout: ConfirmCheckout,
): void {
  command
    .command("watch [source-id]")
    .option("--debounce <milliseconds>", "debounce delay", positiveInteger)
    .option("--documents-directory <directory>", "documents directory")
    .option("--index <file>", "SQLite index file")
    .action(
      async (
        sourceId: string | undefined,
        options: {
          debounce?: number;
          documentsDirectory?: string;
          index?: string;
        },
      ) => {
        const active = await prepareConfig(
          command.opts<{ project: string }>().project,
          { sourceId, ...options },
          confirmCheckout,
        );
        if (active === undefined) return writeOut("Cancelled.\n");
        await watchSources(active, writeOut);
      },
    );
}
