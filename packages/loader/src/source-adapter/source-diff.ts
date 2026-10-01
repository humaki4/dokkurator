import { createHash } from "node:crypto";
import type {
  SourceChange,
  SourceFileState,
  SourceRevision,
} from "./source-adapter.js";

export function diffFileStates(
  previous: readonly SourceFileState[],
  current: readonly SourceFileState[],
): readonly SourceChange[] {
  const before = filesByPath(previous, "previous");
  const after = filesByPath(current, "current");
  const paths = [...new Set([...before.keys(), ...after.keys()])].sort((a, b) =>
    a.localeCompare(b),
  );
  const changes: SourceChange[] = [];

  for (const path of paths) {
    const oldFile = before.get(path);
    const newFile = after.get(path);
    if (oldFile === undefined && newFile !== undefined) {
      changes.push({ type: "added", path, hash: newFile.hash });
    } else if (oldFile !== undefined && newFile === undefined) {
      changes.push({ type: "deleted", path, previousHash: oldFile.hash });
    } else if (
      oldFile !== undefined &&
      newFile !== undefined &&
      oldFile.hash !== newFile.hash
    ) {
      changes.push({
        type: "modified",
        path,
        previousHash: oldFile.hash,
        hash: newFile.hash,
      });
    }
  }
  return changes;
}

export function contentHash(content: string): string {
  return `sha256:${createHash("sha256").update(content).digest("hex")}`;
}

export function fileStateRevision(
  files: readonly SourceFileState[],
): SourceRevision {
  const digest = createHash("sha256");
  for (const file of files) {
    digest.update(file.path).update("\0").update(file.hash).update("\0");
  }
  return { id: `sha256:${digest.digest("hex")}`, type: "content-hash" };
}

function filesByPath(
  files: readonly SourceFileState[],
  name: string,
): Map<string, SourceFileState> {
  const result = new Map<string, SourceFileState>();
  for (const file of files) {
    if (result.has(file.path))
      throw new Error(`Duplicate path in ${name} source state: ${file.path}`);
    result.set(file.path, file);
  }
  return result;
}
