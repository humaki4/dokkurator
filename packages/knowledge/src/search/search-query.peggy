{
  function term(value, metadataKey) {
    return metadataKey === undefined
      ? { type: "term", value }
      : { type: "term", metadataKey, value };
  }

  function combine(type, head, tail) {
    if (tail.length === 0) return head;
    return { type, operands: [head, ...tail.map((item) => item[1])] };
  }
}

SearchExpression
  = Whitespace* expression:OrExpression Whitespace* EndOfInput { return expression; }

OrExpression
  = head:AndExpression tail:(OrOperator expression:AndExpression { return [null, expression]; })* {
      return combine("or", head, tail);
    }

AndExpression
  = head:PrimaryExpression tail:((AndOperator / ImplicitAnd) expression:PrimaryExpression { return [null, expression]; })* {
      return combine("and", head, tail);
    }

PrimaryExpression
  = OpenParenthesis expression:OrExpression CloseParenthesis { return expression; }
  / OpenParenthesis OrExpression { error("Missing closing parenthesis"); }
  / Colon BareValue { error("Metadata key must not be empty"); }
  / MetadataTerm
  / value:QuotedValue { return term(value); }
  / '"' [^"\r\n]* EndOfInput { error("Missing closing quote"); }
  / !Operator value:BareValue { return term(value); }

MetadataTerm
  = !Operator key:BareKey Colon Whitespace* value:(QuotedValue / BareValue) { return term(value, key); }
  / !Operator key:BareKey Colon { error(`Missing value for metadata key: ${key}`); }

OrOperator
  = &(Whitespace* "OR"i Boundary) Whitespace* "OR"i Whitespace*

AndOperator
  = &(Whitespace* "AND"i Boundary) Whitespace* "AND"i Whitespace*

ImplicitAnd
  = Whitespace+ !Operator
  / &"("

OpenParenthesis = "(" Whitespace*
CloseParenthesis = ")"
Parenthesis = [()]
Colon = ":"
Operator = ("AND"i / "OR"i) Boundary
Boundary = &(Whitespace / Parenthesis / EndOfInput)
BareKey = $([^ \t\r\n():"]+)
BareValue = $([^ \t\r\n()"]+)
QuotedValue = '"' value:$([^"\r\n]*) '"' { return value; }
Whitespace = [ \t\r\n]
EndOfInput = !.
