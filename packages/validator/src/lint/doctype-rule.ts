import type { MarkdownRuleDefinition } from "@eslint/markdown";
import { parseDocument } from "yaml";
import type { PreparedDocTypeRegistry } from "./doc-types.js";

/** Only DocType association; field/schema findings are added in Task 06. */
export function createDocTypeRule(
  registry: PreparedDocTypeRegistry,
): MarkdownRuleDefinition {
  return {
    meta: {
      type: "problem",
      docs: {
        description: "Require an unambiguous prepared DocType association.",
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
        "invalid-yaml": "Invalid YAML frontmatter.",
      },
    },
    create(context) {
      return {
        root(node) {
          const frontmatter = node.children.find(
            (child) => child.type === "yaml",
          );
          let metadata: unknown;
          if (frontmatter) {
            const yaml = parseDocument(frontmatter.value, {
              prettyErrors: false,
            });
            if (yaml.errors.length > 0) {
              context.report({ node: frontmatter, messageId: "invalid-yaml" });
              return;
            }
            metadata = yaml.toJS();
          }
          const selection = registry.selectDocType(metadata);
          if (selection.status === "invalid") {
            context.report({
              node: frontmatter ?? node,
              messageId: selection.code,
              data: { message: selection.message },
            });
          }
        },
      };
    },
  };
}
