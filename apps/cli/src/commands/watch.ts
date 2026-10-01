import { resolveProjectConfig } from "@dokkurator/config";
import { Command } from "commander";
import { watchSources } from "../actions/watch-action.js";
import type { WriteOutput } from "../command.js";
import { withDokkurator } from "../core-runtime.js";

export function addWatchCommand(
  command: Command,
  writeOut: WriteOutput,
  writeErr: WriteOutput,
): void {
  command.command("watch [source-id]").action(async (sourceId?: string) => {
    const root = command.opts<{ project: string }>().project;
    const project = await resolveProjectConfig({ root, sourceId });
    await withDokkurator(
      root,
      writeErr,
      (app) => watchSources(app, project, writeOut, writeErr),
      { sourceId },
    );
  });
}
