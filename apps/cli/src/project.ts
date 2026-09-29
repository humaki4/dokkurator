import { Command } from "commander";
import {
  loadConfig,
  resolveActiveConfig,
  type ActiveConfig,
  type ActiveConfigOptions,
  type LoadedConfig,
} from "@dokkurator/config";
import {
  createConfiguredSource,
  isGitRepositoryRoot,
} from "@dokkurator/doctype";
import { confirm } from "./prompts.js";

export type ConfirmCheckout = (question: string) => Promise<boolean>;

export async function currentConfig(command: Command): Promise<LoadedConfig> {
  return loadConfig(command.opts<{ project: string }>().project);
}

//TODO: warum wird nicht direkt directory übergeben?
//wenn nun tatsächlich createConfiguredSource überflüssig ist
//kann im Code (wo diese Funktion verwendet wird)
//eigentlich direkt resolveActiveConfig aufgerufen werden (die dann auch die currentConfig direkt selbst lädt.
// dann kann dieser Teil hier weg!!.
export async function currentActiveConfig(
  root: string,
  options: ActiveConfigOptions = {},
  confirmCheckout: ConfirmCheckout = confirm,
): Promise<ActiveConfig | undefined> {
  //const loaded = await currentConfig(command);
  const loaded = await loadConfig(root);
  const active = await resolveActiveConfig(loaded, options);

  for (const source of active.sources) {
    if (
      source.remote !== undefined &&
      !(await isGitRepositoryRoot(source.root)) &&
      !(await confirmCheckout(
        `Checkout ${source.remote.url} to ${source.root}?`,
      ))
    )
      return undefined;
  }

  for (const source of active.sources) await createConfiguredSource(source);
  return active;
}
