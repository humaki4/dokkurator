import type { ErrorObject } from "ajv";
import { isMap, isNode, isScalar, isSeq } from "yaml";
import type { getFrontmatter } from "../../markdown/frontmatter.js";

export function getSchemaErrorLocation(
  error: ErrorObject,
  frontmatter: ReturnType<typeof getFrontmatter>,
) {
  const { yaml, location } = frontmatter;
  const path = error.instancePath
    ? error.instancePath
        .slice(1)
        .split("/")
        .map((part) => part.replace(/~1/g, "/").replace(/~0/g, "~"))
    : [];
  let target = yaml?.contents;
  // Resolve as far as possible. Aliases and absent fields stay at the
  // nearest container/reference rather than inventing a field range.
  for (const segment of path) {
    const next: unknown = isMap(target)
      ? target.items.find(
          (item) => isScalar(item.key) && String(item.key.value) === segment,
        )?.value
      : isSeq(target)
        ? target.get(Number(segment), true)
        : undefined;
    if (!isNode(next)) break;
    target = next;
  }
  const property =
    error.propertyName ??
    error.params.additionalProperty ??
    error.params.propertyName;
  if (typeof property === "string" && isMap(target)) {
    const pair = target.items.find(
      (item) => isScalar(item.key) && String(item.key.value) === property,
    );
    if (isNode(pair?.key)) target = pair.key;
  }

  return target?.range ? location(target.range) : undefined;
}
