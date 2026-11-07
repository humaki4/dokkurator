---
doctype: guide
title: Beispiele für die Bewerbung vorbereiten
---

# Beispiele für die Bewerbung vorbereiten

## Gemeinsames Ziel

Die Beispiele sollen verständlich, übersichtlich und nach einem
frischen Checkout nachvollziehbar ausführbar sein. Dieses Vorhaben bündelt
CLI-Validierung, gemeinsame Berichtsausgabe, die Bereinigung der Beispiele,
die eigenständige ESLint-Integration sowie Knowledge/Index/Search auf demselben
Datenbestand. Auch die dafür erforderliche tolerante Indexierung ist enthalten.

## Ergebnis der Analyse

Stand: 2. November 2026. Es fehlt vor allem die CLI-Anbindung, keine neue
Validierungsengine. Dieser Ordner plant die Umsetzung; er implementiert sie nicht.

- [Core](../../../packages/core/src/validation-use-cases.ts) bietet bereits
  `app.validate({ sourceId })`: DocTypes und Dokumente laden, Konfiguration
  vorbereiten, synchron prüfen und `results` sowie operative `errors` zurückgeben.
  Projekt- und Source-Regeln, Plugins und externe Schemas sind angebunden.
- [Core-Tests](../../../packages/core/src/validation-use-cases.test.ts) belegen
  konfigurationsfreie Validierung ohne Index und Behandlung von fehlerhaftem YAML
  als Dokumentbefund. Konfigurations- und Pluginfehler sind separat getestet.
- [CLI-Registrierung](../../../apps/cli/src/command.ts) enthält kein `validate`.
  [withDokkurator](../../../apps/cli/src/core-runtime.ts) bietet bereits den
  Lebenszyklus und Source-Hinweise. Der Programmeinstieg setzt bei geworfenen
  Fehlern Status 1; zurückgegebene Validierungsfehler benötigen eigene Behandlung.
- [Beispiele](../../../examples/documentation/package.json) starten eigene
  `.mjs`-Programme. Minimalstart und Sammlung verwenden schon Core; zusätzliche
  Beispiele demonstrieren Editor-Text und die direkte ESLint-Integration.
- Die Sammlung hat 24 Dokumente: acht gültige, 16 negative Beispiele, darunter
  zwei reine Warnungsfälle. Die bestehenden Tests erwarten 14 fehlgeschlagene
  Dokumente. Gruppen werden erst nach der Validierung für Ausgabe und Exit-Code
  gefiltert; operative Fehler zählen unabhängig von der Gruppe.
- Die JavaScript-Konfiguration ist laut
  [akzeptierter ADR](../../../packages/config/docs/adrs/0001-use-javascript-project-configuration.md)
  das vorgesehene Format für importierte Plugins und Schemas. DocTypes bleiben
  YAML, Legacy-Projekt-YAML bleibt unterstützt. Ein Wechsel der Konfiguration zu
  YAML ist keine Voraussetzung für einen CLI-Einstieg. Der Minimalfall braucht
  grundsätzlich keine Konfiguration; die leere Datei im Beispiel verhindert
  lediglich das Finden der ausführlichen Elternkonfiguration.

## Geplanter Umfang

Ziel ist `dokkurator [--project <directory>] validate [source-id]` mit
`--format`, nachvollziehbarer Ausgabe und CI-tauglichem Exit-Code. Die CLI
verwendet ausschließlich öffentliche Paket-Root-APIs und delegiert an Core.
Validierung öffnet keinen Index, klont nicht und aktualisiert keine Checkouts.
Fehlende Checkouts erhalten den vorhandenen Prepare-Hinweis.

Die folgenden Tasks schlagen den Befehlsvertrag vor. Sie erteilen keine Freigabe
für Änderungen öffentlicher Bibliotheks-APIs. Insbesondere die geplante
Formatter-API muss vor Umsetzung entsprechend AGENTS.md bestätigt werden.

## Reihenfolge und Abhängigkeiten

