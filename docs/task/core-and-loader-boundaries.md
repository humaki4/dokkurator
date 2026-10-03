---
doctype: task
title: "Dokkurator Core und Loader: Abgrenzung auf Basis des aktuellen Projekts"
status: accepted
---

# Dokkurator Core und Loader: Abgrenzung auf Basis des aktuellen Projekts

Status: Erster Core-Zuschnitt umgesetzt
Stand: 2026-10-03

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

- `@dokkurator/core` stellt den App-Lifecycle und die wiederverwendbaren
  Use-Cases `prepare`, `sync`, `diff`, `search`, `listDocTypes` und
  `listDocuments` bereit.
- `@dokkurator/loader` besitzt Source-Adapter und Lade-/Parse-Abläufe. Der
  abgeschlossene Package-Rename und die Entfernung der Demo-CLI sind separat in
  `renameDocType.md` beschrieben.
- `@dokkurator/knowledge` stellt Dokument-/Indexmodelle, Suche, SQLite und bereits vorhandene Indexierungsfunktionen bereit. `indexDocumentChanges` übernimmt den inkrementellen Source-Diff, lädt geänderte Dokumente über Loader und schreibt Aktualisierungen in den Index.
- `@dokkurator/config` lädt und validiert Projektkonfiguration und liefert über `resolveActiveConfig` ein `ResolvedConfig` einschließlich Sources, Dokumentfiltern, DocType-Verzeichnissen und Indexpfad.
- `@dokkurator/validator` bietet synchrone ESLint-Validierung. Core orchestriert sie über `validate()`; die Knowledge-Indexierung bleibt davon unabhängig.

### Umgesetzte Aufgaben in `apps/cli`

| CLI-Code                                      | Zuständigkeit                                                                                                                                              |
| --------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `core-runtime.ts`                             | Erzeugt die Core-App pro Einmal-Aufruf, öffnet sie und garantiert `close()` über `finally`; formatiert Readiness- und Recovery-Hinweise                    |
| `commands/prepare.ts`                         | Stellt `dokkurator prepare [source-id]` ohne Checkout-Prompt bereit                                                                                        |
| `commands/knowledge.ts`                       | Delegiert Index/Sync, Diff und Search an Core; formatiert Ergebnisse                                                                                       |
| `commands/doctype.ts`                         | Delegiert DocType- und Dokumentinspektion an Core                                                                                                          |
| `commands/*.ts`, `command.ts`                 | Commander-Registrierung, Host-Argumente und Ausgabe                                                                                                        |
| `prompts.ts`, `actions/source-actions.ts`     | Ausschließlich Source-Verwaltung: fehlende Eingaben, Bestätigung der Konfigurationsänderung und optionales Löschen von Indexdaten                          |
| `actions/watch-action.ts`, `watch-runtime.ts` | Hält eine Core-App über die Watch-Laufzeit offen; Watcher, Debounce und Prozessdauer bleiben Host-Verhalten, Änderungen rufen `app.sync({ sourceId })` auf |

Die frühere CLI-Orchestrierung in `project.ts`, `sync-source.ts`,
`actions/knowledge-actions.ts` und `actions/doctype-actions.ts` wurde entfernt.

### CLI-zu-Core-Zuordnung

| Bestehender CLI-Use-Case                          | Core-API                              | Bleibt im CLI                                         |
| ------------------------------------------------- | ------------------------------------- | ----------------------------------------------------- |
| `doctype list [source-id]`                        | `app.listDocTypes({ sourceId })`      | JSON/Text-Ausgabe und Argumentdarstellung             |
| `doctype documents [source-id]`                   | `app.listDocuments({ sourceId })`     | JSON/Text-Ausgabe und Argumentdarstellung             |
| `diff [source-id]`                                | `app.diff({ sourceId })`              | Darstellung der Änderungen und Exit-Code-Entscheidung |
| `index [source-id]`                               | `app.sync({ sourceId })`              | Manuelles Auslösen und Sync-Bericht formatieren       |
| Vorbereitung fehlender Repositories/Indexzustände | `app.prepare()`                       | Expliziter CLI-Command; keine Zustimmungsprompts      |
| `search <query>`                                  | `app.search(query)`                   | Query-Argument übernehmen, Resultate formatieren      |
| `watch [source-id]`                               | `app.sync({ sourceId })` als Callback | Dateiwatcher, Debounce und Laufzeitsteuerung          |
| `source add/remove`                               | Keine Core-Methode im ersten Umfang   | Konfigurationsdatei ändern, Prompts und Bestätigung   |

