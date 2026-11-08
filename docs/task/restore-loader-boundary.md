---
doctype: task
title: Loader- und Knowledge-Grenze bei inkrementeller Indexierung wiederherstellen
status: proposed
component: knowledge
tags: [knowledge, loader, architecture, incremental-indexing]
---

# Loader- und Knowledge-Grenze bei inkrementeller Indexierung wiederherstellen

## Ausgangslage

Die Repository-Regeln legen fest:

- Loader besitzt Source-Adapter und die Source-Verträge.
- Knowledge besitzt Index-, Query- und Storage-Verträge.
- Knowledge darf Loader für geparste Dokumentmodelle und den minimalen
  `DocumentSource`-Ladevertrag verwenden, nicht aber für konkrete Adapter oder
  Provider-spezifische Source-Funktionen.

Die aktuelle Knowledge-Implementierung überschreitet diese Grenze an mehreren
Stellen:

- `packages/knowledge/src/index/incremental-index.ts` akzeptiert
  `SourceAdapter`, ruft `getSourceId()` und `diff()` auf und entscheidet damit
  selbst, wann und wie ein Source-Diff ausgeführt wird.
- Derselbe Ablauf liest geänderte Dokumente vom Adapter und interpretiert die
  Loader-Revision, um Commit-Inhalte zu laden.
- `packages/knowledge/src/index-adapter/index.ts` und
  `packages/knowledge/src/index-adapter/sqlite/sqlite-index.ts` verwenden
  Loader-`SourceState` als Knowledge-Checkpoint-Vertrag.
- Knowledge-Tests importieren in einzelnen Fällen `FileSystemSource` und
  `openConfiguredSource` und testen damit den Loader-Lifecycle aus dem
  Knowledge-Package heraus.

Damit kennt Knowledge nicht nur die geparsten Inhalte, die es indexiert,
sondern auch Source-Lifecycle und Loader-Checkpoint-Semantik.

## Ziel

Knowledge soll Indexierung und atomare Storage-Änderungen ausführen, ohne
Source-Adapter zu öffnen oder Source-Diffs zu berechnen. Core koordiniert Loader
und Knowledge: Core liest den bisherigen Checkpoint, ruft den Loader-Adapter
auf, lädt die vollständigen Inhalte der geänderten Dateien und übergibt die
fertig vorbereiteten Daten an Knowledge.

Der Dokument-Diff dient nur zur Auswahl der betroffenen Dokumente. Die
vollständigen Dokumentinhalte im Zielzustand werden weiterhin über Loader
geladen und geparst; Knowledge soll keine Diff-Hunks oder Git-Details
interpretieren.

## Vorgeschlagene Zuständigkeiten

### Loader

- Besitzt `SourceAdapter`, `DocumentSource`, `SourceState`, `SourceDiff` und
  die zugehörigen Source-Revisionen.
- Ermittelt Diffs und liest Dateien in der angeforderten Revision.
- Bleibt zuständig für Parsing durch seine öffentlichen Loading-Funktionen.

### Core

- Koordiniert Source- und Indexoperationen.
- Ermittelt `sourceId`, liest den zuvor im Index gespeicherten
  Checkpoint-Blob und dekodiert ihn als Loader-`SourceState`.
- Ruft `SourceAdapter.diff()` auf und filtert die Änderungen anhand der
  konfigurierten Dokumentregeln.
- Lädt und parst geänderte, nicht gelöschte Dateien im Zielzustand.
- Berechnet die zu entfernenden Knowledge-Dokument-IDs.
- Übermittelt vorbereitete Änderungen und den neuen Checkpoint an Knowledge.
- Verantwortet Fehler bei inkompatiblen oder nicht lesbaren Checkpoints.

### Knowledge

- Nimmt geparste Loader-Dokumente, Lösch-IDs und einen undurchsichtigen
  Checkpoint-Wert entgegen.
- Wandelt geparste Dokumente in Knowledge-Dokumente um.
- Schreibt Löschungen, Upserts und Checkpoint atomar in den Index.
- Kennt weder `SourceAdapter` noch `SourceDiff`/`SourceState` oder
  Git-Revisionstypen.

## API-Skizze

Die genauen Namen sind offen. Die Richtung der Abhängigkeiten sollte etwa so
aussehen:

```ts
// Core:
const checkpoint = await index.getSourceCheckpoint(sourceId);
const previous = decodeLoaderSourceState(checkpoint);
const diff = await source.diff(previous, diffOptions);
const changes = filterDocumentChanges(diff, documentConfig);
const parsedDocuments = await loadChangedDocuments(source, changes, diff.state);

await index.applyDocumentUpdate({
  sourceId,
  checkpoint: encodeLoaderSourceState(diff.state),
  upsert: parsedDocuments,
  remove: removedDocumentIds,
  replaceSource: diff.fromRevision === undefined,
});
```

