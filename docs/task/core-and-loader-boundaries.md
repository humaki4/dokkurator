# Dokkurator Core und Loader: Abgrenzung auf Basis des aktuellen Projekts

Status: Architekturentwurf, keine Umsetzungsfreigabe  
Stand: 2026-10-01

## Ziel

Dieses Dokument ordnet die geplante Core-Schicht und das in `@dokkurator/loader`
umbenannte Loader-Paket anhand des aktuellen Repository-Stands ein. Es soll
klären, welche wiederverwendbare Anwendungsorchestrierung heute in `apps/cli`
liegt und welche Verantwortung beim CLI-Host bleiben sollte.

`apps/catalog-server` wird hier nicht betrachtet. Der Validator wird nur als bestehende, noch nicht integrierte Grenze erwähnt. Dieses Dokument ist kein Auftrag, die nachfolgenden Ausbaustufen oder eine vollständige Validierung umzusetzen.

## Begriffe

**Loader** bezeichnet die Funktionalität des Pakets `@dokkurator/loader`:
Source-Adapter bereitstellen sowie Quelldateien laden und Dokumente oder
DocType-Definitionen parsen. Das Paket wurde von `@dokkurator/doctype` in
`@dokkurator/loader` umbenannt; die Umbenennung ändert die Domänenbegriffe und
Exportnamen nicht.

**DocType** ist das fachliche Modell, das beschreibt, welche Art von Dokument vorliegt. Es umfasst konzeptionell das Frontmatter-Schema, optional ein Template und Regeln. Ein Loader kann eine DocType-Definition finden, lesen und parsen; er ist nicht selbst der DocType.

Im derzeitigen Code ist dieses Modell nur teilweise in `ParsedDocType` abgebildet: Schema-/Metadaten, Struktur und Regeln sind enthalten. `readDocType` liest ein optionales Template, aber das geparste öffentliche Modell übernimmt es nicht. Die Verbindung zwischen DocType-Regeln und Validator ist noch nicht hergestellt. Diese Punkte sind Modelllücken beziehungsweise offene Integrationsfragen, keine Aufgaben, die Core durch eine zweite Definition lösen sollte.

## Ist-Zustand

### Pakete

- `@dokkurator/loader` besitzt Source-Adapter und Lade-/Parse-Abläufe. Der
  abgeschlossene Package-Rename und die Entfernung der Demo-CLI sind separat in
  `renameDocType.md` beschrieben.
- `@dokkurator/knowledge` stellt Dokument-/Indexmodelle, Suche, SQLite und bereits vorhandene Indexierungsfunktionen bereit. `indexDocumentChanges` übernimmt den inkrementellen Source-Diff, lädt geänderte Dokumente über Loader und schreibt Aktualisierungen in den Index.
- `@dokkurator/config` lädt und validiert Projektkonfiguration und liefert über `resolveActiveConfig` ein `ResolvedConfig` einschließlich Sources, Dokumentfiltern, DocType-Verzeichnissen und Indexpfad.
- `@dokkurator/validator` bietet derzeit nur eine minimale, als temporär markierte API. Die aktuelle Knowledge-Indexierung ruft Validator nicht auf.

### Aufgaben in `apps/cli`

