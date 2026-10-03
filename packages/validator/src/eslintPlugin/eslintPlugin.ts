import { docTypeRule } from "../rules/doctype-rule/doctype-rule.js";
import { requiredHeadingsRule } from "../rules/required-headings-rule/required-headings-rule.js";
import { metadataSchemaRule } from "../rules/metadata-schema-rule/metadata-schema-rule.js";
import type { Linter } from "eslint";

/** Ordinary ESLint plugin; prepared resources are supplied through settings. */
export const dokkuratorEslintPlugin = {
  meta: { name: "@dokkurator/validator", version: "0.0.0" },
  rules: Object.freeze({
    doctype: docTypeRule,
    "metadata-schema": metadataSchemaRule,
    "required-headings": requiredHeadingsRule,
  }),
  configs: { recommended: [] as Linter.Config[] },
};

dokkuratorEslintPlugin.configs.recommended.push({
  name: "dokkurator/recommended",
  files: ["**/*.[mM][dD]"],
  plugins: { dokkurator: dokkuratorEslintPlugin },
  rules: {
    "dokkurator/doctype": "error",
    "dokkurator/metadata-schema": "error",
    "dokkurator/required-headings": "error",
  },
});
Object.freeze(dokkuratorEslintPlugin.configs.recommended);
Object.freeze(dokkuratorEslintPlugin.configs);
Object.freeze(dokkuratorEslintPlugin);
