import { Command } from "commander";
import { DEFAULT_DOCTYPES_DIRECTORY, loadDocTypes } from "./index.js";
import { FileSystemSource } from "./source-adapter.js";

export interface CommandOutput {
  writeOut?: (text: string) => void;
  writeErr?: (text: string) => void;
}

export interface CommandEnvironment {
  cwd?: string;
  doctypesDirectory?: string;
}

export function createCommand(
  output: CommandOutput = {},
  environment: CommandEnvironment = {},
): Command {
  const writeOut =
    output.writeOut ?? ((text: string) => process.stdout.write(text));
  const command = new Command()
    .name("dokkurator-doctype")
    .description("Inspect Dokkurator document type source files")
    .version("0.0.0")
    .option(
      "--root <directory>",
      "root directory exposed by the source adapter",
      environment.cwd ?? process.cwd(),
    )
    .option(
      "--doctypes-directory <directory>",
      "DocType directory relative to the source root",
      environment.doctypesDirectory ?? DEFAULT_DOCTYPES_DIRECTORY,
    )
    .showHelpAfterError();

  command.configureOutput({ ...output, writeOut });

  command
    .command("read")
    .description("Read all document types without parsing them")
    .action(async () => {
      const options = command.opts<{
        root: string;
        doctypesDirectory: string;
      }>();
      const source = new FileSystemSource({ root: options.root });
      const docTypes = await loadDocTypes(source, {
        doctypesDirectory: options.doctypesDirectory,
      });
      writeOut(`${JSON.stringify(docTypes, null, 2)}\n`);
    });

  return command;
}
