---
title: "Knowledge-Modell, Index, Aggregationen und Queries"
doctype: task
status: draft
component: knowledge
---

# Research: Knowledge-Modell, Index, Aggregationen und Queries

## Ausgangslage

Dokkurator liest aktuell Markdown-Freitext und Frontmatter-Felder ein und stellt eine Suche darauf bereit. Künftig sollen Dokumente auch über ihre Beziehungen, Herkunft, Versionen und ihren Validierungszustand auffindbar und auswertbar sein. Das gilt für eine lokale SQLite-basierte Implementierung und perspektivisch auch für OpenSearch.

Die Erweiterung soll **dokumentenzentriert** bleiben. Knowledge ist eine Query Engine über Dokumentationswissen, keine automatische KI-Interpretations- oder Kontextplanungsplattform.

## Ziel

Untersuchen und einen evolvierbaren Entwurf vorbereiten für:

- Logisches Knowledge-Modell mit Dokumenten, Fundstellen, Beziehungen und Metadaten.
- Nachvollziehbare Herkunft, Version und Qualität.
- Physische Indexstrukturen und optionale materialisierte Sichten für schnelle Abfragen.
- Einfache freie CLI-Suche und eine ausdrucksstarke programmatische Query API.
- Programmierbare, parametrisierte Named Queries aus Domain Packs / Instanzkonfiguration.
- Abfragen, Aggregationen, Facetten, Graphnavigation und unterschiedliche Ergebnisformen.
- Erweiterung auf OpenSearch ohne Kopplung des öffentlichen Query-Vertrags an dessen DSL.

## Vorläufige Leitentscheidungen

1. **Dokumente sind primäre Wissensobjekte.** Team- oder Service-Dokumente beschreiben bereits fachliche Objekte; zunächst kein separates allgemeines Entitätsmodell einführen.
2. **Referenzziele können extern sein**, ohne dass zwingend ein vollständiges Dokument zu ihnen existiert.
3. **Knowledge stellt eine öffentliche Query API bereit**, die von CLI, Server, zukünftigen Oberflächen und Named Queries verwendet werden kann.
4. **Endnutzer erhalten eine bewusst einfache Ad-hoc-Suchsyntax:** Freitext, Feldfilter, `AND`/`OR`; Beziehungen zunächst möglichst einfach.
5. **Komplexe Queries dürfen als ausführbare Named Queries programmiert werden.** Dafür muss keine vollständige frei nutzbare Graph-DSL geschaffen werden.
6. **Ergebnisse können über Dokumente hinausgehen:** Abschnitte/Fundstellen, Relationen, Graphen und Aggregate, soweit ein konkreter Anwendungsfall den Mehrwert rechtfertigt.
7. **Darstellung ist nicht Aufgabe von Knowledge.** Knowledge liefert typisierte strukturierte Ergebnisse; CLI, API, UI oder Agent-Adapter entscheiden über die Ausgabe.
8. Eine Instanz kann Named Queries aus zentral installierten Domain Packs bereitstellen; deren Ablage und Sicherheit sind Gegenstand des separaten Instanz-Researchs.

## Forschungsblock A: Logisches Wissensmodell

### Dokument als primäre Identität

Untersuchen:

- Stabile Dokument-ID unabhängig von Pfad und Repository-Umbenennung.
- DocType, Frontmatter, Markdown und Quellinformationen als Eigenschaften des Dokuments.
- Mehrere Dokumente zu demselben fachlichen Gegenstand: wann genügt eine Relation, wann wird echte Identitätszuordnung benötigt?
- Externe Referenzziele (z. B. Sourcecode, Services oder URLs) ohne eigenes Dokkurator-Dokument.
- Umgang mit fehlenden, mehrdeutigen oder gelöschten Referenzzielen.

**Hypothese:** Ein separates `Entity`-Modell ist kein MVP-Bestandteil. Nur bei nachgewiesenen Use Cases ergänzen.

