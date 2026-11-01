---
type: readmes
---

# Validator ausprobieren

Der Standardweg verwendet die CLI: Dokumente und DocTypes anlegen, bei Bedarf
Regeln konfigurieren und `dokkurator validate` starten. Ein Knowledge-Index ist
für Validierung nicht nötig. Alle Daten bleiben lokal.

## Einfach starten

Einmalig im Repository-Stammverzeichnis installieren und bauen
(Node.js `>=22.13.0 <23` oder `>=24.0.0`, pnpm `>=10 <11`):

```sh
pnpm install
pnpm --filter @dokkurator/cli... build
cd examples/validator
pnpm start
```

`start` und `demo` führen `dokkurator --project minimal validate` aus.
Dieser Minimalfall prüft ein Dokument mit einem Compact-DocType und endet mit
Exit-Code 0; der Standardformatter gibt bei Erfolg nichts aus. Die leere `minimal/dokkurator.config.mjs` verhindert, dass die
Konfiguration des Elternordners geladen wird. Im eigenständigen Projekt kann sie
entfallen; die recommended-Regeln sind automatisch aktiv.

## Die Sammlung prüfen

```sh
pnpm run demo:all
pnpm run demo:json
# dieselben Aufrufe direkt:
pnpm exec dokkurator validate
pnpm exec dokkurator validate --format json
```

Die Sammlung enthält acht DocTypes und 24 Dokumente. 14 Dokumente schlagen fehl,
daher enden diese Aufrufe absichtlich mit Exit-Code 1. Die Ordner `documents/valid`
und `documents/invalid` unterscheiden gültige und gezielt fehlerhafte Beispiele.
`custom-rule.md` und `duplicate-headings.md` enthalten nur Warnungen und bleiben
erfolgreich. JSON ist auch bei Fehlern parsebar: `results` enthält Dateiergebnisse,
`sources` die Dokumentdiagnosen und `errors` operative Fehler.

## Direkte Core-Einbindung

Das einzige ausführbare JS-Beispiel [validate.mjs](./validate.mjs) öffnet den
Minimalfall, validiert, gibt den gemeinsamen JSON-Bericht aus und schließt die
Anwendung in `finally`:

```sh
pnpm run demo:core
pnpm test
```

Core lädt Dokumente, DocTypes und Regeln selbst. `open()` und `validate()`
benötigen keinen Index. Die [separate ESLint-Integration](../validator-eslint/README.md)
verwendet dieselbe Sammlung und Konfiguration.

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

## Konfiguration und eigene Regel

[dokkurator.config.mjs](./dokkurator.config.mjs) legt den Dokumentordner fest,
importiert [das gemeinsame Schema](./schemas/common.schema.json) direkt mit
`with { type: "json" }` und registriert [rules/no-todo.mjs](./rules/no-todo.mjs).
`validator.schemas`, `validator.plugins` und `validator.rules` konfigurieren die
Prüfung. Die beiden zusätzlichen Regeln sind als Warnungen aktiviert.

`example/no-todo` meldet TODO-Platzhalter in sichtbaren Textknoten; Codeblöcke
und Inline-Code werden nicht geprüft. `$ref` im Reference-DocType nutzt das
importierte Schema ohne Netzwerkzugriff. Änderungen an Dokumenten, DocTypes,
Schema oder Regel gelten auch für ESLint ohne Kopier- oder Vorbereitungsschritt.

## Knowledge per CLI (Vorschau)

Knowledge verwendet dasselbe Dokkurator-Projekt und dieselbe vollständige
Sammlung. Die Demo wartet noch auf [tolerante Indexierung](../../docs/task/prepare-examples/05c-tolerant-indexing.md):
absichtlich ungültiges YAML bricht den Indexlauf derzeit ab. Der Minimalfall ist
ein eigener Projekt-Root und liegt außerhalb der gemeinsamen Sammlung.
Nach Umsetzung der Voraussetzung ist der vorgesehene Ablauf:

```sh
pnpm run knowledge:index
pnpm run knowledge:search ESLint
pnpm run knowledge:search status:accepted
# documents/valid/decision.md bearbeiten, dann:
pnpm run knowledge:diff
pnpm run knowledge:index
pnpm run knowledge:diff
```

`diff` verändert den Index nicht; `index` arbeitet inkrementell. Der lokale Index
liegt unter `.dokkurator/index.db` und wird von Git ignoriert. Weitere Befehle
stehen in der [CLI-Referenz](../../apps/cli/docs/commands.md).

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
