---
doctype: task
title: "07 — DocType-Inhaltsregeln als ESLint-Plugin bereitstellen"
status: accepted
---

# 07 — DocType-Inhaltsregeln als ESLint-Plugin bereitstellen

Status: umgesetzt, 2026-10-03.

Abhängigkeiten: 06.

## Outcome

Das bestehende Validator-Paket stellt ein normales ESLint-Plugin bereit, einschließlich einer DocType-Regel für erforderliche Überschriften.

## Umsetzung

Die Paket-Root exportiert zusätzlich nur `plugin`, mit den Regeln `doctype`,
`metadata-schema` und `required-headings` sowie `configs.recommended`. Das Profil registriert das Plugin
und legt seine Standardregeln fest. `createLintConfig` verwendet dieses Profil
und das empfohlene Markdown-Profil, ohne einzelne Dokkurator-Rule-IDs zu kennen.
Vorbereitete DocTypes werden
über `settings.dokkurator` bereitgestellt; die direkte Plugin-Nutzung bereitet
weder Schemas vor noch lädt sie Ressourcen während der Regelausführung.

`structure.requiredHeadings` bleibt eine Liste von Texten. Der Vergleich ist
case-sensitive und entfernt äußere Leerzeichen. Alle Heading-AST-Knoten zählen,
unabhängig von Ebene, Reihenfolge und Wiederholungen. Markdown-Formatierung wird
wie im Loader über `mdast-util-to-string` ausgewertet. Jede eindeutige Anforderung
benötigt mindestens eine passende Überschrift. Pro fehlendem Text wird am
Frontmatter `missing-heading` mit DocType und Überschriftentext gemeldet.

Die Regel hat keine zusätzlichen Optionen (`meta.schema: []`); Schweregrad und
Aktivierung folgen ESLint-Konventionen. Sie überspringt Dokumente mit kaputtem
YAML oder ungültiger DocType-Zuordnung, damit die Metadatenregel diese Fehler nur
einmal meldet. Alle drei Regeln teilen eine YAML-Auswertung pro ESLint-Source-Objekt;
erfasste Überschriften bleiben lokal im jeweiligen Regellauf.

Die Prüfung von `structure.requiredHeadings` gehört zur Überschriften-Regel und
erfolgt bei deren Aktivierung im `create`-Schritt. Die allgemeine DocType-Vorbereitung
kennt keine Überschriften-Regel und prüft die Anforderungen bei `off` nicht.
Regel-Konfigurationsfehler bleiben auch in der Fassade `LintConfigurationError`.
Parse-/Lint-Phasen können Regeln über `meta.messagePhases` selbst festlegen;
die Fassade enthält dafür keine fest verdrahteten Rule- oder Message-IDs.

Generische Prüfungen bleiben bei `@eslint/markdown`. Eine einzige direkte
Abhängigkeit auf das bereits im Workspace verwendete `mdast-util-to-string`
4.0.0 wurde ergänzt; keine Paketgrenzen, Export-Subpaths oder weiteren Root-Typen.

Die [Paket-Dokumentation](../../../packages/validator/README.md) enthält Beispiele
für `eslint.config.js`, den Helfer und den direkten Plugin-Import sowie den
genauen Vergleichsvertrag und die Markdown-Kompatibilitätsgrenze.

## Nachweis

ESLint `RuleTester` prüft positive und negative Fälle: mehrere Ebenen,
Setext-Überschriften, formatierten Text, Wiederholungen, Groß-/Kleinschreibung,
fehlende Abschnitte und Überschriftentext in Codeblöcken. Integrationstests
importieren ausschließlich die öffentliche Validator-Paket-Root und prüfen
normales ESLint, den Konfigurationshelfer und die Fassade, unabhängige
Warn-/Off-Overrides, fehlende Settings, ungültige Optionen und Definitionen,
wiederholte Dokumentläufe sowie BOM/CRLF-Positionen.

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
