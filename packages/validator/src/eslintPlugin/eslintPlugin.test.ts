import { describe, expect, test } from "vitest";
import {
  createLintConfig,
  plugin,
  prepareLintConfiguration,
} from "@dokkurator/validator";

const docType = {
  name: "decision",
  metadata: { type: "object" },
  structure: { requiredHeadings: ["Context", "Decision"] },
  rules: [],
};

const prepared = prepareLintConfiguration({ docTypes: [docType] });

describe("public plugin and recommended profile", () => {
  test("the helper registers the public plugin and both default rules", () => {
    const config = createLintConfig(prepared);
    expect(
      config.find((entry) => entry.plugins?.dokkurator)!.plugins!.dokkurator,
    ).toBe(plugin);
    expect(
      Object.assign({}, ...config.map((entry) => entry.rules)),
    ).toMatchObject({
      "dokkurator/doctype": "error",
      "dokkurator/metadata-schema": "error",
      "dokkurator/required-headings": "error",
    });
  });
  test("the helper consumes the plugin's recommended profile", () => {
    const recommended = plugin.configs.recommended;
    expect(recommended[0]!.plugins!.dokkurator).toBe(plugin);
    const rules = Object.assign({}, ...recommended.map((entry) => entry.rules));
    expect(
      Object.assign(
        {},
        ...createLintConfig(prepared).map((entry) => entry.rules),
      ),
    ).toMatchObject(rules);
    expect(
      createLintConfig({
        docTypes: [docType],
        rules: { "dokkurator/required-headings": "off" },
      }).at(-1)!.rules!["dokkurator/required-headings"],
    ).toBe("off");
  });
});
