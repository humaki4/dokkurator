---
doctype: task
title: Delta-Spec für optionale DocType-Zuordnungen
status: draft
---

# Delta-Spec für optionale DocType-Zuordnungen

## Status und Bezug

Die fachlichen Entscheidungen zu Optionalität, unbekannten Typen und kaputtem
YAML sind abgestimmt. Der konkrete API-Vertrag und die unten ausdrücklich
benannten Randfälle bleiben Entwurf. Diese Delta-Spec beschreibt geplantes
Verhalten, keinen Nachweis einer bereits erfolgten Umsetzung.

Betroffene dauerhafte Specs:

- [DocType selection](../../../packages/validator/docs/specs/doc-type-selection.md):
  Auswahl aus geparsten Metadaten; keine Gleichsetzung eines Auswahlproblems
  mit einem verpflichtenden Validierungsbefund.
- [Shared ESLint configuration](../../../packages/validator/docs/specs/lint-configuration.md):
  Default und Optionen der DocType-Regel sowie globale Schweregrade.
- [Synchronous lint](../../../packages/validator/docs/specs/synchronous-lint.md):
  Befunde, Parse-Probleme und übersprungene typspezifische Prüfungen.
- [Metadata schemas](../../../packages/validator/docs/specs/metadata-schemas.md) und
  [Required headings](../../../packages/validator/docs/specs/rules/required-headings.md):
  Prüfung nur bei bekanntem, erfolgreich ausgewähltem Typ.

## Geänderte Anforderungen

Die bisher generell gemeldete Pflicht zu Frontmatter und DocType entfällt im
Default. Ebenso erzeugt ein unbekannter Typname standardmäßig keinen Befund.
Die fachliche Typauswahl bleibt von der konfigurierbaren Diagnose getrennt:
Ein unbekannter Typ wird durch seine Zulassung nicht zu einem bekannten Typ.
Öffentliche Auswahltypen werden nur nach gesonderter API-Entscheidung geändert.

## Neue und fortgeltende Anforderungen

- R1: Ohne Frontmatter oder ohne eigenes `doctype`-Feld wird ein Dokument im
  Standardmodus als untypisiert behandelt. Daraus entsteht kein DocType-Befund.
- R2: Untypisierte Dokumente und Dokumente mit erlaubten unbekannten Typnamen
  durchlaufen keine DocType-spezifische Metadaten-
  oder Überschriftenprüfung. Allgemeine Markdown- und explizite Plugin-Regeln
  bleiben aktiv. Untypisiert bedeutet nicht von jeder Prüfung ausgeschlossen.
- R3: Ein vorhandenes `doctype`-Feld darf nicht durch einen falschen Wert die
  Typprüfung umgehen: `null`, leerer String, Zahl, Liste und Objekt sind Fehler.
- R4: Ein bekannter Typ aktiviert seine Metadaten- und Strukturregeln einschließlich
  erforderlicher Überschriften. Bestehende `$schema`-Zuordnungsregeln bleiben erhalten.
- R5: Ein unbekannter Typname ist standardmäßig erlaubt. Ohne Definition findet
  keine DocType-spezifische Prüfung statt; dies ist keine erfolgreiche Prüfung
  gegen einen bekannten Typ. Projekte können unbekannte Typnamen ablehnen.
- R6: Im Pflichtmodus sind fehlendes Frontmatter und fehlender DocType Fehler.
- R7: Zusätzliche Felder eines bekannten Typs richten sich zunächst nach dessen
  Schema. Ein zusätzliches globales Feldverbot ist nicht vorgesehen.
- R8: Kann wegen fehlerhaften YAMLs einschließlich doppelter Schlüssel kein
  DocType zuverlässig bestimmt werden, entscheidet die globale DocType-Regel
  gemäß der YAML-Fallmatrix. Es erfolgt keine teilweise Typinferenz aus
  beschädigtem YAML. Keine zusätzliche Syntaxregel und keine neuen Optionen
  an `metadata-schema`.
- R9: Laden und Parsen bleiben unabhängig von einer DocType-Pflicht. Metadaten
  werden weder ergänzt noch gelöscht oder in andere Datentypen umgewandelt.

## Akzeptanzmatrix

Die Tabelle bildet den Zielvertrag ab; ausdrücklich offene Randfälle sind vor
Umsetzung zu bestätigen. „OK“ bedeutet ausschließlich: kein Befund wegen dieses Sachverhalts.

| Dokumentfall | Standard | Streng: Pflicht + unbekannte Typen ablehnen |
| --- | --- | --- |
| Markdown ohne Frontmatter | OK, untypisiert | Fehlendes Frontmatter |
| Mapping mit `title`, ohne `doctype` | OK, untypisiert | Fehlender DocType |
| Leeres Mapping `{}` | OK, untypisiert | Fehlender DocType |
| Leerer YAML-Block / YAML `null` | Offen; Empfehlung: ungültiges Mapping | Ungültiges Mapping |
| `doctype: null`, `42`, `[]`, `{}` oder `''` | Ungültiger DocType | Ungültiger DocType |
| Unbekannter Typname | OK, keine DocType-spezifische Prüfung | Unbekannter DocType |
| Bekannter Typ, gültige Metadaten und Struktur | OK | OK |
| Bekannter Typ, Pflichtfeld fehlt / falscher Feldtyp | Schema-Befund | Schema-Befund |
| Bekannter Typ, erforderliche Überschrift fehlt | Struktur-Befund | Struktur-Befund |
| Bekannter Typ, zusätzliches Feld | Gemäß Schema | Gemäß Schema |
| Bekannter Typ, widersprüchliches `$schema` | Zuordnungsfehler | Zuordnungsfehler |
| `$schema` ohne `doctype` | Empfehlung: untypisiert, keine Typinferenz | Fehlender DocType |
| Kaputtes YAML / doppelte Schlüssel | Kein Befund aus der DocType-Regel | Ein YAML-Befund gemäß Regel-Schweregrad |
| Liste oder Skalar als Frontmatter | Noch abzustimmen: strukturell ungültig, aber syntaktisch gültiges YAML | Noch abzustimmen |

