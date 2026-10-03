---
doctype: task
title: "03 — Frontmatter-Schema-Integration auswählen"
status: accepted
---

# 03 — Frontmatter-Schema-Integration auswählen

Status: auf Wunsch übersprungen. Das externe Plugin wird nicht übernommen;
eigene dünne Integration mit Ajv und yaml. Die Auswahl und Vorbereitung sind im
[Konfigurationsvertrag](./04-konfigurationsvertrag.md) dokumentiert.

Abhängigkeiten: 01, 02.

## Outcome

Ein kurzer Entscheidungsbericht mit reproduzierbaren Fällen bestimmt, ob das bestehende Plugin, eine upstream-kompatible Erweiterung oder eine dünne Ajv-Regel verwendet wird.

## Schritte

- Die tatsächlich veröffentlichte Plugin-Version prüfen, nicht nur den Default-Branch.
- In-Memory-Schemas und vorab aufgelöste `$ref`-Abhängigkeiten testen.
- Synchrone Ausführung ohne verdeckte Datei-/Netzwerkzugriffe prüfen.
- Fehlendes Frontmatter, Skalare, Syntaxfehler, doppelte YAML-Schlüssel und verschachtelte Fehlerpositionen vergleichen.
- ESLint-10-Kompatibilität und die Auswirkungen von Issue #1 sowie PR #2 anhand des gewählten Releases prüfen.
- Konfigurationsobjekt und dokumentierten `defaultSchema`-Vertrag verifizieren.
- Ergebnisse, Einschränkungen und bevorzugte Integrationsoption festhalten. Ein upstream-Beitrag ist eine mögliche Folgeentscheidung, keine Voraussetzung für den Abschluss.

## Abnahmekriterien

- Der Bericht nennt Versionen und zeigt für jeden Fall bestanden, eingeschränkt oder nicht unterstützt.
- Die gewählte Lösung erfüllt den synchronen Eingabevertrag und virtuelle Quellen.
- Bei eigener Integration ist begründet, welche Integrationslücke verbleibt; Ajv und yaml bleiben die etablierten Engines.

## Umfangsgrenze

Keine Übernahme einer experimentellen Library allein aufgrund ihrer README; keine neue Schema-Engine.

## Grundlage

[Task-Übersicht](./README.md) · [Validator-Spezifikation 2](../../../packages/validator/spec/Validator%20Specification%202%20-%20ESLint%20and%20Context%20Validation.md)
