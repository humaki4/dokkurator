import { describe, expect, test } from "vitest";
import { parseSearchExpression } from "./search-query.js";

describe("parseSearchExpression", () => {
  test("parses metadata and unqualified terms with implicit AND", () => {
    expect(parseSearchExpression('status:accepted "access token"')).toEqual({
      type: "and",
      operands: [
        { type: "term", metadataKey: "status", value: "accepted" },
        { type: "term", value: "access token" },
      ],
    });
  });

  test("gives AND precedence over OR", () => {
    expect(parseSearchExpression("draft OR oauth AND owner:platform")).toEqual({
      type: "or",
      operands: [
        { type: "term", value: "draft" },
        {
          type: "and",
          operands: [
            { type: "term", value: "oauth" },
            { type: "term", metadataKey: "owner", value: "platform" },
          ],
        },
      ],
    });
  });

  test("supports parentheses and quoted metadata values", () => {
    expect(
      parseSearchExpression('owner:"platform team" AND (draft OR proposed)'),
    ).toEqual({
      type: "and",
      operands: [
        { type: "term", metadataKey: "owner", value: "platform team" },
        {
          type: "or",
          operands: [
            { type: "term", value: "draft" },
            { type: "term", value: "proposed" },
          ],
        },
      ],
    });
  });

  test("reports incomplete expressions", () => {
    expect(() => parseSearchExpression("status:")).toThrow(
      "Missing value for metadata key: status",
    );
    expect(() => parseSearchExpression("oauth AND")).toThrow(
      "Expected search term",
    );
  });
});
