# Validator Specification

## Purpose

`@dokkurator/validator` validates parsed documents against DocType definitions and validation rules.

The validator is designed as an independently usable library. It depends on the common document and DocType model, but must not depend directly on Knowledge, a database, a Git provider or the Dokkurator server.

Its responsibilities are:

- validate document metadata
- validate Markdown content
- evaluate conditional rules
- execute built-in and custom validation rules
- optionally use external context for cross-document validation
- return standardized diagnostics
- stay independent from storage, indexing and UI concerns

---

## Dependencies

The validator depends on `@dokkurator/loader`.

```text
@dokkurator/loader
        │
        │ ParsedDocument
        │ ResolvedDocType
        ▼
@dokkurator/validator
        │
        │ ValidationResult
        ▼
CLI / Server / Reporter / CI
```

The DocType package provides the shared model and parses:

- DocType definitions
- document frontmatter
- Markdown structure
- references
- rule definitions

The validator evaluates these definitions.

---

## Public API

The central API validates one parsed document.

```ts
export interface Validator {
  validate(
    document: ParsedDocument,
    docType: ResolvedDocType,
    context?: ValidationContext,
  ): Promise<ValidationResult>;
}
```

A functional API can additionally be provided:

```ts
export function validateDocument(
  document: ParsedDocument,
  docType: ResolvedDocType,
  options?: ValidationOptions,
): Promise<ValidationResult>;
```

### ValidationResult

```ts
export interface ValidationResult {
  valid: boolean;
  diagnostics: Diagnostic[];
}
```

### Diagnostic

```ts
export interface Diagnostic {
  ruleId: string;
  severity: "error" | "warning" | "info";
  message: string;

  path?: string;
  source?: SourceLocation;
  data?: Record<string, unknown>;
}
```

Example:

```json
{
  "valid": false,
  "diagnostics": [
    {
      "ruleId": "metadata.required",
      "severity": "error",
      "message": "Required field 'owner' is missing.",
      "path": "frontmatter.owner"
    }
  ]
}
```

Diagnostics should be machine-readable so they can later be consumed by:

- CLI reporters
- CI pipelines
- Explorer UI
- IDE integrations
- JSON output
- SARIF reporters

---

## Validation Pipeline

Validation is performed in several stages.

```text
ParsedDocument
      │
      ▼
Resolve applicable rules
      │
      ▼
Metadata validation
      │
      ▼
Markdown/content validation
      │
      ▼
Context-dependent validation
      │
      ▼
Custom/plugin rules
      │
      ▼
Diagnostics
```

Parsing itself is not a responsibility of the validator.

Invalid Markdown or invalid DocType syntax should therefore normally already be represented by parser diagnostics.

---

# Rule Model

Rules describe constraints applied to a document.

There are three main categories.

## 1. Metadata Rules

Metadata rules validate frontmatter fields.

Examples:

- required
- type
- enum
- pattern
- equals
- contains
- min
- max
- minLength
- maxLength

Example DocType definition:

```yaml
fields:
  title:
    type: string
    required: true

  status:
    type: string
    enum:
      - draft
      - active
      - deprecated
```

This syntax is a convenience form.

Conceptually, it represents rules such as:

```yaml
rules:
  - rule: required
    path: title

  - rule: type
    path: title
    value: string

  - rule: enum
    path: status
    values:
      - draft
      - active
      - deprecated
```

The validator should internally normalize both forms to the same rule representation.

---

## 2. Content Rules

Content rules operate on the Markdown document structure.

Possible built-in rules include:

```text
heading.required
heading.order
section.required
link.valid
link.required
codeBlock.language
content.contains
content.pattern
```

Example:

```yaml
rules:
  - rule: section.required
    heading: Decisions

  - rule: heading.required
    value: Architecture

  - rule: codeBlock.language
    languages:
      - typescript
      - json
      - yaml
```

The validator should work against the parsed Markdown AST or normalized document model rather than raw strings whenever possible.

---

## 3. Context Rules

Some validation cannot be performed using a single document alone.

Examples:

- referenced document exists
- document ID is unique
- referenced service exists
- superseded document exists
- owner exists
- relationship target matches a specific DocType

These rules receive their data through `ValidationContext`.

The validator must not depend directly on Knowledge.

---

# Conditional Rules

Rules can be conditional.

Example:

```yaml
rules:
  - rule: required
    path: deprecatedSince

    when:
      path: status
      equals: deprecated
```

Conditions can be composed.

```yaml
when:
  all:
    - path: status
      equals: active

    - path: visibility
      equals: public
```

