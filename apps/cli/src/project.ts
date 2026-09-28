import { Command } from "commander";
import {
  loadConfig,
  resolveActiveConfig,
  resolveSourceConfig,
  selectSources,
  type ActiveConfig,
  type ActiveConfigOptions,
  type LoadedConfig,
} from "@dokkurator/config";
import { createConfiguredSource } from "@dokkurator/doctype";

export async function currentConfig(command: Command): Promise<LoadedConfig> {
  return loadConfig(command.opts<{ project: string }>().project);
}

//TODO: warum wird nicht direkt directory übergeben?
//wenn nun tatsächlich createConfiguredSource überflüssig ist
//kann im Code (wo diese Funktion verwendet wird)
//eigentlich direkt resolveActiveConfig aufgerufen werden (die dann auch die currentConfig direkt selbst lädt.
// dann kann dieser Teil hier weg!!.
export async function currentActiveConfig(
  command: Command,
  options: ActiveConfigOptions = {},
): Promise<ActiveConfig> {
  const loaded = await currentConfig(command);
  //TODO: warum wird hier createConfiguredSource aufgerufen?
  // Es wird ja gar nicht zurückgegeben oder weiterverwendet
  if (options.includeSources !== false)
    for (const source of selectSources(loaded, options.sourceId))
      await createConfiguredSource(resolveSourceConfig(loaded, source));
  return resolveActiveConfig(loaded, options);
}
