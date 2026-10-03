---
doctype: task
title: Diff-basiertes Laden und Parsen von DocTypes und Dokumenten
status: open
component: doctype
tags: [doctype, documents, source-adapters, git, incremental]
---

# Diff-basiertes Laden und Parsen von DocTypes und Dokumenten

## Ausgangslage

Das Paket `@dokkurator/loader` lädt aktuell entweder einen einzelnen Eintrag
über dessen `SourceId` oder alle auffindbaren DocTypes beziehungsweise
Markdown-Dokumente. Der gemeinsame `SourceAdapter` stellt dafür nur `list()`
und `read()` bereit.

Für eine inkrementelle Verarbeitung soll nicht mehr bei jeder Aktualisierung
der gesamte Quellenbestand geladen und geparst werden. Stattdessen soll ein
Vergleich zwischen zwei Quellzuständen zunächst die betroffenen Dateien
ermitteln. Anschließend werden nur die betroffenen DocTypes und Dokumente aus
dem Zielzustand vollständig geladen und mit den bestehenden Parsern geparst.

Ein Diff-Hunk ist dabei nicht selbst der fachliche Parser-Input. Ein einzelner
Hunk kann notwendigen Kontext wie YAML-Frontmatter, Überschriften oder
Referenzdefinitionen auslassen. Der Diff dient deshalb zur Auswahl der
betroffenen Quellen; geparst wird jeweils der vollständige Inhalt im
Zielzustand.

## Ziel

Eine öffentliche API soll Änderungen zwischen einem Basis- und einem
Zielzustand laden und daraus zwei getrennte Ergebnisse erzeugen:

- vollständig geladene und geparste Einträge, die neu angelegt oder
  aktualisiert werden müssen;
- stabile IDs der Einträge, die aus nachgelagerten Systemen entfernt werden
  müssen.

Dies soll sowohl für Dokumente als auch für DocTypes funktionieren. Die
bestehenden vollständigen Ladewege `loadDocuments()` und `loadDocTypes()`
bleiben unverändert nutzbar.

## Nicht-Ziele

- Markdown oder YAML unmittelbar aus isolierten Diff-Hunks parsen;
- Inhalte im Knowledge-Index speichern oder daraus löschen;
- Validierungsregeln ausführen;
- GitLab-, GitHub- oder andere Remote-Adapter in dieser Aufgabe
  implementieren;
- eine allgemeine Patch-Anwendung auf beliebige Basisinhalte bereitstellen.

## Benötigte Informationen

Ein Änderungsvergleich benötigt mindestens:

- die Basisrevision (`from`);
- den Zielzustand (`to`), entweder eine Revision oder ein ausdrücklich
  bezeichneter lokaler Zustand;
- den Änderungsstatus jeder Quelle;
- den Pfad im Zielzustand;
- bei Umbenennungen zusätzlich den Pfad im Basiszustand;
- stabile Source-IDs und Repository-Metadaten;
- eine eindeutige Semantik für Commit, Index und Working Tree.

Für lokale Git-Quellen müssen mindestens diese Vergleiche unterscheidbar sein:

- Commit gegen Commit;
- Commit gegen Index;
- Commit gegen Working Tree;
- Index gegen Working Tree.

Untracked Dateien müssen bei einem Vergleich mit dem Working Tree als
hinzugefügt erscheinen. Konflikte dürfen nicht stillschweigend als reguläre
Änderungen verarbeitet werden.

## Vorgeschlagenes Quellenmodell

Die endgültige Benennung ist Teil der Implementierung. Inhaltlich wird ein
Modell in dieser Form benötigt:

```ts
type SourceRevision = string;

type SourceState =
  | { readonly kind: "revision"; readonly revision: SourceRevision }
  | { readonly kind: "index" }
  | { readonly kind: "working-tree" };

interface SourceChangeRequest {
  readonly from: SourceState;
  readonly to: SourceState;
}

interface SourceChange {
  readonly status: "added" | "modified" | "deleted" | "renamed";
  readonly id: SourceId;
  readonly previousId?: SourceId;
}

interface SourceChanges {
  readonly from: SourceState;
  readonly to: SourceState;
  readonly changes: readonly SourceChange[];
}
```

`id` bezeichnet den Pfad im Zielzustand. Bei `deleted` kann sie den zuletzt
gültigen Pfad bezeichnen. Bei `renamed` muss `previousId` gesetzt sein.

Der `SourceAdapter` benötigt darauf aufbauend eine optionale Fähigkeit zur
Änderungsermittlung. Außerdem muss festgelegt werden, wie vollständige Inhalte
aus dem gewählten Zielzustand gelesen werden:

```ts
interface ChangeAwareSourceAdapter extends SourceAdapter {
  changes(request: SourceChangeRequest): Promise<SourceChanges>;
  readAt(id: SourceId, state: SourceState): Promise<SourceDocument>;
}
```