Possible operators:

```text
equals
notEquals

contains
notContains

in
notIn

exists
notExists

matches

greaterThan
greaterThanOrEqual

lessThan
lessThanOrEqual
```

Logical composition:

```text
all
any
not
```

Example:

```yaml
when:
  any:
    - path: status
      equals: deprecated

    - path: archived
      equals: true
```

The condition model should be generic enough to be reused by custom rules.

---

# Rule Interface

Rules implement a common interface.

```ts
export interface ValidationRule<
  TConfig = unknown,
  TContext extends ValidationContext = ValidationContext,
> {
  id: string;

  validate(input: RuleInput<TConfig>, context: TContext): Promise<Diagnostic[]>;
}
```

With:

```ts
export interface RuleInput<TConfig> {
  document: ParsedDocument;
  docType: ResolvedDocType;
  config: TConfig;
}
```

Rules should preferably be:

- stateless
- deterministic
- side-effect free
- independent from I/O

External data should be supplied through the validation context.

---

# Rule Registry

The validator maintains a registry of available rules.

```ts
export interface RuleRegistry {
  register(rule: ValidationRule): void;

  get(ruleId: string): ValidationRule | undefined;

  has(ruleId: string): boolean;
}
```

Example:

```ts
const validator = createValidator({
  rules: [requiredRule, typeRule, sectionRequiredRule],
});
```

Custom rules can be added:

```ts
validator.rules.register({
  id: "architecture.has-owner",

  async validate({ document }) {
    if (document.metadata.owner) {
      return [];
    }

    return [
      {
        ruleId: "architecture.has-owner",
        severity: "error",
        message: "Architecture documents require an owner.",
      },
    ];
  },
});
```

---

# Validation Context

The validation context allows rules to access information that is outside the current document.

```ts
export interface ValidationContext {
  references?: ReferenceResolver;
  documents?: DocumentResolver;
}
```

The interfaces should stay narrow.

Example:

```ts
export interface ReferenceResolver {
  exists(reference: DocumentReference): Promise<boolean>;
}
```

Possible future extension:

```ts
export interface DocumentResolver {
  get(reference: DocumentReference): Promise<DocumentSummary | undefined>;

  find(query: DocumentQuery): Promise<DocumentSummary[]>;
}
```

Knowledge can later implement these interfaces.

```text
Knowledge
   │
   ▼
KnowledgeReferenceResolver
   │
   ▼
ValidationContext
   │
   ▼
Validator
```

The validator therefore remains usable without Knowledge:

```ts
await validateDocument(document, docType);
```

while the full Dokkurator application can provide additional context:

```ts
await validateDocument(document, docType, {
  context: {
    references: knowledgeReferenceResolver,
  },
});
```

---

# References

References in frontmatter should be represented as structured values by the DocType parser.

Example:

```yaml
service: billing-service
```

The DocType can define the field as a reference:

```yaml
fields:
  service:
    type: reference
    target: service
```

The validator can then apply rules such as:

```text
reference.required
reference.exists
reference.targetType
```

`reference.exists` requires a `ReferenceResolver`.

---

# Markdown Links

Markdown links are separate from semantic references.

Example:

```md
See [Architecture](../architecture.md).
```

Possible validation rules:

```text
link.valid
link.localTargetExists
link.externalAllowed
link.schemeAllowed
```

Local file existence should be provided through an abstraction rather than direct filesystem access.

For example:

```ts
export interface ResourceResolver {
  exists(uri: string): Promise<boolean>;
}
```

This allows the same validation logic to work with:

- local filesystem repositories
- Git repositories
- GitHub
- GitLab
- virtual test repositories

---

# Embedded Content

Markdown can contain structured embedded content such as Mermaid diagrams.

The validator should allow handlers for these blocks.

```ts
export interface EmbeddedContentHandler {
  id: string;

  supports(node: MarkdownNode): boolean;

  validate(
    node: MarkdownNode,
    context: ValidationContext,
  ): Promise<Diagnostic[]>;
}
```

Example handler:

```text
MermaidHandler
```

Responsibilities:

```text
detect Mermaid block
        ↓
parse Mermaid syntax
        ↓
validate syntax
        ↓
return diagnostics
```

Knowledge may later use a separate extractor for deriving graph information from the same content.

---

# Severity

Every rule has a severity.

```ts
type Severity = "error" | "warning" | "info";
```

A DocType can optionally override severity.

Example:

```yaml
rules:
  - rule: section.required
    heading: Decisions
    severity: warning
```

Default severities belong to the rule implementation.

