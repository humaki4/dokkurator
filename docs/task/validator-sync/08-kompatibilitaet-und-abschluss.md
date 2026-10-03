# 08 — Synchrone Ausführung vollständig nachweisen und dokumentieren

Status: abgeschlossen.

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

## Nachweise und Beispiele

- [`examples/validator`](../../../examples/validator/README.md) enthält acht
  DocTypes, acht gültige und 16 gezielt fehlerhafte oder warnende Dokumente.
  Gezeigt werden Compact und JSON Schema, Pflichtfelder und Überschriften,
  `pattern`, `enum`, Array- und Zahlenbedingungen, verschachtelte Objekte,
  Formate, `additionalProperties`, `if`/`then`, `oneOf`, vorab geladene `$ref`
  und ein eigenes Markdown-Plugin.
- Der Standardstart `npm start` zeigt zusätzlich einen minimalen Compact-DocType
  und ein Dokument mit unveränderten Defaults, ohne Plugins oder externe Schemas.
  Erweiterte Fälle werden separat gestartet. Die
  [Core-Integration](../core-validator-integration.md) ist als Folgeaufgabe für
  die Vereinfachung der Projekt-Orchestrierung festgehalten.
- `examples/validator/src/setup.examples.test.ts` vergleicht für alle 24
  Dokumente die Meldungen der Fassade mit Standard-ESLint über `createLintConfig`
  und mit einer direkten Einbindung von `plugin.configs.recommended`. Rule-IDs,
  Schwere, Meldungstext und vollständige Quellpositionen stimmen überein. Gültige
  Dokumente bleiben meldungsfrei; Fehlerbeispiele treffen jeweils die erwartete
  Regel. Die beiden Warnungsbeispiele bleiben im Status `passed`.
- `packages/validator/src/lint/runtime/runtime.sources.test.ts` lädt
  Dateisystem-Text und einen echten lokalen Git-Commit. Anschließend wird die
  temporäre Quelle entfernt; beide synchronen Prüfwege funktionieren weiterhin.
  Der Commit-Text bleibt trotz geänderter Arbeitskopie unverändert, und die
  Diagnose erhält seine Revision. Eine virtuelle Quelle verweigert nach dem
  Laden jeden weiteren Zugriff; wiederholte Aufrufe für verschiedene Dokumente
  bleiben unabhängig. CRLF und Unicode-Positionen werden mitgeprüft.
- Derselbe Test unterscheidet fehlende Quelldateien, den standardmäßigen
  `DocumentParseError`, gesammelte Parse-Findings und einen
  `LintConfigurationError` bei unbekannten Regeln. Vorhandene Fehler- und
  Diagnosetests decken zusätzlich Regelabstürze, Suppressionen, BOM, Fixes,
  ungültige Optionen, fehlende Ressourcen und Schema-Konflikte ab.
- Die Beispielanleitung dokumentiert Vorbereitung, Root-APIs, Plugin-Verwendung,
  erwartete Exit-Codes und den Wechsel von der entfernten `validateDocument`-API
  auf Schemas und `lint`. Die bestehende Dokkurator-CLI erhält keinen neuen
  Befehl. CLI-Anbindung und Knowledge-Beispiele sind getrennte Folgeaufgaben.
- Das Beispielprojekt ist ein privater Workspace-Verbraucher der vorhandenen
  Root-APIs. Manifeste und Lockfile wurden ohne Dependency-Upgrades ergänzt;
  Bibliotheksimplementierungen und öffentliche Exports wurden nicht erweitert.

Verifikation: Loader (85 Tests), Validator (146 Tests) und Beispielvergleich
(zwei Tests für Minimalstart und die gesamte Sammlung), betroffene Builds und Typechecks sowie
Lint- und Formatprüfungen. Die dokumentierten Beispielbefehle wurden ausgeführt;
ESLint meldet für die Fehlersammlung erwartungsgemäß 25 Fehler und zwei Warnungen.
Boundary- und Referenzsuchen zeigen keine internen Cross-Package-Imports,
Knowledge-Abhängigkeiten oder Runtime-I/O im Validator.

## Grundlage

[Task-Übersicht](./README.md) · [Validator-Spezifikation 2](../../../packages/validator/spec/Validator%20Specification%202%20-%20ESLint%20and%20Context%20Validation.md)