| CLI-Code                                      | Heutige Funktion                                                                                                                                                  | Vorläufige Zuständigkeit                                                                                                                                                        |
| --------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `actions/knowledge-actions.ts`                | Führt Index-/Diff-/Search-Abläufe für konfigurierte Sources aus; öffnet SQLite und orchestriert Aufrufe an Knowledge                                              | Die Use-Cases `sync`, `diff` und `search` werden Core-Methoden. Formatierung und Commander-Optionen bleiben im CLI                                                              |
| `sync-source.ts`                              | Erzeugt einen konfigurierten Source-Adapter, ruft `indexDocumentChanges` auf und schließt SQLite                                                                  | Core koordiniert Sources und Ressourcen; `indexDocumentChanges` und die eigentliche Diff-/Indexlogik bleiben in Knowledge                                                       |
| `actions/doctype-actions.ts`                  | Lädt und parst DocTypes oder Dokumente je Source                                                                                                                  | `listDocTypes` und `listDocuments` werden Core-Methoden, die an Loader delegieren. Core führt dabei keine Validierung aus                                                       |
| `project.ts`                                  | Ruft `resolveActiveConfig` auf, fragt interaktiv nach Checkout-Erlaubnis und erzeugt konfigurierte Sources; diese Source-Erzeugung kann klonen oder aktualisieren | Checkout-Prompt und Source-Materialisierung entfallen aus diesem CLI-Pfad. Core lädt die Config über Config und löst Checkout/Sync nur in den expliziten Lifecycle-Methoden aus |
| `commands/*.ts`, `command.ts`                 | Commander-Registrierung, Flags, Prompts, Ausgabe und Cancel-Verhalten                                                                                             | Bleibt im CLI-Host                                                                                                                                                              |
| `actions/source-actions.ts`                   | Liest/ändert Source-Konfiguration, fragt nach IDs und Bestätigung; optionales Löschen von Indexdaten                                                              | Bleibt CLI-/Projektverwaltung. Konfigurationsmutation und interaktive/destruktive Entscheidungen sind keine Core-Orchestrierung                                                 |
| `actions/watch-action.ts`, `watch-runtime.ts` | Startet Dateiwatcher und synchronisiert bei Änderungen                                                                                                            | Watcher, Timer und Prozessdauer bleiben Host-Verhalten; die Callback-Synchronisation ruft `app.sync()` auf                                                                      |

Die Tabelle beschreibt Kandidaten und Grenzen, keine bereits beschlossene API.

### CLI-zu-Core-Zuordnung

| Bestehender CLI-Use-Case                          | Core-API                              | Bleibt im CLI                                         |
| ------------------------------------------------- | ------------------------------------- | ----------------------------------------------------- |
| `doctype list [source-id]`                        | `app.listDocTypes({ sourceId })`      | JSON/Text-Ausgabe und Argumentdarstellung             |
| `doctype documents [source-id]`                   | `app.listDocuments({ sourceId })`     | JSON/Text-Ausgabe und Argumentdarstellung             |
| `knowledge diff [source-id]`                      | `app.diff({ sourceId })`              | Darstellung der Änderungen und Exit-Code-Entscheidung |
| `knowledge index [source-id]`                     | `app.sync({ sourceId })`              | Manuelles Auslösen und Sync-Bericht formatieren       |
| Vorbereitung fehlender Repositories/Indexzustände | `app.prepare()`                       | Expliziter CLI-Command; keine Zustimmungsprompts      |
| `knowledge search <query>`                        | `app.search(query)`                   | Query-Argument parsen, Resultate formatieren          |
| `watch [source-id]`                               | `app.sync({ sourceId })` als Callback | Dateiwatcher, Debounce und Laufzeitsteuerung          |
| `source add/remove`                               | Keine Core-Methode im ersten Umfang   | Konfigurationsdatei ändern, Prompts und Bestätigung   |

Damit verwenden die fachlichen CLI-Kommandos dieselbe Application-API, ohne dass Core Commander, Ausgabe oder Watch-Laufzeit übernimmt. Die Loader- und Knowledge-Packages bleiben zusätzlich direkt verwendbar; Core ist die einheitliche API für diese Anwendungsfälle, aber kein vollständiger 1:1-Reexport aller Library-Funktionen.

## Zielbild für den ersten Core-Zuschnitt

Core bietet wiederverwendbare Abläufe über die bestehenden Libraries an. Er koordiniert die in der Projektkonfiguration konfigurierten Repositories mit dem bestehenden Knowledge-Index, ohne Loader-, Config-, Diff-, Index- oder Suchlogik zu duplizieren.

Die Konfigurationsquelle ist zunächst ausschließlich die vorhandene Datei `.dokkurator/config.yaml` im ermittelten Projekt. `createDokkurator()` erhält keine Optionen; CLI-Flags, Umgebungsvariablen oder frei zusammengestellte Konfigurationsobjekte überschreiben die Datei nicht. Format, Parser, Defaults und Validierung bleiben bei `@dokkurator/config`. Core nutzt dessen bestehende Auflösung statt ein zweites Schema einzuführen.