Alternativ kann `read()` um einen optionalen Zustand ergänzt werden. Die
Entscheidung muss berücksichtigen, dass bestehende Adapter weiterhin nur den
aktuellen Zustand unterstützen dürfen.

## Verarbeitung von Dokumenten

Für Dokumente gilt eine Datei als Verarbeitungseinheit.

1. Änderungen über den Source-Adapter ermitteln.
2. Dieselben Pfad-, Endungs- und Ausschlussregeln anwenden wie bei
   `loadDocuments()`.
3. Hinzugefügte und geänderte Markdown-Dateien vollständig aus dem
   Zielzustand lesen.
4. Die vollständigen Inhalte mit dem bestehenden `parseDocument()` parsen.
5. Gelöschte Dokumente als entfernte Source-IDs zurückgeben.
6. Eine Umbenennung als Entfernen der alten ID und Upsert der neuen ID
   behandeln.
7. Änderungen außerhalb des konfigurierten Dokumentbereichs ignorieren.

Vorgeschlagenes Ergebnis:

```ts
interface ChangedDocuments {
  readonly upserted: readonly ParsedDocument[];
  readonly removed: readonly SourceId[];
}
```

Die öffentliche Operation könnte beispielsweise heißen:

```ts
loadChangedDocuments(source, request, config): Promise<ChangedDocuments>
```

Die Filterfunktion für Dokumentpfade muss zwischen vollständigem und
inkrementellem Laden geteilt werden, damit beide Wege exakt dieselben Dateien
berücksichtigen.

## Verarbeitung von DocTypes

Ein DocType besteht aus mehreren zusammengehörigen Dateien. Die
Verarbeitungseinheit ist daher das DocType-Verzeichnis und nicht die einzelne
geänderte Datei.

1. Änderungen unterhalb des konfigurierten DocType-Verzeichnisses ermitteln.
2. Für Änderungen an `definition.yml`, `rules.yml` oder `template.md` das
   jeweilige DocType-Verzeichnis bestimmen.
3. Jedes betroffene Verzeichnis nur einmal verarbeiten.
4. Den vollständigen DocType aus dem Zielzustand lesen, einschließlich der
   unveränderten Geschwisterdateien.
5. Mit dem bestehenden `parseDocType()` parsen.
6. Wird `definition.yml` gelöscht, den DocType als entfernt zurückgeben.
7. Wird eine optionale Datei gelöscht, den DocType neu laden; sie fehlt dann
   im neuen normalisierten Ergebnis.
8. Eine Umbenennung eines DocType-Verzeichnisses als Entfernen des alten und
   Laden des neuen DocTypes behandeln.

Vorgeschlagenes Ergebnis:

```ts
interface ChangedDocTypes {
  readonly upserted: readonly ParsedDocType[];
  readonly removed: readonly SourceId[];
}
```

Die IDs in `removed` sollen zunächst DocType-Verzeichnis-IDs sein. Der
fachliche `name` aus `definition.yml` ist bei einer gelöschten Definition im
Zielzustand nicht mehr verfügbar und kann außerdem unabhängig vom Pfad
geändert worden sein.

Die öffentliche Operation könnte beispielsweise heißen:

```ts
loadChangedDocTypes(source, request, config): Promise<ChangedDocTypes>
```

## Gesamtablauf

```text
Basiszustand + Zielzustand
            |
            v
SourceAdapter.changes()
            |
            v
Änderungen nach docs und DocTypes klassifizieren
            |
            +--> entfernte und alte umbenannte IDs sammeln
            |
            +--> betroffene Dokumentdateien bestimmen
            |        |
            |        v
            |    vollständigen Zielinhalt laden und parsen
            |
            +--> betroffene DocType-Verzeichnisse bestimmen
                     |
                     v
                 vollständiges Bundle laden und parsen
            |
            v
Upserts + Löschungen + verarbeitete Zielrevision zurückgeben
```

Der aufrufende Catalog- oder Knowledge-Prozess führt danach die Upserts und
Löschungen aus. Erst nach erfolgreicher Verarbeitung darf er den Zielzustand
als neue Synchronisationsbasis speichern.

## Fehlerverhalten

- Ein ungültiges geändertes Dokument erzeugt denselben Parsefehler wie beim
  vollständigen Laden.
- Ein ungültiger geänderter DocType erzeugt denselben Parsefehler wie beim
  vollständigen Laden.
- Ein fehlender optionaler DocType-Bestandteil ist kein Fehler.
- Eine fehlende `definition.yml` im Zielzustand bedeutet nur dann eine
  Entfernung, wenn der Diff deren Löschung ausweist.
- Kann eine als vorhanden gemeldete Zielquelle nicht gelesen werden, muss die
  Operation fehlschlagen; sie darf nicht als Löschung interpretiert werden.
- Konfliktbehaftete Dateien müssen mit einem klaren Fehler oder einem
  ausdrücklich modellierten Ergebnis zurückgegeben werden.
