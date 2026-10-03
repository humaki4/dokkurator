# Loader-Vertrag für Originaltext und Parse-Diagnosen

Status: Aufgabe 02 umgesetzt, 2026-10-03.

## Konfigurationsentscheidung

Dokkurator soll künftig über eine JavaScript-Konfiguration (`dokkurator.config.mjs`)
konfiguriert werden. DocType-Definitionen bleiben zunächst deklarative YAML-Dateien
mit JSON Schema. Die Umsetzung der JavaScript-Konfiguration ist eine separate
Änderung; Aufgabe 02 verändert weder Config-Discovery noch das DocType-Dateiformat.
Plugin-Imports und Schema-Vorbereitung gehören vor die synchrone Lint-Runtime.
YAML-Frontmatter in Markdown-Dokumenten bleibt davon unabhängig.

## Öffentlicher Dokumentvertrag

`loadDocument` und `loadDocuments` aus `@dokkurator/loader` liefern zusätzlich:

- `originalText`: vollständiger Originaltext, einschließlich Frontmatter, BOM,
  Unicode und ursprünglicher Zeilenenden.
- `parseDiagnostics`: strukturierte Parse-Fehler; bei gültigem Text ein leeres Array.

`content` bleibt der Markdown-Body ohne Frontmatter und ohne die unmittelbar
folgende Zeilentrennung. AST, Überschriften, Links und Referenzen beziehen ihre
Positionen auf `originalText`. Positionen sind 1-basiert, Offsets zählen
JavaScript-UTF-16-Codeeinheiten; Endpositionen sind exklusiv. Ein führendes BOM
bleibt im Text und wird bei Loader-Offsets und Spalten der ersten Zeile mitgezählt.
ESLint/Micromark ignoriert das BOM bei seinen Spalten der ersten Zeile; die spätere
Lint-Normalisierung muss dort gegebenenfalls eine Spalte addieren. Nachfolgende
Zeilen sind direkt vergleichbar.

`source` erhält weiterhin die vollständigen bestehenden `SourceMetadata`,
insbesondere `sourceId`, quellrelativen `path` und gegebenenfalls Git-Revisionen.
Gleiche Pfade in unterschiedlichen Quellen bleiben unterscheidbar. Der dritte
Parameter von `loadDocument` akzeptiert weiterhin `revision`; Parse-Optionen
werden nicht an den Quellenadapter weitergegeben.

`DocumentParseOptions`, `DocumentParseDiagnostic`, `DocumentParseError`,
`SourceDocument` und `SourceMetadata` sind über die Paket-Root-API zugänglich.
Manuell konstruierte `ParsedDocument`-Objekte müssen die beiden neuen Pflichtfelder
angeben; vorhandene Aufrufer der Ladefunktionen erhalten sie automatisch.

## Syntax und Parser

Loader verwendet weiterhin Remark/MDAST, ergänzt um `remark-gfm` 4.0.1:
CommonMark plus GFM-Tabellen, Task-Listen, Strikethrough und Autolinks sowie
YAML-Frontmatter. Die ESLint-Vorbereitung muss entsprechend
`language: "markdown/gfm"` und `languageOptions: { frontmatter: "yaml" }` setzen.
Math-, TOML- und JSON-Frontmatter-Erweiterungen werden nicht aktiviert.

YAML wird aus dem Originaltext-Ausschnitt gelesen, damit CRLF-Offsets nicht durch
den normalisierten MDAST-YAML-Wert verschoben werden. Einzelne CR-Zeilenenden
werden ausschließlich für den YAML-Parser längengleich zu LF übersetzt. Originaltext
und Body werden nicht normalisiert. Die YAML-Bibliothek liefert Fehlercodes und
Fehlerbereiche; Loader rechnet diese auf den gesamten Originaltext um.

## Fehlerbehandlung und Verantwortlichkeit

Das bestehende Verhalten bleibt Standard: Ungültiges YAML wirft
`DocumentParseError`. Validator-Anwendungen können ausdrücklich sammeln:

```ts
import { loadDocuments } from "@dokkurator/loader";

const documents = await loadDocuments(source, { parseErrors: "collect" });
```

Bei YAML-Syntaxfehlern oder doppelten Schlüsseln erhält das betroffene Dokument
Parse-Diagnosen mit Code, Schwere, Nachricht, Quellenmetadaten und Originalposition.
`metadata` und `type` sind dann `undefined`; partiell geparste Werte werden nicht
als gültige Metadaten angeboten. Markdown-Body, AST und Originaltext bleiben
verfügbar. Andere Dokumente im Batch werden weiterhin geparst. I/O-Fehler und
unerwartete Runtime-Fehler bleiben operationale Fehler und werden nicht als
Dokumentdiagnosen verschleiert.

Für den späteren kombinierten Loader/Lint-Ablauf gilt: Ein YAML-Parse-Fehler hat
nur einen diagnostischen Eigentümer. Wenn die Frontmatter-Lint-Integration den
Originaltext prüft, sind ihre normalisierten Parse-Diagnosen maßgeblich; die
Loader-Diagnosen werden nicht zusätzlich angehängt. Wenn wegen eines Loader-
Parse-Fehlers die Frontmatter-Prüfung ausgelassen wird, werden stattdessen die
Loader-Diagnosen übernommen. Diese Auswahl wird in Aufgaben 05/06 konkret
implementiert; das Sammeln hier verhindert zunächst den Batch-Abbruch.

Eine Feldpositions-API oder persistierter YAML-CST wird noch nicht eingeführt.
Aufgabe 06 konkretisiert den Bedarf der eigenen Schema-Integration; der Originaltext bleibt
für deren Positionsbestimmung verfügbar.

## Nachweis

Die Loader-Tests prüfen Text und Positionen bei Frontmatter, LF/CRLF/CR, Unicode,
BOM, getrennten Quellen, GFM sowie Syntaxfehlern und doppelten YAML-Schlüsseln.
Ein Test lädt identischen Text aus dem Dateisystem und aus einer festen Git-
Revision trotz verändertem Arbeitsverzeichnis. Der Validator-Kompatibilitätstest
vergleicht Überschriftenpositionen über die öffentliche Loader-Root-API mit
ESLint für Frontmatter, BOM, CRLF und Unicode.
