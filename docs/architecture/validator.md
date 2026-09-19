# Validator

`Validator` executes validation rules against parsed documents.

It consumes `ParsedDocument` and `ParsedDocType` objects from DocType and can optionally query Knowledge for cross-document rules.

## Technology

- TypeScript / Node.js
- rule-based architecture
- small built-in rule set
- extensible through rule plugins
- simple rules derived directly from DocType definitions
- optional Knowledge dependency for cross-document validation
- structured validation results for CLI, CI and Catalog Server

## Responsibilities

- execute validation rules
- validate metadata and document structure
- validate links and references
- support conditional rules
- support cross-document rules through Knowledge
- load additional rules from plugins
- collect findings in a normalized result format

## Validation flow

```text
ParsedDocument
      +
ParsedDocType
      ↓
resolve configured rules
      ↓
built-in rules + plugin rules
      ↓
execute rules
      ↓
optional Knowledge queries
      ↓
ValidationResult
```

## Rule model

Every rule implements the same interface.

```ts
interface Rule {
  id: string;

  validate(
    context: ValidationContext,
    options?: unknown,
  ): Promise<ValidationFinding[]>;
}
```

```ts
type ValidationContext = {
  document: ParsedDocument;
  docType: ParsedDocType;
  knowledge?: KnowledgeReader;
};
```

## Built-in rules

Validator provides a small set of generic rules.

Examples:

```text
required
type
enum
pattern
min
max
contains
unique
```

They can be used as shortcuts directly in DocType definitions:

```yaml
metadata:
  title:
    type: string
    required: true

  status:
    type: string
    enum:
      - draft
      - accepted
      - deprecated
```

Internally these constraints are resolved to the same rule mechanism as explicitly configured rules.

## Explicit rules

More complex validation can be declared separately.

```yaml
rules:
  - id: accepted-requires-date
    when:
      field: status
      equals: accepted

    use: required

    options:
      field: acceptedAt
```

## Conditional rules

Rules can be restricted through conditions.

```yaml
when:
  field: status
  equals: accepted
```

Possible operators:

```text
equals
notEquals
contains
exists
matches
in
greaterThan
lessThan
```

## Plugin model

The Validator core should only contain rules that are broadly useful across projects.

Domain-specific or project-specific rules are provided through plugins.

A plugin is a normal JavaScript/TypeScript package that exports one or more rules.

```ts
import type { ValidatorPlugin } from "@dokkurator/validator";

export const plugin: ValidatorPlugin = {
  name: "@example/architecture-rules",

  rules: [decisionOwnerRule, validServiceReferenceRule],
};
```

A rule inside the plugin uses the normal rule API:

```ts
const decisionOwnerRule: Rule = {
  id: "decision-owner",

  async validate({ document }) {
    if (document.type !== "decision") {
      return [];
    }

    if (!document.metadata.owner) {
      return [
        {
          ruleId: "decision-owner",
          severity: "error",
          message: "Decision must define an owner.",
        },
      ];
    }

    return [];
  },
};
```

### Loading plugins

Plugins are configured outside the DocType definition, for example in the Dokkurator configuration:

```yaml
validator:
  plugins:
    - "@example/architecture-rules"
    - "./rules/company-rules.js"
```

The CLI or Catalog Server loads the configured packages and registers their rules:

```ts
const validator = createValidator({
  plugins: [architectureRules, companyRules],
});
```

The Validator then exposes one combined rule registry:

```text
Validator
├── built-in rules
│   ├── required
│   ├── type
│   └── pattern
│
└── plugin rules
    ├── decision-owner
    ├── valid-service-reference
    └── company-naming-convention
```

DocTypes can reference plugin rules by their ID:

```yaml
rules:
  - use: decision-owner

  - use: valid-service-reference
    options:
      allowedTypes:
        - service
        - component
```

This keeps the DocType format declarative while allowing arbitrary domain logic to be implemented in TypeScript.

## Cross-document rules

Plugin and built-in rules can optionally use Knowledge.

```ts
const referenceExistsRule: Rule = {
  id: "reference-exists",

  async validate({ document, knowledge }) {
    const reference = document.metadata.supersedes;

    const target = await knowledge?.get(reference);

    if (!target) {
      return [
        {
          ruleId: "reference-exists",
          severity: "error",
          message: "Referenced document does not exist.",
        },
      ];
    }

    return [];
  },
};
```

This allows rules such as:

- referenced document exists
- document ID is unique
- reference points to the expected DocType
- related document has an allowed status
- required inverse relation exists

## Validation result

All rules return the same finding structure.

```ts
type ValidationFinding = {
  ruleId: string;

  severity: "error" | "warning" | "info";

  message: string;

  location?: {
    path?: string;
    line?: number;
    column?: number;
    field?: string;
  };
};
```

```ts
type ValidationResult = {
  valid: boolean;
  findings: ValidationFinding[];
};
```

Example:

```ts
const result = await validator.validate({
  document,
  docType,
  knowledge,
});
```

## Boundaries

Validator does not:

- parse Markdown
- load source files
- maintain the Knowledge index
- access GitLab directly
- persist validation results
- modify documents

DocType provides parsed documents and rule configuration. Knowledge provides optional cross-document information. Plugins extend the available validation logic.
