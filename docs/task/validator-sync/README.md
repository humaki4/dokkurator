# Tasks: synchrone ESLint-Regelausführung

Status: Aufgaben 01, 02, 04, 05 und 06 abgeschlossen; Aufgabe 03 auf Wunsch übersprungen;
Aufgaben 07–08 noch nicht begonnen.

Die [Runtime-Entscheidung](./01-runtime-entscheidung.md) dokumentiert die geprüfte
Versionskombination, den synchronen Zielvertrag und die unveränderte Bestands-API.
Der [Loader-Vertrag](./02-loader-vertrag.md) beschreibt Originaltext, Positionen,
Parse-Diagnosen und die Entscheidung zum künftigen Konfigurationsformat.
Der [Konfigurationsvertrag](./04-konfigurationsvertrag.md) beschreibt die
gemeinsame Vorbereitung für direktes und eingebettetes ESLint: Regeln als
JavaScript-Objekt, DocTypes vorerst YAML, eigene dünne Schema-Integration.
Der [Lint-Vertrag](./05-lint-vertrag.md) beschreibt die synchrone Fassade,
normalisierte Diagnosen und das standardmäßig aktivierte empfohlene Markdown-Profil.

Grundlage: [Validator-Spezifikation 2](../../../packages/validator/spec/Validator%20Specification%202%20-%20ESLint%20and%20Context%20Validation.md).

ESLint besitzt die synchrone Rule-Runtime. Dokkurator bereitet Eingaben und Konfiguration vor und übersetzt Ergebnisse. Die Task-Liste konkretisiert für diesen Umfang die synchrone Variante mit `Linter.verify`; sie ersetzt nicht die noch offene Gesamtentscheidung der Spezifikation.

Laden von Dokumenten, DocTypes und Schema-Abhängigkeiten darf vorab asynchron erfolgen. Die hier geplante Lint-Operation und ihre Regeln bleiben synchron und führen keine I/O-Abfragen aus. Kontextvalidierung, Knowledge, Multi-Document-Regeln und CLI-Ausbau gehören nicht zu dieser Liste.

## Reihenfolge und Outcomes

| Schritt | Task                                                                                                          | Outcome                                                                                                                                                                        |
| ------- | ------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1       | [Synchrone ESLint-Runtime und Verträge festlegen](./01-runtime-und-vertraege.md)                              | Eine dokumentierte Entscheidung für `Linter.verify` als synchrone Ausführung und ein klarer Vertrag für Eingaben, Ergebnisse und Konfigurationsfehler.                         |
| 2       | [Originaltext und Positionen im Loader sichern](./02-loader-originaltext-und-positionen.md)                   | Loader stellt den unveränderten Dokumenttext samt Quellenidentität über seine öffentliche API bereit; bestehende Body- und AST-Semantik bleibt eindeutig.                      |
| 3       | [Frontmatter-Schema-Integration auswählen](./03-frontmatter-integration-evaluieren.md)                        | Ein kurzer Entscheidungsbericht mit reproduzierbaren Fällen bestimmt, ob das bestehende Plugin, eine upstream-kompatible Erweiterung oder eine dünne Ajv-Regel verwendet wird. |
| 4       | [DocType-Auswahl und ESLint-Konfiguration vorbereiten](./04-doctype-konfiguration-und-schema-vorbereitung.md) | Eine gemeinsame Konfigurationsvorbereitung liefert dieselben DocType- und Schemaentscheidungen für Dokkurator und direktes ESLint.                                             |
| 5       | [Synchrone Lint-Fassade und Diagnosen implementieren](./05-synchrone-lint-fassade-und-diagnosen.md)           | Eine öffentlich nutzbare synchrone Lint-Operation führt Standardregeln aus und liefert eindeutige, maschinenlesbare Ergebnisse.                                                |
| 6       | [Metadatenprüfung in die ESLint-Runtime integrieren](./06-frontmatter-schema-regel.md)                        | Frontmatter wird durch die in Task 03 gewählte Integration gegen das DocType-Schema geprüft; Dokkurator implementiert keine eigenen Schema-Keywords.                           |
| 7       | [DocType-Inhaltsregeln als ESLint-Plugin bereitstellen](./07-doctype-content-regeln-und-plugin-export.md)     | Das bestehende Validator-Paket stellt ein normales ESLint-Plugin bereit, einschließlich einer DocType-Regel für erforderliche Überschriften.                                   |
| 8       | [Synchrone Ausführung vollständig nachweisen und dokumentieren](./08-kompatibilitaet-und-abschluss.md)        | Ein verifiziertes synchrones Lint-MVP samt Nutzungsbeispielen und dokumentierten Grenzen ist abgeschlossen.                                                                    |

Jeder Task beschreibt Arbeit, Outcome und Abnahmekriterien. Auf Wunsch entfällt
die Plugin-Evaluation aus Aufgabe 03; eine eigene dünne Ajv-/yaml-Integration
ist festgelegt. Alle Implementierungen bleiben in den vorhandenen besitzenden
Paketen und werden über deren Root-APIs konsumiert.
