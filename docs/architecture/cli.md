# CLI architecture

The CLI operates directly on accessible sources.

Typical sources are:

- a local directory,
- a local Git repository,
- repository contents available inside a CI pipeline.

No central Dokkurator server is required.

```mermaid
flowchart LR
    User["User / CI"]

    CLI["Dokkurator CLI"]

    Source["Local Filesystem / Git Repository"]

    SourceAdapter["Source Adapter"]

    DocType["DocType"]

    Validator["Validator"]

    Knowledge["Knowledge"]

    LocalIndex[("Local Index")]

    User --> CLI
    CLI --> SourceAdapter
    SourceAdapter --> Source

    SourceAdapter --> DocType

    DocType --> Validator
    DocType --> Knowledge

    Validator -. cross-document queries .-> Knowledge

    Knowledge --> LocalIndex
```

Possible CLI workflows include:

```text
repository
   ↓
parse
   ↓
validate
   ↓
index
   ↓
search / query / inspect
```

The local index is derived data and can be rebuilt from the repository.
