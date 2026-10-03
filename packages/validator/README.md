# Validator

Der Validator prüft Markdown synchron mit ESLint. DocTypes bleiben YAML;
ESLint-Regeln und Plugins werden in JavaScript konfiguriert.

## Ablauf und Zuständigkeiten

Es gibt zwei getrennte Phasen:

1. `prepareLintConfiguration` nimmt bereits geladene Daten entgegen. Die
   DocType-Vorbereitung erstellt unveränderliche Definitionen und eine Suche nach
   Namen. Die Schema-Vorbereitung kompiliert alle JSON Schemas mit Ajv. Danach
   entsteht die geprüfte ESLint-Konfiguration mit den empfohlenen Profilen.
2. `lint` prüft die Eingabe, führt ESLint aus und bereitet dessen Meldungen mit
   Quellenidentität und Originalpositionen auf. ESLint ruft die aktivierten
   Regeln auf; nur die Metadaten-Regel verwendet den vorbereiteten Ajv-Validator.

| Bereich unter `src/` | Aufgabe                                                                    |
| -------------------- | -------------------------------------------------------------------------- |
| `schemas/`           | Schema-Identitäten, Registrierung und Ajv-Kompilierung; keine ESLint-Regel |
| `doc-types/`         | Definitionen vorbereiten und DocType anhand von Metadaten auswählen        |
| `markdown/`          | Frontmatter aus Originaltext lesen und YAML-Positionen erhalten            |
| `rules/`             | Einzelne fachliche ESLint-Prüfungen                                        |
| `plugin/`            | Regeln bündeln, empfohlenes Profil und Regel-Settings bereitstellen        |
| `lint/`              | ESLint-Konfiguration, Ausführung und Ergebnisaufbereitung                  |
| `legacy/`            | Bestehende Pflichtfeld-API, unabhängig vom neuen Ablauf                    |

Die Einstiegspunkte beschreiben den Ablauf mit benannten Schritten. Die
Ajv-Optionen, YAML-Knotenauflösung, ESLint-Konfigurationsprobe und
Diagnoseumwandlung liegen in den jeweiligen Implementierungen. `index.ts`
enthält ausschließlich Exports; es gibt keine neuen Paketgrenzen.

## In einer normalen ESLint-Konfiguration

`eslint.config.js` in einem ESM-Projekt (alternativ `eslint.config.mjs`):

```js
import { FileSystemSource, loadDocTypes } from "@dokkurator/loader";
import { createLintConfig } from "@dokkurator/validator";

const source = new FileSystemSource({ root: process.cwd() });
const docTypes = await loadDocTypes(source);

export default createLintConfig({
  docTypes,
  rules: {
    "dokkurator/required-headings": "error",
    "markdown/no-duplicate-headings": "warn",
  },
});
```

Der Helfer aktiviert `markdown/gfm`, YAML-Frontmatter, das empfohlene Profil von
`@eslint/markdown` sowie `plugin.configs.recommended`. Die Standardregeln werden
im Plugin definiert; der Konfigurationshelfer kennt keine einzelnen Rule-IDs.
DocTypes und zusätzliche
Schema-Ressourcen werden vorab geladen; die Regelausführung benötigt keine I/O.
Projekt- und Repository-Konfigurationen können die Regeln jeweils mit `warn`
oder `off` überschreiben.

## Plugin direkt importieren

Das Paket exportiert außerdem das normale ESLint-Plugin `plugin`. Es verwendet
vorbereitete Daten aus `settings.dokkurator`:

```js
import markdown from "@eslint/markdown";
import { FileSystemSource, loadDocTypes } from "@dokkurator/loader";
import { plugin, prepareLintConfiguration } from "@dokkurator/validator";

const source = new FileSystemSource({ root: process.cwd() });
const prepared = prepareLintConfiguration({
  docTypes: await loadDocTypes(source),
});

export default [
  ...markdown.configs.recommended,
  ...plugin.configs.recommended,
  {
    files: ["**/*.[mM][dD]"],
    language: "markdown/gfm",
    languageOptions: { frontmatter: "yaml" },
    plugins: { markdown },
    settings: { dokkurator: prepared },
  },
];
```

