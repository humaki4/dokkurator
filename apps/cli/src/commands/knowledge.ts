import { Command } from "commander";
import type { WriteOutput } from "../command.js";
import {
  diffSources,
  indexSources,
  searchIndex,
} from "../actions/knowledge-actions.js";
import { currentActiveConfig, type ConfirmCheckout } from "../project.js";
import { positiveInteger } from "./options.js";

export function addKnowledgeCommands(
  command: Command,
  writeOut: WriteOutput,
  confirmCheckout: ConfirmCheckout,
): void {
  command
    .command("index [source-id]")
    .option("--documents-directory <directory>", "documents directory")
    .option("--index <file>", "SQLite index file")
    .action(
      async (
        sourceId: string | undefined,
        options: { documentsDirectory?: string; index?: string },
      ) => {
        const active = await currentActiveConfig(
          command.opts<{ project: string }>().project,
          { sourceId, ...options },
          confirmCheckout,
        );
        if (active === undefined) return writeOut("Cancelled.\n");
        for (const { sourceId: id, result } of await indexSources(active))
          writeOut(
            `${id}: ${result.indexedDocuments} indexed, ${result.removedDocuments} removed\n`,
          );
      },
    );

  command
    .command("diff [source-id]")
    .option("--documents-directory <directory>", "documents directory")
    .option("--index <file>", "SQLite index file")
    .action(
      async (
        sourceId: string | undefined,
        options: { documentsDirectory?: string; index?: string },
      ) => {
        const active = await currentActiveConfig(
          command.opts<{ project: string }>().project,
          { sourceId, ...options },
          confirmCheckout,
        );
        if (active === undefined) return writeOut("Cancelled.\n");
        for (const { sourceId: id, diff } of await diffSources(active)) {
          writeOut(`${id}: ${diff.changes.length} changes\n`);
          for (const change of diff.changes)
            writeOut(`  ${change.type}\t${change.path}\n`);
        }
      },
    );

  command
    .command("search <query...>")
    .option("--limit <number>", "maximum results", positiveInteger, 20)
    .option("--index <file>", "SQLite index file")
    .action(
      async (parts: string[], options: { limit: number; index?: string }) => {
        const active = await currentActiveConfig(
          command.opts<{ project: string }>().project,
          {
            includeSources: false,
            index: options.index,
          },
          confirmCheckout,
        );
        if (active === undefined) return writeOut("Cancelled.\n");
        const results = await searchIndex(
          active,
          parts.join(" "),
          options.limit,
        );
        writeOut(`${JSON.stringify(results, null, 2)}\n`);
      },
    );
}
