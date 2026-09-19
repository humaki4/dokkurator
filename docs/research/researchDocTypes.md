---
doctype: research
title: Fachliche Dokumenttypen und Anwendungsfälle
status: in-progress
topic: document-types
tags: [doctypes, standards]
sources: []
---

# Research: Fachliche Dokumenttypen und Anwendungsfälle

## Softwarearchitektur

### arc42

**arc42** definiert eine etablierte Struktur für Softwarearchitekturdokumentation.

arc42 ist explizit mit Docs-as-Code kompatibel und stellt Vorlagen unter anderem als Markdown und AsciiDoc bereit.

Weiterführend:

[arc42 Overview](https://arc42.org/overview/?utm_source=chatgpt.com)
[arc42 Documentation](https://docs.arc42.org/?utm_source=chatgpt.com)
[arc42 Template Repository](https://github.com/arc42/arc42-template?utm_source=chatgpt.com)

### Relevanz für Dokkurator

arc42 zeigt, dass fachliche Dokumentation bereits über **semantisch definierte Dokumentbereiche** strukturiert wird.
Dokkurator müsste arc42 nicht selbst implementieren. Denkbar wäre vielmehr ein optionales `@dokkurator/doctype-arc42`-Paket.

---

## Entscheidungen

### ADR / MADR

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

#### Relevanz für Dokkurator

> **Vertiefung:** Structured MADR genauer mit dem geplanten DocType-Format vergleichen. Insbesondere Schema, Relations, Statusmodell und CI-Validierung.

---

## Change Proposals und Design Documents

Mehrere große Open-Source-Projekte haben eigene formalisierte Dokumenttypen für Änderungen entwickelt.

### Kubernetes Enhancement Proposals

KEPs kombinieren Markdown mit strukturierten Metadaten. Die Metadaten werden ausdrücklich für **Tooling, Filterung und Darstellung** verwendet.

[KEP Process](https://github.com/kubernetes/enhancements/tree/master/keps?utm_source=chatgpt.com)

---

## Requirements Engineering

### Volere

Volere ist ein umfangreiches Requirements-Engineering-Modell.

Es definiert sowohl Dokumentstrukturen als auch Eigenschaften einzelner Anforderungen.

Ein Requirement kann beispielsweise besitzen:

- ID
- Beschreibung
- Rationale
- Originator
- Fit Criterion
- Priority
- Supporting Material
- Abhängigkeiten / Traceability

Insbesondere der **Fit Criterion** macht Anforderungen maschinell bzw. methodisch prüfbarer.

[Volere Requirements Template](https://www.volere.org/templates/volere-requirements-specification-template/?utm_source=chatgpt.com)

---

## Dokumentationsarten

### Diátaxis

Diátaxis unterscheidet vier grundlegende Arten technischer Dokumentation:

- Tutorial
- How-to
- Reference
- Explanation

Jeder Typ hat einen anderen Zweck und sollte entsprechend anders geschrieben werden.

[Diátaxis](https://diataxis.fr/?utm_source=chatgpt.com)

---

## Betrieb und Incidents

### SRE Postmortems

Google SRE verwendet strukturierte Postmortems.

Typische Inhalte sind:

- Incident
- Impact
- Timeline
- Root Causes / contributing factors
- Detection
- Resolution
- Lessons Learned
- Action Items

Google empfiehlt außerdem definierte Kriterien dafür, wann ein Postmortem erforderlich ist, und einen Reviewprozess.

[Google SRE Postmortem Culture](https://sre.google/sre-book/postmortem-culture/?utm_source=chatgpt.com)
---

## Compliance-as-Code

### OpenControl

OpenControl verfolgt explizit einen **Compliance-as-Code**-Ansatz.

Kontrollinformationen werden strukturiert in YAML abgelegt und können versioniert, validiert, wiederverwendet und in andere Darstellungen überführt werden.

### OSCAL

OSCAL ist ein NIST-Standard für maschinenlesbare Security- und Compliance-Dokumentation.
[OSCAL](https://pages.nist.gov/OSCAL/?utm_source=chatgpt.com)

---

## Metadatenstandards

### Dublin Core

Dublin Core definiert generische Metadaten für Informationsressourcen.

Beispiele:

- `title`
- `creator`
- `subject`
- `description`
- `publisher`
- `date`
- `type`
- `identifier`
- `language`
- `rights`
- `license`
- `source`

[Dublin Core Metadata Terms](https://www.dublincore.org/specifications/dublin-core/dcmi-terms/?utm_source=chatgpt.com)

### Bedeutung für Dokkurator

Für generische Felder sollte geprüft werden, ob vorhandene Begriffe übernommen werden können.

---

## Developer Portals und Docs-as-Code

### Backstage TechDocs

Ein `catalog-info.yaml` beschreibt beispielsweise:

```yaml
kind: Component

spec:
  type: documentation
  lifecycle: experimental
  owner: team-a
```

Die eigentliche Dokumentation bleibt im Repository.

[Backstage TechDocs](https://backstage.io/docs/features/techdocs/?utm_source=chatgpt.com)

---

## „Die Daten gehören dem Nutzer“

Neben Docs-as-Code gibt es eine zweite relevante Bewegung: **Local-first Software**.
Die Grundidee lautet:

> Die Anwendung ist nicht der Eigentümer bzw. einzige Zugangspunkt zu den Daten.

Die Daten bleiben unabhängig von der Anwendung verfügbar.

---

### Obsidian

Obsidian speichert Notizen als normale Markdown-Dateien in einem lokalen Verzeichnis.
[How Obsidian stores data](https://obsidian.md/help/data-storage?utm_source=chatgpt.com)

Das entspricht sehr stark dem Dokkurator-Grundprinzip:

```text
Dokument gehört nicht Dokkurator.
Dokkurator liest und interpretiert das Dokument.
```

---

### Logseq

Logseq beschreibt sich als privacy-first und local-first.
Die Daten liegen lokal und können als Markdown auch von anderen Anwendungen gelesen werden.

[Logseq](https://logseq.com/?utm_source=chatgpt.com)

---

### Anytype

[Anytype](https://anytype.io/?utm_source=chatgpt.com)

Interessant ist insbesondere die Trennung zwischen Anwendung und zugrunde liegendem Sync-/Datenprotokoll.

---

### Solid

Das Solid-Projekt verfolgt ein noch grundsätzlicheres Modell.

Nutzer besitzen persönliche Datenspeicher, sogenannte **Pods**. Anwendungen greifen auf diese Daten zu, statt sie selbst exklusiv zu besitzen.
Dadurch kann ein Nutzer Anwendungen wechseln, ohne gleichzeitig seine Daten zu migrieren.

[Solid Project](https://solidproject.org/?utm_source=chatgpt.com)

---

### AT Protocol

Das AT Protocol verwendet persönliche Daten-Repositories.
Ein Repository enthält die von einem Nutzer veröffentlichten Records und ist unabhängig prüfbar und übertragbar.

[AT Protocol Data Repositories](https://atproto.com/guides/data-repos?utm_source=chatgpt.com)

Für Dokkurator ist weniger das konkrete Datenformat interessant als das Prinzip:

```text
dezentrale Quelle
+
identifizierbare Records
+
standardisiertes Datenmodell
+
zentral oder föderiert auswertbar
```

---

## Mögliche DocType-Bibliothek

Langfristig könnten offene DocType-Pakete entstehen.

```text
@dokkurator/doctype-adr
@dokkurator/doctype-arc42
@dokkurator/doctype-requirement
@dokkurator/doctype-incident
@dokkurator/doctype-runbook
@dokkurator/doctype-diataxis
@dokkurator/doctype-rfc
```

Dabei sollte Dokkurator möglichst bestehende Standards referenzieren und nicht stillschweigend eigene Varianten daraus machen.

---
