---
doctype: task
title: "05 — Synchrone Lint-Fassade und Diagnosen implementieren"
status: accepted
---

# 05 — Synchrone Lint-Fassade und Diagnosen implementieren

Status: abgeschlossen. Öffentliche Fassade, empfohlenes Markdown-Profil und
Fehlerbehandlung siehe [Lint-Vertrag](./05-lint-vertrag.md).

Abhängigkeiten: 04.

## Outcome

Eine öffentlich nutzbare synchrone Lint-Operation führt Standardregeln aus und liefert eindeutige, maschinenlesbare Ergebnisse.

## Schritte

- ESLint und `@eslint/markdown` intern ausführen; Regelaufrufe und AST-Traversierung ESLint überlassen.
- Ein bewusst ausgewähltes Markdown-Regelprofil konfigurieren.
- ESLint-Meldungen mit Rule-ID, Message-ID soweit vorhanden, Quellenidentität, Position und Schwere normalisieren.
- Warning/Error direkt abbilden; `off` bleibt deaktiviert und wird nicht zu `info`.
- Suppressionen und Suggestions bei Bedarf strukturiert erhalten; keine Fixes anwenden.
- Document-Findings und operationale Fehler gemäß Task 01 abbilden.
- Die bisherige Pflichtfeld-API gemäß der festgelegten Migrationsentscheidung behandeln.
- Benötigte Runtime-Abhängigkeiten und Lockfile ohne breite Upgrades aktualisieren.

## Abnahmekriterien

- `lint` liefert synchron ein Ergebnis und verändert weder Text noch Metadaten.
- Unabhängige Aufrufe beeinflussen sich nicht durch versteckten Zustand.
- ESLint-Disable-Kommentare funktionieren für die aktivierten lokalen Regeln.
- Fokussierte Validator-Tests sowie Typecheck und Build bestehen.

## Umfangsgrenze

Keine asynchrone Kontextphase, kein Caching, keine Persistenz.

## Grundlage

[Task-Übersicht](./README.md) · [Validator-Spezifikation 2](../../../packages/validator/spec/Validator%20Specification%202%20-%20ESLint%20and%20Context%20Validation.md)
