# 07 — DocType-Inhaltsregeln als ESLint-Plugin bereitstellen

Status: vorgeschlagen, nicht begonnen.

Abhängigkeiten: 06.

## Outcome

Das bestehende Validator-Paket stellt ein normales ESLint-Plugin bereit, einschließlich einer DocType-Regel für erforderliche Überschriften.

## Schritte

- `structure.requiredHeadings` durch eine eigene ESLint-Regel gegen Markdown-AST-Knoten auswerten.
- Verhalten für gleiche Überschriftentexte, Ebenen und fehlende Überschriften ausdrücklich definieren.
- Weitere generische Prüfungen aus `@eslint/markdown` verwenden, statt sie nachzubauen.
- Regeloptionen und Meldungen über ESLint-Konventionen definieren.
- Plugin und Konfigurationshelfer ausschließlich über `@dokkurator/validator` exportieren.
- Beispiele für den Import in eine gewöhnliche `eslint.config.js` ergänzen.
- Dokumentieren, dass nur Markdown-kompatible Regeln auf dem Markdown-AST laufen.

## Abnahmekriterien

- ESLint RuleTester prüft die Dokkurator-Regel mit positiven und negativen Fällen.
- Ein fehlender Pflichtabschnitt erzeugt eine klar zugeordnete Meldung.
- Direkter ESLint-Import funktioniert über die Paket-Root-API.
- Keine zusätzliche Paketgrenze oder Export-Subpaths werden eingeführt.

## Umfangsgrenze

Keine Embedded-Code-Runtime, kein Codeblock-Processor-Durchlauf, keine Mermaid-Validierung.

## Grundlage

[Task-Übersicht](./README.md) · [Validator-Spezifikation 2](../../../packages/validator/spec/Validator%20Specification%202%20-%20ESLint%20and%20Context%20Validation.md)
