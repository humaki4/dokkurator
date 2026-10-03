# Vorbereitete DocTypes und gemeinsame ESLint-Konfiguration

Status: Aufgabe 04 umgesetzt, 2026-10-03.

## Entscheidung und Umfang

Aufgabe 03 wird auf Wunsch übersprungen. Das externe Frontmatter-Schema-Plugin
wird nicht übernommen. Eine eigene dünne Integration verwendet Ajv und `yaml`;
die eigentliche Metadaten-ESLint-Regel folgt in Aufgabe 06. Das Plugin darf später
als Funktionsumfang-Referenz dienen, ist aber keine Abhängigkeit.

ESLint-Regeln werden als JavaScript-Objekt konfiguriert. DocType-Definitionen
bleiben vorerst YAML und werden als `ParsedDocType` über die öffentliche
Loader-Root-API geladen. Der bestehende Loader liest optionale `rules.yml`
weiterhin für bisherige Aufrufer; die neue Vorbereitung lehnt nichtleere
Legacy-Regeln ausdrücklich ab. Sie werden weder ignoriert noch automatisch in
eine neue Regel-DSL übersetzt. Metadatenbedingungen stehen im JSON Schema;
zusätzliche lokale Regeln stehen im ESLint-`rules`-Objekt.

Die anschließende [Config-Erweiterung](../../../packages/config/README.md) lädt
`dokkurator.config.mjs` auf Projekt- und Repository-Ebene und führt deren
Validator-Einstellungen pro Quelle zusammen. Die Validator-API bleibt unabhängig
vom Dateiformat, aus dem eine Anwendung ihre Einstellungen lädt.

## Öffentliche API

`@dokkurator/validator` exportiert:

- `prepareLintConfiguration(input)`: synchroner Aufbau einer vorbereiteten
  DocType-Registry samt kompilierten Schemas und geprüfter Flat Config.
- `createLintConfig(inputOrPrepared)`: dieselbe Konfiguration als normales
  ESLint-Flat-Config-Array; wiederverwendbar für direktes und eingebettetes ESLint.
- `LintConfigurationError` sowie die zentralen Typen `LintConfigurationInput`
  und `PreparedLintConfiguration`. Untertypen bleiben ohne eigene Root-Exports;
  ihre Struktur wird aus den öffentlichen Funktionen abgeleitet.

```ts
const prepared = prepareLintConfiguration({
  docTypes, // vollständig geladene ParsedDocType[]
  schemas: {
    "https://example.com/schemas/common.json": commonSchema,
  },
  plugins: { company: companyPlugin }, // vorher importiert, Markdown-kompatibel
  rules: {
    "markdown/no-duplicate-headings": "error",
    "company/local-rule": ["warn", { option: true }],
  },
});

const selection = prepared.selectDocType(document.metadata);
if (selection.status === "selected") {
  const metadataResult = selection.docType.validateMetadata(document.metadata);
}
const flatConfig = createLintConfig(prepared);
```

Die Beispiele setzen bereits geladene Daten und importierte Plugins voraus.
`validateMetadata` liefert synchron `{ valid, errors }` mit unabhängigen
Ajv-Fehlerkopien. Es wird noch nicht automatisch als Metadaten-ESLint-Regel
aufgerufen. Die neue öffentliche `lint`-Fassade folgt in Aufgabe 05.
`validateDocument` und sein bisheriges Ergebnis bleiben unverändert.

DocTypes und Schema-Daten werden kopiert. Vorbereitete Definitionen sind
unveränderlich; Flat-Config-Helfer liefern unabhängige Kopien der Config-Container
und Regeloptionen. Importierte Drittanbieter-Plugins bleiben vertrauenswürdige
Module, die nach der Vorbereitung nicht umdefiniert werden dürfen. Die Runtime
ist keine Sandbox für beliebigen Plugin-Code.

## Identische DocType-Auswahl