Ohne vorbereitete `settings.dokkurator` melden aktivierte Dokkurator-Regeln einen
Konfigurationsfehler. Die Regeln haben keine zusätzlichen Regeloptionen.
Die Paket-Root ist der einzige Exportpfad; zusätzliche Hilfstypen werden nicht exportiert.

## DocType-Regeln

Das empfohlene Profil aktiviert drei voneinander getrennte Regeln:

- `dokkurator/doctype` prüft YAML und die eindeutige DocType-Zuordnung.
- `dokkurator/metadata-schema` prüft Metadaten gegen das vorbereitete JSON Schema.
- `dokkurator/required-headings` prüft Pflichtüberschriften.

Alle drei Regeln sind unabhängig mit `warn` und `off` konfigurierbar. Seit der
Trennung deaktiviert `dokkurator/doctype: off` die Schema-Prüfung nicht mehr;
dazu wird `dokkurator/metadata-schema: off` verwendet. Bei fehlerhaftem YAML oder
ungültiger Zuordnung überspringt die Schema-Regel die Prüfung, damit nur die
Zuordnungs-Regel den ursprünglichen Fehler meldet.

Pflichtüberschriften stehen in
`structure.requiredHeadings`, beispielsweise in
`_dokkurator/.doctypes/decision/definition.yml`:

```yaml
name: decision
metadata:
  type: object
  required: [doctype]
  properties:
    doctype:
      const: decision
structure:
  requiredHeadings: [Context, Decision]
```

Für Pflichtüberschriften gilt:

- Der sichtbare Text wird wie im Loader mit `mdast-util-to-string` bestimmt.
  Markdown-Formatierung, Links, Inline-Code und Bild-Alternativtexte zählen mit.
  Außenliegende Leerzeichen werden entfernt; Groß-/Kleinschreibung und innere
  Leerzeichen bleiben erhalten.
- Jede Ebene von H1 bis H6 zählt, ebenso Setext-Überschriften und Überschriften
  innerhalb von Zitaten. Reihenfolge und Anzahl sind nicht vorgeschrieben.
- Eine passende Überschrift erfüllt die Anforderung. Wiederholte Anforderungen
  nach dem Entfernen äußerer Leerzeichen werden einmal ausgewertet. Doppelte
  Dokumentüberschriften sind bei Bedarf Aufgabe von `markdown/no-duplicate-headings`.
- Text in Absätzen, HTML-Blöcken oder Codeblöcken zählt nicht als Markdown-Überschrift.
- Ein fehlender Abschnitt erzeugt `missing-heading` am Frontmatter, mit DocType
  und Überschriftentext in der Meldung. Bei fehlerhaftem YAML oder ungültiger
  DocType-Zuordnung werden keine zusätzlichen Überschriftenfehler erzeugt.
  Bei gültiger Zuordnung läuft die Inhaltsprüfung auch bei Schema-Verletzungen.
- Die Regeln sind unabhängig abschaltbar. Ungültige Überschriftenanforderungen
  prüft die aktivierte Überschriften-Regel in ihrem `create`-Schritt selbst und
  meldet sie als Konfigurationsfehler. Bei `off` erfolgt diese Prüfung nicht.
  Die allgemeine DocType-Vorbereitung kennt diese Regelkonfiguration nicht.

Zusätzliche Plugins müssen Regeln für den Markdown-AST bereitstellen.
JavaScript-Regeln können diesen AST nicht als JavaScript-AST auswerten. Es gibt
keinen Codeblock-Processor, keine Embedded-Code-Runtime und keine Mermaid-Prüfung.

Die Fassade unterscheidet Regel-Konfigurationsfehler von unerwarteten Abstürzen.
Die Diagnosephase kommt ebenfalls aus der jeweiligen Regel: Optional ordnet
`meta.messagePhases` Message-IDs `parse` oder `lint` zu. Ohne Zuordnung gilt
`lint`; fatale ESLint-Parserfehler sind stets `parse`. Dafür sind keine konkreten
Rule-IDs in der Fassade hinterlegt.

Die bestehende `validateDocument`-API bleibt als isolierte Kompatibilitätsfunktion
in `legacy/validate-document.ts` verfügbar. Sie ist keine zusätzliche ESLint-Regel.
Der synchrone Einstieg
für vollständiges Markdown ist `lint({ originalText, source, configuration })`.