### Beziehungen und Bedeutung

Das bestehende separate Research zu RelationTypes, RelationTargets, Frontmatter-/Markdown-/Pfad-Relationen bleibt die fachliche Grundlage. Knowledge sollte erkannte Beziehungen in eine normalisierte, abfragbare Form bringen.

Zu prüfen:

- Typisierte, gerichtete Kanten zwischen Dokumenten bzw. Referenzzielen.
- Eingehende und ausgehende Relationen, inverse Relationen und Relation-Metadaten.
- Nachweis der Relation aus Quelle/Feld/Abschnitt/Pfadkonvention.
- Auflösung (`resolved`, `unresolved`, ggf. `ambiguous`) und Diagnostik.
- Erlaubte RelationTypes für Traversierung; Behandlung von Zyklen.
- Reicht ein Satz expliziter Relationen oder werden ausgewählte abgeleitete Beziehungen benötigt?

**Nicht automatisch gleichsetzen:** Ein Frontmatter-Filter `owner:team-a` und die aufgelöste Relation `ownedBy -> team-a` haben unterschiedliche Semantik, auch wenn die CLI sie später ähnlich darstellen kann.

### Abschnitte und Fundstellen

- Reicht die Indexierung ganzer Dokumente für relevante Treffer?
- Abschnitt als indexierte Such-Einheit, aber nicht zwingend eigenständiges Wissensobjekt.
- Referenz auf Dokument, Überschrift/Anker und Position; stabile Fundstellen bei Dokumentänderungen.
- Dokumenttreffer zusammenfassen vs. Treffer je Abschnitt ausgeben.

## Forschungsblock B: Provenienz, Version und Zustand

### Herkunft / Provenienz

Auf welchen Ebenen benötigen wir Herkunft?

| Ebene       | Kandidaten                                               |
| ----------- | -------------------------------------------------------- |
| Quelle      | Repository/Connector, Branch/Ref, Dateipfad, URL         |
| Version     | Commit, Content-Hash, ggf. Revision                      |
| Indexierung | Sync-Lauf, Zeit, Parser-/Modellversion                   |
| Information | Feld, Markdown-Abschnitt, Quelle einer Relation          |
| Validierung | Rule/Ruleset-Version, Zeitpunkt, geprüfter Dokumentstand |

W3C PROV als konzeptionelle Referenz evaluieren, aber nicht automatisch vollständig übernehmen.

### Zeit und Historie

Unterscheiden:

- `sourceModifiedAt` bzw. Git-Revision,
- `indexedAt` / letzter erfolgreicher Sync,
- `validatedAt` / geprüfte Version,
- fachliche Gültigkeit und fachlicher Status.

Fragen: aktuelle Version vs. historische Snapshots, Changes/Diffs von Dokumenten und Kanten, Löschung/Verschiebung, unterschiedliche Sync-Stände mehrerer Quellen.

**Hypothese:** Version/Identität von Anfang an sauber trennen, vollständige Historisierung später evaluieren.

### Qualität und Zustand

Der Validator erzeugt Diagnostics; Knowledge indexiert deren Ergebnisse, **validiert aber nicht selbst**.

Zu unterscheiden:

- Indexstatus (aktuell, veraltet, fehlgeschlagen),
- Validierungsausführung (nie geprüft, erfolgreich, fehlgeschlagen),
- Diagnostics (Errors, Warnings etc.),
- Referenzauflösung/Integrität,
- fachlicher Status (`draft`, `approved`, `deprecated`, soweit definiert),
- optionale Dokumentqualitätsmetriken.

**Wichtig:** Keine Diagnostics ≠ erfolgreich validiert. Prüfstand und Rule-Version müssen sichtbar bleiben.

## Block C: Indexaufbau und Projektionen

Zunächst zwischen **logischen Sichten** und **physischen Tabellen/Indizes** unterscheiden.