Die aktive Standardregel `dokkurator/doctype` benutzt dieselbe vorbereitete
`selectDocType`-Funktion wie der eingebettete Ablauf. Sie prüft zunächst nur die
Zuordnung und meldet Fehler über normale ESLint-Rule-/Message-IDs:

| Eingabe                                                        | Verhalten                                                            |
| -------------------------------------------------------------- | -------------------------------------------------------------------- |
| Kein Frontmatter                                               | `missing-frontmatter`                                                |
| Frontmatter kein Mapping                                       | `invalid-frontmatter`                                                |
| `doctype` fehlt                                                | `missing-doctype`                                                    |
| `doctype` leer oder kein String                                | `invalid-doctype`                                                    |
| `doctype` unbekannt                                            | `unknown-doctype`                                                    |
| Ungültige `$schema`-Annotation                                 | `invalid-schema-annotation`                                          |
| `$schema` widerspricht dem DocType-Schema                      | `schema-conflict`                                                    |
| Ungültiges YAML oder doppelte Schlüssel                        | ESLint-Message-ID `invalid-yaml`; keine Auswahl aus partiellen Daten |
| Bekannter `doctype`, keine Annotation oder passende Annotation | Zugehörigen vorbereiteten DocType auswählen                          |

Eine Dokument-Annotation `$schema` darf nur die Schema-Identität des ausgewählten
DocTypes bestätigen. Sie ersetzt weder `doctype` noch das maßgebliche Schema.
Der JSON-Schema-Dialekt in `ParsedDocType.metadata.$schema` ist davon getrennt:
Dort bezeichnet `$schema` Draft 7, nicht die Dokumentzuordnung.

Die Config nutzt `markdown/gfm`, YAML-Frontmatter und Markdown-Erweiterungen
`.md`, `.MD`, `.Md`, `.mD`. Standardmäßig wird nur die Zuordnungsregel aktiviert;
das Markdown-Regelprofil folgt in Aufgabe 05. Weitere Regeln, Schweregrade,
Optionen und Suppressionen verwenden die normale ESLint-Konfiguration.
`markdown` und `dokkurator` sind reservierte Plugin-Namensräume.

## Schemas und Vorbereitung

- Maßgeblich ist das tatsächliche `ParsedDocType.metadata`, einschließlich der
  in Draft 7 erlaubten booleschen Schemas. Der Loader-Typ wurde an sein bereits
  vorhandenes Draft-7-Schema angeglichen.
- Eine explizite `$id` muss eine absolute URI ohne Fragment sein. Ohne `$id`
  lautet die Identität `https://dokkurator.dev/doctypes/<URL-kodierter Name>/metadata.schema.json`.
  Dies ist eine logische Identität, keine Ladeadresse. Ein abschließendes leeres
  `#` wird bei Identitätsvergleichen entfernt.
- Zusätzliche Schema-Ressourcen werden in `schemas` unter ihrer absoluten URI
  übergeben. Eine enthaltene `$id` muss dazu passen. Doppelte DocType-Namen oder
  Schema-Identitäten sind Konfigurationsfehler.
- `$ref` wird ausschließlich aus registrierten Ressourcen und lokalen
  Schema-Definitionen aufgelöst. Relative Referenzen beziehen sich auf die
  jeweilige Schema-Identität. Alle Ressourcen werden vorab kompiliert, auch
  unbenutzte. Nicht geladene Referenzen scheitern vor Regel-Visitors.
- Als Dialekt gilt Draft 7; andere Dialekte und asynchrone Schema-Validatoren
  werden abgelehnt. Es gibt kein `loadSchema`, kein `compileAsync`, keine
  Dateisuche und keinen Netzwerkzugriff in der Vorbereitung oder in Regeln.

Runtime-Abhängigkeiten: Ajv **8.20.0**, ajv-formats **3.0.1**, yaml **2.9.1** sowie
die vorhandenen ESLint-/Markdown-Abhängigkeiten. Keine fremden Paketinternas
werden verwendet.

