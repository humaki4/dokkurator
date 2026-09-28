import { Command } from "commander";
import type { WriteOutput } from "../command.js";
import {
  diffSources,
  indexSources,
  searchIndex,
} from "../actions/knowledge-actions.js";
import { currentActiveConfig } from "../project.js";
import { positiveInteger } from "./options.js";

export function addKnowledgeCommands(
  command: Command,
  writeOut: WriteOutput,
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
        for (const { sourceId: id, result } of await indexSources(
          await currentActiveConfig(command, { sourceId, ...options }),
        ))
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
        for (const { sourceId: id, diff } of await diffSources(
          await currentActiveConfig(command, { sourceId, ...options }),
        )) {
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
        const results = await searchIndex(
          await currentActiveConfig(command, {
            includeSources: false,
            index: options.index,
          }),
          parts.join(" "),
          options.limit,
        );
        writeOut(`${JSON.stringify(results, null, 2)}\n`);
      },
    );
}