Damit verwenden die fachlichen CLI-Kommandos dieselbe Application-API, ohne dass Core Commander, Ausgabe oder Watch-Laufzeit übernimmt. Die Loader- und Knowledge-Packages bleiben zusätzlich direkt verwendbar; Core ist die einheitliche API für diese Anwendungsfälle, aber kein vollständiger 1:1-Reexport aller Library-Funktionen.

## Zielbild für den ersten Core-Zuschnitt

Core bietet wiederverwendbare Abläufe über die bestehenden Libraries an. Er koordiniert die in der Projektkonfiguration konfigurierten Repositories mit dem bestehenden Knowledge-Index, ohne Loader-, Config-, Diff-, Index- oder Suchlogik zu duplizieren.

Die Konfigurationsquelle ist zunächst ausschließlich die vorhandene Datei `.dokkurator/config.yaml` im ermittelten Projekt. `createDokkurator()` erhält als einzige Option einen Projektpfad beziehungsweise einen Startpunkt für die Projektsuche. Wird kein anderer Ort benötigt, kann der Aufrufer `.` übergeben. Der Pfad bestimmt nur, wo die Projektkonfiguration gesucht wird; er ist kein Konfigurations-Override. CLI-Flags, Umgebungsvariablen oder frei zusammengestellte Konfigurationsobjekte überschreiben die Datei nicht. Format, Parser, Defaults und Validierung bleiben bei `@dokkurator/config`. Core nutzt dessen bestehende Auflösung statt ein zweites Schema einzuführen.

Die Config-Auflösung ist in zwei öffentliche Schritte getrennt. `resolveProjectConfig()` lädt die Projektkonfiguration und löst Source- sowie Indexpfade auf, ohne Source-Repositories zu lesen. `resolveSourceConfig()` lädt die repository-lokale Konfiguration erst für eine verfügbare Source. `resolveActiveConfig()` bleibt als kompatible Kombination beider Schritte für bestehende direkte Nutzer erhalten. Keine dieser Funktionen führt einen Checkout aus.

Core löst beim Öffnen ausschließlich die Projektkonfiguration und die darin deklarierten Sources, Checkout-Pfade und den Indexpfad auf. Dabei hält Core pro Source fest, ob der benötigte lokale Zustand vorhanden ist. Fehlende oder noch nicht nutzbare Sources verhindern `open()` nicht; sie werden als nicht vorbereitet gemeldet. Repository-lokale Konfigurationen werden erst geladen, nachdem die jeweilige Source bereits vorhanden ist oder durch `prepare()` hergestellt wurde. Dadurch kann eine neu geklonte Source noch im selben `prepare()`-Aufruf mit ihrer eigenen Konfiguration initial indexiert werden.

Damit Core diese Grenze durchsetzen kann, muss die Source-API im Loader explizite Operationen für Preparation und Update bieten oder die bestehende Factory entsprechend entkoppelt werden. Das Erzeugen eines Adapters für ein bestehendes Repository darf nicht nebenbei klonen oder fetchen. Klonen fehlender Remote-Repositories gehört ausschließlich zu `prepare()`; Aktualisieren vorhandener Remote-Repositories ausschließlich zu `sync()`. Andere Core-Operationen öffnen vorhandene Sources und melden bei fehlendem Checkout einen Preparation-Fehler.

Der Ablauf hat vier getrennte Phasen:

