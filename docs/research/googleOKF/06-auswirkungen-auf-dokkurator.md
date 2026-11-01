---
doctype: research
title: Auswirkungen auf Dokkurator
status: in-progress
topic: open-knowledge-format
tags: [knowledge, interoperability]
sources:
  - https://github.com/google/open-knowledge
---

# Auswirkungen auf Dokkurator

**Stand:** 19. September 2026

Die ursprüngliche Architektur sollte vor diesem Hintergrund teilweise neu bewertet werden.

### DocType

Weiterhin sinnvoll, aber möglichst als Erweiterung von offenen Formaten.

Statt:

```text
Dokkurator Format
```

eher:

```text
Markdown
  ↓
OKF / compatible metadata
  ↓
Dokkurator DocType
```

Ein DocType beschreibt dann nicht mehr das komplette Basisformat, sondern die **fachliche Semantik**.

---

### Validator

Weiterhin ein starker eigenständiger Bereich.

Trennung:

```text
OKF Validator
      ↓
Format korrekt?

Dokkurator Validator
      ↓
fachlich korrekt?
organisatorisch vollständig?
Beziehungen valide?
Knowledge konsistent?
```

---

### Knowledge

Hier sollte geprüft werden, welche Funktionen bereits bestehende OKF-Libraries übernehmen können.

Insbesondere:

```text
parsing
basic graph
links
bundle traversal
```

müssen wahrscheinlich nicht dauerhaft Dokkurator-eigene Implementierungen sein.

Eigene Abstraktionen für:

```text
index
query
storage
cross-repo knowledge
authorization
```

bleiben dagegen sinnvoll.

---

### Hub

Die Bedeutung des Hubs nimmt durch OKF eher zu.
Google beschreibt selbst das Problem, dass einzelne Git Bundles organisationsweit weder ausreichend suchbar noch zentral governbar sind.
Der Dokkurator Hub könnte eine offene Alternative zu einem solchen zentralen Knowledge Layer darstellen:

```text
GitLab repositories
GitHub repositories
local repositories
other sources
          ↓
      Dokkurator
          ↓
     central index
          ↓
authorization-aware query
          ↓
          Hub
```

---

[Inhaltsverzeichnis](README.md) · [Zurück: Standardfunktionen und offene Aufgaben](05-standardfunktionen-und-offene-aufgaben.md) · [Weiter: Zusammenspiel von Dokkurator und OpenWiki](07-zusammenspiel-mit-openwiki.md)
