# 08 — Synchrone Ausführung vollständig nachweisen und dokumentieren

Status: vorgeschlagen, nicht begonnen.

Abhängigkeiten: 07.

## Outcome

Ein verifiziertes synchrones Lint-MVP samt Nutzungsbeispielen und dokumentierten Grenzen ist abgeschlossen.

## Schritte

- Direktes ESLint und Dokkurator-Fassade mit identischen Texten, Konfigurationen und DocTypes vergleichen.
- Findings einschließlich Rule-IDs, Schwere und Quellpositionen vergleichen.
- Dateisystem-Text, committed Git-Text und virtuelle Quellen ohne Runtime-I/O prüfen.
- Mehrere Dateien nur als Sammlung unabhängiger synchroner Lint-Aufrufe ausführen.
- Ladefehler, Parsefehler und Konfigurationsfehler anhand der definierten Verträge nachweisen.
- Öffentliche API, Schema-Vorbereitung, Plugin-Verwendung und Migration vom temporären Validator dokumentieren.
- Fokussierte Tests, betroffene Paket-Typechecks/Builds und Boundary-/Referenzsuche durchführen.
- Falls CLI-Anbindung später gewünscht ist, als getrennte Folgeaufgabe notieren.

## Abnahmekriterien

- Standard-ESLint und Fassade liefern äquivalente lokale Findings.
- Alle verpflichtenden Prüfungen der Tasks 01–07 sind bestanden oder verbleibende Einschränkungen ausdrücklich beschrieben.
- Keine Kontextvalidierung oder Knowledge-Abfrage wurde in die synchrone Runtime eingeschleust.
- Manifeste und Lockfile passen zu direkten öffentlichen Abhängigkeiten.

## Umfangsgrenze

Keine Kontext-Runtime, keine neue CLI, kein Deployment; diese Liste endet beim synchronen Library- und Plugin-MVP.

## Grundlage

[Task-Übersicht](./README.md) · [Validator-Spezifikation 2](../../../packages/validator/spec/Validator%20Specification%202%20-%20ESLint%20and%20Context%20Validation.md)
