---
doctype: task
title: CLI-Validierung und Beispiele konsistent dokumentieren
status: open
component: documentation
---

# CLI-Validierung und Beispiele konsistent dokumentieren

## Voraussetzung

[05](05-examples.md), [05b](05b-eslint-example.md) und
[05d](05d-knowledge-example.md).

## Umfang

`apps/cli/docs/commands.md`, CLI-README, `docs/architecture/cli.md` und
`examples/documentation/README.md` auf den tatsächlich umgesetzten Ablauf bringen.
Den CLI-Einstieg vor dem kleinen JS-Beispiel erklären. ESLint unter
`examples/eslint` mit eigener README verlinken; Virtual- und
Gruppenrunner-Anleitungen entfernen. Die Beispielübersicht aktualisieren.

Befehlssyntax, Projektfindung, optionale Source-ID, Formate, Ausgabekanäle und
Exit-Codes dokumentieren. Den Minimalstart ohne eigene Regelkonfiguration von
der erweiterten JavaScript-Konfiguration für Plugins/Schemas unterscheiden.
Build-Voraussetzungen für die CLI einschließlich ihrer Abhängigkeiten nennen.

Veraltete Aussagen in der CLI-Referenz zu ausschließlich `.dokkurator`-basierter
Projektfindung und generell fehlenden Sources ohne Config korrigieren: die
Verarbeitungs-Defaults unterstützen bereits die implizite Source `root`.
Die Config-README-Aussage zur noch ausstehenden CLI-Validierungsanbindung prüfen.
Die bisherige Knowledge-Vorschau nach Abschluss von 05c/05d durch den
funktionsfähigen Index/Search-Ablauf ersetzen. Den gemeinsamen Datenbestand und
die Unabhängigkeit von Validator-Befunden und Indexierung erklären.

## Abnahme

- Alle dokumentierten Validate-Aufrufe funktionieren nach dem beschriebenen Build.
- Warnungen allein bedeuten 0; Dokument- und operative Fehler bedeuten 1.
- Kein `prepare`/Index wird als Voraussetzung für lokale Validierung genannt.
- Unterstützung und Grenzen der Formate entsprechen dem implementierten Vertrag.
- Keine Behauptung einer CLI-Gruppenfilterung oder Validierung über stdin.
- Links sind gültig; geplante Validierung wird an den betroffenen Stellen als
  implementiert beschrieben, erst wenn die vorherigen Tasks abgeschlossen sind.

## Prüfung

Dokumentations-Lint und Formatprüfung für die geänderten Dateien ausführen;
dokumentierte Minimal-, Sammlungs- und JSON-Aufrufe als Smoke-Check nachvollziehen.
