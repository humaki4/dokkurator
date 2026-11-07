import { expectTypeOf, test } from "vitest";
import {
  loadDocType,
  loadDocTypes,
  loadDocument,
  loadDocuments,
} from "./index.js";
import type { DocumentSource } from "./index.js";
import type { ParsedDocType, ParsedDocument } from "./index.js";

test("exposes parsed results at all public loading boundaries", () => {
  expectTypeOf(loadDocType).returns.resolves.toEqualTypeOf<ParsedDocType>();
  expectTypeOf(loadDocTypes).returns.resolves.toEqualTypeOf<ParsedDocType[]>();
  expectTypeOf(loadDocument).returns.resolves.toEqualTypeOf<ParsedDocument>();
  expectTypeOf(loadDocuments).returns.resolves.toEqualTypeOf<
    ParsedDocument[]
  >();
});

test("accepts the source adapter abstraction at the public boundary", () => {
  expectTypeOf(loadDocTypes)
    .parameter(0)
    .toEqualTypeOf<DocumentSource | string>();
  expectTypeOf(loadDocuments).parameter(0).toEqualTypeOf<DocumentSource>();
});
