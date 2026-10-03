# Validator ausprobieren

Das Beispiel lädt acht DocTypes und prüft Markdown mit der synchronen
Dokkurator-Fassade oder direkt mit ESLint. Alle Daten bleiben lokal. Ein
Knowledge-Index wird nicht benötigt.

## Einfach starten

Der Standardstart prüft **ein Dokument mit einem Compact-DocType**. Er benötigt
keine eigene JavaScript-Konfiguration, keine zusätzlichen Plugins und keine
externen Schema-Ressourcen. Die recommended-Regeln sind automatisch aktiv.

Die Pakete sind derzeit lokale Workspace-Abhängigkeiten. Einmalig im
Repository-Stammverzeichnis installieren und bauen (Node.js `>=22.13.0 <23`
oder `>=24.0.0`, pnpm `>=10 <11`):

```sh
pnpm install
pnpm --filter @dokkurator/validator... build
cd examples/validator
npm start
```

Danach kannst du das Beispiel in `examples/validator` auch mit `yarn start`
oder `pnpm start` aufrufen. Diese Befehle starten denselben Node-Einstiegspunkt.
Eine eigenständige Installation außerhalb des Repositorys ist noch nicht
vorbereitet: `workspace:*` verweist auf die lokalen Dokkurator-Pakete. Dafür
müssen später installierbare Paketversionen oder Artefakte bereitgestellt werden.

Erwartet wird ein Ergebnis mit `"status": "passed"` und einer leeren
Diagnoseliste. Der Ablauf steht vollständig in [`src/minimal.mjs`](./src/minimal.mjs).
Loader und Validator werden dort direkt verwendet; die geplante
[Core-Integration](../../docs/task/core-validator-integration.md) soll diese
Projekt-Orchestrierung künftig übernehmen, ohne einen Knowledge-Index zu öffnen.

## Compact-Schreibweise ausprobieren

Der minimale [DocType](./minimal/_dokkurator/.doctypes/guide/definition.yml)
sieht so aus:

```yaml
name: guide
metadata:
  title:
    type: string
    required: true
structure:
  requiredHeadings: [Einstieg]
```

Das zugehörige [Dokument](./minimal/documents/guide.md) verwendet `doctype: guide`
und enthält einen Titel sowie die Überschrift `Einstieg`. Entferne zum
Ausprobieren den Titel oder die Überschrift und starte erneut `npm start`.
Jetzt erhältst du einen Fehler mit seiner Position im Dokument und Exit-Code 1.

Bei Compact stehen die Felder direkt unter `metadata`; Pflichtfelder verwenden
`required: true`. Bei vollständigem JSON Schema stehen die Felder unter
`metadata.properties`, und `metadata.required` enthält eine Liste ihrer Namen.
Auch [guide](./_dokkurator/.doctypes/guide/definition.yml),
[release](./_dokkurator/.doctypes/release/definition.yml) und
[runbook](./_dokkurator/.doctypes/runbook/definition.yml) in der größeren Sammlung
verwenden Compact.

## Weitere Funktionen ausprobieren

Die übrigen Beispiele sind optional. Sie zeigen zusätzliche Möglichkeiten und
verwenden deshalb mehr Konfiguration. Alle folgenden Befehle werden direkt in
**`examples/validator`** ausgeführt:

```sh
# Acht gültige Dokumente prüfen
npm run demo:valid

# Alle 24 Dokumente der ausführlichen Sammlung prüfen
npm run demo:all

# Nur die 16 gezielten Fehler- und Warnungsbeispiele prüfen
npm run demo:invalid

# Identische Dokumente direkt mit ESLint prüfen
npm run demo:eslint

# Alternativ das Plugin mit seinem recommended-Profil direkt einbinden
npm run demo:plugin

# Einen virtuellen Editor-Text prüfen
npm run demo:virtual

# Beispielmeldungen mit beiden ESLint-Konfigurationen vergleichen
npm test
```

