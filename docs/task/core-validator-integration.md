# Projektvalidierung über Core vereinfachen

Status: offen; Folgeaufgabe zum synchronen Validator-MVP.

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
- Der Core-Lifecycle muss lokale Validierung ohne Öffnen oder Anlegen eines
  Knowledge-Index erlauben. Aktuell öffnet `open()` immer SQLite. Index-Ressourcen
  sollen erst für indexbezogene Use-Cases benötigt werden.
- Core kennt keine einzelnen Regel-IDs und verwendet das recommended-Profil des
  Validators. Fachregeln und Schema-Kompilierung bleiben im Validator; Source-
  Adapter und Parsing bleiben im Loader. Alle Paketimporte verwenden Root-APIs.
- Quellen- und Konfigurationsfehler werden von Dokument-Findings getrennt.
  Ausgabe und Exit-Codes bleiben beim Host; Core liefert strukturierte Ergebnisse.
- Das minimale Beispiel verwendet anschließend diesen Core-Use-Case. Die
  ausführlichen Beispiele für direkte Library- und ESLint-Nutzung bleiben erhalten.

## Abnahme

- Ein lokales Projekt lässt sich mit Defaults und einer kleinen öffentlichen
  Core-API prüfen, ohne selbst Sources und Lint-Konfiguration vorzubereiten.
- Eine Validierung erzeugt keinen Index, keinen Clone und keinen Remote-Update.
- Beide DocType-Schreibweisen, Projekt-Regelüberschreibungen und eigene Plugins
  funktionieren über denselben Ablauf.
- Ergebnisse stimmen mit direkten Validator-Aufrufen überein. Wiederholte
  Aufrufe und bestehende Index-Use-Cases bleiben funktionsfähig.
- Die Beispiele erklären Standardnutzung zuerst; Spezialfälle sind optional.

## Eigenständige Beispiele

Die Beispiele verwenden derzeit `workspace:*`, und die Dokkurator-Pakete sind
als `private` markiert. Für eigenständig installierbare npm-/yarn-Beispiele ist
zusätzlich eine Packaging-/Release-Aufgabe nötig: installierbare Paketartefakte,
konkrete Dependency-Versionen und Prüfung außerhalb des Monorepos. Lokales
`npm start` oder `yarn start` nach der Workspace-Installation ist davon unabhängig.
Die Veröffentlichung ist nicht Teil dieser Core-Aufgabe.