| Task                                     | Ergebnis                                | Voraussetzung            |
| ---------------------------------------- | --------------------------------------- | ------------------------ |
| [00](00-validation-report-formatters.md) | Gemeinsame Berichtsausgabe in Core      | API-Abstimmung laut Task |
| [01](01-command.md)                      | Befehl, Source-Auswahl und Lebenszyklus | keine                    |
| [02](02-reporting.md)                    | Gemeinsame Formatter in der CLI         | 01 und 00                |
| [03](03-exit-status.md)                  | Verlässliche Prozess-Exit-Codes         | 02                       |
| [04](04-cli-integration.md)              | Geprüfter kompletter CLI-Lauf           | 03                       |
| [05a](05a-shared-example-data.md)        | Gemeinsamen Datenbestand vorbereiten    | keine; vor 05 und 05b    |
| [05b](05b-eslint-example.md)             | Eigenständiges ESLint-Beispiel          | 05a; mit 05 abstimmen    |
| [05](05-examples.md)                     | Vereinfachte CLI- und JS-Beispiele      | 04 und 05a               |
| [05c](05c-tolerant-indexing.md)          | Tolerante Indexierung                   | keine; vor 05d           |
| [05d](05d-knowledge-example.md)          | Ausführbares Knowledge/Search-Beispiel  | 05 und 05c               |
| [06](06-documentation.md)                | Konsistente Benutzerreferenz            | 05, 05b und 05d          |

Der bestehende [Formatter-Task](00-validation-report-formatters.md) ist eine
gebündelte Voraussetzung: `app.loadFormatter()` existiert noch nicht.
Dessen Datenmodell-, Metadaten- und ESLint-Integrationsarbeit wird hier nicht
noch einmal geplant. Task 01 ist unabhängig davon prüfbar; ein fertiger
Benutzerablauf entsteht nach Task 03. Keine temporäre eigene Stylish-Implementierung.

Nicht vorgesehen sind neue Konfigurationsformate, Dateiglob-Argumente,
Gruppenfilter im allgemeinen CLI-Befehl, stdin/Editor-Text, Watch-Validierung,
Auto-Fixes, Warnungsschwellen oder eine Kopplung von Validierung und Indexierung.
Die Gruppenrunner und das virtuelle Beispiel entfallen; eine kleine direkte
JS-Einbindung bleibt. ESLint zieht nach `examples/eslint` um.
Knowledge/Search soll denselben Datenbestand und dasselbe Dokkurator-Projekt
weiterverwenden, ohne Dokumente oder Konfiguration zu kopieren.
Die tolerante Knowledge-Indexierung ist keine Voraussetzung für `validate`.

## Zielstruktur der Beispiele

```text
examples/
├── documentation/
│   ├── README.md                 # gemeinsamer Einstieg
│   ├── validation.md             # Validator
│   ├── search.md                 # Knowledge/Search
│   ├── package.json
│   ├── dokkurator.config.mjs
│   ├── documents/
│   ├── _dokkurator/.doctypes/
│   ├── schemas/
│   ├── rules/no-todo.mjs
│   └── validate.mjs
├── minimal-validation/           # eigenständiger Minimalfall
└── eslint/
    ├── README.md
    ├── package.json
    └── eslint.config.mjs         # nutzt die gemeinsame Sammlung
```

Tests liegen jeweils neben ihrer Implementierung bzw. Konfiguration. Die
Übersicht zeigt die Nutzereinstiege; sie listet nicht alle Test- und Builddateien.
Die konkrete Pfad- und Ressourcenauflösung wird in Task 05a geprüft.

## Gemeinsame Abschlussprüfung

- Frischer Checkout: dokumentierter Installations-/Buildweg funktioniert.
- Minimalvalidierung, erweiterte Validierung, kleines JS-Beispiel und ESLint
  sind ausführbar; erwartete Fehler und Exit-Codes sind erklärt.
- Knowledge indexiert dieselbe vollständige Sammlung; Volltext- und
  Metadatensuche sowie Ändern → `diff` → `index` sind nachvollziehbar.
- Keine Virtual-Demo, keine Gruppenrunner, keine kopierten Sammlungen und
  keine zusätzlichen Setup-Gerüste bleiben zurück.
- Übersicht und READMEs führen Nutzer jeweils über einen kurzen Standardweg
  zu den optionalen Vertiefungen. Die fokussierten Tests und betroffenen
  Builds, Typechecks, Lint- und Formatprüfungen sind erfolgreich.
