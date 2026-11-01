---
doctype: research
title: Zusammenspiel von Dokkurator und OpenWiki
status: in-progress
topic: open-knowledge-format
tags: [knowledge, interoperability]
sources:
  - https://github.com/google/open-knowledge
---

# Zusammenspiel von Dokkurator und OpenWiki

**Stand:** 19. September 2026

Die beiden Projekte sollten nicht vorschnell als direkte Konkurrenten betrachtet werden.

### OpenWiki

Schwerpunkt:

```text
sources
  ↓
AI
  ↓
generate knowledge
  ↓
maintain wiki
```

### Dokkurator

Schwerpunkt:

```text
distributed existing knowledge
          ↓
structure
validate
collect
index
query
govern
          ↓
central access
```

Eine mögliche zukünftige Kombination wäre sogar:

```text
source code
    ↓
OpenWiki
    ↓
OKF documents
    ↓
Git repository
    ↓
Dokkurator
    ↓
organization-wide knowledge
```

OpenWiki wäre dann ein **Producer** und Dokkurator ein organisationsweiter **Consumer / Curator / Indexer**.

---

[Inhaltsverzeichnis](README.md) · [Zurück: Auswirkungen auf Dokkurator](06-auswirkungen-auf-dokkurator.md) · [Weiter: Beobachtungspunkte und Reifegrad](08-beobachtungspunkte-und-reifegrad.md)
