---
doctype: research
title: Community-Trends
status: in-progress
topic: open-knowledge-format
tags: [knowledge, interoperability]
sources:
  - https://github.com/google/open-knowledge
---

# Community-Trends

**Stand:** 19. September 2026

Die Entwicklung lässt sich grob in fünf Themen clustern.

### Interoperabilität

Das Hauptmotiv bleibt:

```text
Agent A
Agent B
Wiki
IDE
CLI
Search
    ↓
same files
```

Wissen soll nicht mehr ausschließlich in einem einzelnen Agent Memory oder SaaS-System liegen.

---

### Trust und Provenance

Mit zunehmender AI-generierter Dokumentation wird die Frage wichtiger:

> Warum sollte diese Information stimmen?

Daher entstehen Konzepte für:

- generated-by
- verified-by
- sources
- timestamps
- lifecycle
- staleness
- grounded claims
- attestations

---

### Agents als Knowledge Maintainer

Dokumentation wird zunehmend nicht nur **von Menschen für Menschen**, sondern auch von Agents erzeugt und gepflegt.

Das führt zum Muster:

```text
code / data / meetings / messages
              ↓
             agent
              ↓
        structured knowledge
              ↓
          Git / review
```

OpenWiki ist dafür derzeit das sichtbarste Beispiel.

---

### Git als Knowledge Storage

Mehrere Projekte verfolgen explizit:

```text
Markdown
+
Frontmatter
+
Git
```

als persistentes Knowledge-System.

Damit bleiben:

- History
- Diff
- Blame
- Branches
- Pull Requests
- Offline-Nutzung
- Tool-Unabhängigkeit
  erhalten.

Commonplace beschreibt genau diese Eigenschaften als einen wesentlichen Vorteil seiner OKF-Unterstützung.

---

### Query, Graph und MCP entstehen außerhalb der Spec

OKF definiert bewusst nicht:

- wie gesucht wird
- welche Datenbank verwendet wird
- wie ein Graph gespeichert wird
- welche Query Language verwendet wird
- wie Agents zugreife
- wie organisationsweite Berechtigungen funktionieren
  Daher experimentiert die Community gleichzeitig mit:

```text
filesystem search
BM25
custom query APIs
graph indexes
MCP
agent skills
local indexes
```

Ein eindeutiger Gewinner ist noch nicht erkennbar.

---

[Inhaltsverzeichnis](README.md) · [Zurück: LangChain OpenWiki](03-langchain-openwiki.md) · [Weiter: Standardfunktionen und offene Aufgaben](05-standardfunktionen-und-offene-aufgaben.md)
