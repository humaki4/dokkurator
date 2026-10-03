---
doctype: task
title: Konfigurationsebenen und Repository-Konfiguration
status: research
component: configuration
tags: [configuration, cli, knowledge, repositories, indexing]
---

# Konfigurationsebenen und Repository-Konfiguration

## Ausgangslage

Dokkurator erhält seine Konfiguration derzeit hauptsächlich über direkte
Funktionsparameter, CLI-Optionen und Umgebungsvariablen. Beispielsweise können
das Dokument- und das DocType-Verzeichnis beim Aufruf festgelegt werden.

Zusätzlich soll eine Konfigurationsdatei ähnlich wie bei ESLint oder anderen
Entwicklungswerkzeugen eingeführt werden. Dabei gehören jedoch nicht alle
Einstellungen derselben Partei:

- Ein Repository kennt die Struktur und Bedeutung seiner eigenen Dokumente.
- Eine aufrufende Anwendung kennt Quellen, Index, Synchronisation und
  betriebliche Anforderungen.
- Eine Organisation kann verbindliche Policies vorgeben, die ein Repository
  nicht aufheben darf.
- Ein einzelner CLI-Aufruf kann bestimmte veränderbare Einstellungen temporär
  überschreiben.

Eine einzige frei überschreibbare Konfigurationshierarchie würde diese
Verantwortlichkeiten vermischen. Insbesondere dürfte ein Repository keine
zentralen Sicherheits- oder Ausschlussregeln außer Kraft setzen.

## Ziel der Untersuchung

Es soll ein Konfigurationsmodell spezifiziert werden, das:

- lokal, in CI und im Catalog Server gleichartig verwendet werden kann;
- Repository-eigene Einstellungen versionierbar im Repository ablegt;
- betriebliche Einstellungen bei der aufrufenden Anwendung belässt;
- nachvollziehbare Defaults und Überschreibungsregeln besitzt;
- Dateien und Verzeichnisse vom Laden und Indexieren ausschließen kann;
- mehrere Repositories mit jeweils eigener Konfiguration unterstützt;
- keine Zugangsdaten in Repository-Konfigurationen erfordert;
- von den Core Libraries als bereits aufgelöste, typisierte Konfiguration
  konsumiert werden kann.

## Vorgeschlagene Verantwortungsbereiche

### Repository-Konfiguration

Die Repository-Konfiguration beschreibt ausschließlich den Inhalt und die
Struktur einer Quelle. Sie liegt im Repository und wird zusammen mit den
Dokumenten versioniert.

Voraussichtlich geeignete Einstellungen sind:

- Verzeichnis der Dokumente;
- Verzeichnis der DocType-Definitionen;
- einzuschließende Dateimuster;
- auszuschließende Dateien und Verzeichnisse;
- Zuordnung von Dokumentbereichen zu DocTypes, falls später benötigt;
- repository-spezifische Validierungsregeln;
- repository-spezifische Knowledge-Extraktion, sofern diese deklarativ und
  portabel ist.

Nicht in diese Datei gehören:

- Tokens oder andere Zugangsdaten;
- Datenbank- und Index-Verbindungen;
- Synchronisationsintervalle;
- serverseitige Berechtigungsregeln;
- die Liste anderer Repositories;
- lokale absolute Pfade;
- Deployment- oder Server-Konfiguration.

Ein mögliches Format ist eine portable YAML-Datei im Source-Root:

```yaml
# dokkurator.yml
documents:
  directory: docs
  include:
    - "**/*.md"
  exclude:
    - drafts/**
    - generated/**
    - "**/private-notes.md"

doctypes:
  directory: _dokkurator/.doctypes
```

Der endgültige Dateiname, das Format und die Suchstrategie sind noch offen.
YAML passt zu den vorhandenen DocType-Dateien und ist unabhängig von einer
JavaScript-Laufzeit. Eine TypeScript-Konfiguration wäre flexibler, würde aber
das Ausführen von Repository-Code und damit zusätzliche Sicherheits- und
Portabilitätsfragen verursachen.

### Anwendungs- oder Workspace-Konfiguration

Die aufrufende Anwendung konfiguriert, welche Quellen verarbeitet werden und
wie Dokkurator betrieben wird. Diese Konfiguration gehört beispielsweise zur
CLI-Umgebung, zum CI-Projekt oder zum Catalog Server.

Voraussichtlich geeignete Einstellungen sind:

- Liste und Kennungen der einzulesenden Quellen;
- lokaler Pfad oder Remote-Repository;
- Auswahl und Konfiguration des Source Adapters;
- Referenz, Branch oder Synchronisationsstrategie;
- Auswahl und Konfiguration des Index Adapters;
- globale beziehungsweise organisatorische Ausschlussregeln;
- Validator-Plugins und vertrauenswürdige Erweiterungen;
- Scheduling, Logging und Fehlerbehandlung;
- Berechtigungs- und Mandantenkonfiguration;
- Referenzen auf Secrets aus der Laufzeitumgebung.

