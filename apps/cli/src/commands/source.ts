import { Command } from "commander";
import type { WriteOutput } from "../command.js";
import {
  addSource,
  listSources,
  removeSource,
} from "../actions/source-actions.js";
import { ask, confirm } from "../prompts.js";
import { currentConfig } from "../project.js";

export function addSourceCommands(
  command: Command,
  writeOut: WriteOutput,
): void {
  const source = command
    .command("source")
    .description("Manage configured repositories");

  source
    .command("list")
    .option("--json", "output JSON")
    .action(async ({ json }: { json?: boolean }) => {
      listSources(await currentConfig(command), json === true, writeOut);
    });

  source
    .command("add [path]")
    .option("--id <id>", "stable source id")
    .option("--remote <url>", "Git remote URL")
    .option("--branch <branch>", "Git branch")
    .action(
      async (
        path: string | undefined,
        options: { id?: string; remote?: string; branch?: string },
      ) => {
        const item = await addSource(
          await currentConfig(command),
          { path, ...options },
          { ask },
        );
        writeOut(`Added ${item.id} (${item.path ?? item.remote?.url}).\n`);
      },
    );

  source
    .command("remove [id]")
    .option("--yes", "skip confirmation")
    .option("--keep-index", "keep indexed documents")
    .option("--index <file>", "SQLite index file")
    .action(
      async (
        id: string | undefined,
        options: { yes?: boolean; keepIndex?: boolean; index?: string },
      ) => {
        const result = await removeSource(
          await currentConfig(command),
          { id, ...options },
          { ask, confirm },
        );
        if (!result.removed) return writeOut("Cancelled.\n");
        writeOut(
          `Removed ${result.id} from the configuration; index data was ${result.deletedIndex ? "deleted" : "kept"}.\n`,
        );
      },
    );
}
