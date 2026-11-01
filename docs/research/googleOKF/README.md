---
doctype: research
title: Google OKF – Recherche und Inhaltsverzeichnis
status: in-progress
topic: open-knowledge-format
tags: [knowledge, interoperability]
sources:
  - https://github.com/google/open-knowledge
---

# Google OKF – Recherche und Inhaltsverzeichnis

**Forschungsstand:** 19. September 2026

Die Recherche wurde thematisch aufgeteilt. Die Aussagen und Zahlen stammen aus der ursprünglichen Recherche und wurden bei der Aufteilung nicht aktualisiert. Jede Themendatei enthält Links zum Inhaltsverzeichnis sowie zum vorherigen und nächsten Thema.

## Inhaltsverzeichnis

1. [Grundlagen des Open Knowledge Format](01-grundlagen.md)
2. [Ökosystem und Adoption](02-oekosystem-und-adoption.md)
3. [LangChain OpenWiki](03-langchain-openwiki.md)
4. [Community-Trends](04-community-trends.md)
5. [Standardfunktionen und offene Aufgaben](05-standardfunktionen-und-offene-aufgaben.md)
6. [Auswirkungen auf Dokkurator](06-auswirkungen-auf-dokkurator.md)
7. [Zusammenspiel von Dokkurator und OpenWiki](07-zusammenspiel-mit-openwiki.md)
8. [Beobachtungspunkte und Reifegrad](08-beobachtungspunkte-und-reifegrad.md)

## Kurzfassung

Das von Google Cloud im Juni 2026 veröffentlichte **Open Knowledge Format (OKF)** entwickelt sich auffällig schnell.

OKF selbst ist bewusst sehr klein gehalten:

- Markdown als Inhalt
- YAML Frontmatter als strukturierte Metadaten
- Dateien und Verzeichnisse als Bundle
- Links zwischen Dokumenten als Beziehungen
- optionale Informationen zu Provenance, Verification und Lifecycle

Google positioniert OKF ausdrücklich als **offenes Austauschformat**, nicht als fertiges Knowledge-Management-System oder Framework.

Innerhalb von nur rund drei Monaten sind jedoch bereits mehrere unabhängige Implementierungen entstanden:

- Parser und Validatoren
- CLI-Tools
- Graph-Implementierungen
- Search
- MCP-Server
- Agent Skills
- Visualisierungen
- Wiki-Systeme
- Git-basierte Knowledge-Systeme

Der bisher deutlich stärkste externe Adopter ist **LangChain mit OpenWiki**. OpenWiki verwendet inzwischen OKF v0.2 als Ausgabeformat und ergänzt es um automatische Dokumentgenerierung, Git-Integration, Grounded Claims, Connectors, Agent-Integration und einen Graph Viewer.

Ein etabliertes, sprachübergreifend dominierendes OKF-Framework ist derzeit **noch nicht erkennbar**.

Dagegen bleiben mehrere Ebenen offen, die OKF bewusst nicht löst und die weiterhin gut zu Dokkurator passen:

- fachliche DocTypes
- zusätzliche Schemas und Regeln
- dokumentübergreifende Validierung
- Source Adapter
- mehrere Git-Repositories
- zentraler Index
- Query-Abstraktion
- Berechtigungen
- Knowledge Health
- zentrale UI / Hub
