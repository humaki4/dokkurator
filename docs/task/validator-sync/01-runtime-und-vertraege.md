# 01 — Synchrone ESLint-Runtime und Verträge festlegen

Status: abgeschlossen. Entscheidung und geprüfte Verträge siehe
[Runtime-Entscheidung](./01-runtime-entscheidung.md).

Abhängigkeiten: Keine.

## Outcome

Eine dokumentierte Entscheidung für `Linter.verify` als synchrone Ausführung und ein klarer Vertrag für Eingaben, Ergebnisse und Konfigurationsfehler.

## Schritte

- Die aktuelle ESLint-Version mit `@eslint/markdown` anhand eines kleinen In-Memory-Beispiels prüfen.
- `Linter.verify` mit expliziter Flat Config und logischem Dateinamen verwenden; keine automatische Konfigurationssuche.
- Eine synchrone öffentliche `lint`-Operation entwerfen: vollständig geladener Originaltext, Quellenidentität und vorbereitete DocType-Konfiguration hinein, Ergebnis ohne Promise heraus.
- Asynchrones Laden und optionale Vorbereitung von Schemas ausdrücklich vor der Runtime einordnen.
- Fehler in Dokumenten von ungültiger Konfiguration und Runtime-Fehlern unterscheiden.
- Festlegen, ob der temporäre `validateDocument`-Vertrag zunächst erhalten bleibt oder kontrolliert migriert wird.

## Abnahmekriterien

- Ein Markdown-Beispiel erzeugt synchron erwartete Meldungen.
- Regelcode und Runtime führen keine Datei-, Netzwerk- oder Knowledge-Abfragen aus.
- Die Entscheidung nennt unterstützte Versionskombinationen und erforderliche Runtime-Abhängigkeiten.

## Umfangsgrenze

Keine eigene lokale Rule-Runtime, keine Kontextregeln, keine CLI-Implementierung.

## Grundlage

[Task-Übersicht](./README.md) · [Validator-Spezifikation 2](../../../packages/validator/spec/Validator%20Specification%202%20-%20ESLint%20and%20Context%20Validation.md)