Knowledge definiert seine eigenen Storage-API-Typen. Der Checkpoint wird als
undurchsichtiger serialisierter Wert gespeichert, beispielsweise als JSON
String. Knowledge darf den Wert persistieren und atomar aktualisieren, aber
nicht dessen Loader-spezifische Struktur lesen oder validieren.

Die bisherige SQLite-Spalte speichert bereits einen serialisierten JSON-Wert.
Ob der bestehende Datenbankinhalt ohne Schemaänderung weiterverwendet werden
kann, ist bei der Umsetzung anhand der tatsächlichen Persistenzform zu
bestätigen. Der Core-Decoder muss ungültige oder inkompatible Werte als
Checkpoint-Fehler behandeln und darf sie nicht stillschweigend wie einen
gültigen Anfangszustand verwenden.

`SourceDiff`-Ergebnisformen können zunächst in Core verbleiben. Falls mehrere
Hosts dieselbe Koordination benötigen, sollte dafür später ein bewusst
definierter Core-Use-Case verwendet werden, statt Source-Adapter-Operationen
in Knowledge zu platzieren.

## Testgrenzen

- Knowledge-Unit-Tests verwenden ein minimales `DocumentSource`-Testdouble oder
  bereits geparste Dokumente und vorgegebene Änderungen.
- Tests für Dateisystem-/Git-Diff, Revision-Lesen und das Zusammenspiel mit
  Source-Konfiguration gehören in Loader oder Core.
- Packageübergreifende Tests konsumieren nur die öffentlichen Root-APIs.
- Ein Core-Integrationstest kann den vollständigen Ablauf vom Loader-Diff bis
  zum Knowledge-Update abdecken, ohne Knowledge-Tests an konkrete Adapter zu
  koppeln.

## Alternativen

### Loader-SourceState direkt im Knowledge-Indextyp behalten

Das würde die jetzigen Persistenz-APIs möglichst wenig ändern, beließe aber
einen Loader-Typ im öffentlichen Knowledge-Vertrag. Es stellt die Boundary
nicht vollständig wieder her.

### Den gesamten inkrementellen Ablauf in Loader verlegen

Loader kann Source-Diffs und Dokument-Ladevorgänge ausführen, sollte aber nicht
die Knowledge-Speicherung oder Indextransaktionen orchestrieren. Das würde die
Abhängigkeit in die falsche Richtung verschieben.

### Source-Diff-DTOs in Knowledge neu definieren

Das könnte die Loader-Importe reduzieren, dupliziert aber Source-Semantik und
Revisionstypen in Knowledge. Der Adapter-Diff gehört in Loader; Core ist der
geeignete Ort, um dessen Ergebnis mit dem Index zu koordinieren.

## Nicht-Ziele

- Änderung des Source-Adapter-Vertrags oder der Git-Diff-Semantik.
- Veränderung der Dokument-IDs, Indexschema- oder Transaktionssemantik.
- Entfernen der Loader-Abhängigkeit von Knowledge auf geparste Dokumentmodelle,
  sofern sie für die Umwandlung in Knowledge-Dokumente benötigt werden.
- Ändern der öffentlichen Package-Exports ohne separat abgestimmte API-Änderung.
- Verschieben von SQLite- oder anderem Index-Backend-Code aus Knowledge.

## Akzeptanzkriterien

- Knowledge-Produktionscode importiert keinen `SourceAdapter`,
  `SourceDiff` oder `SourceState` aus Loader.
- Knowledge-Produktionscode öffnet keine Quellen und ruft weder `diff()` noch
  `getSourceId()` eines Adapters auf.
- Knowledge verwendet Loader nur für ausdrücklich erlaubte geparste
  Dokumentmodelle und gegebenenfalls das minimale `DocumentSource`-Laden.
- Der Checkpoint wird gemeinsam mit den Dokumentänderungen atomar gespeichert,
  ohne dass Knowledge den Loader-spezifischen Inhalt interpretiert.
- Core lädt geänderte Inhalte aus der Zielrevision und übergibt vollständige,
  geparste Dokumente an Knowledge.
- Ungültige Checkpoints, fehlende Quellen und Source-Diff-Fehler bleiben
  sichtbar und werden nicht als erfolgreiche leere Updates behandelt.
- Tests für konkrete Loader-Adapter befinden sich nicht im Knowledge-Package.
- Bestehende inkrementelle Indexierungs- und SQLite-Tests decken Upsert,
  Löschung, Source-Reconciliation und Checkpoint-Atomizität weiterhin ab.
