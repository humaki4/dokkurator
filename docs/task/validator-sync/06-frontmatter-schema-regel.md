# 06 — Metadatenprüfung in die ESLint-Runtime integrieren

Status: umgesetzt, 2026-10-03.

Abhängigkeiten: 05.

## Outcome

Frontmatter wird mit Ajv gegen das DocType-Schema geprüft; Dokkurator implementiert keine eigenen Schema-Keywords. Task 03 wurde auf Wunsch übersprungen, das externe Plugin wird nicht verwendet.

## Umsetzung und Vertrag

Die bestehende ESLint-Regel `dokkurator/doctype` prüft zuerst YAML und DocType-Zuordnung,
anschließend das vorbereitete Schema. So gibt es einen Parse-Durchlauf und keine
doppelten Befunde aus Auswahl- und Schema-Regeln. Die Regel ist standardmäßig
`error`; globale und projektspezifische `rules` können sie wie bisher auf `warn`
oder `off` setzen. `off` deaktiviert sowohl Zuordnung als auch Metadatenprüfung.
Es gibt keine weiteren Root-Exports oder Abhängigkeiten.

Ajv übernimmt sämtliche Keywords, inklusive Bedingungen und vorab geladener
`$ref`-Ressourcen. Schema-Befunde haben `messageId: invalid-metadata`, Phase `lint`
und nennen JSON Pointer, Ajv-Meldung und Keyword. Bei `allErrors` kann Ajv neben
einer konkreten Verletzung auch den fehlgeschlagenen Bedingungszweig melden;
beide Befunde bleiben erhalten.

JSON Pointer werden auf YAML-Knoten abgebildet, einschließlich Listenindizes und
maskierter Feldnamen. Unzulässige zusätzliche Felder werden am Schlüssel markiert.
Fehlende Pflichtfelder liegen am Elternobjekt; Aliase und nicht auflösbare Pfade
am nächsten vorhandenen Container oder Alias. Es werden keine Positionen für
nicht vorhandene Felder erfunden.

Wie im Loader wird die originale YAML-Textspanne verwendet, damit CRLF, CR und
BOM die Positionen nicht verschieben. Die YAML-1.2-Werte und Alias-Auflösung
entsprechen dem Loader. Syntaxfehler und doppelte Schlüssel erzeugen jeweils
`invalid-yaml` mit Phase `parse` und der konkreten YAML-Position. Erst bei der
Wertumwandlung auftretende Fehler, etwa unbekannte Aliase oder überschrittene
Alias-Limits, werden ebenfalls als Parsefehler am YAML-Container berichtet.
Der Loader wirft hierfür standardmäßig `DocumentParseError`; im Sammelmodus
liefert er `YAML_CONVERSION_ERROR` ohne partielle Metadaten.

Die Ausführung ist synchron und dokumentlokal. Kompilierte Schemas werden
wiederverwendet; YAML-Dokumente und Befunde entstehen pro Aufruf neu. Direkte
ESLint-Nutzung über `createLintConfig` und die Fassade `lint` verwenden dieselbe
Regel. Metadaten werden weder ergänzt, konvertiert noch bereinigt.

## Nachweis

Geprüft mit ESLint 10.10.0, `@eslint/markdown` 8.0.3, Ajv 8.20.0 und yaml 2.9.1.
Die relevanten Evaluationsfälle der übersprungenen Aufgabe 03 sind in
den thematisch gruppierten Tests `doctype-rule.schema.test.ts`,
`doctype-rule.positions.test.ts`, `doctype-rule.parsing.test.ts`,
`doctype-rule.association.test.ts` und `doctype-rule.integration.test.ts` neben
`packages/validator/src/lint/doctype-rule.ts` sowie den Vorbereitungstests neben
`doc-types.ts` abgedeckt:

| Fall                                                              | Ergebnis                                                 |
| ----------------------------------------------------------------- | -------------------------------------------------------- |
| Fehlendes, leeres, skalares und Listen-Frontmatter                | Klare Zuordnungsdiagnose, keine Folgefehler              |
| Syntaxfehler und doppelte YAML-Schlüssel                          | Parse-Diagnosen im Originaltext                          |
| required, type, enum, pattern, Zahlen-/String-Grenzen             | Ajv-Prüfung mit Feldpositionen                           |
| Bedingte Pflichtfelder, verschachtelte Objekte und Listen         | Eltern-/Feldpositionen geprüft                           |
| Maskierte und numerische YAML-Schlüssel                           | Feldpositionen geprüft                                   |
| Vorbereitete externe Referenzen und boolesche Schemas             | Synchrone Prüfung ohne Ressourcenladen                   |
| Virtuelle/Git-Quellen, BOM und verschiedene Zeilenenden           | Quellenidentität und Positionen geprüft                  |
| Direkte ESLint-Nutzung und Fassade                                | Identische Meldungen und Positionen                      |
| Wiederholte ungültige/gültige Dokumente, gültige/ungültige Aliase | Keine übernommenen Befunde; Loader-Werte stimmen überein |

Die Regeln und offenen Schritte des externen Plugins (Issue/PR/defaultSchema)
sind für diese Integration nicht relevant. Auswahl und Konflikte von `$schema`
folgen weiterhin dem [Konfigurationsvertrag](./04-konfigurationsvertrag.md).

## Schritte

- Die gewählte Plugin-Regel integrieren oder eine dünne ESLint-Regel um Ajv und yaml umsetzen.
- Frontmatter-Werte und Schema-Auswahl mit dem Loader-Vertrag abgleichen.
- Pflichtfelder, Typen, enum, pattern, Grenzwerte und Bedingungen durch Ajv prüfen lassen.
- YAML-Syntaxfehler und doppelte Schlüssel gemäß vereinbarter Parse-Fehlerpolitik berichten.
- Verschachtelte Schemafehler auf Felder abbilden; fehlende Felder sinnvoll am Elternobjekt oder Frontmatter verorten.
- Wiederverwendung vorkompilierter Schemas erlauben, ohne mutable Dokumentzustände zwischen Aufrufen zu teilen.
- Gleiche Metadatenprüfung für direkte ESLint-Nutzung und die Fassade ermöglichen.

## Abnahmekriterien

- Die Evaluationsfälle aus Task 03 sind für die endgültige Integration geprüft.
- Fehlende, skalare und ungültige Metadaten erzeugen klare Diagnosen.
- Bedingte Pflichtfelder und verschachtelte Fehler sind korrekt lokalisiert.
- Die Ausführung bleibt synchron und benötigt nur vorbereitete Daten.

## Umfangsgrenze

Keine eigene required/type/enum-Regelfamilie; keine automatische Schema-Netzwerkabfrage.

## Grundlage

[Task-Übersicht](./README.md) · [Validator-Spezifikation 2](../../../packages/validator/spec/Validator%20Specification%202%20-%20ESLint%20and%20Context%20Validation.md)
