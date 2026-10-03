# Validator

Der Validator prüft Markdown synchron mit ESLint. DocTypes bleiben YAML;
ESLint-Regeln und Plugins werden in JavaScript konfiguriert.

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
Konfigurationsfehler. Beide Regeln haben keine zusätzlichen Regeloptionen.
Die Paket-Root ist der einzige Exportpfad; zusätzliche Hilfstypen werden nicht exportiert.

## DocType-Regeln

`dokkurator/doctype` prüft YAML, die eindeutige DocType-Zuordnung und Metadaten
gegen das vorbereitete JSON Schema. `dokkurator/required-headings` prüft
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
- Beide Regeln sind unabhängig abschaltbar. Ungültige Überschriftenanforderungen
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

Die bestehende `validateDocument`-API bleibt verfügbar. Der synchrone Einstieg
für vollständiges Markdown ist `lint({ originalText, source, configuration })`.
