import { Command } from "commander";
import type { WriteOutput } from "../command.js";
import { withDokkurator } from "../core-runtime.js";

export function addValidateCommand(
  command: Command,
  writeOut: WriteOutput,
  writeErr: WriteOutput,
): void {
  command
    .command("validate [source-id]")
    .description("Validate documents in one or all effective sources")
    .option("--format <name>", "validation report format", "stylish")
    .action(
      async (sourceId: string | undefined, options: { format: string }) => {
        await withDokkurator(
          command.opts<{ project: string }>().project,
          writeErr,
          async (app) => {
            const formatter = await app.loadFormatter(options.format);
            const report = await app.validate({ sourceId });
            let output: string;
            try {
              output = await formatter.format(report);
            } catch (error) {
              throw new Error(
                `Failed to format validation report as ${options.format}: ${error instanceof Error ? error.message : String(error)}`,
                {
                  cause: error,
                },
              );
            }
            writeOut(output);
          },
          { sourceId, reportReadiness: false },
        );
      },
    );
}