- Es muss definiert werden, ob ein Fehler die gesamte Änderungsliste stoppt
  oder ob Teilergebnisse zusammen mit Fehlern erlaubt sind. Für die erste
  Implementierung wird ein atomarer Fehler empfohlen.

## Sonderfälle

- Eine Datei wird aus dem Dokumentbereich heraus oder hinein verschoben.
- Eine Markdown-Datei wird in eine andere Endung umbenannt oder umgekehrt.
- Eine DocType-Datei wird zwischen zwei DocType-Verzeichnissen verschoben.
- `definition.yml` wird gleichzeitig mit `rules.yml` geändert.
- Ein optionaler Bestandteil wird gelöscht oder neu hinzugefügt.
- Nur der fachliche DocType-Name in `definition.yml` ändert sich.
- Basis- und Zielrevision sind identisch.
- Der Source-Root ist nur ein Unterverzeichnis des Git-Repositories.
- Ein Diff enthält Dateien außerhalb des Source-Roots.
- Ein Pfad enthält Leerzeichen oder Nicht-ASCII-Zeichen.
- Der Zielzustand ist ein detached HEAD.
- Der Working Tree enthält ignorierte oder untracked Dateien.

## Umsetzungsschritte

1. Öffentliche Modelle für Quellzustände und Änderungen definieren.
2. Die optionale Change-Fähigkeit vom minimalen `SourceAdapter` abgrenzen.
3. `GitSource` um maschinenlesbare Diff-Ermittlung einschließlich Rename-
   Erkennung erweitern.
4. Das Lesen vollständiger Inhalte aus dem Zielzustand ermöglichen.
5. Gemeinsame Dokument-Pfadfilter aus `readDocuments()` extrahieren.
6. `loadChangedDocuments()` implementieren.
7. Die Zuordnung eines geänderten DocType-Pfads zu seinem Verzeichnis
   implementieren.
8. `loadChangedDocTypes()` implementieren.
9. Öffentliche Exporte und Paketdokumentation ergänzen.
10. Unit- und Integrationstests für die beschriebenen Fälle ergänzen.

## Akzeptanzkriterien

- Bei einer Änderung an genau einem Dokument wird nur dessen vollständiger
  Zielinhalt gelesen und geparst.
- Hinzugefügte Dokumente erscheinen in `upserted`.
- Gelöschte Dokumente erscheinen ausschließlich in `removed`.
- Umbenannte Dokumente erzeugen eine Entfernung der alten ID und einen Upsert
  unter der neuen ID.
- Dokumentfilter und Ausschlüsse verhalten sich beim vollständigen und beim
  diff-basierten Laden identisch.
- Eine Änderung an einer beliebigen Datei eines DocTypes lädt genau einmal das
  vollständige DocType-Bundle im Zielzustand.
- Das Löschen von `rules.yml` ergibt einen aktualisierten DocType mit leerer
  Regelliste.
- Das Löschen von `definition.yml` ergibt einen entfernten DocType und keinen
  Parseversuch im Zielzustand.
- Mehrere Änderungen innerhalb desselben DocType-Verzeichnisses erzeugen nur
  einen Upsert.
- Ein leerer Diff liefert leere `upserted`- und `removed`-Listen.
- Die bestehenden APIs und Tests für vollständiges Laden bleiben kompatibel.
- Diff-Hunks werden nicht direkt als Markdown- oder YAML-Dokumente geparst.
- Die verarbeitete Zielrevision ist im Ergebnis eindeutig nachvollziehbar.

## Testumfang

Mindestens folgende Tests sind vorzusehen:

- Unit-Tests für Änderungsmodelle und Pfadklassifikation;
- Dokumente: add, modify, delete und rename;
- DocTypes: Änderungen an Definition, Regeln und Template;
- DocTypes: Löschen von Definition und optionalen Bestandteilen;
- Deduplizierung mehrerer Änderungen desselben DocTypes;
- Ein- und Austritt eines Pfads aus dem konfigurierten Bereich;
- Commit-zu-Commit-Vergleich in einem temporären Git-Repository;
- Commit-zu-Working-Tree einschließlich untracked Datei;
- unveränderte Revisionen;
- Konflikte und nicht lesbare Zielquellen;
- Regressionstests für `loadDocuments()` und `loadDocTypes()`.

## Offene Entscheidungen

- Wird `readAt()` ergänzt oder erhält `read()` einen optionalen Zustand?
- Gehört `changes()` direkt zum `SourceAdapter` oder in ein separates
  Capability-Interface?
- Welche Rename-Erkennung und welcher Ähnlichkeitsschwellwert werden für Git
  verwendet?
- Sind Teilergebnisse bei Parsefehlern zulässig oder ist die Verarbeitung
  atomar?
- Soll die erste Implementierung nur Commit-zu-Commit unterstützen oder auch
  sofort Index und Working Tree?
- Muss das Ergebnis zusätzlich unverarbeitete beziehungsweise konfliktbehaftete
  Änderungen ausweisen?