| Logische Sicht      | Daten                                      | Typische Abfragen                       |
| ------------------- | ------------------------------------------ | --------------------------------------- |
| Documents           | Inhalt, DocType, Frontmatter, Quelle       | Volltext, Filter, Sortierung            |
| Sections            | Überschrift, Text, Fundstelle, Dokument-ID | Präzise Treffer und Snippets            |
| Relations           | Source, Target, Typ, Richtung, Herkunft    | Nachbarn, Rückreferenzen, Traversierung |
| Diagnostics/Quality | Regel, Severity, Status, geprüfte Version  | Qualitätssuche und Dashboards           |
| Provenance/Versions | Commit, Hash, Index-Lauf, Quelle           | Nachweis, Aktualität, Änderungen        |
| Aggregates/Facets   | Nach Dimension gruppierte Kennzahlen       | Counts, Gruppierungen, Navigation       |

Dies sind **keine vorgeschriebenen sechs separaten Indizes**. Materialisierung nur bei begründetem Nutzen.

### SQLite-Prototyp

- FTS5 für Volltext, Ranking, Snippets.
- Relationale Tabellen mit geeigneten Indizes für Dokumente und Kanten.
- Rekursive CTEs für begrenzte Graphtraversierungen.
- SQL-Aggregationen für Facetten und Kennzahlen.
- Messung von Query-Kosten, Aktualisierungskosten und Datenverdopplung.

### Normalisieren und Denormalisieren

Untersuchen, welche Informationen in kanonischen Strukturen liegen und welche als abgeleitete Suchprojektion zusätzlich gespeichert werden (z. B. DocType, Owner-IDs, Fehleranzahl, RelationTypes).

Kritische Fragen: Update-Konsistenz, Materialisierungsaufwand, Indexgröße, transparente Rekonstruktion, Schemaänderungen.

### OpenSearch-Ausblick

OpenSearch kann bei umfangreicher Volltextsuche, Filtern, Facetten/Aggregationen und optional später hybrider Suche helfen. Es sollte aber **nicht vorausgesetzt** werden, dass komplexe Graphtraversierungen oder beliebige Joins dort ebenso geeignet sind.

Research:

- Mapping dynamischer, DocType-spezifischer Frontmatter-Felder.
- Dokument- vs. Abschnittsindex und Gruppierung der Treffer.
- Denormalisierte Felder vs. `nested` vs. getrennte Indizes.
- Aggregationsmöglichkeiten, Limitierungen, Refresh/Consistency.
- Graphoperationen weiterhin auf separater Relationstruktur oder anderem Store?
- Gemeinsamer Capability-Vertrag statt Leckage der OpenSearch Query DSL nach außen.

## Block D: Query-Arten und API

### Anwendungsfall-Katalog

| Abfrage                                   | Benötigte Fähigkeit            | Möglicher Ergebnistyp     |
| ----------------------------------------- | ------------------------------ | ------------------------- |
| Finde OAuth-Dokumentation                 | Volltext, Ranking              | Dokumente oder Abschnitte |
| ADRs mit Status `accepted`                | Filter auf Frontmatter/DocType | Dokumente                 |
| Dokumente mit Errors                      | Quality-Filter                 | Dokumente/Diagnostics     |
| Wer verweist auf ADR-12?                  | Eingehende Relationen          | Kanten und Dokumente      |
| Welche Services hängen an X?              | Direkte Nachbarn               | Dokumentnetzwerk          |
| Welche Services hängen indirekt von X ab? | Begrenztes Traversal           | Graph / Dokumente         |
| Wie hängen A und B zusammen?              | Pfadsuche                      | Pfad                      |
| Services ohne Owner                       | Negation einer Relation        | Dokumente                 |
| Services nach Team gruppieren             | Relationale Aggregation        | Gruppen/Counts            |
| Änderungen seit Revision X                | Versionen/Diffs                | Changeset                 |
| Quelle einer behaupteten Abhängigkeit     | Provenienz einer Kante         | Relation + Quellenbeleg   |

