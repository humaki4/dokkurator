import type { DiagnosticRule } from "../../lint/diagnostics/diagnostics.js";
import { isMap, isNode, isScalar, isSeq } from "yaml";
import { getFrontmatter } from "../../lint/frontmatter.js";
import { getDocTypeRegistry } from "../../lint/settings.js";

/** Select a prepared DocType and delegate its metadata constraints to Ajv. */
export const docTypeRule: DiagnosticRule = {
  meta: {
    type: "problem",
    docs: {
      description:
        "Validate YAML metadata against its prepared DocType schema.",
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
      "invalid-metadata": "{{path}} {{message}} ({{keyword}}).",
    },
  },
  create(context) {
    const registry = getDocTypeRegistry(context.settings);
    return {
      root(node) {
        const {
          node: frontmatter,
          metadata,
          yaml,
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
