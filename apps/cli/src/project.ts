import {
  resolveActiveConfig,
  type ConfigOptions,
  type ResolvedConfig,
} from "@dokkurator/config";
import {
  createConfiguredSource,
  isGitRepositoryRoot,
} from "@dokkurator/loader";
import { confirm } from "./prompts.js";

export type ConfirmCheckout = (question: string) => Promise<boolean>;

export async function prepareConfig(
  root: string,
  options: Omit<ConfigOptions, "root"> = {},
  confirmCheckout: ConfirmCheckout = confirm,
): Promise<ResolvedConfig | undefined> {
  const active = await resolveActiveConfig({ root, ...options });

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