`resolveActiveConfig()` führt selbst keinen Checkout aus: Es liest und validiert die Konfiguration, wählt Sources aus und löst ihre Pfade auf. Der aktuelle Checkout-/Update-Seiteneffekt entsteht anschließend im CLI, weil `prepareConfig()` für jede Source `createConfiguredSource()` aufruft; diese Loader-Funktion kann fehlende Repositories klonen und vorhandene aktualisieren. Diese Verantwortungen dürfen nicht in `resolveActiveConfig()` zusammengezogen werden. Die Funktion bleibt für Konfigurationsauflösung zuständig; Core ruft sie beim Öffnen der App auf und entscheidet erst in `prepare()` beziehungsweise `sync()`, ob ein Checkout angelegt oder aktualisiert werden soll.

Damit Core diese Grenze durchsetzen kann, muss die Source-API im Loader explizite Operationen für Preparation und Update bieten oder die bestehende Factory entsprechend entkoppelt werden. Das Erzeugen eines Adapters für ein bestehendes Repository darf nicht nebenbei klonen oder fetchen. Klonen fehlender Remote-Repositories gehört ausschließlich zu `prepare()`; Aktualisieren vorhandener Remote-Repositories ausschließlich zu `sync()`. Andere Core-Operationen öffnen vorhandene Sources und melden bei fehlendem Checkout einen Preparation-Fehler.

Der Ablauf hat vier getrennte Phasen:

1. `createDokkurator()` erzeugt ein App-Objekt ohne Datei-, Netzwerk- oder Datenbankzugriffe.
2. `app.open()` liest und löst die bestehende Projektkonfiguration auf und öffnet den Knowledge-Index. Es klont keine Repositories und führt keinen Sync oder Indexaufbau aus.
3. `app.prepare()` ist der explizite, nicht-interaktive Vorbereitungsschritt. Für konfigurierte Remote-Repositories klont er nur fehlende Checkouts; bestehende Checkouts aktualisiert er dabei nicht. Anschließend indexiert er Quellen, für die noch kein initialer Knowledge-Indexzustand vorhanden ist. Bereits initialisierte Quellen werden nicht unnötig vollständig neu indexiert. Fehlende lokale Quellen werden nicht geklont und führen zu einem Vorbereitungsfehler.
4. `app.sync()` aktualisiert vorhandene Remote-Checkouts und ruft den vorhandenen Knowledge-Diff-/Indexablauf für konfigurierte Quellen auf. Fehlt ein benötigter Checkout, klont `sync()` nicht stillschweigend, sondern meldet, dass das Projekt vorbereitet werden muss.

`prepare()` und `sync()` liefern strukturierte Ergebnisse. Core fragt nicht nach Zustimmung und gibt nichts auf stdout/stderr aus. Die vorhandene `indexDocumentChanges`-Funktion bleibt für den eigentlichen Source-Abgleich verantwortlich. Core koordiniert Quellen und Phasen, implementiert keinen konkurrierenden Sync.

Core öffnet und schließt die von ihm erzeugte Indexressource. `open()` und `close()` sind wiederholbar; `prepare()` und `sync()` sind explizite, potenziell schreibende Operationen. Ein fehlender oder ungültiger Projektzustand führt zu einer verständlichen Fehlermeldung. Die CLI kann diese in Text und Exit-Codes übersetzen.

Ein langlebiger Host lädt die Konfiguration einmal beim Öffnen der App. Änderungen an `.dokkurator/config.yaml` erfordern zunächst einen Neustart beziehungsweise ein erneutes Öffnen; Hot-Reload ist nicht Teil dieses Zuschnitts.

## Vorläufige API-Richtung

Die API erhält keine Konfigurationsparameter und verwendet die vorhandene Projektdatei. Ein möglicher Aufruf sieht so aus:

```ts
const app = createDokkurator();

await app.open();
try {
  const preparation = await app.prepare();
  const report = await app.sync();
  const hits = await app.search(query);
} finally {
  await app.close();
}
```

Das Beispiel ist ein Diskussionsanker, kein festgelegter TypeScript-Vertrag. `createDokkurator()` bleibt ohne I/O; `open()` liest `.dokkurator/config.yaml` über `@dokkurator/config` und öffnet den Index. `prepare()` klont fehlende Remote-Checkouts und initialisiert noch nicht indexierte Quellen. `sync()` aktualisiert vorhandene Checkouts und verarbeitet Änderungen. Die CLI kann `prepare` und `sync` als explizite Commands anbieten. Ein Server kann beim Start `open()` und `prepare()` aufrufen und danach `sync()` über einen eigenen Timer wiederholen.

