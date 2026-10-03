import type { MarkdownRuleDefinition } from "@eslint/markdown";
import { isMap, isNode, isScalar, isSeq, parseDocument } from "yaml";
import type { PreparedDocTypeRegistry } from "./doc-types.js";

/** Select a prepared DocType and delegate its metadata constraints to Ajv. */
export function createDocTypeRule(
  registry: PreparedDocTypeRegistry,
): MarkdownRuleDefinition {
  return {
    meta: {
      type: "problem",
      docs: {
        description:
          "Validate YAML metadata against its prepared DocType schema.",
      },
      schema: [],
      messages: {
        "missing-frontmatter": "{{message}}",
        "invalid-frontmatter": "{{message}}",
        "missing-doctype": "{{message}}",
        "invalid-doctype": "{{message}}",
        "unknown-doctype": "{{message}}",
        "invalid-schema-annotation": "{{message}}",
        "schema-conflict": "{{message}}",
        "invalid-yaml": "Invalid YAML frontmatter: {{message}}",
        "invalid-metadata": "{{path}} {{message}} ({{keyword}}).",
      },
    },
    create(context) {
      return {
        root(node) {
          const frontmatter = node.children.find(
            (child) => child.type === "yaml",
          );
          let metadata: unknown;
          let yaml: ReturnType<typeof parseDocument> | undefined;
          let start = 0;
          const source = context.sourceCode;
          const location = (range: readonly number[]) => ({
            start: source.getLocFromIndex(start + range[0]!),
            end: source.getLocFromIndex(start + range[1]!),
          });
          if (frontmatter) {
            const position = frontmatter.position!;
            const opening = source.text
              .slice(position.start.offset)
              .match(/^[^\r\n]*(?:\r\n|\r|\n)/)![0];
            start = position.start.offset! + opening.length;
            const end = position.end.offset! - position.end.column + 1;
            // Markdown normalizes line endings in node.value; YAML ranges must
            // instead refer to the original source, as they do in Loader.
            yaml = parseDocument(
              source.text.slice(start, end).replace(/\r(?!\n)/g, "\n"),
              { prettyErrors: false },
            );
            if (yaml.errors.length > 0) {
              for (const error of yaml.errors) {
                context.report({
                  loc: location(error.pos),
                  messageId: "invalid-yaml",
                  data: { message: error.message },
                });
              }
              return;
            }
            try {
              metadata = yaml.toJS();
            } catch (error) {
              // YAML conversion can fail even without parser errors, e.g. an
              // unresolved alias. This is a document error, not a rule crash.
              context.report({
                ...(yaml.contents?.range
                  ? { loc: location(yaml.contents.range) }
                  : { node: frontmatter }),
                messageId: "invalid-yaml",
                data: {
                  message:
                    error instanceof Error ? error.message : String(error),
                },
              });
              return;
            }
          }
          const selection = registry.selectDocType(metadata);
          if (selection.status === "invalid") {
            context.report({
              node: frontmatter ?? node,
              messageId: selection.code,
              data: { message: selection.message },
            });
            return;
          }
          for (const error of selection.docType.validateMetadata(metadata)
            .errors) {
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
                    (item) =>
                      isScalar(item.key) && String(item.key.value) === segment,
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
                (item) =>
                  isScalar(item.key) && String(item.key.value) === property,
              );
              if (isNode(pair?.key)) target = pair.key;
            }
            context.report({
              ...(target?.range
                ? { loc: location(target.range) }
                : { node: frontmatter ?? node }),
              messageId: "invalid-metadata",
              data: {
                path: error.instancePath || "Frontmatter",
                message: error.message ?? "does not match its schema",
                keyword: error.keyword,
              },
            });
          }
        },
      };
    },
  };
}
