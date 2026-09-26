# Repository agent instructions

## Absolute package boundaries

- Package boundaries are absolute. A package may consume another workspace
  package only through that dependency's public root package API (for example,
  `@dokkurator/doctype` or `@dokkurator/knowledge`).
- Never import another package's internal files, source directories, generated
  output, or implementation paths. Do not add package export subpaths to evade
  this rule.
- Imports within one package may use local relative paths. Keep implementations
  within their owning core library until there is a deliberate architectural
  decision to split them into a separately versioned and maintained library.
- Keep workspace dependencies aligned with actual public package dependencies;
  do not create package boundaries just to organize folders.

## Adapter ownership

- Source adapter contracts and implementations belong to `@dokkurator/doctype`.
  This includes `SourceAdapter`, the minimal `DocumentSource` contract,
  `FileSystemSource`, `GitSource`, `createLocalSource`, and normalized source
  metadata. DocType owns their public API and runtime dependencies.
- Index adapter contracts and implementations belong to
  `@dokkurator/knowledge`. This includes Knowledge document/query/index types
  and the SQLite index implementation. Keep backend-specific code in a clearly
  separable internal directory under Knowledge.
- Knowledge may depend on DocType's public root API for parsed document models
  and the minimal `DocumentSource` loading contract. Knowledge must not import
  source adapter implementations or depend on their provider-specific behavior.
- Expose supported integrations only from their owning package root. Tests and
  applications that cross a package boundary must use that root API.

## Validation

- When changing workspace package dependencies or locations, update the
  manifests and lockfile without broad dependency upgrades.
- Preserve behavior and tests when moving implementations; run focused tests,
  typechecks/builds, and search for stale package-name references.