Dieselben Skripte lassen sich mit `yarn run <name>` oder `pnpm run <name>` starten.
Die Fehlersammlung endet absichtlich mit **Exit-Code 1**. Warnungen allein führen
zu `PASS` und Exit-Code 0: `custom-rule.md` und `duplicate-headings.md` demonstrieren
diesen Unterschied. Der virtuelle Text erzeugt ebenfalls nur eine Warnung.

## Dateien und DocTypes

| DocType                                                             | Schreibweise | Was er zeigt                                                                         |
| ------------------------------------------------------------------- | ------------ | ------------------------------------------------------------------------------------ |
| [guide](./_dokkurator/.doctypes/guide/definition.yml)               | Compact      | Pflichtfelder, Zielgruppen-Enum, Mindestlänge, Tags mit `pattern` und `uniqueItems`  |
| [decision](./_dokkurator/.doctypes/decision/definition.yml)         | JSON Schema  | `if`/`then`: angenommene oder abgelehnte Entscheidungen brauchen eine Begründung     |
| [architecture](./_dokkurator/.doctypes/architecture/definition.yml) | JSON Schema  | Komponentenname mit `pattern`, Abhängigkeiten und Pflichtüberschriften               |
| [service](./_dokkurator/.doctypes/service/definition.yml)           | JSON Schema  | `additionalProperties: false`, verschachtelte Pflichtfelder, URL- und E-Mail-Formate |
| [api](./_dokkurator/.doctypes/api/definition.yml)                   | JSON Schema  | `oneOf` für Authentifizierung und ein begrenzter Zahlenbereich                       |
| [release](./_dokkurator/.doctypes/release/definition.yml)           | Compact      | Versionsmuster, Datumsformat und eine nicht leere Liste                              |
| [runbook](./_dokkurator/.doctypes/runbook/definition.yml)           | Compact      | Boolean und Integer ohne automatische Typumwandlung, drei Pflichtabschnitte          |
| [reference](./_dokkurator/.doctypes/reference/definition.yml)       | JSON Schema  | `$ref` auf vorab geladene gemeinsame Schema-Ressourcen                               |

Die zugehörigen Dokumente liegen in [`documents/valid`](./documents/valid/) und
[`documents/invalid`](./documents/invalid/). Der Dateiname des Fehlerbeispiels
benennt die geprüfte Bedingung. Weitere Beispiele zeigen ungültiges YAML,
fehlende oder unbekannte DocTypes, doppelte Überschriften und die eigene Regel.

## So funktioniert die ausführliche Library-Variante

[`src/setup.mjs`](./src/setup.mjs) lädt die DocTypes über `FileSystemSource`, liest
das gemeinsame Schema und ruft `prepareLintConfiguration` auf. Hier werden auch
Plugins importiert und Regeln als JavaScript-Objekt aktiviert oder überschrieben.
Standardmäßig sind die recommended-Regeln von Dokkurator und `@eslint/markdown`
aktiv. Zwei Regeln werden im Beispiel als Warnung konfiguriert.

[`src/run.mjs`](./src/run.mjs) lädt anschließend die Dokumente. Erst danach ruft
es für jedes Dokument unabhängig und synchron auf:

```js
const result = lint({
  originalText: document.originalText,
  source: document.source,
  configuration,
});
```

Das Ergebnis enthält den Status sowie Diagnosen mit Rule-ID, Schwere,
Quellenidentität und Zeile/Spalte im Originaltext. Mehrere Dokumente sind eine
Sammlung einzelner Aufrufe; es werden keine Beziehungen zwischen ihnen geprüft.
Ein bereits geladenes Git-Dokument oder virtueller Text kann genauso übergeben
werden. [`src/virtual.mjs`](./src/virtual.mjs) zeigt die zweite Variante.

`parseErrors: "collect"` erhält fehlerhafte YAML-Dokumente als Eingabe für die
Regeln. Die Loader-Diagnosen werden nicht zusätzlich angehängt, weil ESLint den
Originaltext erneut prüft und den Parsefehler meldet. Ohne diese Option wirft der
Loader einen `DocumentParseError`. Fehlende Dateien oder ungültige DocType-Dateien
brechen bereits das Laden ab; ungültige Schemas oder unbekannte Regeln führen
bei der Vorbereitung zu einem `LintConfigurationError`. Diese Fehler sind keine
gewöhnlichen Dokument-Findings. Unerwartete Regelabstürze meldet die Fassade als
`LintRuntimeError`.

