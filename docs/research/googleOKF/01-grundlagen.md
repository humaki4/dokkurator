---
doctype: research
title: Grundlagen des Open Knowledge Format
status: in-progress
topic: open-knowledge-format
tags: [knowledge, interoperability]
sources:
  - https://github.com/google/open-knowledge
---

# Grundlagen des Open Knowledge Format

**Stand:** 19. September 2026

Google Cloud veröffentlichte OKF am **12. Juni 2026**.

Google beschreibt das Problem als fehlende portable Kontextinformation für AI-Systeme und Agents. Wissen wie Schemas, Metrikdefinitionen, Runbooks oder fachlicher Kontext soll nicht ausschließlich in proprietären Plattformen liegen.

OKF v0.1 bestand deshalb bewusst nur aus:

```text
directory
 ├── index.md
 ├── concept-a.md
 └── concept-b.md
```

mit Dokumenten wie:

```yaml
---
type: ArchitectureDecision
title: Authentication Architecture
tags:
  - authentication
---
```

und normalem Markdown darunter.

Das Ziel ist keine neue Dokumentationsanwendung, sondern ein interoperables Format, das Menschen, Tools und Agents gleichermaßen lesen können.

Google nennt beispielsweise als mögliche Producer:

- Menschen
- eigene Scripts
- Google ADK Agents
- LangChain Agents
- Exporte aus Datenkatalogen
  und als mögliche Quellen unter anderem Dataplex, Unity Catalog oder Collibra. Das bedeutet allerdings **nicht**, dass diese Produkte bereits offiziell OKF unterstützen. Google beschreibt hier mögliche Integrationspfade.

---

[Inhaltsverzeichnis](README.md) · [Weiter: Ökosystem und Adoption](02-oekosystem-und-adoption.md)