Die Tabelle dient als **Fähigkeits- und Priorisierungstest**, nicht als Zusage für die erste Version.

### Navigation über Beziehungen

**Hypothese:** Für interaktive Navigation reicht im Normalfall `neighbors()` für eine Ebene; tiefere Abfragen bleiben als explizite API-Fähigkeit verfügbar.

Mögliche Operationen:

```ts
knowledge.search(...)
knowledge.getDocument(...)
knowledge.getSection(...)
knowledge.neighbors(...)
knowledge.traverse(...)
knowledge.findPath(...)
knowledge.aggregate(...)
```

Zu prüfen: Wirklicher Bedarf an `findPath`, maximaler Depth/Result-Limit, Pagination, Zyklenerkennung, gerichtete Kanten, RelationTypes und Berechtigungsfilter während der Traversierung.

### Einfache Endnutzer-Suche

Ziel: eine kleine Sprache für CLI und ggf. Suchfeld, z. B.:

```text
authentication
status:accepted AND type:adr
owner:platform AND payment
```

Fragen:

- Welche Operatoren wirklich nötig? Freitext, Feldvergleich, `AND`, `OR`, Klammern, Negation?
- Werden typisierte Felder und Relation-Felder automatisch erkannt?
- Was bedeutet `owner:platform` bei nicht aufgelösten Referenzen?
- Wie werden mehrdeutige Feldnamen über DocTypes hinweg behandelt?
- Welche Escape-, Typisierungs- und Fehlermelderegeln gelten?

**Nicht Ziel:** Eine vollständige, universelle Graph-DSL für Endanwender.

### Programmatische Knowledge API

Named Queries sollen nicht direkten Index-Zugriff benötigen. Deshalb sind strukturierte, backendunabhängige Operationen mit klaren Typen und Fehlern entscheidend.

Zu evaluieren:

- Mehrere kleine API-Operationen vs. eine gemeinsame Query-AST.
- Zusammengesetzte Filter, Relation-Exists/Not-Exists, Aggregationen.
- Streaming/Pagination und Limits.
- Zugriffskontext und durchgehende Datenberechtigungen.
- Capability Detection für Backend-Funktionen.
- Typisierte Ergebnisformen statt ausschließlich `Document[]`.

## Block E: Named Queries aus Domain Packs

**Konzept:** Eine Named Query ist eine registrierte, programmatische, parameterisierte Funktion. Sie wird als ausführbarer Code auf Instanzebene bereitgestellt, nicht in Dokumentations-Repositories kopiert.

Beispiel (API-Skizze, nicht implementiert):

```ts
export const servicesByOwner = {
  id: "software.servicesByOwner",
  parameters: {
    owner: { type: "string", required: true },
  },
  async execute(context, params) {
    return context.knowledge.search({
      docType: "service",
      // Filter über Relation ownedBy auf params.owner
    });
  },
};
```

Verwendung:

```text
dokkurator query software.servicesByOwner --owner platform
```

Zu klären:

- Namespacing, Discovery, Beschreibungen, Parameter- und Ergebnis-Schema.
- Aufruf über CLI/Server/API; UI und Agent-Adapter können dieselbe Query nutzen.
- Wie greifen Queries auf DocType- und RelationType-Definitionen zu?
- Abhängigkeit von einer Domain-Pack-Version.
- Können komplexe Queries mehrere API-Aufrufe kombinieren, ohne unkontrollierte N+1-Abfragen zu verursachen?
- Query-Registrierung und Sicherheits-/Berechtigungsmodell (siehe separates Instanz-Research).
- Konfiguration vs. Programmierung: Wann reicht ein gespeicherter Filter, wann ist Code gerechtfertigt?

