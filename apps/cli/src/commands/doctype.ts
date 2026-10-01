import { Command } from "commander";
import type { WriteOutput } from "../command.js";
import { withDokkurator, writeSourceErrors } from "../core-runtime.js";

export function addDocTypeCommands(
  command: Command,
  writeOut: WriteOutput,
  writeErr: WriteOutput,
): void {
  const doctype = command
    .command("doctype")
    .description("Inspect parsed document sources");

  doctype.command("list [source-id]").action(async (sourceId?: string) => {
    await withDokkurator(
      command.opts<{ project: string }>().project,
      writeErr,
      async (app) => {
        const result = await app.listDocTypes({ sourceId });
        for (const source of result.results)
          writeOut(`${JSON.stringify(source, null, 2)}\n`);
        writeSourceErrors(result.errors, writeErr);
      },
      { sourceId },
    );
  });

  doctype.command("documents [source-id]").action(async (sourceId?: string) => {
    await withDokkurator(
      command.opts<{ project: string }>().project,
      writeErr,
      async (app) => {
        const result = await app.listDocuments({ sourceId });
        for (const source of result.results)
          writeOut(`${JSON.stringify(source, null, 2)}\n`);
        writeSourceErrors(result.errors, writeErr);
      },
      { sourceId },
    );
  });
}