## Direktes ESLint und eigene Regeln

[`eslint.config.mjs`](./eslint.config.mjs) verwendet `createLintConfig` mit derselben
vorbereiteten Konfiguration wie die Fassade. Das alternative
[`eslint-plugin.config.mjs`](./eslint-plugin.config.mjs) bindet `plugin` und
`plugin.configs.recommended` explizit ein. Es setzt Markdown als Sprache,
YAML-Frontmatter und `settings.dokkurator` für die vorbereiteten DocTypes.

[`src/custom-plugin.mjs`](./src/custom-plugin.mjs) definiert eine unabhängige
Markdown-Regel: `example/no-todo` meldet sichtbare Textknoten mit einem
`TODO`-Platzhalter. Codeblöcke und Inline-Code werden dabei nicht geprüft. Das
Plugin wird in JavaScript importiert und die Regel mit `warn` aktiviert. Die
Validator-Runtime kennt weder diese Regel noch ihre fachliche Bedeutung.

Zum Experimentieren kannst du ein gültiges Dokument kopieren oder eine Definition
ändern und den passenden Lauf erneut starten. Weitere Regeln lassen sich in
`src/setup.mjs` hinzufügen, überschreiben oder mit `off` abschalten. Für den
alternativen direkten Plugin-Aufbau passe auch dessen Konfiguration an.

## Grenzen und Hinweise

- Die Frontmatter-Kennung heißt `doctype`; `type` ist kein Alias.
- Compact erweitert nur die oberste Feldkarte zu `properties` und übernimmt
  `required: true` in die Pflichtfeldliste. Innerhalb eines Feldes bleiben
  JSON-Schema-Keywords erhalten. Verschachtelte Objekte verwenden die normale
  Schema-Schreibweise. Bedingungen zwischen Feldern und Objektoptionen benötigen
  das vollständige Schema. Deshalb steht das Metadatenfeld `dependencies` im
  Architecture-Beispiel unter `properties`: sein Name ist auch ein Schema-Keyword.
- Zusätzliche Felder sind standardmäßig erlaubt. Das Service-Beispiel zeigt die
  ausdrückliche Einschränkung über `additionalProperties: false`.
- Verwendet wird JSON Schema Draft 7. `$ref`-Ressourcen werden vorab geladen;
  während der Prüfung erfolgt kein Download. Metadaten werden nicht durch
  Coercion, Defaults oder Feldentfernung verändert.
- Pflichtüberschriften vergleichen den sichtbaren, außen getrimmten Text unter
  Beachtung der Groß-/Kleinschreibung. Ihre Ebene und Reihenfolge sind beliebig.
- Das empfohlene Markdown-Profil zählt ein Frontmatter-Feld `title` als
  Dokumenttitel. Die Beispieldokumente beginnen deshalb direkt mit H2-Abschnitten;
  ein zusätzliches H1 würde `markdown/no-multiple-h1` auslösen.
- Keine Kontextvalidierung, Knowledge-Abfragen, Multi-Document-Regeln,
  Codeblock-Ausführung oder neue Dokkurator-CLI. Die vorhandene Dokkurator-CLI
  wird durch dieses Beispiel nicht um einen Validierungsbefehl erweitert.

## Migration vom temporären Validator

Die frühere `validateDocument`-Funktion mit `requiredFields` ist entfernt. Neue
Aufrufer laden `ParsedDocType` und Originaltext über die Loader-Root-API, bereiten
die Konfiguration einmal vor und verwenden `lint`. Pflichtfelder stehen im
Metadatenschema; Pflichtüberschriften werden von einer eigenen Regel geprüft.
Die Paket-Root-APIs bleiben die einzigen unterstützten Importpfade.