Noch festzulegen sind die Ergebnisse von `prepare()`/`sync()` und wie fehlende oder nicht erreichbare Repositories strukturiert gemeldet werden. Eine nicht-mutierende `diff()`-API gehört nur dann in Core, wenn sie auch außerhalb des CLI benötigt wird; Knowledge bleibt Eigentümer der zugrunde liegenden Diff-Funktion.

DocType- und Dokument-Inspektion gehören zur Core-API: `listDocTypes()` und `listDocuments()` machen die bestehenden Loader-Funktionen als Anwendungs-Use-Cases verfügbar. Core delegiert Lesen und Parsen an Loader; die Ergebnisse können also auch ohne Validator ausgegeben werden. Regeln dürfen Teil der geladenen DocType-Daten sein, werden im ersten Core-Zuschnitt aber nicht ausgeführt. Der Validator ist noch keine belastbare Grundlage für eine Sync-Integration; Core soll weder Regeln neu interpretieren noch eine Validierungsengine nachbauen.

Core stellt die für die Anwendung unterstützten Use-Cases bereit, nicht zwingend einen 1:1-Wrapper für jeden Export aus jeder Library. Die Libraries behalten ihre eigenständige öffentliche API. Adapterimplementierungen und deren fachliches Verhalten bleiben in ihren Paketen: Loader besitzt Sources, Knowledge besitzt Indexadapter wie SQLite. Core liest die bestehende Config und verdrahtet diese Implementierungen für die App-Lifecycle- und Use-Case-Methoden.

## Akzeptanzkriterien

| ID   | Szenario                                                              | Erwartetes Ergebnis                                                                                                                                                                                                                                   |
| ---- | --------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| AK01 | `createDokkurator()` wird aufgerufen                                  | Keine Datei-, Netzwerk- oder Datenbankoperation; die Factory nimmt keine Config-Overrides oder Komponenten entgegen.                                                                                                                                  |
| AK02 | App wird geöffnet                                                     | Config wird ausschließlich über das bestehende Format und Parsing von `@dokkurator/config` aus `.dokkurator/config.yaml` geladen. `open()` öffnet den Knowledge-Index, klont oder aktualisiert aber keine Repositories und indexiert keine Dokumente. |
| AK03 | `listDocTypes()` oder `listDocuments()` wird aufgerufen               | Core delegiert an Loader und liefert geparste Daten. Es gibt keinen Checkout, Sync, Index-Schreibvorgang oder Validator-Aufruf. Ein fehlendes erforderliches Repository führt zu einem Preparation-Fehler.                                            |
| AK04 | `diff()` wird für konfigurierte Sources ausgeführt                    | Core delegiert an Knowledge und verwendet vorhandene Checkouts. Die Operation klont oder aktualisiert keine Repositories und schreibt keinen neuen Indexzustand.                                                                                      |
| AK05 | `search(query)` wird aufgerufen                                       | Core delegiert die Abfrage an Knowledge und sucht im bestehenden Index. Es werden keine Sources gelesen, ausgecheckt oder synchronisiert.                                                                                                             |
| AK06 | `prepare()` trifft auf ein fehlendes konfiguriertes Remote-Repository | Das Repository wird ohne interaktiven Prompt geklont. Ein bereits vorhandener Checkout wird durch `prepare()` nicht aktualisiert. Fehlende lokale Sources werden nicht geklont und führen zu einem klaren Fehler.                                     |
| AK07 | `prepare()` trifft auf eine Source ohne initialen Indexzustand        | Die Source wird initial indexiert. Bereits initialisierte Sources werden nicht pauschal vollständig ersetzt oder unnötig neu indexiert.                                                                                                               |
| AK08 | `sync()` trifft auf einen fehlenden Checkout                          | Es erfolgt kein impliziter Clone. Der Aufruf meldet, dass zuerst `prepare()` erforderlich ist.                                                                                                                                                        |
| AK09 | `sync()` trifft auf vorhandene Sources                                | Remote-Checkouts werden aktualisiert; Dokumentänderungen werden über den vorhandenen Knowledge-Abgleich verarbeitet. Core implementiert keine zweite Diff- oder Indexierungslogik.                                                                    |
| AK10 | Ein bestehender CLI-Use-Case wird ausgeführt                          | `doctype list/documents`, `knowledge diff/index/search` verwenden die zugeordneten Core-Methoden. Commander, Text-/JSON-Ausgabe, Prompts für andere Source-Verwaltung und Exit-Codes bleiben im CLI.                                                  |
| AK11 | Ein langlebiger Host betreibt die App                                 | Der Host kann beim Start `open()` und `prepare()` und danach `sync()` nach eigenem Timer aufrufen. Core startet keinen eigenen Timer oder Hintergrund-Sync.                                                                                           |
| AK12 | App wird geschlossen                                                  | Von Core erzeugte Ressourcen werden geschlossen; wiederholtes `close()` bleibt unschädlich.                                                                                                                                                           |

