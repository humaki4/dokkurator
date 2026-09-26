---
title: Typisierte SQLite-Queries, Mapping und Index-Migrationen
status: open
component: index-adapters
tags: [index, sqlite, orm, migrations, fts]
---

# Typisierte SQLite-Queries, Mapping und Index-Migrationen

## Ausgangslage

Der SQLite-Indexadapter unter `@dokkurator/knowledge` verwendet aktuell
unmittelbar `node:sqlite`. Schemaerzeugung, Inserts, Upserts, Abfragen und
Transaktionen werden innerhalb der separaten Adapterimplementierung formuliert. Eine einzelne
`schema_version`-Tabelle erkennt derzeit lediglich, ob die erwartete
Schemaversion vorliegt. Sie kann bestehende Datenbanken noch nicht schrittweise
auf eine neue Version migrieren.

Der Ansatz hält Abhängigkeiten klein und macht die SQLite-Semantik sichtbar.
Mit wachsendem Schema entstehen jedoch mehrere Nachteile:

- Tabellen- und Spaltennamen werden an mehreren Stellen als Strings verwendet;
- Datenbankzeilen müssen manuell in `KnowledgeDocument` übersetzt werden;
- Änderungen am Schema sind nicht automatisch mit Abfragen gekoppelt;
- es gibt noch keinen versionierten Upgrade-Pfad für bestehende Indexdateien;
- umfangreiches SQL erschwert Refactorings und Tests.

Queries bilden einen Schwerpunkt von Knowledge. Neben dem vollständigen
Indexaufbau sollen Dokumente später nach Typ, Quelle, Metadaten und
Volltexttreffern kombiniert abgefragt werden. Weitere Anforderungen wie
Sortierung, Pagination, Facetten oder Beziehungen werden voraussichtlich
hinzukommen. Die Wahl des Mappers darf deshalb nicht hauptsächlich anhand der
Bequemlichkeit beim Schreiben entschieden werden. Entscheidend ist, wie gut
sich dynamische und dennoch typisierte Abfragen zusammensetzen lassen.

Der Knowledge-Index bleibt abgeleitete und wiederaufbaubare Datenbasis. Dennoch
sollen Schemaänderungen zuverlässig funktionieren, weil lokale und spätere
serverseitige Indizes nicht bei jedem Update ungefragt gelöscht werden dürfen.

## Ziel

Es soll untersucht und anschließend umgesetzt werden, ob ein kleiner
TypeScript-basierter Mapper oder Query Builder den SQLite-Adapter vereinfacht.
Zusätzlich soll ein Liquibase-ähnlicher, versionierter Migrationsablauf
eingeführt werden.

Die Lösung soll:

- mit dem im Projekt verwendeten `node:sqlite` zusammenarbeiten;
- Tabellen, Spalten und Ergebniswerte möglichst statisch typisieren;
- Inserts, Upserts, Deletes und reguläre Selects ohne verstreute SQL-Strings
  ausdrücken;
- dynamische Filter, Sortierungen und Pagination typsicher zusammensetzen;
- strukturierte Filter mit Volltextsuche und Ranking kombinieren;
- das öffentliche `KnowledgeQuery`-Modell unabhängig von SQLite halten;
- Migrationen als versionierte, reviewbare Dateien im Repository ablegen;
- neue und bereits vorhandene Indexdateien auf denselben Schemastand bringen;
- Transaktionen für einen vollständigen Index-Neuaufbau erhalten;
- SQLite FTS5 weiterhin vollständig nutzbar machen;
- die öffentliche Knowledge-API und den `index`-CLI-Befehl unverändert lassen.

## Nicht-Ziele

- Wechsel von SQLite zu PostgreSQL oder OpenSearch;
- Einführung von Entities oder semantischen Relationen;
- Änderung des `KnowledgeDocument`-Modells;
- inkrementelles Indexieren einzelner Dokumentänderungen;
- Abbildung von FTS5 als portables, datenbankunabhängiges ORM-Modell;
- Migration der ursprünglichen Markdown-Dokumente. Migrationen betreffen nur
  den abgeleiteten Index.

## Zu untersuchende Varianten

Die Bewertung muss query-first erfolgen. Migrationserzeugung und
Schema-Deklaration sind wichtig, dürfen aber keine eingeschränkte oder schwer
erweiterbare Query-Implementierung erzwingen.

### Drizzle ORM und Drizzle Kit

Drizzle ist ein Kandidat, sofern die zum Implementierungszeitpunkt verwendete
Version `node:sqlite` stabil unterstützt und komplexere dynamische Queries
ohne Ausweichen auf umfangreiches Raw SQL ausdrücken kann.

Zu prüfen sind:

