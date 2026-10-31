---
type: readmes
---

# Validator ausprobieren

Die Beispiele verwenden `createDokkurator` und `app.validate()` für den
Minimalstart, die Sammlung mit acht DocTypes und einen Editor-Text. Zwei
zusätzliche Integrationen vergleichen die Ergebnisse direkt mit ESLint. Alle
Daten bleiben lokal. Die Validator-Läufe benötigen keinen Knowledge-Index.

## Einfach starten

Der Standardstart prüft **ein Dokument mit einem Compact-DocType**. Er benötigt
keine eigene JavaScript-Konfiguration, keine zusätzlichen Plugins und keine
externen Schema-Ressourcen. Die recommended-Regeln sind automatisch aktiv.

Die Pakete sind derzeit lokale Workspace-Abhängigkeiten. Einmalig im
Repository-Stammverzeichnis installieren und bauen (Node.js `>=22.13.0 <23`
oder `>=24.0.0`, pnpm `>=10 <11`):

```sh
pnpm install
pnpm --filter @dokkurator/core... build
cd examples/validator
pnpm start
```

Der Lauf liefert `results` pro Source und eine separate `errors`-Liste für
Lade-, Konfigurations- und Laufzeitfehler. Im Beispiel enthält `results[0].documents`
ein Dokument mit `"status": "passed"` und leerer Diagnoseliste.

[`src/minimal.mjs`](./src/minimal.mjs) verwendet ausschließlich Core:

```js
const app = createDokkurator({ root });
await app.open();
try {
  const result = await app.validate();
  console.log(result);
} finally {
  await app.close();
}
```

Die leere `minimal/dokkurator.config.mjs` grenzt den Minimalstart von der
ausführlichen Konfiguration im Elternordner ab. In einem eigenständigen Projekt
kann diese leere Datei entfallen.

Core löst die Projektkonfiguration auf, lädt DocTypes und Dokumente, bereitet die
recommended-Regeln vor und ruft den Validator pro Dokument synchron auf. Ohne
konfigurierte Sources ist das Projektverzeichnis die Source `root`. Hier genügt
der Projektpfad: eine `dokkurator.config.mjs` ist für den Standardfall nicht nötig.
`open()` und `validate()` öffnen keinen Knowledge-Index. Erst Index-Operationen
wie `prepare()`, `sync()`, `diff()` oder `search()` benötigen ihn. Dafür ist kein
Schalter in `createDokkurator` nötig.

Die Beispiele bleiben Teil des pnpm-Workspace und verwenden lokale Pakete;
eine Veröffentlichung oder eigenständige Paketinstallation ist nicht vorgesehen.

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
Ausprobieren den Titel oder die Überschrift und starte erneut `pnpm start`.
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
# Ergebnisse der acht gültigen Dokumente anzeigen
pnpm run demo:valid

# Alle 24 Dokumente der ausführlichen Sammlung prüfen
pnpm run demo:all

# Ergebnisse der 16 gezielten Fehler- und Warnungsbeispiele anzeigen
pnpm run demo:invalid

# Identische Dokumente direkt mit ESLint prüfen
pnpm run demo:eslint

# Alternativ das Plugin mit seinem recommended-Profil direkt einbinden
pnpm run demo:plugin

# Einen Editor-Text über eine temporäre Dateiquelle prüfen
pnpm run demo:virtual

