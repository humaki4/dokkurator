import type { ResolvedProjectConfig } from "@dokkurator/config";

/** Project resources independent of a Knowledge index. */
export interface ApplicationContext {
  readonly project: ResolvedProjectConfig;
}