Ajv-Einstellungen: `allErrors`, `strictSchema`, `strictNumbers`, `validateSchema`,
`validateFormats` und `ownProperties` sind aktiv; `coerceTypes`, `useDefaults`,
`removeAdditional` sind deaktiviert. `strictTypes`, `strictTuples` und
`strictRequired` sind deaktiviert, damit reguläre Draft-7-Kombinationen und
bedingte Anforderungen ohne zusätzliche Ajv-Stilbeschränkungen funktionieren.
Unbekannte Schema-Keywords und Formate scheitern weiterhin sichtbar.

Formate stammen aus `ajv-formats` im `full`-Modus, einschließlich `date`, `time`,
`date-time`, `iso-time`, `iso-date-time`, `duration`, `uri`, `uri-reference`, `uri-template`, `url`, `email`,
`hostname`, `ipv4`, `ipv6`, `regex`, `uuid`, `json-pointer`, `json-pointer-uri-fragment`,
`relative-json-pointer`, `byte`, `int32`, `int64`, `float`, `double`, `password`
und `binary`. `password` und `binary` sind dabei reine Annotationen ohne
Wertprüfung. Zusätzliche Format-Limit-Keywords sind deaktiviert. Keine
projektspezifischen Keywords oder Format-Callbacks werden eingeführt.

ESLint selbst prüft Rule-IDs und Optionschemas vor dem ersten Visitor. Der
Vorbereitungsprobe wird eine absichtlich fehlschlagende Parser-Antwort gegeben,
damit kein tatsächliches Plugin-`create` oder Visitor ausgeführt wird. Dabei
werden auch konfigurierte `off`-Regeln auf gültige IDs und Optionen geprüft;
ihre spätere Ausführung bleibt deaktiviert. Fehler werden als
`LintConfigurationError` mit ursprünglichem `cause` weitergegeben.

## Direktes ESLint

```js
// eslint.config.mjs
import { FileSystemSource, loadDocTypes } from "@dokkurator/loader";
import { createLintConfig } from "@dokkurator/validator";

// Laden findet vor der Konfigurationsvorbereitung und vor Rule-Visitors statt.
const source = new FileSystemSource({
  root: process.cwd(),
  sourceId: "project",
});
const docTypes = await loadDocTypes(source);

export default createLintConfig({
  docTypes,
  rules: { "markdown/no-duplicate-headings": "error" },
});
```

Zusätzliche Schemas und Plugins müssen ebenfalls vor dem Helper-Aufruf geladen
sein. Eingebettete Ausführung verwendet `Linter.verify(originalText,
createLintConfig(prepared), { filename: logicalMarkdownPath })` ohne Config-Suche.
Nicht passende oder von ESLint standardmäßig ausgeschlossene Pfade behandelt
Aufgabe 05 als operationale Konfigurationsfehler; der Helper ist keine
Quellenpfad- oder SourceAdapter-Implementierung.

## Nachweis

Fokussierte Tests laden echte YAML-DocTypes, prüfen bedingte `if`/`then`-
Anforderungen, Datumsformate, boolesche Schemas, aufgelöste Referenzen,
Konfigurationsfehler, fehlende Mutation und unabhängige Fehlerergebnisse.
Direktes `ESLint.lintText` und eingebettetes `Linter.verify` liefern dieselben
Zuordnungsdiagnosen. Ein Plugin-Spy bestätigt, dass die Vorbereitung keine
Rule-Visitors bzw. `create`-Funktionen ausführt.

Grundlagen: [Ajv-Optionen](https://ajv.js.org/options.html),
[Schema-Referenzen](https://ajv.js.org/guide/combining-schemas.html),
[ajv-formats](https://github.com/ajv-validator/ajv-formats),
[ESLint Node.js API](https://eslint.org/docs/latest/integrate/nodejs-api#linter).
