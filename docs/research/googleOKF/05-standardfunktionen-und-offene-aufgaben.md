---
doctype: research
title: Standardfunktionen und offene Aufgaben
status: in-progress
topic: open-knowledge-format
tags: [knowledge, interoperability]
sources:
  - https://github.com/google/open-knowledge
---

# Standardfunktionen und offene Aufgaben

**Stand:** 19. September 2026

## Was könnte kurzfristig Commodity werden?

Bei folgenden Bereichen zeichnet sich bereits starke Überschneidung zwischen Implementierungen ab:

### Sehr wahrscheinlich Commodity

```text
Markdown parsing
YAML frontmatter parsing
OKF parsing
OKF validation
link resolution
graph extraction
bundle traversal
formatting
basic linting
Mermaid graph export
MCP read access
```

Mehrere unabhängige Projekte implementieren diese Funktionen bereits heute.

Diese Bereiche sollte Dokkurator möglichst nicht unnötig neu erfinden.

---

## Was ist dagegen noch weitgehend offen?

## Fachliche DocTypes

OKF verlangt im Wesentlichen:

```yaml
type: something
```

Es definiert aber nicht, was beispielsweise ein:

```text
ArchitectureDecision
Requirement
Incident
Meeting
Policy
Procedure
Project
Risk
```

beinhalten muss.

Hier bleibt Raum für:

```text
DocType
   ↓
schema
   ↓
rules
   ↓
templates
```

---

## Fachliche Validation

OKF kann prüfen:

```text
Ist dieses Dokument syntaktisch gültiges OKF?
```

Dokkurator könnte prüfen:

```text
Ist dies eine vollständige Architecture Decision?

Hat eine akzeptierte Entscheidung einen Owner?

Referenziert dieses Requirement seine übergeordnete Capability?

Existiert das referenzierte Dokument?

Ist die referenzierte Entscheidung deprecated?
```

Das ist eine höhere Abstraktionsebene.

---

## Cross-Repository Knowledge

Viele Tools betrachten weiterhin primär:

```text
one bundle
one repository
```

Dokkurator interessiert dagegen:

```text
repo A ─┐
repo B ─┤
repo C ─┼─→ common index
repo D ─┘
```

---

## Authorization

Bei organisationsweitem Wissen entsteht unmittelbar das Problem:

```text
user
  ↓
query
  ↓
only documents user may access
```

Google adressiert das mit Knowledge Catalog.

Eine allgemein nutzbare Open-Source-Lösung ist bislang nicht als Standard erkennbar.

---

## Source Adapter

Auch die Abstraktion:

```text
Filesystem
Git
GitLab
GitHub
...
   ↓
SourceAdapter
```

ist nicht Teil von OKF.

---

## Organisationsweite Knowledge Health

Beispielsweise:

```text
outdated docs
broken references
unowned documents
contradicting knowledge
missing documents
code-doc drift
unused docs
```

ist ebenfalls keine Kernaufgabe der Spezifikation.

---

[Inhaltsverzeichnis](README.md) · [Zurück: Community-Trends](04-community-trends.md) · [Weiter: Auswirkungen auf Dokkurator](06-auswirkungen-auf-dokkurator.md)
