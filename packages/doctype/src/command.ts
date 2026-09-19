import { Command } from "commander";
import { loadDocType } from "./index.js";
import { FileSystemSource } from "./source-adapter.js";

export interface CommandOutput {
  writeOut?: (text: string) => void;
  writeErr?: (text: string) => void;
}

export interface CommandEnvironment {
  cwd?: string;
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
    .showHelpAfterError();

  command.configureOutput({ ...output, writeOut });

  command
    .command("read")
    .description("Read a document type directory without parsing it")
    .argument(
      "<directory>",
      "document type directory relative to the source root",
    )
    .action(async (directory: string) => {
      const options = command.opts<{ root: string }>();
      const source = new FileSystemSource({ root: options.root });
      const docType = await loadDocType(source, directory);
      writeOut(`${JSON.stringify(docType, null, 2)}\n`);
    });

  return command;
}