Beispielhaft könnte eine aufrufende Anwendung mehrere Quellen konfigurieren:

```yaml
sources:
  - id: platform-docs
    adapter: git
    repository: https://example.com/platform/docs.git
    ref: main
    policy:
      exclude:
        - secrets/**
        - internal-export/**

  - id: product-docs
    adapter: filesystem
    root: ../product-docs

index:
  adapter: sqlite
  location: .dokkurator/index.db
```

Diese Form ist zunächst nur ein Strukturbeispiel. Insbesondere die
Konfiguration konkreter Adapter gehört in die jeweilige Anwendung oder eine
spätere Composition-Schicht, nicht in Knowledge oder DocType.

### Aufrufbezogene Überschreibungen

CLI-Optionen, Umgebungsvariablen oder direkte API-Parameter sind für temporäre
Überschreibungen geeignet. Sie sollten nicht automatisch jede beliebige
Repository- oder Policy-Einstellung ersetzen können.

Geeignete Beispiele sind:

- abweichender Source-Root;
- alternatives Dokumentverzeichnis für einen lokalen Test;
- expliziter Pfad zu einer Konfigurationsdatei;
- Ausgabeformat oder Log-Level;
- einmaliger Full-Rebuild statt inkrementeller Synchronisation.

Secrets sollten über die Laufzeitumgebung oder einen Secret Store injiziert,
aber nicht in die zusammengeführte oder ausgegebene Konfiguration geschrieben
werden.

## Vorgeschlagene Auflösung

Die Konfiguration sollte feldbezogen statt als unkontrollierter Deep Merge
aufgelöst werden.

Für repository-eigene, überschreibbare Einstellungen kann folgende Rangfolge
gelten:

```text
eingebaute Defaults
        ↓
Defaults der aufrufenden Anwendung
        ↓
Repository-Konfiguration
        ↓
explizite Aufrufparameter
        ↓
aufgelöste Konfiguration für genau eine Quelle
```

Diese Reihenfolge gilt nicht für verbindliche Policies. Dafür gilt:

```text
Anwendungs-/Organisations-Policy
        +
Repository-Einschränkung
        +
optionale Aufruf-Einschränkung
        ↓
effektive Einschränkung
```

Ein Repository darf seinen eigenen Bereich enger definieren, aber nicht den
von der Anwendung erlaubten Quellbereich erweitern oder zentrale Ausschlüsse
aufheben.

## Semantik für Datei-Auswahl

Die Datei-Auswahl benötigt eine explizite Semantik, da ein allgemeiner Merge
von Arrays nicht ausreicht.

Vorgeschlagene Regeln:

1. Der Source Adapter begrenzt den technisch erreichbaren Source-Root.
2. Die Anwendung kann den erlaubten Bereich weiter einschränken.
3. Das Repository kann über `directory` und `include` seinen Dokumentbestand
   weiter einschränken.
4. Ausschlüsse aller Ebenen werden vereinigt.
5. Ein Ausschluss gewinnt immer gegen einen Einschluss derselben oder einer
   niedrigeren Vertrauensebene.
6. Kein Muster darf aus dem Source-Root ausbrechen.
7. Dieselbe aufgelöste Auswahl muss für vollständiges und inkrementelles Laden
   verwendet werden.

Konzeptionell:

```ts
interface DocumentSelectionConfig {
  readonly directory: string;
  readonly include: readonly string[];
  readonly exclude: readonly string[];
}

interface ResolvedRepositoryConfig {
  readonly documents: DocumentSelectionConfig;
  readonly doctypes: {
    readonly directory: string;
  };
}
```

Die bestehenden Standardausschlüsse wie `.git`, `.nx`, `node_modules` und
`dist` sollten als eingebaute Schutz- und Performance-Defaults behandelt
werden. Es ist noch zu entscheiden, ob und welche davon ausdrücklich wieder
aktiviert werden dürfen. Für `.git` und Abhängigkeitsverzeichnisse wird ein
nicht aufhebbarer Ausschluss empfohlen.

## Vorgeschlagene Komponentenaufteilung

Das Laden und Auflösen von Konfiguration sollte nicht nebenbei in DocType,
Knowledge oder einem Source Adapter implementiert werden.

Eine mögliche Aufteilung ist:

```text
Repository-Konfigurationsdatei ─┐
                                │
Anwendungskonfiguration ────────┼─> Configuration Resolver
                                │          │
CLI-/API-Parameter ─────────────┘          │
                                           v
                              ResolvedRepositoryConfig
                                    │             │
                                    v             v
                                 DocType       Knowledge/Indexing
```

