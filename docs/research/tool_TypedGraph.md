---
doctype: research
title: Typed Graph – Typisierte Wissensgraphen für Dokumentation und Code
status: in-progress
topic: similar tools
---

# Research: Typed Graph – Typisierte Wissensgraphen für Dokumentation und Code

**Status:** Research / Evaluation  
**Projekt:** Dokkurator  
**Referenzen:** [Typed Graph](https://typedgraph.org/) · [GitHub](https://github.com/Volland/typedgraph)

## 1. Kurzbeschreibung

Typed Graph ist ein Open-Source-Werkzeug zur Modellierung und Abfrage typisierter Wissensgraphen auf Basis von Markdown, Metadaten und Code-Annotationen.

Es verbindet Anforderungen, Architekturentscheidungen (ADRs), Dokumentation, Code und Tests über explizite, typisierte Beziehungen.

Zu den Funktionen gehören:

- Typisierte Knoten, Beziehungen und Schema-Validierung
- Referenzen zwischen Dokumenten, Abschnitten und Code-Symbolen
- Volltextsuche, Graphabfragen (Cypher) und GraphRAG
- Requirements-Traceability und Coverage-Prüfungen
- Impact-Analysen bei Änderungen an Code und Anforderungen
- Integration mit OpenSpec, Spec Kit und weiteren Spec-Driven-Workflows
- CLI, MCP sowie Editor-Integrationen

## 2. Überschneidungen mit Dokkurator

| Typed Graph           | Dokkurator                    |
| --------------------- | ----------------------------- |
| Typed Nodes / Schemas | DocTypes / JSON Schema        |
| Typed Edges           | Typisierte Dokumentreferenzen |
| Graph Index           | Knowledge Index               |
| Cypher Queries        | Knowledge Query DSL           |
| Graph Checks          | Validator / Knowledge Rules   |
| Impact / Traceability | Mögliche Knowledge-Analysen   |
| MCP / GraphRAG        | Mögliche Agent-Schnittstelle  |

**Wesentlicher Unterschied:**

Typed Graph konzentriert sich auf die Nachverfolgbarkeit zwischen Specs, Architekturentscheidungen, Code und Tests.

Dokkurator verfolgt einen breiteren, dokumentenzentrierten Ansatz mit dezentralen Quellen, erweiterbaren DocTypes, Validierung, Qualitätsanalysen und fachlichen Domain-Packs, auch außerhalb der Softwareentwicklung.

## 3. Interessante Ansätze für Dokkurator

### Granularität des Knowledge-Modells

Nicht nur Dokumente, sondern auch einzelne Abschnitte, Anforderungen und andere Wissenselemente könnten als adressierbare Knoten modelliert werden.

### Typisierte Beziehungen

Beziehungen wie `implements`, `verifies`, `depends-on`, `supersedes` oder `affects` ermöglichen fachliche Konsistenzprüfungen und Änderungsfolgenanalysen.

### Traceability und Impact Analysis

Ein Knowledge-Graph könnte erkennen helfen:

- Welche Dokumente sind von einer Änderung betroffen?
- Welche Anforderungen besitzen keine Implementierung oder Tests?
- Welche ADRs wurden ersetzt, werden aber weiterhin referenziert?
- Wo bestehen Widersprüche zwischen Anforderungen und Dokumentation?

### Agentic Documentation

Der Knowledge-Index könnte Coding-Agenten Informationen für Spec-Driven Development bereitstellen. Ein Agent könnte vorhandene Dokumente identifizieren und entscheiden, ob eine Änderung ein neues ADR, eine Aktualisierung oder keine Dokumentationsanpassung erfordert.

## 4. Mögliche Umsetzung

Die Fähigkeiten sollten nicht zwingend vollständig in den Dokkurator-Core aufgenommen werden.

Denkbare Aufteilung:

- **Knowledge-Core:** Fachneutrale Knoten, Beziehungen, Indexierung und Abfragen
- **Validator:** Dokument- und graphbasierte Konsistenzprüfungen
- **Analyzer:** Coverage, Abhängigkeiten, Änderungsfolgen und Qualitätsmetriken
- **Domain-Packs:** Fachliche Beziehungstypen, Schemas und Regeln
- **Integrationen:** Code-Analyse, Typed Graph, Spec-Driven-Frameworks und Coding-Agenten

## 5. Offene Forschungsfragen

1. Sollte das Knowledge-Modell Dokumentabschnitte und weitere Wissenselemente als eigenständige Knoten unterstützen?
2. Ist eine eigene Query-DSL sinnvoll oder wäre eine etablierte Graph-Abfragesprache geeigneter?
3. Welche Traceability-Funktionen lassen sich generisch umsetzen und welche gehören in Domain-Packs?
4. Kann Typed Graph als ergänzende Engine integriert werden, statt vergleichbare Funktionalität nachzubauen?
5. Wie können Impact-Analysen und Dokumentationsentscheidungen durch konfigurierbare Regeln unterstützt werden?

## 6. Vorläufige Bewertung

**Hohe Relevanz für das Knowledge-Modul und agentische Dokumentationsworkflows.**

Typed Graph ist sowohl ein potenzieller Integrationskandidat als auch eine Referenzarchitektur für typisierte Beziehungen, Graphabfragen und Traceability.

Für Dokkurator erscheint besonders interessant, diese Konzepte fachneutral umzusetzen und über Domain-Packs auf Softwareentwicklung, Verwaltung, Wissenschaft und weitere Bereiche anzuwenden.

**Nächster Schritt:** Datenmodell, Schema-Mechanismen, Graphabfragen und Agent-Schnittstellen von Typed Graph anhand der Implementierung untersuchen und mit der geplanten Knowledge-Architektur von Dokkurator vergleichen.
