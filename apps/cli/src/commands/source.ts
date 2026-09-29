import { Command } from "commander";
import type { WriteOutput } from "../command.js";
import {
  addSource,
  listSources,
  removeSource,
} from "../actions/source-actions.js";
import { ask, confirm } from "../prompts.js";

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
      await listSources(
        command.opts<{ project: string }>().project,
        json === true,
        writeOut,
      );
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
          command.opts<{ project: string }>().project,
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
    .action(
      async (
        id: string | undefined,
        options: { yes?: boolean; keepIndex?: boolean },
      ) => {
        const result = await removeSource(
          command.opts<{ project: string }>().project,
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
