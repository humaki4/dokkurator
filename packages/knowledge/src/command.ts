import { isAbsolute, resolve } from "node:path";
import {
  createLocalSource,
  DEFAULT_DOCUMENTS_DIRECTORY,
} from "@dokkurator/doctype";
import { Command } from "commander";
import { indexDocuments } from "./index/index-documents.js";
import { SQLiteIndex } from "./index-adapter/sqlite/index.js";
import { parseSearchExpression } from "./search/search-query.js";

export interface CommandOutput {
  writeOut?: (text: string) => void;
  writeErr?: (text: string) => void;
}

export interface CommandEnvironment {
  cwd?: string;
  documentsDirectory?: string;
}

export function createCommand(
  output: CommandOutput = {},
  environment: CommandEnvironment = {},
): Command {
  const writeOut =
    output.writeOut ?? ((text: string) => process.stdout.write(text));
  const command = new Command()
    .name("dokkurator-knowledge")
    .description("Build the Dokkurator knowledge index")
    .version("0.0.0")
    .option(
      "--root <directory>",
      "root directory exposed by the source adapter",
      environment.cwd ?? process.cwd(),
    )
    .option(
      "--documents-directory <directory>",
      "documentation directory relative to the source root",
      environment.documentsDirectory ?? DEFAULT_DOCUMENTS_DIRECTORY,
    )
    .option(
      "--index <file>",
      "SQLite index file, relative to the source root",
      ".dokkurator/index.db",
    )
    .showHelpAfterError();

  command.configureOutput({ ...output, writeOut });
  command
    .command("index")
    .description("Index all Markdown documents recursively")
    .action(async () => {
      const options = command.opts<{
        root: string;
        documentsDirectory: string;
        index: string;
      }>();
      const filename = isAbsolute(options.index)
        ? options.index
        : resolve(options.root, options.index);
      const source = await createLocalSource(options.root);
      const index = new SQLiteIndex({ filename });
      try {
        const result = await indexDocuments({
          source,
          index,
          documentsDirectory: options.documentsDirectory,
        });
        writeOut(
          `${JSON.stringify({ ...result, index: filename }, null, 2)}\n`,
        );
      } finally {
        index.close();
      }
    });

  command
    .command("search <query...>")
    .description("Search document content and metadata")
    .option(
      "--limit <number>",
      "maximum number of results",
      parsePositiveInt,
      20,
    )
    .action(async (queryParts: string[], searchOptions: { limit: number }) => {
      const options = command.opts<{
        root: string;
        index: string;
      }>();
      const filename = isAbsolute(options.index)
        ? options.index
        : resolve(options.root, options.index);
      const index = new SQLiteIndex({ filename });
      try {
        const results = await index.search({
          expression: parseSearchExpression(queryParts.join(" ")),
          limit: searchOptions.limit,
        });
        writeOut(`${JSON.stringify(results, null, 2)}\n`);
      } finally {
        index.close();
      }
    });

  return command;
}

function parsePositiveInt(value: string): number {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isSafeInteger(parsed) || parsed < 1)
    throw new Error(`Expected a positive integer, received: ${value}`);
  return parsed;
}
