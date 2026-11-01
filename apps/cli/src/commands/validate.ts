import { Command } from "commander";
import type { WriteOutput } from "../command.js";
import { withDokkurator } from "../core-runtime.js";

export function addValidateCommand(
  command: Command,
  writeErr: WriteOutput,
): void {
  command
    .command("validate [source-id]")
    .description("Validate documents in one or all effective sources")
    .action(async (sourceId?: string) => {
      await withDokkurator(
        command.opts<{ project: string }>().project,
        writeErr,
        (app) => app.validate({ sourceId }),
        { sourceId },
      );
    });
}
