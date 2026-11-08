---
doctype: task
title: Optionale DocTypes und projektbezogene Validierung
status: draft
---

# Optionale DocTypes und projektbezogene Validierung

Arbeitsentwurf vom 7. November 2026, zur gemeinsamen Abstimmung. Keine
Implementierungsfreigabe und keine Freigabe für Änderungen öffentlicher APIs.

## Ziel

Dokkurator soll schrittweise in bestehende Dokumentbestände eingeführt werden
können. Die Aktivierung allein verpflichtet Dokumente weder zu Frontmatter noch
zu einem DocType. Eine bekannte Typzuordnung ist dagegen ein Vertrag: Das Dokument muss die
Anforderungen dieses Typs erfüllen. Unbekannte Typnamen sind standardmäßig
erlaubt, damit bestehende Projekte schrittweise einsteigen können.

Projekte sollen DocTypes verpflichtend machen und unbekanntes Frontmatter
einschränken können. Die Ablehnung unbekannter Typnamen wird unabhängig von der DocType-Pflicht
einstellbar. Zusätzliche Felder richten sich ausschließlich nach dem DocType-Schema.

## Bereits geäußerter Bedarf

- Standard: kein verpflichtender DocType; Frontmatter ohne Typ ist erlaubt.
- Ist ein bekannter DocType angegeben, muss das Dokument dessen Struktur entsprechen.
- Unbekannte Typnamen sind standardmäßig erlaubt und werden nicht DocType-spezifisch
  geprüft; Projekte können ihre Ablehnung aktivieren.
- Zusätzliche Felder werden ausschließlich durch das jeweilige Schema geregelt;
  es gibt kein zusätzliches projektweites Feldverbot.
- Optional: projektbezogene Pflicht zu DocTypes und Einschränkung auf bekannte
  DocTypes beziehungsweise bekanntes Frontmatter.

## Noch abzustimmen

- Syntaktisch gültiges, aber nicht als Mapping vorliegendes Frontmatter sowie
  leere YAML-Blöcke: Verhalten separat abstimmen.
- Bestehende Rangfolge Projekt → Source und konkrete API-Ausgestaltung bestätigen.
- `$schema` ohne bekannten Typ abschließend festlegen.

## Vorgehen nach Spec Driven Development

| Schritt | Ergebnis | Voraussetzung |
| --- | --- | --- |
| [01 – Delta-Spec](01-behavior-spec.md) | Verhaltensänderungen, Akzeptanz- und YAML-Matrix | Antworten auf offene Fachfragen |
| [02 – Konfigurationsvertrag](02-configuration-design.md) | Konkrete Konfiguration, Kompatibilität und API-Entscheidung | 01 |
| [03 – Umsetzung](03-implementation-tasks.md) | Kleine, überprüfbare Arbeitspakete | 01 und 02 akzeptiert |

Erst die Spec abstimmen, dann den Konfigurationsvertrag festlegen und notwendige
öffentliche API-Änderungen bestätigen, anschließend implementieren. Änderungen
der Entscheidungen werden zuerst in der Spec und ihren Beispielen nachgeführt.

## Befund im aktuellen Code

- [selectDocType](../../../packages/validator/src/doc-types/select-doc-type.ts)
  klassifiziert fehlendes Frontmatter und fehlenden `doctype` als ungültig.
- [doctypeRule](../../../packages/validator/src/rules/doctype-rule/doctype-rule.ts)
  meldet diese Fälle; das empfohlene Plugin-Preset aktiviert die Regel als Fehler.
- [metadataSchemaRule](../../../packages/validator/src/rules/metadata-schema-rule/metadata-schema-rule.ts)
  prüft bereits nur erfolgreich zugeordnete Typen. Die Überschriftenprüfung muss
  für untypisierte Dokumente ebenfalls berücksichtigt werden.
- [ValidatorConfig](../../../packages/config/src/model.ts) hat bereits
  `validator.rules`; Projekt- und Source-Regeln werden bereits aufgelöst.
  Core übergibt diese an `prepareLintConfiguration`.
- Der [JSON-Schema-Vertrag](../../adr/0002-use-json-schema-for-doctype-metadata.md)
  verwendet Draft 7 und verbietet automatische Datenkorrekturen.

Keine neue Konfigurationsschicht, kein neues Package und keine Änderung der
Adapter-Zuständigkeiten erforderlich. Der ältere Task
[Konfigurationsebenen](../configuration-layers.md) ist Hintergrund, keine
Voraussetzung für eine erneute Konfigurationsimplementierung.

## Bestätigte Scope-Grenzen

Die YAML-Fallmatrix ist in der [Delta-Spec](01-behavior-spec.md) festgehalten.
Keine Regeln auf DocType-Ebene und keine weiteren Optionen an `metadata-schema`.

## Lebenszyklus der Specs

Die Delta-Spec beschreibt die geplante Änderung gegenüber den bestehenden
Paket-Specs. Zum Abschluss werden diese auf den vollständigen neuen Vertrag
aktualisiert und mit tatsächlichen Testnachweisen versehen. Das Aufgabenverzeichnis
bleibt Änderungshistorie; die Paket-Specs sind danach der dauerhaft zu pflegende
Vertrag. Die konkrete Zuordnung steht in der Delta-Spec und in Task C.