- Umfang der zusätzlichen Laufzeit- und Entwicklungsabhängigkeiten;
- direkte Unterstützung von `DatabaseSync` aus `node:sqlite`;
- JSON-Spalten und deren TypeScript-Typisierung;
- dynamische Kombination optionaler WHERE-Bedingungen;
- wiederverwendbare Filter- und Sortierbausteine;
- Verbindung regulärer Tabellenabfragen mit FTS5-Ergebnissen;
- Upserts über `ON CONFLICT`;
- synchrone Transaktionen hinter dem asynchronen Adaptervertrag;
- Erzeugung und Ausführung versionierter SQLite-Migrationen;
- Verhalten von Drizzle Kit in einem pnpm-/Nx-Monorepo;
- Nutzung eigener SQL-Migrationen für virtuelle FTS5-Tabellen.

### Kysely mit separatem Migration Runner

Kysely ist als query-zentrierte Alternative gleichwertig zu bewerten. Seine
Stärken bei zusammensetzbaren und typisierten SQL-Abfragen können für
Knowledge wichtiger sein als eine ORM-artige Modellierung. Falls dessen
SQLite-Dialekt nicht direkt mit `node:sqlite` arbeitet, muss der Aufwand eines
eigenen Dialekts beziehungsweise eines zusätzlichen Treibers dagegen
abgewogen werden.

Für Migrationen kämen der Kysely Migrator oder ein separates Werkzeug wie
Umzug infrage. Diese Variante ist vorzuziehen, falls Drizzle zu viel
Framework-Semantik oder Einschränkungen bei dynamischen Queries und FTS5
einführt.

## Repräsentative Query-Szenarien

Der technische Spike muss mindestens folgende Abfragen mit beiden engeren
Kandidaten prototypisch umsetzen:

1. Dokument über seine ID laden.
2. Nach optionalem Dokumenttyp und optionaler Quelle filtern.
3. Nach einem skalaren Metadatenfeld wie `status` filtern.
4. Mehrere Filter mit `AND` und `OR` dynamisch kombinieren.
5. Nach einem Metadatenwert oder Indexzeitpunkt sortieren.
6. Stabile Pagination mit definierter Tie-Break-Sortierung ausführen.
7. FTS5-Suche mit `MATCH` ausführen und nach `bm25()` sortieren.
8. FTS-Treffer mit Dokumenttyp und Metadatenfilter kombinieren.
9. Trefferzahl und Ergebnisse für dieselbe Filtermenge ermitteln.
10. Die erzeugten SQL-Statements und Query-Pläne in Tests beziehungsweise
    Diagnoseausgaben untersuchen können.

Die Kandidaten sind danach zu bewerten, wie viel Raw SQL, Typ-Casting und
manuelles Row-Mapping für diese Szenarien verbleibt. Ein kurzer CRUD-Vergleich
reicht nicht aus.

## Query-Architektur

Das öffentliche Query-Modell wird in Knowledge beziehungsweise im neutralen
Index-Adaptervertrag definiert. Der SQLite-Adapter übersetzt dieses Modell in
SQL. Weder Drizzle- noch Kysely-Ausdrücke dürfen Teil der öffentlichen API
werden.

```text
KnowledgeQuery / SearchQuery
            |
            v
SQLite Query Translation
            |
            +--> strukturierte Filter
            +--> JSON-Metadatenfilter
            +--> Sortierung und Pagination
            +--> FTS5 MATCH und Ranking
            |
            v
        Query Builder
```

Die Übersetzung sollte aus kleinen, testbaren Query-Bausteinen bestehen. Damit
können neue Filter ergänzt werden, ohne jede Kombination als eigenes Statement
zu implementieren.

### Umfangreichere ORMs

Prisma, TypeORM und MikroORM sollen nur gewählt werden, wenn sie einen
konkreten Vorteil bieten, den die kleineren Varianten nicht abdecken. Für den
aktuellen eingebetteten und wiederaufbaubaren Index gelten zusätzliche
Generatoren, Engines oder umfangreiche Runtime-Abstraktionen zunächst als
Nachteil.

## Vorgeschlagener Zielzustand

Vorbehaltlich der technischen Prüfung wird folgende Aufteilung angestrebt:

```text
TypeScript-Schema
      |
      +--> Documents-Tabelle und reguläre Indizes
      |
      +--> typisierte Inserts und Upserts
      |
      +--> generierte versionierte Migrationen

Query Builder
      |
      +--> kombinierbare strukturierte Filter
      +--> JSON-Metadatenfilter
      +--> Sortierung und stabile Pagination

explizite SQL-Migration
      |
      +--> FTS5 Virtual Table

explizite SQLite-Abfrage
      |
      +--> MATCH, bm25() und snippet()
```

FTS5 bleibt bewusst SQLite-spezifisch. Der Mapper muss dafür Raw SQL erlauben;
eine künstliche portable Abstraktion ist nicht erforderlich.

## Anforderungen an Migrationen

Migrationen müssen mindestens folgende Semantik besitzen:

1. Eine neue Datenbank wird vollständig bis zur aktuellen Version aufgebaut.
2. Bereits ausgeführte Migrationen werden dauerhaft protokolliert und nicht
   erneut ausgeführt.
3. Mehrere ausstehende Migrationen werden in definierter Reihenfolge
   angewendet.
