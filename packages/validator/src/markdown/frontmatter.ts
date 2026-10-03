import type { MarkdownSourceCode } from "@eslint/markdown";
import { parseDocument } from "yaml";

function parseFrontmatter(source: MarkdownSourceCode) {
  const node = source.ast.children.find((child) => child.type === "yaml");
  const errors: { message: string; range: readonly number[] }[] = [];
  let metadata: unknown;
  let yaml: ReturnType<typeof parseDocument> | undefined;
  let start = 0;
  if (node) {
    const position = node.position!;
    const opening = source.text
      .slice(position.start.offset)
      .match(/^[^\r\n]*(?:\r\n|\r|\n)/)![0];
    start = position.start.offset! + opening.length;
    const end = position.end.offset! - position.end.column + 1;
    // Preserve original ranges, matching Loader rather than normalized AST values.
    yaml = parseDocument(
      source.text.slice(start, end).replace(/\r(?!\n)/g, "\n"),
      { prettyErrors: false },
    );
    errors.push(
      ...yaml.errors.map((error) => ({
        message: error.message,
        range: error.pos,
      })),
    );
    if (!errors.length) {
      try {
        metadata = yaml.toJS();
      } catch (error) {
        errors.push({
          message: error instanceof Error ? error.message : String(error),
          range: yaml.contents?.range ?? [0, 0],
        });
      }
    }
  }
  return {
    node,
    metadata,
    yaml,
    errors,
    location: (range: readonly number[]) => ({
      start: source.getLocFromIndex(start + range[0]!),
      end: source.getLocFromIndex(start + range[1]!),
    }),
  };
}

// Both rules share one parse for a source object. ESLint creates a new source
// object for each document/pass; weak keys do not retain completed documents.
const parsed = new WeakMap<
  MarkdownSourceCode,
  ReturnType<typeof parseFrontmatter>
>();
export function getFrontmatter(source: MarkdownSourceCode) {
  let result = parsed.get(source);
  if (!result) {
    result = parseFrontmatter(source);
    parsed.set(source, result);
  }
  return result;
}