## Bewusst außerhalb des ersten Zuschnitts

- Fastify, HTTP-Routen und `apps/catalog-server`.
- CLI-Parser, Konfigurations-Overrides, Ausgabe und Exit-Codes. Interaktive Checkout-Bestätigungen entfallen; Preparation wird explizit ausgelöst.
- Source-Verwaltung (`add`, `remove`) und deren Konfigurationsänderungen.
- Watcher, Scheduler und automatische Hintergrund-Synchronisation.
- Neue Parser-, Diff-, Index- oder Suchlogik.
- Andere Konfigurationsquellen als `.dokkurator/config.yaml`, CLI-Overrides und eine neue Konfigurationssprache.
- Validator-Redesign oder eine zweite Regel-Engine.
- Generische Plugin-, Connector- oder Ressourcen-Frameworks ohne konkreten zweiten Anwendungsfall.

## Vorschlag für die Reihenfolge

1. Die abgeschlossene Package-Umbenennung zu `@dokkurator/loader` und Entfernung
   der Demo-CLI bilden die Grundlage für die weiteren Schritte.
2. Config-Anbindung auf die vorhandene `.dokkurator/config.yaml` begrenzen; Config-Format und Auflösung bleiben in `@dokkurator/config`.
3. Den Core-Lifecycle `open()` / `prepare()` / `sync()` / `search()` / `close()` anhand der vorhandenen Config-, Source- und Knowledge-APIs festlegen. `prepare()` klont fehlende Remote-Checkouts und initialisiert noch nicht indexierte Quellen; `sync()` aktualisiert nur vorhandene Checkouts.
4. Im CLI eine explizite Preparation- und Sync-Aktion anbieten. Normale Loader-, Diff- und Search-Commands lösen weder Checkout noch Indexierung aus; fehlt ein erforderlicher Checkout, melden sie „Projekt nicht vorbereitet“.
5. Ein langlebiger Host kann beim Start `open()` und `prepare()` aufrufen und anschließend `sync()` über einen eigenen Timer auslösen. Der Timer und dessen Intervall gehören zum Host; Core stellt den wiederverwendbaren Sync-Aufruf bereit.
6. Validator-Integration, Watch und weitere Hosts separat bewerten, wenn konkrete Anforderungen und belastbare Verträge dafür vorliegen.

## Repo-Anker

- Loader-/DocType-Modell: `packages/loader/src/index.ts`, `packages/loader/src/docTypes/types.ts`, `packages/loader/src/docTypes/read.ts`
- Knowledge-Sync und Suche: `packages/knowledge/src/index/incremental-index.ts`, `packages/knowledge/src/index-adapter/sqlite/sqlite-index.ts`
- Config-Auflösung: `packages/config/src/resolution.ts`, `packages/config/src/model.ts`
- CLI-Orchestrierung und Host-Grenzen: `apps/cli/src/actions/knowledge-actions.ts`, `apps/cli/src/actions/doctype-actions.ts`, `apps/cli/src/project.ts`, `apps/cli/src/actions/source-actions.ts`, `apps/cli/src/actions/watch-action.ts`
- Der Loader-Package-Rename: `docs/task/renameDocType.md`
