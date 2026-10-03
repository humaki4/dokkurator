# Synchrone Lint-Fassade und empfohlenes Markdown-Profil

Status: Aufgabe 05 umgesetzt, 2026-10-03.

## Verwendung

```js
import { loadDocument } from "@dokkurator/loader";
import { lint, prepareLintConfiguration } from "@dokkurator/validator";

// Quellen, DocTypes, Plugins und externe Schemas werden vorab geladen.
const document = await loadDocument(sourceAdapter, path, {
  parseErrors: "collect",
});
const configuration = prepareLintConfiguration({
  docTypes,
  ...resolvedSource.validator,
});

// Kein await: Linter.verify und alle lokalen Regeln laufen synchron.
const result = lint({
  originalText: document.originalText,
  source: document.source,
  configuration,
});
```

Die Root-API erhält nur `lint` und `LintRuntimeError` hinzu. Keine zusätzlichen
Root-Typ-Exports: Eingabe und Ergebnis sind über `Parameters<typeof lint>[0]`
und `ReturnType<typeof lint>` ableitbar. Die bisherige Pflichtfeld-API
`validateDocument` bleibt unverändert.

## Profil und Ergebnis

Die gemeinsame Vorbereitung aktiviert alle Regeln aus
`@eslint/markdown.configs.recommended` der installierten Version 8.0.3 sowie
`dokkurator/doctype`. Das gilt auch für direktes ESLint über `createLintConfig`.
Eigene `rules`-Einträge haben Vorrang, einschließlich `warn` und `off`.
Die Config-Schicht führt vorher Projekt- und Repository-Overrides zusammen.
Codeblöcke werden nicht als eigenständige JavaScript-Dateien gelintet.

`lint` liefert synchron `status`, `diagnostics` und `suppressedDiagnostics`.
Nicht unterdrückte Errors ergeben `failed`; Warnings allein ergeben `passed`.
Unterdrückte Findings beeinflussen den Status nicht. ESLint-Suppressionsgründe
und Begründungen bleiben erhalten. `off` erzeugt keine Info-Diagnose.

Diagnosen enthalten `phase`, `sourceId`, `path`, gegebenenfalls `revision`,
`ruleId` (bei Parsermeldungen ggf. null), `messageId` soweit vorhanden,
`severity`, `message` und verfügbare Positionen. Fatal-Parsermeldungen und die
gegenwärtige YAML-Syntaxmeldung der DocType-Regel erhalten `phase: "parse"`;
sonstige Meldungen `phase: "lint"`.

Positionen sind 1-basiert; Endpositionen sind exklusiv. Bei einem führenden BOM
werden Spalten der ersten Zeile und Edit-Offsets auf den Originaltext umgerechnet.
Suggestions und angebotene Fixes bleiben reine Daten: Edits besitzen
`{ range: [startOffset, endOffset], text }`; Suggestions zusätzlich `description`
und ggf. `messageId`. Es wird kein Fix angewendet und kein Dokument geändert.

Ein explizites `source.revision` bleibt erhalten. Bei direkt übergebenen Loader-
Quellen wird für sauberen Git-Stand `git.fileRevision` übernommen. Veränderter
Arbeitsstand wird nicht als Text einer committed Revision gekennzeichnet.
Gleiche Pfade verschiedener Quellen bleiben durch `sourceId` unterscheidbar.

## Fehler und Grenzen

Benötigt werden vollständiger Originaltext, nichtleere Quellenidentität,
relativer POSIX-Markdown-Pfad und vorbereitete Konfiguration. Absolute Pfade,
URLs, Windows-Pfade, Traversierungssegmente, nicht passende Erweiterungen oder
von ESLint ausgeschlossene Pfade werfen `LintConfigurationError`, statt einen
ungeprüften Lauf als Erfolg auszugeben. Ein Konfigurationsprobe erkennt solche
Pfade und prüft Rule-IDs/Optionen vor echten Rule-Visitors.

Ungültige Eingaben oder explizite Konfiguration werfen `LintConfigurationError`
mit `cause` und verfügbarer Quellenidentität. Regelabstürze oder unerwartete
Engine-Fehler werfen `LintRuntimeError` mit diesen Details; es gibt kein partielles
Dokumentergebnis. Inline-Konfigurationsfehler, die ESLint als Dokumentmeldungen
liefert, bleiben Dokument-Findings.

Jeder Lauf erhält eine neue Linter-Instanz sowie kopierte Config-Container und
Regeloptionen. Suppressionen und Dokumentzustand werden nicht geteilt. Die eigene
Runtime lädt keine Dateien, fragt kein Netzwerk ab und verwendet kein Knowledge.
Importierte Plugins müssen ebenfalls lokale synchrone Regeln ohne I/O
bereitstellen; beliebiger Plugin-Code wird nicht sandboxed.

Loader-Parse-Diagnosen werden nicht zusätzlich angehängt: Der Originaltext ist
maßgeblich und jeder YAML-Parsefehler erscheint einmal. Feldbezogene Schema-Diagnosen
sind seit [Aufgabe 06](./06-frontmatter-schema-regel.md) ebenfalls Teil von
`dokkurator/doctype`. CLI-Lint-Befehle,
Kontextvalidierung, Caching und Persistenz bleiben außerhalb dieser Aufgabe.

## Nachweis

Tests prüfen das vollständige empfohlene Profil, Warn-/Off-Overrides, Suppression
mit Begründung, unabhängige Aufrufe, BOM/CRLF/Unicode-Positionen, Suggestions und
Fixes ohne Textänderung, Quellenidentität und Revisionen. Weitere Fälle prüfen
direkte ESLint-Übereinstimmung, einmalige Parse-Diagnosen, unpassende/exkludierte
Pfade, ungültige Konfiguration und Regelabstürze.