# Beispielmeldungen mit beiden ESLint-Konfigurationen vergleichen
pnpm test
```

`demo:all`, `demo:valid` und `demo:invalid` prüfen die Sammlung über dieselbe
Core-Anwendung. Das Argument wählt die angezeigte Gruppe und die für den Exit-Code
gezählten Dokumentbefunde; Fehler beim Laden oder Prüfen der Source führen immer
zu Exit-Code 1.

Die Fehlersammlung endet absichtlich mit **Exit-Code 1**. Warnungen allein führen
zu `PASS` und Exit-Code 0: `custom-rule.md` und `duplicate-headings.md` demonstrieren
diesen Unterschied. Der virtuelle Text erzeugt ebenfalls nur eine Warnung.

## Knowledge per CLI ausprobieren

Dieser optionale Teil verwendet dieselben acht gültigen Dokumente, DocTypes und
dieselbe Projektkonfiguration. Nach `pnpm install` im Repository-Stammverzeichnis
startest du mit drei Befehlen (Node.js und pnpm wie oben):

```sh
pnpm --filter @dokkurator/cli... build
cd examples/validator
pnpm run knowledge:index
```

Die gemeinsame Konfiguration umfasst `documents/valid` und die absichtlich
fehlerhaften Dokumente in `documents/invalid`. Der Knowledge-Teil ist noch in
Vorbereitung: Die [tolerante Indexierung](../../docs/task/index-invalid-documents.md)
muss zuerst umgesetzt werden, damit ungültiges YAML den Indexlauf nicht abbricht. `minimal/` liegt außerhalb des
Dokumentordners und ist ein eigener Projekt-Root. Ohne konfigurierte Sources
verwendet die CLI das Projekt als Source `root`; `source add` ist nicht nötig.
Der lokale Index liegt unter `.dokkurator/index.db` und wird von Git ignoriert.

Alle folgenden Befehle werden in `examples/validator` ausgeführt. pnpm reicht
Argumente direkt weiter; ein zusätzliches `--` ist nicht erforderlich.

```sh
# Volltext: die angenommene Entscheidung zur synchronen Validierung
pnpm run knowledge:search ESLint

# Phrase: die Anführungszeichen gehören zur Suchabfrage
pnpm run knowledge:search '"Regeln synchron"'

# Metadaten und implizites AND
pnpm run knowledge:search status:accepted
pnpm run knowledge:search doctype:decision status:accepted

# OR und Klammern: Anleitung oder Runbook; Entscheidung oder Release
pnpm run knowledge:search doctype:guide OR doctype:runbook
pnpm run knowledge:search '(doctype:decision OR doctype:release) AND status:accepted'

