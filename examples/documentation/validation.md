# Dokumente validieren

Voraussetzung: [Installation und Build](./README.md#vorbereitung).
Alle Befehle laufen in `examples/documentation`.

## Die Sammlung prüfen

```sh
pnpm run validate
pnpm run validate:json
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

Das einzige ausführbare JS-Beispiel [validate.mjs](./validate.mjs) öffnet die
gemeinsame Sammlung, validiert, gibt den gemeinsamen JSON-Bericht aus und schließt die
Anwendung in `finally`. Auch dieser Aufruf endet wegen der absichtlichen
Fehler mit Exit-Code 1:

```sh
pnpm run validate:core
pnpm test
```

Core lädt Dokumente, DocTypes und Regeln selbst. `open()` und `validate()`
benötigen keinen Index. Die [separate ESLint-Integration](../eslint/README.md)
verwendet dieselbe Sammlung und Konfiguration.

Der eigenständige [Minimalfall](../minimal-validation/README.md) zeigt die
Compact-Schreibweise mit einem Dokument.

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
