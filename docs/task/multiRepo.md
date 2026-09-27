# Multi-Repository-Support und zentrale CLI

## Ziel

Ein Dokkurator-Projekt verwaltet mehrere lokale Repositories über eine
gemeinsame Datei:

```text
<project-root>/.dokkurator/config.yaml
```

Die zentrale Anwendung lädt diese Konfiguration und orchestriert DocType,
Knowledge und später Validator. Indexzustand und Dateihashes bleiben
ausschließlich in `.dokkurator/index.db`.

## Architekturentscheidung

```text
.dokkurator/config.yaml
          ↓
@dokkurator/cli
  Config und Benutzerinteraktion
  Source-Auswahl und Multi-Repo-Orchestrierung
          ↓
@dokkurator/doctype          @dokkurator/knowledge
  Source-Adapter              Index, Diff und Suche
  Dokumente parsen            eine Source pro API-Aufruf
```

- `apps/cli` besitzt das Dokkurator-Projektmodell und lädt die YAML-Datei.
- `@dokkurator/doctype` besitzt weiterhin alle Source-Adapter. Die zentrale CLI
  erzeugt darüber eine konfigurierte `SourceAdapter`-Instanz.
- `@dokkurator/knowledge` kennt weder YAML noch Projektverzeichnisse und erhält
  pro Operation eine fertige Source.
- Paket-CLIs dürfen als Diagnose- und Entwicklungswerkzeuge bestehen bleiben.
  Die zentrale CLI startet sie nicht als Unterprozesse, sondern verwendet
  dieselben öffentlichen Bibliotheksfunktionen.
- Ein eigenes Config-Package entsteht erst, wenn mindestens eine zweite
  Anwendung dieselbe Projektkonfiguration tatsächlich benötigt.

Diese Aufteilung entspricht den Paketgrenzen: Cross-Package-Zugriffe erfolgen
nur über die Root-API des jeweiligen Workspace-Pakets.

## Konfiguration

Erster Stand:

```yaml
sources:
  - id: knowledge
    path: packages/knowledge

  - id: documentation
    path: ../documentation
```

`id` ist der stabile Schlüssel im Knowledge-Index. `path` wird relativ zum
Projekt-Root aufgelöst, nicht relativ zum aktuellen Arbeitsverzeichnis. Dadurch
bleiben Aufrufe aus Unterverzeichnissen deterministisch.

Remote-Repositories, Branches und Credentials sind nicht Bestandteil des
ersten Schritts. Sie werden erst ergänzt, wenn ein entsprechender Resolver und
Lifecycle (clone/fetch/checkout) implementiert wird.

## CLI-Oberfläche

Die zentrale CLI ist die Benutzeroberfläche:

```bash
dokkurator source add ../documentation --id documentation
dokkurator source list
dokkurator source remove documentation

dokkurator index
dokkurator index documentation
dokkurator diff
dokkurator diff documentation
dokkurator search architecture decision

dokkurator doctype list
dokkurator doctype documents documentation
```

Ohne Source-ID verarbeiten `index`, `diff` und die DocType-Kommandos alle
konfigurierten Sources. Mit ID verarbeiten sie genau eine Source.

### Interaktive Bedienung

Verwaltungskommandos dürfen bei einem interaktiven Terminal fehlende Angaben
erfragen:

- `source add`: Pfad und vorgeschlagene/stabile ID
- `source remove`: Source-Auswahl und Bestätigung
- später Remote-URL, Branch und Checkout-Ziel

Jeder Ablauf muss gleichzeitig vollständig über Argumente und Flags ausführbar
sein. Das ist für CI, Skripte und Tests erforderlich. Destruktive Varianten
verwenden explizite Bestätigung beziehungsweise `--yes`.

`source remove` entfernt im ersten Stand nur den Config-Eintrag und weist darauf
hin, dass Indexdaten erhalten bleiben. Das spätere Löschen aus Knowledge wird
erst angeboten, wenn Knowledge eine atomische öffentliche Operation wie
`deleteSource(sourceId)` besitzt. Dann sind sinnvolle Optionen:

```bash
dokkurator source remove documentation            # Rückfrage zum Index
dokkurator source remove documentation --keep-index
dokkurator source remove documentation --yes
```

## Gemeinsame Funktionen statt Command-Wiederverwendung

Commander-Kommandos werden nicht zwischen Paketen verschachtelt. Geteilt werden
fachliche Funktionen:

```ts
// @dokkurator/doctype
createConfiguredLocalSource({ root, sourceId });
loadDocTypes(source, options);
loadDocuments(source, options);

// @dokkurator/knowledge
indexDocumentChanges({ source, index, documentsDirectory });
calculateDocumentDiff({ source, index, documentsDirectory });
index.search(query);
```

Die zentrale und die paketbezogenen CLIs sind jeweils dünne Adapter um diese
APIs. Auf diese Weise gibt es keine Prozessverkettung und keine duplizierte
Fachlogik.

## Multi-Source-Index

Knowledge verarbeitet weiterhin genau eine Source pro Funktionsaufruf. Die
zentrale CLI öffnet einen gemeinsamen `SQLiteIndex` und iteriert über die
ausgewählten Sources:

```ts
for (const sourceConfig of selectedSources) {
  const source = await createConfiguredLocalSource({
    root: resolveSourcePath(sourceConfig),
    sourceId: sourceConfig.id,
  });
  await indexDocumentChanges({ source, index });
}
```

Der vorhandene Knowledge-Store trennt Zustände und Dokumente bereits anhand von
`sourceId`. Gleiche relative Pfade in verschiedenen Repositories kollidieren
dadurch nicht.

## Umsetzungsstand des ersten Inkrements

Die folgende Liste beschreibt ausdrücklich nicht die Umsetzung der gesamten
Task. Abgeschlossen ist nur der lokale Multi-Repository-Grundstand. Die offenen
Punkte darunter gehören weiterhin zum geplanten Gesamtumfang.

- [x] zentrale CLI in `apps/cli`
- [x] YAML-Konfiguration unter `.dokkurator/config.yaml`
- [x] `source add`, `source list`, `source remove`
- [x] interaktive Eingaben und skriptfähige Argumente
- [x] Multi-Source `index` und `diff`
- [x] zentrale `search`- und DocType-Kommandos
- [x] konfigurierte Source-ID an DocType-Adapter übergeben
- [x] CLI-README und vollständige Benutzerreferenz
- [ ] Config-Suche vom aktuellen Verzeichnis nach oben bis zum Projekt-Root
- [ ] Validator auf das aktuelle Parsed-DocType-Modell umstellen und als
      zentrales `validate`-Kommando ergänzen
- [ ] `knowledge.deleteSource(sourceId)` und Remove-Dialog für Indexdaten
- [ ] Remote-Resolver und Repository-Lifecycle
- [ ] Watcher pro konfigurierter Source

## Nächste Schritte

1. Projekt-Root automatisch anhand von `.dokkurator/config.yaml` finden.
2. Validator vom temporären Kompatibilitätsmodell lösen; erst danach
   `dokkurator validate [source-id]` ergänzen.
3. Öffentliche, atomische Knowledge-Operation zum Löschen einer Source bauen.
4. Danach den interaktiven Remove-Ablauf um `Indexdaten löschen/behalten`
   erweitern.
5. Remote-Sources und Watch-Modus auf demselben Source-Modell aufbauen.
