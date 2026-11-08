---
title: "DDomain Packs – Vorlagen und Import"
doctype: task
status: draft
component: validator
---

# Domain Packs – Vorlagen und Import

**Status:** Research / Konzeptstand 2026-11-08

## Ziel

Domain Packs stellen wiederverwendbare Vorlagen für Dokkurator-Projekte bereit. Ein Projekt kann gezielt einzelne angebotene Einheiten übernehmen und anschließend unabhängig vom ursprünglichen Pack weiterentwickeln.

## Grundprinzipien

- **Copy-on-Import:** Ausgewählte Einheiten werden vollständig in das Zielprojekt kopiert. Sie werden dort zu eigenen Dateien und Konfigurationen.
- **Keine laufende Bindung:** Es gibt keine Vererbung vom Pack, keine automatischen Updates und keine Synchronisierung mit der Quelle. Unterschiedliche Projektvarianten sind ausdrücklich akzeptiert.
- **Keine Teil-Auswahl innerhalb einer Einheit:** Wird beispielsweise ein DocType importiert, werden alle zugehörigen Dateien einschließlich seiner Regeln und Vorlagen übernommen.
- **Eigenständige DocTypes:** DocTypes verwenden weder DocType-Vererbung noch gemeinsam genutzte Schemas.
- **Offene Quellen:** Packs können aus einem lokalen Verzeichnis, einer URL, einem Git-Repository oder einer anderen Quelle geladen werden. Server und CLI sollen dasselbe Importprinzip verwenden.

## Inhalt und Granularität

Ein Pack ist ein Katalog **importierbarer Einheiten**. Zunächst sind relevant:

- **DocType:** Vollständige Einheit mit Definition, zugehörigem Schema, optionalem Dokument-Template und DocType-spezifischen Regeln.
- **Eigenständige Regel:** Unabhängig von einem DocType importierbare Regel, etwa für wiederverwendbare oder dokumentübergreifende Prüfungen.

Die Reichweite einer Regel (ein Dokument, mehrere Dokumente oder gesamter Bestand) bestimmt nicht ihre Import-Einheit. Eine dokumentübergreifende Regel kann auch zu einem einzelnen DocType gehören.

## Beispielstruktur

```text
software-architecture/
├── pack.yaml
├── doctypes/
│   ├── adr/
│   │   ├── doctype.yaml
│   │   ├── template.md
│   │   └── rules/
│   │       └── valid-decision.js
│   └── service/
│       └── doctype.yaml
└── rules/
    └── references-exist.js
```

Eine DocType-Einheit wird beispielsweise durch das vollständige Verzeichnis `doctypes/adr/` gebildet. `rules/references-exist.js` ist separat importierbar.

## Manifest

Ein Manifest macht die angebotenen Einheiten für Katalog, CLI und Importmechanismus auffindbar. Es benennt ihre Art und den zu kopierenden Pfad.

```yaml
id: software-architecture
version: 1.0.0

artifacts:
  - id: adr
    kind: doctype
    path: doctypes/adr/
  - id: service
    kind: doctype
    path: doctypes/service/
  - id: references-exist
    kind: rule
    path: rules/references-exist.js
```

Dies ist ein **Konzeptbeispiel**, noch kein festgelegtes Manifest-Schema. Bei Verzeichniseinheiten müssen keine einzelnen enthaltenen Dateien im Manifest aufgezählt werden.

## Importablauf

1. Quelle laden und Manifest lesen.
2. Verfügbare Einheiten anzeigen bzw. per ID adressieren.
3. Gewählte Einheit vollständig in das Projekt kopieren.
4. Bereits vorhandene Zieldateien und Namenskonflikte erkennen; nicht stillschweigend überschreiben.
5. Anschließend gelten allein die Dateien im Projekt. Die Quelle wird für ihre Verwendung nicht benötigt.

**Abgrenzung:** Es gibt keine zusätzliche Auswahl optionaler Dateien oder Regeln innerhalb einer gewählten Einheit. Ein allgemeiner Dependency-Resolver ist zunächst nicht vorgesehen.

## Ausführbare Regeln

Fachliche Regeln dürfen als ausführbarer Code im Pack liegen und mitkopiert werden, ähnlich wie lokale ESLint-Regeln. Die Implementierung soll über eine definierte, möglichst stabile Dokkurator-Rule-API angebunden werden.

Daraus folgen zwei getrennte Aspekte:

- **Import:** Regeldateien werden wie andere Artefaktdateien kopiert und dürfen im Projekt verändert werden.
- **Ausführung:** Die spätere Laufzeit muss entscheiden, unter welchen Bedingungen lokaler bzw. fremder Code geladen und ausgeführt werden darf. Das gilt besonders für einen zentralen Server.

Externe Laufzeitabhängigkeiten kopierter Regeln sind ein offener technischer Punkt; sie dürfen nicht unbemerkt als durch das bloße Kopieren gelöst gelten.

## Offene Punkte für die Implementierung

- **Pfade als Import-Einheit:** Zunächst Verzeichnisse für DocTypes und Dateien für einzelne Regeln; soll das Manifest später auch explizite Dateigruppen unterstützen?
- **Kopierziel und Konflikte:** Wie werden Zielpfade bestimmt und bestehende Artefakte behandelt?
- **Referenzen zwischen Einheiten:** Falls später ein DocType eine außerhalb seines Verzeichnisses liegende Regel referenziert, muss das Pack diese Beziehung ausdrücklich abbilden oder das Artefakt anders schneiden. Für den ersten Entwurf sollten Einheiten in sich vollständig sein.
- **Regelcode:** Wie werden erforderliche Packages, Rule-API-Kompatibilität und sichere Ausführung geregelt? Dies ist primär eine Frage der Regel-Laufzeit, nicht des Pack-Formats.

## Nicht Bestandteil dieses Konzepts

Editor-Konfiguration, geführte Anpassungen für Fachanwender, Update- und Herkunftsverfolgung, organisationsweite Policy-Vererbung sowie die konkrete Validator- und Diagnostik-Architektur.
