import type { SearchExpression } from "@dokkurator/index-adapter";

export function parseSearchExpression(input: string): SearchExpression {
  const parser = new SearchExpressionParser(tokenizeSearchQuery(input));
  return parser.parse();
}

interface Token {
  readonly value: string;
  readonly startsWithQuote: boolean;
}

class SearchExpressionParser {
  readonly #tokens: readonly Token[];
  #position = 0;

  constructor(tokens: readonly Token[]) {
    this.#tokens = tokens;
  }

  parse(): SearchExpression {
    if (this.#tokens.length === 0)
      throw new SearchQuerySyntaxError("Empty query");
    const expression = this.#parseOr();
    if (this.#peek() !== undefined)
      throw new SearchQuerySyntaxError(
        `Unexpected token: ${this.#peek()?.value}`,
      );
    return expression;
  }

  #parseOr(): SearchExpression {
    const operands = [this.#parseAnd()];
    while (this.#isOperator("OR")) {
      this.#position += 1;
      operands.push(this.#parseAnd());
    }
    return operands.length === 1 ? operands[0]! : { type: "or", operands };
  }

  #parseAnd(): SearchExpression {
    const operands = [this.#parsePrimary()];
    while (this.#canStartPrimary()) {
      if (this.#isOperator("AND")) this.#position += 1;
      operands.push(this.#parsePrimary());
    }
    return operands.length === 1 ? operands[0]! : { type: "and", operands };
  }

  #parsePrimary(): SearchExpression {
    const token = this.#peek();
    if (token?.value === "(") {
      this.#position += 1;
      const expression = this.#parseOr();
      if (this.#peek()?.value !== ")")
        throw new SearchQuerySyntaxError("Missing closing parenthesis");
      this.#position += 1;
      return expression;
    }
    if (
      token === undefined ||
      token.value === ")" ||
      this.#isOperator("AND") ||
      this.#isOperator("OR")
    )
      throw new SearchQuerySyntaxError(
        `Expected search term${token === undefined ? "" : ` before ${token.value}`}`,
      );
    this.#position += 1;

    const separator = token.startsWithQuote ? -1 : token.value.indexOf(":");
    if (separator < 0) return { type: "term", value: token.value };
    const key = token.value.slice(0, separator);
    let value = token.value.slice(separator + 1);
    if (key === "")
      throw new SearchQuerySyntaxError("Metadata key must not be empty");
    if (value === "") {
      const next = this.#peek();
      if (
        next === undefined ||
        next.value === "(" ||
        next.value === ")" ||
        this.#isOperator("AND") ||
        this.#isOperator("OR")
      )
        throw new SearchQuerySyntaxError(
          `Missing value for metadata key: ${key}`,
        );
      value = next.value;
      this.#position += 1;
    }
    return { type: "term", metadataKey: key, value };
  }

  #canStartPrimary(): boolean {
    const token = this.#peek();
    return (
      token !== undefined && token.value !== ")" && !this.#isOperator("OR")
    );
  }

  #isOperator(operator: "AND" | "OR"): boolean {
    const token = this.#peek();
    return (
      token?.startsWithQuote === false && token.value.toUpperCase() === operator
    );
  }

  #peek(): Token | undefined {
    return this.#tokens[this.#position];
  }
}

export class SearchQuerySyntaxError extends Error {
  constructor(message: string) {
    super(`Invalid search query: ${message}`);
    this.name = "SearchQuerySyntaxError";
  }
}

function tokenizeSearchQuery(input: string): readonly Token[] {
  const searchTokens: Token[] = [];
  let cursor = 0;

  // Scan the query from left to right, emitting one token at a time.
  while (cursor < input.length) {
    const character = input[cursor]!;

    // Whitespace separates tokens and is not included in them.
    if (/\s/u.test(character)) {
      cursor += 1;
      continue;
    }

    // Parentheses are standalone tokens so the parser can build groups.
    if (character === "(" || character === ")") {
      searchTokens.push({ value: character, startsWithQuote: false });
      cursor += 1;
      continue;
    }

    // Gather the token's text, removing quote delimiters but preserving spaces
    // inside quoted phrases. A quote at the beginning marks a literal term.
    let tokenValue = "";
    let startsWithQuote = false;
    while (
      cursor < input.length &&
      !/\s/u.test(input[cursor]!) &&
      input[cursor] !== "(" &&
      input[cursor] !== ")"
    ) {
      if (input[cursor] !== '"') {
        tokenValue += input[cursor];
        cursor += 1;
        continue;
      }

      startsWithQuote = tokenValue.length === 0;
      cursor += 1;
      while (cursor < input.length && input[cursor] !== '"') {
        tokenValue += input[cursor];
        cursor += 1;
      }
      if (cursor === input.length)
        throw new SearchQuerySyntaxError("Missing closing quote");
      cursor += 1;
    }

    // Emit the completed token for the expression parser.
    searchTokens.push({ value: tokenValue, startsWithQuote });
  }

  return searchTokens;
}