DocType-Pflicht und Ablehnung unbekannter Namen sind unabhängig:

| Pflicht | Unbekannte ablehnen | Ohne Typ | Unbekannter Typname |
| --- | --- | --- | --- |
| Nein (Default) | Nein (Default) | Erlaubt | Erlaubt, ungeprüft |
| Ja | Nein | Fehler | Erlaubt, ungeprüft |
| Nein | Ja | Erlaubt | Fehler |
| Ja | Ja | Fehler | Fehler |

Bekannte Typen werden in allen vier Kombinationen geprüft. „Ungeprüft“ bezieht
sich nur auf DocType-spezifische Prüfungen; allgemeine Regeln bleiben aktiv.
Bei erlaubtem unbekanntem Typ darf `$schema` keine bekannte Typdefinition
vortäuschen oder automatisch laden; die genaue Diagnose-Semantik bleibt im
Konfigurationsentwurf zu klären.

## Neue Anforderung: YAML-Fallmatrix

| `required` | `allowUnknown` | Frontmatter nicht lesbar, Typ nicht bestimmbar |
| --- | --- | --- |
| `false` | `true` | Kein Befund aus der DocType-Regel |
| `true` | `true` | Ein Befund: verpflichtender DocType nicht bestimmbar |
| `false` | `false` | Ein Befund: Beschränkung auf bekannte Typen nicht überprüfbar |
| `true` | `false` | Ein Befund: verpflichtender bekannter DocType nicht bestimmbar |

- Der Befund enthält den YAML-Syntaxfehler mit Position und verwendet den
  Schweregrad der globalen `dokkurator/doctype`-Regel (`warn`, `error`, `off`).
- Pro betroffenem Dokument entsteht genau ein DocType-Befund für diesen Fall,
  auch wenn beide Optionen verletzt sind. Keine zusätzlichen Metadaten- oder
  Überschriftenbefunde aus einer unsicheren Typzuordnung.
- Ohne Frontmatter bleibt ein Dokument bei `required: false` auch mit
  `allowUnknown: false` erlaubt. Dies unterscheidet es von beschädigtem YAML,
  das eine unbekannte Typangabe enthalten könnte.
- Diese Matrix betrifft Dokument-Frontmatter. Fehler in DocType-Definitionen
  bleiben Vorbereitungs-/Konfigurationsfehler.
- Syntaktisch gültige Skalare, Listen und leere YAML-Blöcke sind separat von
  Syntaxfehlern zu spezifizieren; die Bestätigung dieser Matrix entscheidet
  diese Randfälle nicht automatisch.

## Unverändert und außerhalb des Umfangs

Keine Regelkonfiguration auf DocType-Ebene. Aktivierung und Schweregrade bleiben
auf Projekt-/Source-Ebene. Keine neuen Optionen an `metadata-schema`, kein
projektweites Verbot zusätzlicher Schemafelder, keine Änderung des JSON-Schema-
Dialekts und keine automatische Korrektur von Dokumenten.

## Geplanter Nachweis

Zusätzlich prüfen: leere Typregistrierung; gleicher Inhalt über direkte
Validator-Nutzung, Core und ESLint; untypisiertes Dokument mit allgemeinem
Markdown-Verstoß; explizites `warn`/`off` und bestehende Regelunterdrückung.
Leerzeichen als Typname dürfen nicht versehentlich eine untypisierte Zuordnung ergeben.

## Abnahme

Offene Entscheidungen sind aufgelöst, jede Tabellenzeile hat ein eindeutiges
Ergebnis, und daraus lassen sich Tests ohne weitere fachliche Annahmen ableiten.
Eine neue Bedeutung von „nur bekanntem Frontmatter“ ergänzt zuerst diese Matrix.

## Übernahme nach Umsetzung

Die betroffenen dauerhaften Specs werden im selben Änderungsvorhaben auf den
vollständigen resultierenden Vertrag aktualisiert. Jede geänderte oder neue
Anforderung erhält einen konkreten Testnachweis im Stil der bestehenden
DocType-Auswahl-Spec. Noch fehlende Nachweise werden ausdrücklich benannt;
geplante Tests dürfen nicht als bereits erfolgreich verifiziert erscheinen.

Die Delta-Spec bleibt nach Abschluss als Änderungshistorie im Aufgabenverzeichnis
und verlinkt die aktualisierten dauerhaften Specs. Sie ist dann kein zweiter,
parallel zu pflegender normativer Vertrag. Der Task wird erst abgeschlossen,
wenn Implementierung, Nachweise und dauerhafte Specs übereinstimmen.