1. `createDokkurator({ root })` erzeugt ein App-Objekt ohne Datei-, Netzwerk- oder Datenbankzugriffe. `root` ist der Projektpfad oder Startpunkt der Projektsuche und kein inhaltlicher Config-Override.
2. `app.open()` liest und validiert die Projektkonfiguration, ermittelt die deklarierten Sources und meldet deren Readiness. Der Knowledge-Index wird erst bei einer indexbezogenen Operation geöffnet; Validierung und Inspektion benötigen ihn nicht. `open()` klont oder aktualisiert keine Repositories und indexiert keine Dokumente. Nicht vorbereitete Sources werden im Ergebnis von `open()` ausgewiesen, einschließlich des Hinweises, `prepare()` für diese Sources aufzurufen.
3. `app.prepare({ sourceId? })` ist der explizite, nicht-interaktive Vorbereitungsschritt. Ohne `sourceId` verarbeitet er alle konfigurierten Sources; mit `sourceId` nur die gewählte Source. Für konfigurierte Remote-Repositories klont er nur fehlende Checkouts; bestehende Checkouts aktualisiert er dabei nicht. Nachdem eine Source verfügbar ist, lädt Core deren repository-lokale Konfiguration. Anschließend indexiert Core Quellen, für die noch kein initialer Knowledge-Indexzustand vorhanden ist. Bereits initialisierte Quellen werden nicht unnötig vollständig neu indexiert. Fehlende lokale Quellen werden nicht geklont und führen zu einem Vorbereitungsfehler.
4. `app.sync({ sourceId? })` aktualisiert vorhandene Remote-Checkouts und ruft den vorhandenen Knowledge-Diff-/Indexablauf für die ausgewählten konfigurierten Quellen auf. Fehlt ein benötigter Checkout, klont `sync()` nicht stillschweigend, sondern meldet, dass zuerst `prepare()` für die Source erforderlich ist.

`prepare()` und `sync()` liefern strukturierte Ergebnisse. Core fragt nicht nach Zustimmung und gibt nichts auf stdout/stderr aus. Die vorhandene `indexDocumentChanges`-Funktion bleibt für den eigentlichen Source-Abgleich verantwortlich. Core koordiniert Quellen und Phasen, implementiert keinen konkurrierenden Sync.

Core öffnet und schließt die von ihm erzeugte Indexressource. Der Lifecycle ist robust gegen wiederholte Aufrufe: Ein erneutes `open()` auf einer bereits geöffneten App ist ein No-op und liefert denselben geöffneten Zustand; `close()` darf mehrfach aufgerufen werden. Nach `close()` darf dieselbe Instanz erneut mit `open()` geöffnet werden. Dabei werden Projektkonfiguration und Source-Zustände neu geladen und der Index erst beim nächsten indexbezogenen Use-Case geöffnet. Diese Garantien sind für eingebettete Hosts, Tests, Wiederanlauf und mehrfach ausgelöstes Cleanup gedacht; die globale CLI benötigt sie im normalen Einmal-Aufruf nicht. Use-Case-Methoden außerhalb eines geöffneten Lifecycles melden einen verständlichen Lifecycle-Fehler. `prepare()` und `sync()` sind explizite, potenziell schreibende Operationen. Parallele mutierende Operationen auf derselben App-Instanz werden zunächst verhindert und mit einem verständlichen Fehler abgewiesen. Ein fehlender oder ungültiger Projektzustand führt zu einer verständlichen Fehlermeldung. Die CLI kann diese in Text und Exit-Codes übersetzen.

Ein langlebiger Host lädt die Projektkonfiguration einmal beim Öffnen der App. Repository-lokale Konfiguration wird für eine Source geladen, sobald sie verfügbar ist, spätestens nach einem erfolgreichen Checkout in `prepare()`. Spätere Änderungen an einer bereits geladenen `.dokkurator/config.yaml` erfordern zunächst einen Neustart beziehungsweise `close()` und erneutes `open()`; Hot-Reload ist nicht Teil dieses Zuschnitts.

## Umgesetzte API-Richtung

Die API erhält keine Konfigurationsparameter und verwendet die vorhandene Projektdatei. Ein möglicher Aufruf sieht so aus:

```ts
const app = createDokkurator({ root: "." });

await app.open();
try {
  const preparation = await app.prepare({ sourceId });
  const report = await app.sync({ sourceId });
  const hits = await app.search(query, { sourceId });
} finally {
  await app.close();
}
```

`createDokkurator({ root })` bleibt ohne I/O; `open()` liest die Projektdatei `.dokkurator/config.yaml` über `@dokkurator/config`, ohne einen Index zu öffnen. `validate()` prüft Dokumente über den synchronen Validator. Ohne konfigurierte Sources verwendet Core das Projektverzeichnis als Source `root`. `prepare()` klont fehlende Remote-Checkouts und initialisiert noch nicht indexierte Quellen. `sync()` aktualisiert vorhandene Checkouts und verarbeitet Änderungen. Alle Use-Case-Methoden außer `open()` und `close()` können optional auf eine `sourceId` eingeschränkt werden. Das gilt auch für `search()`, dessen Ergebnisse dann auf diese Source begrenzt werden. Ohne `sourceId` bearbeiten beziehungsweise berücksichtigen sie alle konfigurierten Sources.

