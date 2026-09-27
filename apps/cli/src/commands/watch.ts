import { DEFAULT_DOCUMENTS_DIRECTORY } from "@dokkurator/doctype";
import { Command } from "commander";
import { watchSources } from "../actions/watch-action.js";
import type { WriteOutput } from "../command.js";
import { currentConfig } from "../project.js";
import { positiveInteger } from "./options.js";

export function addWatchCommand(command: Command, writeOut: WriteOutput): void {
  command
    .command("watch [source-id]")
    .option("--debounce <milliseconds>", "debounce delay", positiveInteger, 300)
    .option(
      "--documents-directory <directory>",
      "documents directory",
      DEFAULT_DOCUMENTS_DIRECTORY,
    )
    .option("--index <file>", "SQLite index file", ".dokkurator/index.db")
    .action(
      async (
        sourceId: string | undefined,
        options: {
          debounce: number;
          documentsDirectory: string;
          index: string;
        },
      ) => {
        await watchSources(
          await currentConfig(command),
          sourceId,
          options,
          writeOut,
        );
      },
    );
}
