import {
  DEFAULT_DOCUMENTS_DIRECTORY,
  DEFAULT_DOCTYPES_DIRECTORY,
} from "@dokkurator/doctype";
import { Command } from "commander";
import type { WriteOutput } from "../command.js";
import {
  inspectDocTypes,
  inspectDocuments,
} from "../actions/doctype-actions.js";
import { currentConfig } from "../project.js";

export function addDocTypeCommands(
  command: Command,
  writeOut: WriteOutput,
): void {
  const doctype = command
    .command("doctype")
    .description("Inspect parsed document sources");
  doctype
    .command("list [source-id]")
    .option(
      "--directory <directory>",
      "DocType directory",
      DEFAULT_DOCTYPES_DIRECTORY,
    )
    .action(
      async (
        sourceId: string | undefined,
        { directory }: { directory: string },
      ) => {
        for (const result of await inspectDocTypes(
          await currentConfig(command),
          sourceId,
          directory,
        ))
          writeOut(`${JSON.stringify(result, null, 2)}\n`);
      },
    );
  doctype
    .command("documents [source-id]")
    .option(
      "--directory <directory>",
      "documents directory",
      DEFAULT_DOCUMENTS_DIRECTORY,
    )
    .action(
      async (
        sourceId: string | undefined,
        { directory }: { directory: string },
      ) => {
        for (const result of await inspectDocuments(
          await currentConfig(command),
          sourceId,
          directory,
        ))
          writeOut(`${JSON.stringify(result, null, 2)}\n`);
      },
    );
}