Die CLI bietet `dokkurator prepare [source-id]` als Top-Level-Command an. So können Repositories bewusst nach und nach ausgecheckt und indexiert werden. Ein Server kann beim Start `open()` und `prepare()` aufrufen und danach `sync()` über einen eigenen Timer wiederholen.

`diff({ sourceId? })` gehört zum ersten Core-Zuschnitt und bleibt nicht mutierend. Knowledge bleibt Eigentümer der zugrunde liegenden Diff-Funktion.

Mehrere Sources werden fehlertolerant nacheinander verarbeitet. Erfolgreiche Checkouts und Indexänderungen bleiben bestehen. Ein Fehler in einer Source verhindert nicht die Verarbeitung der folgenden Sources. Das strukturierte Gesamtergebnis enthält Erfolge und Fehler pro Source; die CLI gibt die Fehler gesammelt am Ende aus. Checkout-Fehler sollen, soweit zuordenbar, auf Konfigurationskorrektur, Remote-Korrektur oder das lokale Git-Werkzeug und einen erneuten `prepare({ sourceId })`-Aufruf verweisen. Indexfehler enthalten die ursprüngliche Fehlermeldung und den Hinweis, den Index-/Sync-Aufruf für die betroffene `sourceId` erneut auszuführen.

Die Source-Bereitschaft und die Indexinitialisierung sind getrennte Zustände. Eine Source ist bereit, wenn ihr konfigurierter lokaler Pfad als passende Source geöffnet werden kann; sie gilt als initial indexiert, sobald der Knowledge-Index für ihre `sourceId` einen Source-State liefert. `indexDocumentChanges()` darf diesen initialen State auch für eine Source ohne passende Dokumente schreiben. Dadurch kann ein späterer `prepare()`-Aufruf erkennen, dass keine erneute Vollinitialisierung erforderlich ist.

DocType- und Dokument-Inspektion gehören zur Core-API: `listDocTypes()` und `listDocuments()` machen die bestehenden Loader-Funktionen als Anwendungs-Use-Cases verfügbar. Core delegiert Lesen und Parsen an Loader; die Ergebnisse können also auch ohne Validator ausgegeben werden. Regeln dürfen Teil der geladenen DocType-Daten sein, werden im ersten Core-Zuschnitt aber nicht ausgeführt. Der Validator ist noch keine belastbare Grundlage für eine Sync-Integration; Core soll weder Regeln neu interpretieren noch eine Validierungsengine nachbauen.

Core stellt die für die Anwendung unterstützten Use-Cases bereit, nicht zwingend einen 1:1-Wrapper für jeden Export aus jeder Library. Die Libraries behalten ihre eigenständige öffentliche API. Adapterimplementierungen und deren fachliches Verhalten bleiben in ihren Paketen: Loader besitzt Sources, Knowledge besitzt Indexadapter wie SQLite. Core liest die bestehende Config und verdrahtet diese Implementierungen für die App-Lifecycle- und Use-Case-Methoden.

## Akzeptanzkriterien