**Hypothese:** Eine einfache freie Suche und eine programmierbare Named Query sind zwei Zugangswege zur selben Knowledge API. Eine mächtige zweite DSL ist dafür zunächst nicht nötig.

## Block F: Gruppierung und Sichten

Zwei Dinge getrennt bewerten:

1. **Aggregation**: nach Eigenschaften oder Relation-Zielen gruppieren, zählen, berechnen.
2. **Gruppierte Ergebnismenge**: tatsächliche Treffer in Gruppen präsentieren (mit Pagination pro Gruppe).

Mögliche Dimensionen: DocType, Repository, Projekt, fachlicher Status, Severity, Owner/Team, Zeiträume, RelationType, dynamische Frontmatter-Felder.

Fragen:

- Können beliebige DocType-Felder als Filter-/Sortier-/Gruppierungsdimensionen genutzt werden?
- Brauchen wir eine abfragbare **Field Registry** (Feldtyp, mögliche Werte, filterbar, sortierbar, gruppierbar)?
- Wie werden mehrere Owners, fehlende Werte, unbekannte DocTypes und nicht aufgelöste Referenzen gezählt?
- Sind Relation-basierte Gruppen eigene API-Fähigkeiten?
- Sind **Views** eigenständige Definitionen oder bloß Named Queries mit Standardparametern und Darstellungsmetadaten?

**Vorläufige Grenze:** Knowledge liefert Query-Ergebnisse und ihre Gruppierungsstruktur. Tabellen, Filterwidgets, Graphen und Layouts sind Sache der Clients. UI-/Editor-Konfiguration gehört nicht zum Kern-Research.

## Block G: Ergebnisformen und Nutzergruppen

Mögliche strukturierte Result-Typen:

| Typ                      | Mehrwert / Anwendungsfall                  |
| ------------------------ | ------------------------------------------ |
| DocumentHit              | Titel, Metadaten, Quelllink, Snippet       |
| SectionHit               | Präzise Fundstelle mit Dokumentbezug       |
| RelationResult           | Typisierte Kante samt Provenienz           |
| Neighborhood/GraphResult | Navigation und Abhängigkeitsübersicht      |
| AggregateResult          | Gruppen, Facetten, Kennzahlen              |
| DiagnosticResult         | Ursachen und Status von Qualitätsproblemen |
| ChangeResult             | Versionen und Änderungen (später)          |

Mensch und Agent benötigen nicht zwingend getrennte Endpoints:

- **Knowledge** liefert typisierte Daten und wählbare Granularität.
- **CLI** formatiert Text/Tabellen/JSON.
- **Server** stellt eine API samt Zugriffskontrolle bereit.
- **UI/Editor** entscheidet über Darstellung und Navigation.
- **Agent-Adapter** bereitet verfügbare Operationen und Ergebnisse aufgabengerecht auf (z. B. Quellenbelege und begrenzten Kontext).

**Abgrenzung:** Eine explizite Query, die definierte Nachbardokumente lädt, gehört zur Knowledge Engine. Automatische Interpretation eines offenen Arbeitsziels und autonome Auswahl des „besten Kontexts“ gehören zunächst nicht zum Knowledge-Kern.

## Querschnitt: Sicherheit, Aktualisierung und Erklärbarkeit

### Berechtigungen

Filter müssen vor oder während Auswertung von Suche, Graphabfragen und Aggregationen wirksam sein; spätes Entfernen von Treffern reicht nicht immer (Leckage über Counts, Pfade oder Facetten). Named Queries erhalten einen eingeschränkten, aufrufergebundenen Query-Kontext. Installations-/Ausführungsdetails siehe separates Instanz-Research.

### Inkrementelle Synchronisierung

Bei Änderung oder Löschung eines Dokuments müssen betroffene Text-, Abschnitts-, Relations- und Quality-Projektionen konsistent aktualisiert werden. Rule-/DocType-Änderungen können Neuvalidierung oder Reindexierung auslösen, auch ohne geänderte Markdown-Datei.

