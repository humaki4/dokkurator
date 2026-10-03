# 04 — DocType-Auswahl und ESLint-Konfiguration vorbereiten

Status: abgeschlossen. Öffentliche API, Schema- und Auswahlregeln siehe
[Konfigurationsvertrag](./04-konfigurationsvertrag.md).

Abhängigkeiten: 01, 02. Aufgabe 03 wurde auf Wunsch übersprungen; das externe
Frontmatter-Plugin wird nicht verwendet.

## Outcome

Eine gemeinsame Konfigurationsvorbereitung liefert dieselben DocType- und Schemaentscheidungen für Dokkurator und direktes ESLint.

## Schritte

- Das reale `ParsedDocType.metadata` als JSON Schema Draft 7 verwenden.
- Eine vorbereitete DocType-Registry und Auswahl über `doctype` definieren; fehlende und unbekannte Werte sichtbar behandeln.
- `$schema`-Annotationen dürfen die DocType-Zuordnung nicht stillschweigend überschreiben; Konfliktverhalten festlegen und prüfen.
- Schema-Identitäten, Format-Unterstützung, `$ref`-Auflösung und Ajv-Optionen spezifizieren.
- Schema-Prüfung ohne Coercion, Default-Injektion oder Feldentfernung konfigurieren.
- Einen öffentlichen Flat-Config-Helfer entwerfen und implementieren; dokumentieren, wo Laden endet und synchrone Ausführung beginnt.
- Regeln und Schemas vorab validieren; unbekannte Regeln und ungültige Optionen als Konfigurationsfehler behandeln.

## Abnahmekriterien

- Ein Dokument wählt unabhängig vom Ausführungspfad denselben DocType.
- Bedingte Metadatenanforderungen funktionieren über JSON Schema `if`/`then`.
- Ungültige Schemas und nicht vorbereitete Referenzen scheitern sichtbar vor der Regelausführung.
- Keine eigene generische Bedingungs-DSL und kein eigener lokaler Rule-Registry-Vertrag entstehen.

## Umfangsgrenze

Keine automatische Schema-Auflösung während eines Rule-Visitors; keine Knowledge-Abhängigkeit.

## Grundlage

[Task-Übersicht](./README.md) · [Validator-Spezifikation 2](../../../packages/validator/spec/Validator%20Specification%202%20-%20ESLint%20and%20Context%20Validation.md)
