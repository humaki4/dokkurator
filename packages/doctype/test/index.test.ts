import { expectTypeOf, test } from "vitest";
import type { DocType } from "../src/index.js";

test("describes a document type and its required fields", () => {
  expectTypeOf<DocType>().toEqualTypeOf<{
    name: string;
    requiredFields: readonly string[];
  }>();
});
