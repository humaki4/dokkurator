---
doctype: research
title: "Entscheidungen"
status: in-progress
topic: document-types
tags: [doctypes, standards]
sources: []
---

# Entscheidungen

## ADR / MADR

Architecture Decision Records sind eines der stärksten Beispiele für einen klar abgegrenzten fachlichen Dokumenttyp.

MADR definiert unter anderem:

- Status
- Kontext / Problem
- betrachtete Optionen
- Entscheidung
- Konsequenzen
- Beziehungen zu anderen ADRs

MADR nutzt Markdown und unterstützt YAML Frontmatter für Metadaten.

Besonders interessant ist **Structured MADR**. Es erweitert MADR explizit um maschinenlesbares YAML Frontmatter und ein festes Schema mit Feldern wie:

- `type`
- `category`
- `status`
- `created`
- `updated`
- `author`
- `project`
- `related`

sowie JSON-Schema-basierte Validierung.

Weiterführend:

[MADR](https://adr.github.io/madr/?utm_source=chatgpt.com)
[Structured MADR](https://smadr.dev/reference/specification/overview/?utm_source=chatgpt.com)

### Relevanz für Dokkurator

> **Vertiefung:** Structured MADR genauer mit dem geplanten DocType-Format vergleichen. Insbesondere Schema, Relations, Statusmodell und CI-Validierung.

---

[Inhaltsverzeichnis](README.md) · [Zurück](01-softwarearchitektur.md) · [Weiter](03-change-proposals-und-design-documents.md)
