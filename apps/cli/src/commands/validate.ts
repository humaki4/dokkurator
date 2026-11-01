import { Command } from "commander";
import type { WriteOutput } from "../command.js";
import { withDokkurator } from "../core-runtime.js";

export const validationExitCodes = new WeakMap<Command, number>();

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
            const failed =
              report.errors.length > 0 ||
              report.results.some(({ documents }) =>
                documents.some(({ status }) => status === "failed"),
              );
            if (
              options.format === "stylish" &&
              !failed &&
              report.results.every(({ documents }) => documents.length === 0)
            )
              output = "No documents to validate.\n";
            writeOut(output);
            validationExitCodes.set(command, failed ? 1 : 0);
          },
          { sourceId, reportReadiness: false },
        );
      },
    );
}
