import { simpleGit } from "simple-git";
import { mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { dirname } from "node:path";
import { FileSystemSource } from "./file-system-source.js";
import { GitSource } from "./git-source.js";
import type { SourceAdapter } from "./source-adapter.js";

export async function createLocalSource(root: string): Promise<SourceAdapter> {
  return createConfiguredLocalSource({ root });
}

export interface LocalSourceOptions {
  readonly root: string;
  readonly sourceId?: string;
}

/** Creates the appropriate local adapter while preserving a configured id. */
export async function createConfiguredLocalSource({
  root,
  sourceId,
}: LocalSourceOptions): Promise<SourceAdapter> {
  return (await simpleGit({ baseDir: root }).checkIsRepo())
    ? new GitSource({ root, sourceId })
    : new FileSystemSource({ root, sourceId });
}

export interface GitCheckoutOptions {
  readonly root: string;
  readonly url: string;
  readonly branch?: string;
  readonly sourceId?: string;
  readonly update?: boolean;
}

/** Clones or updates a managed checkout and exposes it as a Git source. */
export async function createGitCheckoutSource({
  root,
  url,
  branch,
  sourceId,
  update = true,
}: GitCheckoutOptions): Promise<SourceAdapter> {
  const checkout = existsSync(root) ? simpleGit({ baseDir: root }) : undefined;
  if (checkout !== undefined && (await checkout.checkIsRepo())) {
    if (update) {
      await checkout.fetch("origin");
      if (branch !== undefined) await checkout.checkout(branch);
      if (branch === undefined) await checkout.pull("origin");
      else await checkout.pull("origin", branch);
    }
    return new GitSource({ root, sourceId });
  }
  await mkdir(dirname(root), { recursive: true });
  await simpleGit().clone(
    url,
    root,
    branch === undefined ? [] : ["--branch", branch],
  );
  return new GitSource({ root, sourceId });
}
