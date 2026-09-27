import { DEFAULT_DOCUMENTS_DIRECTORY } from "@dokkurator/doctype";
import { Command } from "commander";
import type { WriteOutput } from "../command.js";
import {
  diffSources,
  indexSources,
  searchIndex,
} from "../actions/knowledge-actions.js";
import { currentConfig } from "../project.js";
import { positiveInteger } from "./options.js";

export function addKnowledgeCommands(
  command: Command,
  writeOut: WriteOutput,
): void {
  command
    .command("index [source-id]")
    .option(
      "--documents-directory <directory>",
      "documents directory",
      DEFAULT_DOCUMENTS_DIRECTORY,
    )
    .option("--index <file>", "SQLite index file", ".dokkurator/index.db")
    .action(
      async (
        sourceId: string | undefined,
        options: { documentsDirectory: string; index: string },
      ) => {
        for (const { sourceId: id, result } of await indexSources(
          await currentConfig(command),
          sourceId,
          options,
        ))
          writeOut(
            `${id}: ${result.indexedDocuments} indexed, ${result.removedDocuments} removed\n`,
          );
      },
    );

  command
    .command("diff [source-id]")
    .option(
      "--documents-directory <directory>",
      "documents directory",
      DEFAULT_DOCUMENTS_DIRECTORY,
    )
    .option("--index <file>", "SQLite index file", ".dokkurator/index.db")
    .action(
      async (
        sourceId: string | undefined,
        options: { documentsDirectory: string; index: string },
      ) => {
        for (const { sourceId: id, diff } of await diffSources(
          await currentConfig(command),
          sourceId,
          options,
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
    .option("--index <file>", "SQLite index file", ".dokkurator/index.db")
    .action(
      async (parts: string[], options: { limit: number; index: string }) => {
        const results = await searchIndex(
          await currentConfig(command),
          parts.join(" "),
          options,
        );
        writeOut(`${JSON.stringify(results, null, 2)}\n`);
      },
    );
}