| ID   | Szenario                                                                           | Erwartetes Ergebnis                                                                                                                                                                                                                                                                                                                                                                                                  |
| ---- | ---------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| AK01 | `createDokkurator({ root })` wird aufgerufen                                       | Keine Datei-, Netzwerk- oder Datenbankoperation; die Factory nimmt außer dem Projektpfad keine Config-Overrides oder Komponenten entgegen.                                                                                                                                                                                                                                                                           |
| AK02 | App wird geöffnet                                                                  | Die Projekt-Config wird ausschließlich über das bestehende Format und Parsing von `@dokkurator/config` aus `.dokkurator/config.yaml` geladen. `open()` öffnet keinen Index, klont oder aktualisiert keine Repositories und indexiert keine Dokumente. Der Index wird erst für `prepare`, `sync`, `diff` oder `search` geöffnet. Nicht vorbereitete Sources erscheinen im Ergebnis mit einem Hinweis auf `prepare()`. |
| AK03 | `listDocTypes()` oder `listDocuments()` wird aufgerufen                            | Core delegiert an Loader und liefert geparste Daten. Es gibt keinen Checkout, Sync, Index-Schreibvorgang oder Validator-Aufruf. Ein fehlendes erforderliches Repository führt zu einem Preparation-Fehler.                                                                                                                                                                                                           |
| AK04 | `diff()` wird für konfigurierte Sources ausgeführt                                 | Core delegiert an Knowledge und verwendet vorhandene Checkouts. Die Operation klont oder aktualisiert keine Repositories und schreibt keinen neuen Indexzustand.                                                                                                                                                                                                                                                     |
| AK05 | `search(query, { sourceId? })` wird aufgerufen                                     | Core delegiert die Abfrage an Knowledge und sucht im geöffneten Index, optional beschränkt auf eine Source. Ein leerer oder noch nicht initialisierter Index liefert keine Treffer. Es werden keine Sources gelesen, ausgecheckt oder synchronisiert.                                                                                                                                                                |
| AK06 | `prepare({ sourceId? })` trifft auf ein fehlendes konfiguriertes Remote-Repository | Das Repository wird ohne interaktiven Prompt geklont. Danach wird seine repository-lokale Konfiguration geladen. Ein bereits vorhandener Checkout wird durch `prepare()` nicht aktualisiert. Fehlende lokale Sources werden nicht geklont und führen zu einem klaren Fehler.                                                                                                                                         |
| AK07 | `prepare()` trifft auf eine Source ohne initialen Indexzustand                     | Die Source wird initial indexiert. Bereits initialisierte Sources werden nicht pauschal vollständig ersetzt oder unnötig neu indexiert.                                                                                                                                                                                                                                                                              |
| AK08 | `sync()` trifft auf einen fehlenden Checkout                                       | Es erfolgt kein impliziter Clone. Der Aufruf meldet, dass zuerst `prepare()` erforderlich ist.                                                                                                                                                                                                                                                                                                                       |
| AK09 | `sync()` trifft auf vorhandene Sources                                             | Remote-Checkouts werden aktualisiert; Dokumentänderungen werden über den vorhandenen Knowledge-Abgleich verarbeitet. Core implementiert keine zweite Diff- oder Indexierungslogik.                                                                                                                                                                                                                                   |
| AK10 | Ein bestehender CLI-Use-Case wird ausgeführt                                       | `doctype list/documents` sowie `diff`, `index` und `search` verwenden die zugeordneten Core-Methoden. Commander, Text-/JSON-Ausgabe, Prompts für die Source-Verwaltung und Exit-Codes bleiben im CLI.                                                                                                                                                                                                                |
| AK11 | Ein langlebiger Host betreibt die App                                              | Der Host kann beim Start `open()` und `prepare()` und danach `sync()` nach eigenem Timer aufrufen. Core startet keinen eigenen Timer oder Hintergrund-Sync.                                                                                                                                                                                                                                                          |
| AK12 | App wird geschlossen                                                               | Von Core erzeugte Ressourcen werden geschlossen; wiederholtes `close()` bleibt unschädlich.                                                                                                                                                                                                                                                                                                                          |
| AK13 | Eine Operation verarbeitet mehrere Sources und einzelne Sources schlagen fehl      | Erfolgreiche Änderungen bleiben bestehen, weitere Sources werden verarbeitet und das Ergebnis enthält Erfolge und Fehler pro Source. Die CLI gibt Fehler mit einer passenden Handlungsempfehlung gesammelt am Ende aus.                                                                                                                                                                                              |
| AK14 | Zwei mutierende Operationen werden gleichzeitig auf derselben App gestartet        | Der zweite Aufruf wird nicht parallel ausgeführt, sondern mit einem verständlichen Konfliktfehler abgewiesen.                                                                                                                                                                                                                                                                                                        |

## Bewusst außerhalb des ersten Zuschnitts

