import { Command } from "commander";
import type { WriteOutput } from "../command.js";
import {
  inspectDocTypes,
  inspectDocuments,
} from "../actions/doctype-actions.js";
import { currentActiveConfig, type ConfirmCheckout } from "../project.js";

export function addDocTypeCommands(
  command: Command,
  writeOut: WriteOutput,
  confirmCheckout: ConfirmCheckout,
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
        const active = await currentActiveConfig(
          command.opts<{ project: string }>().project,
          { sourceId, doctypesDirectory: directory },
          confirmCheckout,
        );
        if (active === undefined) return writeOut("Cancelled.\n");
        for (const result of await inspectDocTypes(active))
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
        const active = await currentActiveConfig(
          command.opts<{ project: string }>().project,
          { sourceId, documentsDirectory: directory },
          confirmCheckout,
        );
        if (active === undefined) return writeOut("Cancelled.\n");
        for (const result of await inspectDocuments(active))
          writeOut(`${JSON.stringify(result, null, 2)}\n`);
      },
    );
}
