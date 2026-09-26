import type { SearchExpression } from "../index-adapter/index.js";
import { parse } from "./generated/search-query-parser.js";

export function parseSearchExpression(input: string): SearchExpression {
  if (input.trim() === "") throw new SearchQuerySyntaxError("Empty query");
  try {
    return parse(input) as SearchExpression;
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Expected search term";
    const isSpecificSyntaxError =
      [
        "Metadata key must not be empty",
        "Missing closing parenthesis",
        "Missing closing quote",
      ].includes(message) ||
      message.startsWith("Missing value for metadata key:");
    throw new SearchQuerySyntaxError(
      isSpecificSyntaxError ? message : "Expected search term",
      { cause: error },
    );
  }
}

export class SearchQuerySyntaxError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(`Invalid search query: ${message}`, options);
    this.name = "SearchQuerySyntaxError";
  }
}
