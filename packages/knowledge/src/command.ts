import { existsSync } from "node:fs";
import { isAbsolute, resolve } from "node:path";
import {
  createLocalSource,
  DEFAULT_DOCUMENTS_DIRECTORY,
  type SourceDiff,
} from "@dokkurator/loader";
import { Command } from "commander";
import {
  calculateDocumentDiff,
  indexDocumentChanges,
} from "./index/incremental-index.js";
import { SQLiteIndex } from "./index-adapter/sqlite/index.js";
import { parseSearchExpression } from "./search/search-query.js";

export interface CommandOutput {
  writeOut?: (text: string) => void;
  writeErr?: (text: string) => void;
}

export interface CommandEnvironment {
  cwd?: string;
  documentsDirectory?: string;
  index?: string;
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
      environment.index ?? ".dokkurator/index.db",
    )
    .showHelpAfterError();

  command.configureOutput({ ...output, writeOut });
  command
    .command("index [source]")
    .description("Index changed Markdown documents recursively")
    .action(async (sourceArgument?: string) => {
      const options = command.opts<{
        root: string;
        documentsDirectory: string;
        index: string;
      }>();
      const root = resolve(
        environment.cwd ?? process.cwd(),
        sourceArgument ?? options.root,
      );
      const filename = isAbsolute(options.index)
        ? options.index
        : resolve(root, options.index);
      const source = await createLocalSource(root);
      const index = new SQLiteIndex({ filename });
      try {
        const result = await indexDocumentChanges({
          source,
          index,
          documents: { documentsDirectory: options.documentsDirectory },
        });
        writeOut(
          `${JSON.stringify(
            {
              indexedDocuments: result.indexedDocuments,
              removedDocuments: result.removedDocuments,
              revision: result.diff.state.revision,
              index: filename,
            },
            null,
            2,
          )}\n`,
        );
      } finally {
        index.close();
      }
    });

  command
    .command("diff [source]")
    .description("Show changes since the last successful index")
    .option(
      "--format <format>",
      "output format: text or json",
      parseFormat,
      "text",
    )
    .option("--exit-code", "exit with 1 when changes are present", false)
    .action(
      async (
        sourceArgument: string | undefined,
        diffOptions: { format: "text" | "json"; exitCode: boolean },
      ) => {
        const options = command.opts<{
          root: string;
          documentsDirectory: string;
          index: string;
        }>();
        const root = resolve(
          environment.cwd ?? process.cwd(),
          sourceArgument ?? options.root,
        );
        const filename = isAbsolute(options.index)
          ? options.index
          : resolve(root, options.index);
        const source = await createLocalSource(root);
        const index = existsSync(filename)
          ? new SQLiteIndex({ filename, readOnly: true })
          : undefined;
        try {
          const diff = await calculateDocumentDiff({
            source,
            index: index ?? { getSourceState: async () => undefined },
            documents: { documentsDirectory: options.documentsDirectory },
          });
          writeOut(
            diffOptions.format === "json"
              ? `${JSON.stringify(
                  {
                    sourceId: diff.sourceId,
                    ...(diff.fromRevision === undefined
                      ? {}
                      : { fromRevision: diff.fromRevision }),
                    toRevision: diff.state.revision,
                    changes: diff.changes,
                  },
                  null,
                  2,
                )}\n`
              : formatDiff(diff),
          );
          if (diffOptions.exitCode && diff.changes.length > 0)
            process.exitCode = 1;
        } finally {
          index?.close();
        }
      },
    );

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

function parseFormat(value: string): "text" | "json" {
  if (value === "text" || value === "json") return value;
  throw new Error(`Expected text or json, received: ${value}`);
}

function formatDiff(diff: SourceDiff): string {
  const lines = [`Source: ${diff.sourceId}`];
  if (diff.fromRevision === undefined)
    lines.push("No previous indexed snapshot found.");
  for (const type of ["added", "modified", "deleted"] as const) {
    const changes = diff.changes.filter((change) => change.type === type);
    if (changes.length === 0) continue;
    lines.push("", `${type[0]?.toUpperCase()}${type.slice(1)}`);
    lines.push(...changes.map((change) => `  ${change.path}`));
  }
  lines.push(
    "",
    `${diff.changes.length} ${diff.changes.length === 1 ? "change" : "changes"}`,
  );
  return `${lines.join("\n")}\n`;
}

function parsePositiveInt(value: string): number {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isSafeInteger(parsed) || parsed < 1)
    throw new Error(`Expected a positive integer, received: ${value}`);
  return parsed;
}