### Erklärbarkeit

Nachvollziehbar machen, warum ein Treffer gefunden wurde oder woher eine Kante stammt (Trefferfeld, Abschnitt, Relation-Quelle, geprüfte Version). Kein freies Ableiten nicht belegter Sachverhalte als Grundlage der Engine.

## Vergleich mit bestehenden Systemen

Für das Research gezielt untersuchen:

- **GitLab Orbit:** Graph-Matching, Traversal, Aggregationen, Named Queries und deren Grenzen. Insbesondere Trennung von freier Graph-Abfrage und stabiler serverseitiger Named Query.
- **Backstage Catalog:** Strukturierte Feld-/Katalogfilter, Relation-Modelle, Entity-Suche und konfigurierbare Katalogsichten. Augenmerk auf einfache User-Einstiege statt allumfassender Graph-DSL.
- **SQLite FTS5:** Ranking, Abschnittssuche und geeignete SQL-/Graph-Workloads.
- **OpenSearch:** Volltext, dynamische Felder, Aggregationen, Skalierung, Beschränkungen bei Joins und Graphtraversierungen.

Nicht die Produkte komplett nachbauen, sondern konkrete Abfragefälle vergleichen.

## Vorschlag für Research-Durchführung

### Phase 1: Referenzbestand und Queries

30–50 Dokumente aus mindestens zwei Repositories mit verschiedenen DocTypes, Beziehungen, längeren Abschnitten, fehlenden Referenzen, Diagnostics und mehreren Versionsständen. Dazu 10 repräsentative Queries aus Abschnitt 7.

### Phase 2: Logisches Modell

Identitäten, Relationen, Fundstellen, Provenienz und Quality-State definieren. Prüfen, ob ein eigenständiges Entitätsmodell wirklich benötigt wird.

### Phase 3: SQLite-PoC

Document- und Section-Suche, Relation-Queries, mindestens eine Aggregation über Relationsziele und Quality-Filter implementieren. Query-Laufzeit und Update-Konsistenz messen.

### Phase 4: Query-Vertrag

Einfache Suchsyntax vs. programmatische API abgrenzen. Zwei bis drei Named Queries mit Parametern und strukturierten Ergebnissen implementieren/testen.

### Phase 5: Backend-Vergleich

Capability-Matrix und OpenSearch-Projektionen gegen dieselben Query-Fälle evaluieren; erst dann physische Indexstrategie finalisieren.

## 14. Erwartete Research-Ergebnisse

- Minimaler fachlicher Knowledge-Modellentwurf.
- Priorisierter Query-Katalog mit Ergebnistypen.
- Vorschlag für logische Sichten und SQLite-Schema inkl. Indexstrategie.
- Messbare Entscheidung zu Dokument- vs. Abschnittssuche.
- Entwurf der öffentlichen Query API und einfachen Suchsyntax.
- Vertrag für Named Queries, Parameter und strukturierte Resultate.
- Konzept für Aggregationen, Field Discovery, Provenienz und Quality-Filter.
- OpenSearch-Fähigkeitsvergleich und Migrations-/Erweiterungspfad.
- Offene Entscheidungen und Out-of-Scope-Liste für eine spätere Implementierungsspezifikation.

## 15. Out of Scope

- Vollständige Ontologie-Engine, RDF-/OWL-Inferenz.
- Automatische KI-Erkennung neuer fachlicher Beziehungen.
- Semantische Suche / Embedding-Pipeline als Pflichtbestandteil.
- Graphdatenbank als festgelegte Voraussetzung.
- Vollständige Git-Historisierung aller Versionen im MVP.
- Allgemeine komplexe Graph-DSL für Endanwender.
- KI-basierte autonome Kontextinterpretation und Agent-Planung.
- UI-/Editor-Implementierung.
- Zentrale Domain-Pack-Installation, Code-Sandboxing und administrative Berechtigungen (separates Research).
