---
doctype: research
title: LangChain OpenWiki
status: in-progress
topic: open-knowledge-format
tags: [knowledge, interoperability]
sources:
  - https://github.com/google/open-knowledge
---

# LangChain OpenWiki

**Stand:** 19. September 2026

OpenWiki ist aktuell der wichtigste OKF-Adopter außerhalb von Google.
Das GitHub-Repository weist derzeit ungefähr **16.000 Stars und mehr als 1.000 Forks** auf. Diese Zahlen gelten jedoch für OpenWiki als Ganzes und sind nicht mit „16.000 OKF-Nutzern“ gleichzusetzen.

### Grundidee

OpenWiki erstellt automatisch Dokumentation aus vorhandenen Informationsquellen.

Für Code:

```text
source repository
      ↓
Deep Agent
      ↓
generated documentation
      ↓
OKF wiki
```

Für persönliches Wissen:

```text
Git
Notion
Slack
Gmail
Web
...
   ↓
connectors
   ↓
Agent
   ↓
OKF wiki
```

### Grounded Claims

Besonders interessant ist OpenWikis Konzept der **Grounded Claims**.
Eine relevante Aussage in einem generierten Dokument wird auf konkrete Quelldaten zurückgeführt.
Vereinfacht:

```text
"The service uses PostgreSQL"
             │
             ▼
repo://service/database.ts
commit abc123
```

Wenn sich diese Quelle verändert, kann OpenWiki erkennen, dass eine Aussage erneut geprüft werden muss.
Das überschneidet sich teilweise mit den für Dokkurator angedachten Bereichen:

- Evidence
- Code-Doc-Linking
- Drift
- Knowledge Health
  OpenWiki sollte daher nicht nur als OKF-Consumer, sondern als relevantes verwandtes Projekt beobachtet werden.

### Unterschiede zu Dokkurator

OpenWiki konzentriert sich hauptsächlich auf:

> Wissen **generieren und aktuell halten**.

Dokkurator hat bisher einen anderen Schwerpunkt:

> bereits vorhandene dezentrale Dokumentation **strukturieren, validieren, indexieren und organisationsweit zugänglich machen**.

OpenWiki:

```text
sources
   ↓
AI generation
   ↓
wiki
```

Dokkurator:

```text
existing docs in many repositories
             ↓
collect
             ↓
validate
             ↓
index
             ↓
query
             ↓
Hub / CLI / Agents
```

Die Projekte überschneiden sich zunehmend, sind aber derzeit nicht identisch.

---

[Inhaltsverzeichnis](README.md) · [Zurück: Ökosystem und Adoption](02-oekosystem-und-adoption.md) · [Weiter: Community-Trends](04-community-trends.md)