4. Eine fehlgeschlagene Migration hinterlässt keinen fälschlich als erfolgreich
   markierten Stand.
5. Der CLI-Befehl führt erforderliche Migrationen vor dem Indexieren aus.
6. Nicht unterstützte oder nachträglich veränderte Migrationsstände erzeugen
   eine verständliche Fehlermeldung.
7. FTS5-Strukturen können über explizite SQL-Migrationen erstellt, geändert
   oder neu aufgebaut werden.

Da der Index vollständig wiederaufbaubar ist, muss nicht jede Migration Daten
verlustfrei transformieren. Eine Migration darf einen kontrollierten
Index-Neuaufbau verlangen. Dieses Verhalten muss jedoch explizit markiert und
vom Aufrufer nachvollziehbar behandelt werden.

## Vorgesehene Arbeitsschritte

1. Aktuelle Unterstützung von `node:sqlite` bei Drizzle und Kysely anhand der
   repräsentativen Query-Szenarien prüfen.
2. Kandidaten nach Query-Ausdrucksstärke, Typsicherheit, verbleibendem Raw SQL,
   Treiberaufwand und Migrationen vergleichen.
3. Entscheidung und Begründung mit den Ergebnissen des Spikes im Task
   dokumentieren.
4. Das bestehende `documents`-Schema typisiert abbilden.
5. Die initiale Schemaerzeugung in eine erste versionierte Migration
   überführen.
6. Die FTS5-Tabelle über eine explizite SQL-Migration anlegen.
7. Dokument-Upsert, Lookup, Query und Delete auf die gewählte API umstellen.
8. Dynamische Filter, Sortierung und Pagination als testbare Query-Bausteine
   implementieren.
9. Vollständiges `replaceAll` weiterhin in einer Transaktion ausführen.
10. FTS-Suche mit `MATCH`, `bm25()` und `snippet()` als begrenztes Raw SQL
    erhalten.
11. Tests für strukturierte, kombinierte und FTS-basierte Queries ergänzen.
12. Tests für leere Datenbanken, bestehende Datenbanken, ausstehende
    Migrationen und fehlgeschlagene Migrationen ergänzen.
13. Die bisherige ad-hoc `schema_version`-Logik entfernen, sobald der neue
    Migrationsmechanismus dieselbe Schutzfunktion übernimmt.

## Akzeptanzkriterien

- `@dokkurator/knowledge` exportiert weiterhin nur die öffentliche
  Indexierungsoperation `indexDocuments`.
- Der CLI-Befehl `dokkurator-knowledge index` funktioniert unverändert.
- Der SQLite-Adapter enthält für reguläre CRUD-Operationen keine manuell
  zusammengesetzten SQL-Statements mehr.
- Optionale Filter können frei kombiniert werden, ohne für jede Kombination
  ein eigenes SQL-Statement zu pflegen.
- Strukturierte Filter und FTS5-Suche können in einer Abfrage kombiniert
  werden.
- Sortierung und Pagination sind deterministisch und durch Tests abgedeckt.
- Das öffentliche Query-Modell enthält keine Typen des gewählten Query
  Builders.
- Verbleibendes Raw SQL ist auf Migrationen und SQLite-spezifische
  FTS5-Abfragen begrenzt und zentral abgelegt.
- Eine neue Datenbank wird automatisch auf den aktuellen Stand migriert.
- Mindestens eine Testmigration belegt den Upgrade-Pfad einer bereits
  existierenden Datenbank.
- Ein vollständiger Index-Neuaufbau bleibt atomar.
- Dokumente können nach einem Prozessneustart verlustfrei gelesen werden.
- Volltextsuche, Ranking und Snippets funktionieren weiterhin.
- Typecheck, Lint und alle Tests des Workspaces sind erfolgreich.

## Offene Fragen

1. Soll die Anwendung Migrationen beim Öffnen immer automatisch ausführen oder
   dafür einen expliziten CLI-Befehl anbieten?
2. Werden Migrationen als TypeScript oder als reine SQL-Dateien ausgeliefert?
3. Soll ein inkompatibler Index automatisch neu aufgebaut werden dürfen oder
   nur nach ausdrücklicher Zustimmung des Aufrufers?
4. Ist die experimentelle Kennzeichnung von `node:sqlite` unter Node.js 22 für
   den vorgesehenen Einsatz akzeptabel, oder soll vor der ORM-Umstellung auch
   ein Wechsel des SQLite-Treibers bewertet werden?
5. Benötigen Migrationen echte Down-Migrationen, obwohl der Index aus den
   Quellen neu erstellt werden kann?
6. Welche Metadatenoperatoren gehören in die erste öffentliche Query-API:
   Gleichheit, Mengenvergleich, Bereiche, Existenzprüfung oder Textvergleich?
7. Soll Pagination zunächst offset-basiert oder direkt cursor-basiert
   umgesetzt werden?
8. Muss die erste Version bereits Trefferzahlen und Facetten liefern?
