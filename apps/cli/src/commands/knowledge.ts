import { Command } from "commander";
import type { WriteOutput } from "../command.js";
import { withDokkurator, writeSourceErrors } from "../core-runtime.js";
import { positiveInteger } from "./options.js";

export function addKnowledgeCommands(
  command: Command,
  writeOut: WriteOutput,
  writeErr: WriteOutput,
): void {
  command.command("index [source-id]").action(async (sourceId?: string) => {
    await withDokkurator(
      command.opts<{ project: string }>().project,
      writeErr,
      async (app) => {
        const result = await app.sync({ sourceId });
        for (const source of result.results)
          writeOut(
            `${source.sourceId}: ${source.indexedDocuments} indexed, ${source.removedDocuments} removed\n`,
          );
        writeSourceErrors(result.errors, writeErr);
      },
      { sourceId },
    );
  });

  command.command("diff [source-id]").action(async (sourceId?: string) => {
    await withDokkurator(
      command.opts<{ project: string }>().project,
      writeErr,
      async (app) => {
        const result = await app.diff({ sourceId });
        for (const source of result.results) {
          writeOut(
            `${source.sourceId}: ${source.diff.changes.length} changes\n`,
          );
          for (const change of source.diff.changes)
            writeOut(`  ${change.type}\t${change.path}\n`);
        }
        writeSourceErrors(result.errors, writeErr);
      },
      { sourceId },
    );
  });

  command
    .command("search <query...>")
    .option("--limit <number>", "maximum results", positiveInteger, 20)
    .option("--source <source-id>", "restrict results to one source")
    .action(
      async (parts: string[], options: { limit: number; source?: string }) => {
        await withDokkurator(
          command.opts<{ project: string }>().project,
          writeErr,
          async (app) => {
            const results = await app.search(parts.join(" "), {
              sourceId: options.source,
              limit: options.limit,
            });
            writeOut(`${JSON.stringify(results, null, 2)}\n`);
          },
          { sourceId: options.source },
        );
      },
    );
}