Der Resolver besitzt Merge-, Default- und Policy-Semantik. Die Core Libraries
erhalten nur die für sie relevanten aufgelösten Teilmodelle. Dadurch müssen sie
weder Konfigurationsdateien suchen noch Umgebungsvariablen interpretieren.

Ob daraus sofort ein eigenes internes Package wie
`@dokkurator/configuration` entstehen soll, bleibt offen. Ein eigenes Package
wird spätestens dann sinnvoll, wenn CLI und Catalog Server dieselbe Auflösung
verwenden.

## Abgrenzung zwischen Laden und Indexieren

Für die erste Umsetzung wird empfohlen, ausgeschlossene Dokumente gar nicht
erst über `loadDocuments()` zu lesen und zu parsen. Das spart Arbeit und sorgt
dafür, dass vollständige und inkrementelle Verarbeitung dieselbe Dokumentmenge
sehen.

Eine zusätzliche Knowledge-spezifische Option wie `index: false` kann später
nötig werden, wenn Dokumente zwar validiert, aber nicht indexiert werden
sollen. Dies ist ein anderer Anwendungsfall als ein allgemeiner Ausschluss und
sollte deshalb nicht vorschnell mit `documents.exclude` vermischt werden.

```text
documents.exclude
  -> nicht laden, nicht parsen, nicht validieren, nicht indexieren

knowledge.exclude / index: false
  -> laden und gegebenenfalls validieren, aber nicht indexieren
```

Ob die zweite Ebene benötigt wird, ist Teil der Untersuchung.

## Offene Fragen

1. Soll die Repository-Datei `dokkurator.yml`, `.dokkurator.yml` oder anders
   heißen?
2. Wird ausschließlich YAML unterstützt oder zusätzlich JSON?
3. Wird die Datei nur im Source-Root gesucht oder ähnlich ESLint entlang der
   Verzeichnishierarchie?
4. Soll es genau eine Repository-Konfiguration oder verschachtelte
   Konfigurationen pro Unterverzeichnis geben?
5. Welche eingebauten Ausschlüsse sind nicht aufhebbar?
6. Welche Glob-Syntax und Bibliothek wird verwendet?
7. Sind `include` und `exclude` relativ zum Source-Root oder zum konfigurierten
   Dokumentverzeichnis? Empfohlen wird das Dokumentverzeichnis.
8. Darf ein CLI-Aufruf Repository-Einstellungen erweitern oder nur
   einschränken?
9. Müssen unbekannte Konfigurationsfelder als Fehler behandelt werden?
10. Wie werden Schema-Versionen und spätere Migrationen abgebildet?
11. Soll eine Repository-Konfiguration auch DocType- und Validator-Plugins
    auswählen dürfen, oder ist das Ausführen von Code ausschließlich Sache der
    vertrauenswürdigen Anwendung?
12. Werden Dokumente benötigt, die validiert, aber nicht indexiert werden?
13. Soll die vollständig aufgelöste Konfiguration über einen Diagnosebefehl
    wie `dokkurator config --print` sichtbar gemacht werden?

## Empfohlene erste Festlegungen

Für einen ersten Implementierungsschritt erscheinen folgende Festlegungen
risikoarm:

- eine einzelne YAML-Datei im Source-Root;
- keine hierarchische Suche in Unterverzeichnissen;
- getrennte Repository- und Anwendungskonfiguration;
- feldbezogene Auflösung statt generischem Deep Merge;
- additive Ausschlüsse;
- Core Libraries erhalten nur aufgelöste Konfigurationsobjekte;
- keine Plugins, Secrets oder ausführbarer Code in der Repository-Datei;
- ein Diagnosebefehl zeigt Herkunft und Ergebnis der Auflösung;
- vollständiges und inkrementelles Laden teilen dieselbe Datei-Auswahl.

Diese Punkte sind noch keine endgültige Architekturentscheidung. Vor der
Implementierung müssen mindestens Dateiname, Schema, Mustersemantik und die
Grenze zwischen allgemeinem Ausschluss und reinem Index-Ausschluss bestätigt
werden.

## Mögliche nächste Schritte

1. Zwei bis drei reale Repository-Strukturen als Beispiele sammeln.
2. An diesen Beispielen Repository- und Anwendungskonfiguration ausarbeiten.
3. Die gewünschte Glob- und Ausschlusssemantik mit Grenzfällen testen.
4. Ein JSON Schema für die Repository-Konfiguration entwerfen.
5. Eine reine Funktion zur feldbezogenen Auflösung prototypisieren.
6. Ausgabe eines Diagnosebefehls skizzieren.
7. Anschließend eine ADR für die bestätigten Entscheidungen erstellen.
