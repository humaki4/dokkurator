import {
  createDokkurator,
  type DokkuratorApp,
  type OpenResult,
  type SourceOperationError,
} from "@dokkurator/core";
import type { WriteOutput } from "./command.js";

/** Opens one Core app for a CLI action and always closes it afterwards. */
export async function withDokkurator<T>(
  root: string,
  writeErr: WriteOutput,
  operation: (app: DokkuratorApp, opened: OpenResult) => Promise<T>,
  options: {
    readonly sourceId?: string;
    readonly reportReadiness?: boolean;
  } = {},
): Promise<T> {
  const app = createDokkurator({ root });
  const opened = await app.open();
  try {
    if (options.reportReadiness !== false)
      writeReadiness(opened, writeErr, options.sourceId);
    return await operation(app, opened);
  } finally {
    await app.close();
  }
}

export function writeSourceErrors(
  errors: readonly SourceOperationError[],
  writeErr: WriteOutput,
): void {
  for (const error of errors)
    writeErr(`${error.sourceId}: ${error.message} ${recoveryHint(error)}\n`);
}

function writeReadiness(
  opened: OpenResult,
  writeErr: WriteOutput,
  sourceId?: string,
): void {
  for (const source of opened.sources) {
    if (
      source.status === "preparation-required" &&
      (sourceId === undefined || source.sourceId === sourceId)
    )
      writeErr(
        `${source.sourceId}: source is not prepared; run "dokkurator prepare ${source.sourceId}".\n`,
      );
  }
}

function recoveryHint(error: SourceOperationError): string {
  switch (error.recovery) {
    case "run-prepare":
      return `Run "dokkurator prepare ${error.sourceId}" and retry.`;
    case "check-source":
      return `Check the source config, remote and local Git setup, then run "dokkurator prepare ${error.sourceId}" again.`;
    case "check-config":
      return "Correct the project or repository config and retry.";
    case "retry-index":
      return `Correct the index error and retry for source ${error.sourceId}.`;
    case "retry-operation":
      return `Retry the operation for source ${error.sourceId}.`;
  }
}