- Fastify, HTTP-Routen und `apps/catalog-server`.
- Inhaltliche CLI-Konfigurations-Overrides wie Index- oder Dokumentverzeichnisse, Ausgabe und Exit-Codes. `--project` beziehungsweise der Projektpfad und optionale Source-IDs bleiben Eingaben des Hosts. Interaktive Checkout-Bestätigungen entfallen; Preparation wird explizit ausgelöst.
- Source-Verwaltung (`add`, `remove`) und deren Konfigurationsänderungen.
- Watcher, Scheduler und automatische Hintergrund-Synchronisation.
- Neue Parser-, Diff-, Index- oder Suchlogik.
- Andere Konfigurationsquellen als `.dokkurator/config.yaml`, CLI-Overrides und eine neue Konfigurationssprache.
- Validator-Redesign oder eine zweite Regel-Engine.
- Generische Plugin-, Connector- oder Ressourcen-Frameworks ohne konkreten zweiten Anwendungsfall.

## Umsetzungsstand

1. Die Package-Umbenennung zu `@dokkurator/loader` und die Entfernung der Demo-CLI sind abgeschlossen.
2. Projekt- und repository-lokale Config-Auflösung sind getrennt.
3. Der Core-Lifecycle und die vorgesehenen Use-Cases sind umgesetzt.
4. Loader bietet getrennte Operationen zum Öffnen, Vorbereiten und Aktualisieren konfigurierter Sources.
5. Core bietet außerdem `validate()` ohne Knowledge-Index; siehe [Umsetzung](core-validator-integration.md). Die globale CLI verwendet Core und bietet `dokkurator prepare [source-id]` an.
6. Watch bleibt Host-Verhalten und verwendet `app.sync({ sourceId })` als Callback.
7. Die Validator-Integration ist umgesetzt; Git-Policy und interaktiver CLI-Modus bleiben separate Nachfolgeaufgaben.

## CLI-Lifecycle

Die globale CLI bleibt im ersten Zuschnitt eine nicht-interaktive CLI mit einzelnen Aufrufen wie `dokkurator prepare docs` oder `dokkurator search "access token"`. Pro Aufruf erzeugt der CLI-Host eine Core-App, ruft vor der fachlichen Aktion `open()` auf und garantiert anschließend in einem zentralen `finally`-Cleanup `close()`. CLI-Nutzer rufen `open()` und `close()` nicht selbst auf. Signale wie `SIGINT` oder `SIGTERM` dürfen ebenfalls das zentrale Cleanup anstoßen; die Wiederholbarkeit von `close()` verhindert dabei Fehler durch doppeltes Aufräumen.

Ein interaktiver Modus, der wie eine Shell geöffnet bleibt und mehrere Kommandos auf derselben App-Instanz entgegennimmt, gehört nicht zum ersten Zuschnitt. Er wird in einem nachgelagerten Task konzipiert. Die Core-API verhindert einen solchen langlebigen Host nicht, koppelt ihren ersten Entwurf aber auch nicht an dessen Prompt-, Abbruch- oder Eingabeschleifen-Semantik.

Die genaue Validierung vorhandener Git-Checkouts und die Semantik des Remote-Updates werden in einem separaten Task festgelegt. Bis dahin soll Core diese Regeln nicht selbst implementieren; sie bleiben als explizite Loader-Verantwortung gekapselt. Ebenso wird die bestehende Unterscheidung zwischen lokalen Dateisystem- und lokalen Git-Sources in einer nachgelagerten Session bewertet.

## Repo-Anker

- Core-Lifecycle und Use-Cases: `packages/core/src/lifecycle.ts`, `packages/core/src/document-use-cases.ts`, `packages/core/src/validation-use-cases.ts`, `packages/core/src/index-use-cases.ts`, `packages/core/src/source-operations.ts`
- Loader-/DocType-Modell: `packages/loader/src/index.ts`, `packages/loader/src/source-adapter/local-source.ts`, `packages/loader/src/docTypes/types.ts`
- Knowledge-Sync und Suche: `packages/knowledge/src/index/incremental-index.ts`, `packages/knowledge/src/search/search.ts`, `packages/knowledge/src/index-adapter/sqlite/sqlite-index.ts`
- Config-Auflösung: `packages/config/src/resolution.ts`, `packages/config/src/model.ts`
- CLI-Orchestrierung und Host-Grenzen: `apps/cli/src/core-runtime.ts`, `apps/cli/src/commands/prepare.ts`, `apps/cli/src/actions/source-actions.ts`, `apps/cli/src/actions/watch-action.ts`
- Der Loader-Package-Rename: `docs/task/renameDocType.md`
