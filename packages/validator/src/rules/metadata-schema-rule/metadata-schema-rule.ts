import type { MarkdownRuleDefinition } from "@eslint/markdown";
import { getFrontmatter } from "../../markdown/frontmatter.js";
import { getDocTypeRegistry } from "../../eslintPlugin/settings.js";
import { getSchemaErrorLocation } from "./schema-error-location.js";

/** Check metadata using the selected DocType's precompiled JSON Schema. */
export const metadataSchemaRule: MarkdownRuleDefinition = {
  meta: {
    type: "problem",
    docs: {
      description: "Validate metadata against its prepared DocType schema.",
    },
    schema: [],
    messages: { "invalid-metadata": "{{path}} {{message}} ({{keyword}})." },
  },
  create(context) {
    const registry = getDocTypeRegistry(context.settings);
    return {
      root(node) {
        const frontmatter = getFrontmatter(context.sourceCode);
        if (frontmatter.errors.length) return;
        const selection = registry.selectDocType(frontmatter.metadata);
        // YAML and association findings belong to the doctype rule.
        if (selection.status !== "selected") return;
        const validation = selection.docType.validateMetadata(
          frontmatter.metadata,
        );
        for (const error of validation.errors) {
          const loc = getSchemaErrorLocation(error, frontmatter);
          context.report({
            ...(loc ? { loc } : { node: frontmatter.node ?? node }),
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
