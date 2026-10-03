# Projektvalidierung über Core vereinfachen

Status: umgesetzt; geprüft über Core, Config, Beispiele und bestehende CLI-Use-Cases.

## Ziel

Ein Projekt kann seine Dokumente über die öffentliche Core-API prüfen, ohne
Loader, Konfigurationsauflösung und Validator selbst zusammenzubauen.
Ein kleines Beispiel braucht nur einen Projektpfad, einen DocType und ein
Dokument. Eigene Regeln, Plugins und zusätzliche Schemas bleiben optional.

## Zuständigkeiten und Arbeit

- Core orchestriert Projekt- und Source-Konfiguration, DocType- und Dokumentladen
  sowie die Vorbereitung des Validators. Projekt- und Repository-Regeln werden
  über die vorhandene Config-Auflösung übernommen.
- Ein Validierungs-Use-Case delegiert für jedes Dokument an die öffentliche
  `lint`-API. Laden und Vorbereitung dürfen asynchron sein; die einzelne
  Regelausführung bleibt synchron und ohne I/O.
- Der Core-Lifecycle erlaubt lokale Validierung ohne Öffnen oder Anlegen eines
  Knowledge-Index. `open()` lädt nur Projektkonfiguration und Source-Readiness;
  Index-Ressourcen werden erst für indexbezogene Use-Cases geöffnet.
- Core kennt keine einzelnen Regel-IDs und verwendet das recommended-Profil des
  Validators. Fachregeln und Schema-Kompilierung bleiben im Validator; Source-
  Adapter und Parsing bleiben im Loader. Alle Paketimporte verwenden Root-APIs.
- Quellen- und Konfigurationsfehler werden von Dokument-Findings getrennt.
  Ausgabe und Exit-Codes bleiben beim Host; Core liefert strukturierte Ergebnisse.
- Alle Validator-Beispiele verwenden diesen Core-Use-Case. Die zusätzlichen
  direkten ESLint-Integrationen laden ihre DocTypes ebenfalls über Core.

## Abnahme

- Ein lokales Projekt lässt sich mit Defaults und einer kleinen öffentlichen
  Core-API prüfen, ohne selbst Sources und Lint-Konfiguration vorzubereiten.
- Eine Validierung erzeugt keinen Index, keinen Clone und keinen Remote-Update.
- Beide DocType-Schreibweisen, Projekt-Regelüberschreibungen und eigene Plugins
  funktionieren über denselben Ablauf.
- Ergebnisse stimmen mit direkten Validator-Aufrufen überein. Wiederholte
  Aufrufe und bestehende Index-Use-Cases bleiben funktionsfähig.
- Die Beispiele erklären Standardnutzung zuerst; Spezialfälle sind optional.

## Umsetzung

- `createDokkurator({ root })` bleibt unverändert. Nach `open()` prüft `validate()`
  alle Sources; `validate({ sourceId })` beschränkt den Lauf auf eine Source.
- Ohne Sources verwendet Core das Projektverzeichnis als Source `root`; dies
  ist ein expliziter Default in der Config-Auflösung für Core-Aufrufer.
- Ergebnisse enthalten pro Source `documents` mit Pfad, Status, Diagnosen und
  unterdrückten Diagnosen. Operationale Fehler stehen separat in `errors`.
- `validator.schemas`, `validator.plugins` und `validator.rules` werden aus
  Projekt- und Repository-Konfiguration übernommen. Source-Werte überschreiben
  die Projektwerte; Plugin-Konflikte werden weiterhin abgelehnt.
- `prepare`, `sync`, `diff` und `search` öffnen den Index lazily. `validate`,
  `listDocTypes` und `listDocuments` bleiben unabhängig. `close()` wartet auf
  bereits gestartete Operationen und gibt danach den optionalen Index frei.
- Fachlogik bleibt in Loader, Config und Validator. Knowledge wird erst bei
  einem indexbezogenen Use-Case geladen. Es gibt keinen neuen CLI-Befehl.
- Alle Use-Case-Module werden bei Bedarf asynchron geladen und verwenden das
  konsistente Namensschema `document-use-cases`, `validation-use-cases` und
  `index-use-cases`. Der Anwendungskontext ist separat als Typ definiert.
- Das minimale Beispiel verwendet nur die Core-Root-API und startet mit
  `pnpm start`. Auch die ausführliche Sammlung und der Editor-Text verwenden
  `createDokkurator` und `validate`. Der Editor-Text wird in einem temporären
  Dateiprojekt geprüft, das anschließend entfernt wird. Die direkten
  ESLint-Konfigurationen verwenden `listDocTypes` und dieselben Einstellungen aus
  `dokkurator.config.mjs`.

## Paketverwaltung

Die Beispiele bleiben mit `workspace:*` im pnpm-Workspace; alle Dokkurator-Pakete
bleiben privat. Eine Veröffentlichung oder eigenständige npm-/yarn-Installation
ist auf Wunsch nicht Teil dieser Aufgabe.

## Geplante Folgeaufgabe

[Validierungsreports mit ESLint-Formattern](./validation-report-formatters.md)
plant `app.loadFormatter` und `formatter.format(report)` nach ESLints
Aufrufschema sowie die Wiederverwendung der ESLint-Formate `stylish`, `json` und `json-with-metadata`. `html` wird auf Aufwand
geprüft und gegebenenfalls zunächst zurückgestellt.
