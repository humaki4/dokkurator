import { docTypeRule } from "./doctype-rule.js";
import { requiredHeadingsRule } from "./required-headings-rule.js";
import type { Linter } from "eslint";

/** Ordinary ESLint plugin; prepared resources are supplied through settings. */
export const plugin = {
  meta: { name: "@dokkurator/validator", version: "0.0.0" },
  rules: Object.freeze({
    doctype: docTypeRule,
    "required-headings": requiredHeadingsRule,
  }),
  configs: { recommended: [] as Linter.Config[] },
};

plugin.configs.recommended.push({
  name: "dokkurator/recommended",
  files: ["**/*.[mM][dD]"],
  plugins: { dokkurator: plugin },
  rules: {
    "dokkurator/doctype": "error",
    "dokkurator/required-headings": "error",
  },
});
Object.freeze(plugin.configs.recommended);
Object.freeze(plugin.configs);
Object.freeze(plugin);
