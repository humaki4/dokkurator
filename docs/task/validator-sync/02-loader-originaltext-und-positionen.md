# 02 — Originaltext und Positionen im Loader sichern

Status: abgeschlossen. Implementierter Vertrag und Fehlerbehandlung siehe
[Loader-Vertrag](./02-loader-vertrag.md).

Abhängigkeiten: 01.

## Outcome

Loader stellt den unveränderten Dokumenttext samt Quellenidentität über seine öffentliche API bereit; bestehende Body- und AST-Semantik bleibt eindeutig.

## Schritte

- Den in Task 01 gewählten Eingabevertrag umsetzen: Originaltext explizit im Modell oder als mitgeladene SourceDocument-Eingabe bereitstellen.
- `ParsedDocument.content` nicht stillschweigend umdeuten; es enthält weiterhin den Markdown-Body.
- Pfad und sourceId gemeinsam erhalten, auch für gleiche Pfade in verschiedenen Quellen.
- CommonMark/GFM und Erweiterungen zwischen Loader und ESLint abstimmen.
- Festlegen, wie ungültiges YAML als Parse-Diagnose weitergegeben wird, ohne den gesamten Batch abzubrechen oder denselben Fehler zweimal zu melden.
- YAML-Feldpositionen dort erhalten, wo die gewählte Schema-Integration sie benötigt; keine zweite YAML-Positionslösung ohne Bedarf entwickeln.

## Abnahmekriterien

- Originaltext einschließlich Frontmatter und Zeilenenden bleibt unverändert.
- Positionen passen bei Frontmatter, CRLF und Unicode zum Originaltext.
- Bestehende Loader-Tests bleiben gültig; neue gezielte Fälle prüfen den erweiterten Vertrag.
- Paketübergreifende Tests verwenden ausschließlich `@dokkurator/loader`.

## Umfangsgrenze

Kein Wechsel der Loader-Parser-Runtime auf ESLint; kein AST-Sharing als Voraussetzung.

## Grundlage

[Task-Übersicht](./README.md) · [Validator-Spezifikation 2](../../../packages/validator/spec/Validator%20Specification%202%20-%20ESLint%20and%20Context%20Validation.md)
