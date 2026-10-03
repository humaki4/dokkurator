import type { MarkdownRuleDefinition } from "@eslint/markdown";
import { toString } from "mdast-util-to-string";
import { getFrontmatter } from "../../markdown/frontmatter.js";
import { getDocTypeRegistry } from "../../eslintPlugin/settings.js";
import { LintConfigurationError } from "../../lint/errors.js";

export const requiredHeadingsRule: MarkdownRuleDefinition = {
  meta: {
    type: "problem",
    docs: {
      description: "Require headings declared by the document's DocType.",
    },
    schema: [],
    messages: {
      "missing-heading": 'DocType {{doctype}} requires heading "{{heading}}".',
    },
  },
  create(context) {
    const registry = getDocTypeRegistry(context.settings);
    const requirements = new Map(
      registry.docTypes.map(({ definition }) => {
        const requiredHeadings = definition.structure?.requiredHeadings;
        if (
          requiredHeadings !== undefined &&
          (!Array.isArray(requiredHeadings) ||
            requiredHeadings.some(
              (heading) => typeof heading !== "string" || !heading.trim(),
            ))
        ) {
          throw new LintConfigurationError(
            `DocType ${definition.name} requires non-empty heading strings.`,
          );
        }
        return [
          definition.name,
          new Set(requiredHeadings?.map((text) => text.trim())),
        ];
      }),
    );
    const headings = new Set<string>();
    return {
      heading(node) {
        headings.add(toString(node).trim());
      },
      "root:exit"(node) {
        const frontmatter = getFrontmatter(context.sourceCode);
        if (frontmatter.errors.length) return;
        const selection = registry.selectDocType(frontmatter.metadata);
        // Association and YAML diagnostics belong exclusively to doctype.
        if (selection.status !== "selected") return;
        const required = requirements.get(selection.docType.definition.name)!;
        for (const heading of required) {
          if (!headings.has(heading)) {
            context.report({
              node: frontmatter.node ?? node,
              messageId: "missing-heading",
              data: { doctype: selection.docType.definition.name, heading },
            });
          }
        }
      },
    };
  },
};
