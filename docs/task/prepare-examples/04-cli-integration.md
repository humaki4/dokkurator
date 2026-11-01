---
doctype: task
title: CLI-Validierung über Paketgrenzen hinweg absichern
status: open
component: cli
---

# CLI-Validierung über Paketgrenzen hinweg absichern

## Voraussetzung

[03](03-exit-status.md).

## Umfang

Kleine temporäre Projekte über die gebaute CLI prüfen. Existierende Core-Tests
nicht duplizieren: Schwerpunkt sind Projektfindung, Ausgabe, Prozessstatus und
das Zusammenspiel der bestehenden Pakete. Tests neben der CLI-Implementierung,
beispielsweise `commands/validate.integration.test.ts`, platzieren.

## Abnahme

- Konfigurationsfreies Projekt mit Compact-DocType funktioniert ohne Index;
  weder `.dokkurator/index.db` noch Checkout-Verzeichnisse werden angelegt.
- Automatische Suche aus Unterverzeichnissen und explizites `--project`
  erreichen das erwartete Projekt; Legacy-YAML bleibt verwendbar.
- Ein JS-Projekt verwendet importiertes Plugin, externes Schema und einen
  Source-lokalen Regeloverride; der CLI-Bericht entspricht Core-Befunden.
- Auswahl einer einzelnen Source unterdrückt Ergebnisse anderer Sources.
- Bei mehreren Sources bleiben erfolgreiche Ergebnisse sichtbar, während eine
  Source mit defekter Config oder fehlendem Checkout scheitert.
- Fehlender Checkout ergibt Prepare-Hinweis und Status 1 ohne Clone/Fetch.
- Fehlerhaftes Dokument-YAML erscheint als Dokumentbefund; Konfigurationsfehler
  als operativer Fehler. JSON bleibt in beiden Fällen parsebar.

## Prüfung

CLI samt Abhängigkeiten bauen, Integrationstests und CLI-Typecheck ausführen.
Für Remote-Fälle lokale Git-Fixtures verwenden; keine Netzwerkzugriffe nötig.
