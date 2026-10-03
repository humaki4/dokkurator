import type { DiagnosticRule } from "../../lint/diagnostics/diagnostics.js";
import { getFrontmatter } from "../../markdown/frontmatter.js";
import { getDocTypeRegistry } from "../../eslintPlugin/settings.js";

/** Require valid YAML and an unambiguous prepared DocType association. */
export const docTypeRule: DiagnosticRule = {
  meta: {
    type: "problem",
    docs: {
      description:
        "Require valid YAML and an unambiguous prepared DocType association.",
    },
    schema: [],
    messagePhases: { "invalid-yaml": "parse" },
    messages: {
      "missing-frontmatter": "{{message}}",
      "invalid-frontmatter": "{{message}}",
      "missing-doctype": "{{message}}",
      "invalid-doctype": "{{message}}",
      "unknown-doctype": "{{message}}",
      "invalid-schema-annotation": "{{message}}",
      "schema-conflict": "{{message}}",
      "invalid-yaml": "Invalid YAML frontmatter: {{message}}",
    },
  },
  create(context) {
    const registry = getDocTypeRegistry(context.settings);
    return {
      root(node) {
        const {
          node: frontmatter,
          metadata,
          errors,
          location,
        } = getFrontmatter(context.sourceCode);
        if (errors.length) {
          for (const error of errors) {
            context.report({
              loc: location(error.range),
              messageId: "invalid-yaml",
              data: { message: error.message },
            });
          }
          return;
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
      },
    };
  },
};
