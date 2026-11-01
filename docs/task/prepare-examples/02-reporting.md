---
doctype: task
title: Gemeinsame Validierungsberichte in der CLI ausgeben
status: open
component: cli
---

# Gemeinsame Validierungsberichte in der CLI ausgeben

## Voraussetzung

[01](01-command.md) und der umgesetzte
[Formatter-Task](00-validation-report-formatters.md). Der dort vorgeschlagene
öffentliche API-Vertrag benötigt vor seiner Umsetzung Bestätigung.

## Umfang

`validate --format <name>` mit Standard `stylish` ergänzen. `stylish`, `json`
und `json-with-metadata` über die bestätigte öffentliche Core-Formatter-API
laden und den vollständigen Bericht genau einmal formatieren. Die CLI schreibt
die Ausgabe; sie implementiert keine ESLint-Formatter und prüft nicht erneut.

Die Aufteilung von Bericht und stderr folgt dem im Formatter-Task festgelegten
Vertrag für operative Fehler. Vorhandene Readiness-Hinweise dürfen JSON auf
stdout nicht beschädigen und operative Fehler nicht unnötig doppelt ausgeben.
Keine zusätzlichen Ausgabeoptionen in der Projektkonfiguration.

## Abnahme

- Standardformat und explizite Formatauswahl sind automatisiert geprüft.
- JSON-Ausgaben lassen sich vollständig parsen; stdout enthält keine
  zusätzlichen Fortschrittsmeldungen oder textuellen Zusammenfassungen.
- Operative Fehler und Ergebnisse anderer Sources bleiben vollständig sichtbar.
- Source-Zuordnung bleibt bei identischen relativen Dokumentpfaden eindeutig.
- Unbekannte Formate und Formatierungsfehler erzeugen verständliche Fehler.
- Tests prüfen Delegation und Ausgabekanäle, nicht erneut alle Formatterdetails.

## Prüfung

CLI-Tests, Typecheck und Build ausführen. Formatter-Vertrag und tatsächliche
CLI-Ausgabe für einen erfolgreichen und einen teilweise fehlgeschlagenen Lauf
vergleichen.