# Ergebniszahl begrenzen
pnpm run knowledge:search ESLint --limit 3
```

Treffer werden als JSON mit Inhalt, Metadaten und Source-Pfad ausgegeben.
`index` arbeitet inkrementell: ohne Änderungen werden keine Dokumente erneut
indexiert. Ergänze zum Ausprobieren einen Satz im Text von
[`documents/valid/decision.md`](./documents/valid/decision.md), und führe aus:

```sh
pnpm run knowledge:diff
pnpm run knowledge:index
pnpm run knowledge:diff
```

Das erste `diff` zeigt `modified`, ohne den Index zu verändern. Nach `index`
zeigt das zweite `diff` keine Änderungen mehr. Siehe auch die
[CLI-Referenz](../../apps/cli/docs/commands.md).

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

## Vorbereitung, Konfiguration und Ausführung

Die Beispiele trennen drei Aufgaben:

| Aufgabe                  | Datei                                                      | Was dort passiert                                                       |
| ------------------------ | ---------------------------------------------------------- | ----------------------------------------------------------------------- |
| Ressourcen vorbereiten   | [`src/prepare-resources.mjs`](./src/prepare-resources.mjs) | Gemeinsames JSON Schema lesen und parsen; keine Regeln aktivieren       |
| Dokkurator konfigurieren | [`dokkurator.config.mjs`](./dokkurator.config.mjs)         | Dokumentpfade wählen, Schema und Plugin registrieren, Regeln aktivieren |
| Dokkurator ausführen     | [`src/run.mjs`](./src/run.mjs)                             | `createDokkurator`, `open`, `validate`, Ergebnisse ausgeben und `close` |

Das Lesen des externen Schemas ist eine Vorbereitung für dieses `$ref`-Beispiel.
Es ist kein Pflichtschritt für Dokkurator. DocTypes und Dokumente lädt Core selbst.
Auch das eigene Plugin hat seine Implementierung separat in `src/custom-plugin.mjs`;
erst die Projektkonfiguration registriert es und aktiviert seine Regel.

Beim Editor-Beispiel richtet [`src/prepare-virtual-project.mjs`](./src/prepare-virtual-project.mjs)
die temporären Dateien ein. Die eigentliche Konfiguration steht separat in
[`src/virtual.dokkurator.config.mjs`](./src/virtual.dokkurator.config.mjs).
[`src/virtual.mjs`](./src/virtual.mjs) kennzeichnet Vorbereitung, Dokkurator-Aufruf
und Aufräumen als drei Schritte. Diese temporären Dateien sind nur wegen der
aktuellen Dateiquellen-API nötig.

[`src/setup.mjs`](./src/setup.mjs) ist ausschließlich eine Vorbereitung für den
direkten ESLint-Vergleich. Die Konfiguration in `eslint*.config.mjs` gehört zu
ESLint. Für `app.validate()` werden diese Integrationsdateien nicht benötigt.

## So funktioniert die ausführliche Core-Variante

[`dokkurator.config.mjs`](./dokkurator.config.mjs) enthält die eigentliche
Dokkurator-Konfiguration: Dokumentpfade, Schema-Zuordnung, Plugin-Registrierung und
Regelaktivierung. Die Datei übernimmt bereits vorbereitete Ressourcen.
`validator.schemas`, `validator.plugins` und `validator.rules` konfigurieren die
Prüfung. Die recommended-Regeln von Dokkurator und `@eslint/markdown` sind
standardmäßig aktiv; zwei Regeln werden hier als Warnung überschrieben.

[`src/run.mjs`](./src/run.mjs) öffnet die Anwendung, ruft `app.validate()` auf und
schließt sie in `finally`. Core übernimmt das Laden, die Vorbereitung und die
Prüfung. Die Ergebnisse enthalten pro Source die Dokumente mit Status und
Diagnosen. YAML-Parsefehler erscheinen als Dokumentbefunde; Lade-, Konfigurations-
und unerwartete Regelfehler stehen in der separaten `errors`-Liste. Mehrere
Dokumente werden unabhängig geprüft; Beziehungen zwischen ihnen sind nicht Teil
dieser Beispiele.

[`src/virtual.mjs`](./src/virtual.mjs) zeigt einen Editor-Text mit derselben
Core-API. Da Core bisher Dateiquellen unterstützt, schreibt das Beispiel den
Text in ein temporäres Projekt, übernimmt die DocTypes sowie die gemeinsame
Validator-Konfiguration und verwendet die Source-ID `editor-buffer`. Anwendung
und temporäres Projekt werden anschließend auch bei Fehlern aufgeräumt. Ein
In-Memory-Adapter für Editor-Texte ist noch nicht Teil der Core-API.

## Direktes ESLint und eigene Regeln

[`eslint.config.mjs`](./eslint.config.mjs) verwendet `createLintConfig` mit denselben
Validator-Einstellungen wie die Core-Anwendung.
[`src/setup.mjs`](./src/setup.mjs) lädt hierfür die DocTypes über
`createDokkurator` und `app.listDocTypes()`. Nur für die direkte ESLint-Anbindung
übersetzt es sie mit `prepareLintConfiguration` in eine ESLint-Konfiguration.
Das alternative
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
`dokkurator.config.mjs` hinzufügen, überschreiben oder mit `off` abschalten.
Die direkte Plugin-Konfiguration übernimmt ebenfalls dieses Regelobjekt.

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
- Keine Kontextvalidierung, Multi-Document-Regeln,
  Codeblock-Ausführung oder neue Dokkurator-CLI. Die vorhandene Dokkurator-CLI
  wird durch dieses Beispiel nicht um einen Validierungsbefehl erweitert.

## Migration vom temporären Validator

Die frühere `validateDocument`-Funktion mit `requiredFields` ist entfernt. Die
Beispiele verwenden stattdessen
`createDokkurator` und `app.validate()`. Direkte Validator-Integrationen können
weiterhin DocTypes und Originaltext laden, die Konfiguration vorbereiten und
`lint` verwenden. Pflichtfelder stehen im Metadatenschema; Pflichtüberschriften werden von einer eigenen Regel geprüft.
Die Paket-Root-APIs bleiben die einzigen unterstützten Importpfade.