---

# Unknown Rules

If a DocType references a rule which is not registered:

```yaml
rules:
  - rule: company.special-check
```

the validator should return a diagnostic such as:

```json
{
  "ruleId": "validator.unknown-rule",
  "severity": "error",
  "message": "Unknown validation rule 'company.special-check'."
}
```

Unknown rules must not silently be ignored.

---

# Rule Configuration Validation

Rule implementations should be able to validate their own configuration.

For example:

```ts
interface ValidationRule<TConfig> {
  id: string;

  configSchema?: Schema<TConfig>;

  validate(
    input: RuleInput<TConfig>,
    context: ValidationContext,
  ): Promise<Diagnostic[]>;
}
```

This detects errors such as:

```yaml
rules:
  - rule: pattern
    pattern: 123
```

before the rule itself executes.

---

# Plugin Model

The core validator contains only generic rules.

Examples:

```text
required
type
enum
pattern

section.required
heading.required

link.valid
```

Domain-specific rules belong in plugins.

Example:

```text
@my-org/dokkurator-rules
```

Usage:

```ts
const validator = createValidator({
  rules: [...defaultRules, ...organisationRules],
});
```

The validator core should not include plugin discovery or package installation logic.

Loading plugins dynamically belongs to the application or CLI layer.

---

# Repository Validation

The core validator works on documents.

Repository traversal is a separate concern.

An orchestration layer can perform:

```text
Source
  │
  ▼
discover files
  │
  ▼
DocType parser
  │
  ▼
ParsedDocument
  │
  ▼
Validator
```

For convenience, the validator package may provide higher-level helpers:

```ts
validateDocuments(...)
```

or:

```ts
validateSource(...)
```

but these should operate on abstractions rather than directly coupling the validator to a filesystem.

---

# CLI

The standalone validator CLI should remain useful independently from the larger Dokkurator application.

Basic invocation:

```bash
dokkurator-validator validate .
```

Possible options:

```bash
dokkurator-validator validate . \
  --format pretty \
  --severity warning
```

Machine-readable output:

```bash
dokkurator-validator validate . \
  --format json
```

The larger Dokkurator CLI can expose the same functionality:

```bash
dokkurator validate
```

The application CLI is responsible for:

- repository configuration
- multiple repositories
- source selection
- credentials
- remote repositories
- Knowledge integration

The validator CLI should stay focused on validation.

---

# Exit Codes

Suggested CLI semantics:

```text
0  validation successful
1  validation errors found
2  validator/configuration/runtime error
```

Warnings alone should normally not result in exit code `1`.

The CLI may later provide an option such as:

```bash
--fail-on warning
```

---

# Reporting

Validation and reporting are separate concerns.

```text
Validator
   │
   ▼
ValidationResult
   │
   ├── PrettyReporter
   ├── JsonReporter
   ├── GitHubReporter
   └── SarifReporter
```

The core validator should not write directly to stdout.

---

# Caching

Caching is not part of the validator core.

Incremental validation can later be implemented by the orchestrating application based on:

- file hash
- DocType hash
- rule configuration hash
- validator version

This avoids coupling validation logic to persistence.

---

# MVP Scope

The first implementation should focus on document-local validation.

## MVP

Built-in metadata rules:

```text
required
type
enum
pattern
equals
contains
```

Conditional rules:

```text
when
equals
contains
in
exists
all
any
not
```

Markdown rules:

```text
section.required
heading.required
link.valid
```

Infrastructure:

```text
ValidationResult
Diagnostic
ValidationRule
RuleRegistry
ValidationContext
```

CLI:

```text
validate <path>
pretty output
json output
exit codes
```

---

# After MVP

Add incrementally:

```text
reference.exists
reference.targetType

cross-document uniqueness

local link target validation

embedded content handlers
Mermaid validation

plugin packages

SARIF output

IDE integrations

Knowledge-backed context rules
```

---

# Boundaries

The validator does **not**:

- parse Git repositories
- clone repositories
- manage repository configuration
- persist validation state
- index documents
- provide search
- authenticate users
- decide repository permissions
- directly query Knowledge
- install plugins
- render Markdown
- manage DocType definitions

These responsibilities belong to other Dokkurator components.

---

# Architectural Principle

The central architectural constraint is:

```text
Validator evaluates rules.

It does not own the data required by those rules.
```

Local information comes from `ParsedDocument` and `ResolvedDocType`.

External information is supplied through `ValidationContext`.

This keeps the validator independently usable while allowing the full Dokkurator application to provide increasingly powerful cross-document validation later.
