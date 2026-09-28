import { Command } from "commander";
import type { WriteOutput } from "../command.js";
import {
  inspectDocTypes,
  inspectDocuments,
} from "../actions/doctype-actions.js";
import { currentActiveConfig } from "../project.js";

export function addDocTypeCommands(
  command: Command,
  writeOut: WriteOutput,
): void {
  const doctype = command
    .command("doctype")
    .description("Inspect parsed document sources");
  doctype
    .command("list [source-id]")
    .option("--directory <directory>", "DocType directory")
    .action(
      async (
        sourceId: string | undefined,
        { directory }: { directory?: string },
      ) => {
        for (const result of await inspectDocTypes(
          await currentActiveConfig(command, {
            sourceId,
            doctypesDirectory: directory,
          }),
        ))
          writeOut(`${JSON.stringify(result, null, 2)}\n`);
      },
    );
  doctype
    .command("documents [source-id]")
    .option("--directory <directory>", "documents directory")
    .action(
      async (
        sourceId: string | undefined,
        { directory }: { directory?: string },
      ) => {
        for (const result of await inspectDocuments(
          await currentActiveConfig(command, {
            sourceId,
            documentsDirectory: directory,
          }),
        ))
          writeOut(`${JSON.stringify(result, null, 2)}\n`);
      },
    );
}
