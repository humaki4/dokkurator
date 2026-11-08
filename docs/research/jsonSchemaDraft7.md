---
doctype: research
title: JSON Schema Draft 7 für DocType-Metadaten
status: complete
topic: schema-validation
tags: [json-schema, doctypes, metadata, validator]
sources:
  - https://json-schema.org/specification
  - https://json-schema.org/draft-07/json-schema-release-notes
  - https://json-schema.org/draft/2019-09/release-notes
  - https://json-schema.org/draft/2020-12/release-notes
  - https://json-schema.org/implementations
  - https://ajv.js.org/json-schema.html
  - https://spec.openapis.org/oas/v3.1.1.html
  - https://kubernetes.io/docs/tasks/extend-kubernetes/custom-resources/custom-resource-definitions/#validation
  - https://python-jsonschema.readthedocs.io/en/stable/
  - https://json-schema.org/understanding-json-schema/reference/conditionals
  - https://json-schema.org/understanding-json-schema/reference/combining
---

# JSON Schema Draft 7 für DocType-Metadaten

Diese Recherche ordnet JSON Schema in Dokkurators
Vision und aktuelle Implementierung ein. Sie ist eine Einschätzung, keine
Änderung des akzeptierten [JSON-Schema-ADR](../adr/0002-use-json-schema-for-doctype-metadata.md).

## Kurzfazit

- Draft 7 deckt die üblichen Anforderungen an Metadaten eines einzelnen
  Dokuments umfassend ab: Typen, Pflichtfelder, Wertebereiche, Formate,
  verschachtelte Objekte, Listen, Bedingungen, Varianten, Referenzen und
  zusätzliche Felder.
- In der Dokkurator-Beispielsammlung sind die komplexen Regeln bereits
  tatsächliche, validierte Schemas: unter anderem bedingte Begründungen für
  Entscheidungen und genau eine Authentifizierungsvariante für APIs.
- JSON Schema beschreibt einen einzelnen geparsten Datenwert. Es löst keine
  Beziehungen oder Konsistenz zwischen Dokumenten, prüft keine externen
  Geschäftsregeln und validiert keine Markdown-Struktur. Das sind ergänzende
  Validierungsaufgaben, kein Grund, Metadaten in eine eigene Regelsprache zu
  überführen.
- Die kompakte Feldsyntax ist passend für häufige einfache Fälle. Für
  objektweite und zusammengesetzte Regeln ist ein vollständiges Schema ein
  vertretbarer, interoperabler Ausweg. Die vorliegende Recherche zeigt noch
  keinen wiederkehrenden Bedarf für eine zweite DocType-Syntax.

## Welche JSON-Schema-Dialekte gibt es?

Die aktuelle Spezifikationsseite führt **Draft 2020-12** als aktuelle Version
und **2019-09** als Vorgänger. Für neue oder bestehende Schemas begegnet man
außerdem vor allem Draft 7, Draft 6 und Draft 4. Historische Entwürfe vor Draft
4 existieren, sind aber für neue interoperable Schemas nicht die relevante
Auswahl. Die Bezeichnungen 2019-09 und 2020-12 lösen die fortlaufende
Draft-Nummerierung ab. Ein Validator muss den Dialekt kennen: gleiche
Schlüsselwörter oder Strukturen haben nicht in jedem Draft dieselbe Bedeutung.

| Dialekt       | Wesentliche Entwicklung gegenüber dem Vorgänger                                                                                                                                                                                        | Bedeutung für Dokkurator                                                                          |
| ------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| Draft 4       | Etablierte frühe Fassung; unter anderem Referenzen, Objekte, Arrays und boolesche Schemas.                                                                                                                                             | Für heutige Anforderungen unnötig alt; wichtige bequemere Keywords fehlen.                        |
| Draft 6       | Fügt unter anderem `const`, `contains` und `propertyNames` hinzu; `exclusiveMinimum`/`exclusiveMaximum` werden numerische Grenzen statt boolescher Schalter.                                                                           | Älter als die von Dokkurator benötigten Bedingungen.                                              |
| Draft 7       | Fügt `if`/`then`/`else` für Bedingungen hinzu; ordnet außerdem Content- und Annotations-Keywords neu. Laut Release Notes sind Validierungsergebnisse gegenüber Draft 6 rückwärtskompatibel.                                            | Unterstützt bereits die aktuellen DocType-Anforderungen und ist Dokkurators festgelegter Vertrag. |
| Draft 2019-09 | Führt Vocabularies, `$defs`, `dependentRequired`/`dependentSchemas` und `unevaluatedProperties`/`unevaluatedItems` ein; Änderungen an `$ref` und rekursiven Referenzen. `format` ist standardmäßig nicht mehr zwingend eine Assertion. | Nützlich für komplexe Schema-Komposition, aber auch ein Kompatibilitäts- und Migrationsschritt.   |
| Draft 2020-12 | Ändert insbesondere Tupel-Arrays zu `prefixItems` plus `items` und ersetzt rekursive durch dynamische Referenzen; präzisiert neue Mechanismen aus 2019-09.                                                                             | Kein erkennbarer notwendiger Mehrwert für die bisher gezeigten Metadaten.                         |

Die bedeutendste mögliche Draft-7-Reibung bei Objektkomposition ist
`additionalProperties`: Es berücksichtigt nicht ohne Weiteres, welche Felder
über andere Teilschemas wie `allOf` zugelassen wurden. `unevaluatedProperties`
aus Draft 2019-09 kann das lösen. Draft 7 kann viele konkrete Fälle dennoch
anders modellieren, etwa mit einem gemeinsamen Basisschema oder einer
expliziten `properties`-Liste. Ob diese Komplexität in Dokkurator tatsächlich
häufig auftritt, ist eine empirische Frage.

Ein Dialekt-Upgrade ist außerdem nicht nur ein Versionsstring: Validatoren
unterscheiden sich in unterstützten Drafts und optionale Keywords. Beispielsweise
verwendet Ajv für 2020-12 eine eigene Instanz und kombiniert diesen Dialekt
nicht mit älteren in derselben Instanz. Auch `format` ist nicht als
Implementierungsverhalten vollständig durch den Schema-Dialekt vereinheitlicht.

## Was lässt sich mit Draft 7 ausdrücken?

Neben den in der Fragestellung genannten Typen, Pflichtfeldern, Wertelisten und
Bedingungen unterstützt Draft 7 unter anderem:

- Zahlen- und Zeichenketten-Grenzen (`minimum`, `maxLength`, `pattern`),
  `enum`/`const`, Array-Grenzen, `items` und `uniqueItems`;
- verschachtelte Objekte, `properties`, `patternProperties`,
  `additionalProperties` sowie Abhängigkeiten über `dependencies`;
- logische Verknüpfungen mit `allOf`, `anyOf`, `oneOf`, `not` und
  bedingte Teilschemas mit `if`/`then`/`else`;
- wiederverwendbare und externe Schemas über `$ref` sowie Format-Hinweise wie
  `date`, `uri` und `email` (deren tatsächliche Assertion vom Validator
  abhängt).

Damit lassen sich beispielsweise „bei Status `accepted` ist `rationale`
erforderlich“ oder „`auth` muss genau eine von zwei Objektformen erfüllen“
standardisiert formulieren. Die JSON-Schema-Dokumentation beschreibt dieselben
Muster für bedingte Regeln und logische Komposition.

### Was Draft 7 nicht gut oder nicht allein prüft

| Anforderung                                                                                                                          | Einordnung                                                                                                                                       |
| ------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| Ein Feld muss vorhanden und passend typisiert sein; abhängige Felder; mindestens eine von mehreren Formen                            | Direkt in Draft 7 ausdrückbar.                                                                                                                   |
| Beliebiger Vergleich zweier Werte desselben Dokuments, zum Beispiel `startDate < endDate`                                            | Kein allgemeines Keyword für solche feldübergreifenden Berechnungen. Mit statischen Fällen teils modellierbar, sonst eigene semantische Prüfung. |
| Eindeutigkeit von `id`-Werten über eine Liste von Objekten hinweg                                                                    | `uniqueItems` vergleicht ganze Array-Elemente, nicht einen ausgewählten Schlüssel. Benötigt zusätzliche Prüfung.                                 |
| Referenzziel existiert, ist eindeutig oder hat einen bestimmten DocType                                                              | Benötigt Zugriff auf andere Dokumente oder einen Index; ein `$ref` in einem Schema ist keine Prüfung einer Dokumentbeziehung.                    |
| Dokumente sind organisationsweit konsistent, ein Status ist aktuell/zulässig, Berechtigung oder externer Dienst bestätigt einen Wert | Außerhalb einer rein lokalen Schema-Prüfung; gehört in eine passende fachliche oder kontextbezogene Regel.                                       |
| Markdown-Überschriften, Linkziele oder Reihenfolge von Abschnitten                                                                   | Nicht Frontmatter-Metadaten. Als separate Dokumentstruktur- oder Beziehungsregel prüfen.                                                         |

Die erste und zweite Tabellenzeile sind keine vollständige Liste aller
denkbaren Grenzen; entscheidend ist die Trennung zwischen **Dokumentvertrag**
und **Prüfung mit Kontext oder Berechnung**. Ein eigener Validator oder eine
Dokkurator-Regel kann solche Fälle ergänzen, während das Metadatenschema
interoperabel bleibt.

## Anwendungen außerhalb Dokkurators

JSON Schema ist ein Format für maschinenlesbare Verträge über JSON-Daten,
nicht nur für Dokument-Metadaten. Typische Einsätze sind:

1. **HTTP-API-Beschreibungen und Payloads:** OpenAPI 3.1 verwendet ein
   JSON-Schema-Dialektmodell für Schema Objects. OpenAPI 3.0 ist dagegen nicht
   einfach gleichbedeutend mit vollständigem JSON Schema Draft 7; die
   Kompatibilität hängt von der jeweiligen OAS-Version ab.
2. **Konfigurationsdateien und Manifeste:** Editoren und CI können YAML- oder
   JSON-Dateien gegen Schemas prüfen. Kubernetes CustomResourceDefinitions
   verwenden OpenAPI-v3-Schemas zur Validierung benutzerdefinierter Ressourcen,
   allerdings mit eigenen strukturellen und Kubernetes-spezifischen Regeln.
3. **Formulare und Dateneingabe:** UI-Bibliotheken können aus Schemas
   Eingabefelder und Validierung ableiten. Das Schema allein bestimmt jedoch
   nicht zwingend eine passende, verständliche Oberfläche.
4. **Datenverarbeitung und Codegenerierung:** Ein Schema kann als
   Eingabevertrag für Laufzeitvalidierung, Testdatengenerierung oder
   TypeScript-/Sprachtyp-Generierung dienen. Die generierten Typen ersetzen
   keine Validierung zur Laufzeit.
5. **Editorunterstützung:** Schema-Kataloge und YAML-/JSON-Erweiterungen bieten
   Autovervollständigung und Fehlerhinweise in Konfigurationsdateien.

Diese Beispiele zeigen den Interoperabilitätswert eines etablierten Formats.
Sie bedeuten nicht, dass jedes dieser Systeme denselben Draft oder jedes
Keyword unterstützt. OpenAPI 3.1 und Kubernetes sind insbesondere
Schema-Anwendungen mit eigenem Konformitätskontext und sollten nicht als
Beleg für identische Unterstützung in beliebigen JSON-Schema-Validatoren
verstanden werden.

## Zugehörige Tools und Libraries

| Aufgabe                                 | Beispiele                                                                                                                                                                                                                                          | Hinweise                                                                                                                                                                          |
| --------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Laufzeitvalidierung                     | [Ajv](https://ajv.js.org/json-schema.html) (JavaScript/TypeScript), [python-jsonschema](https://python-jsonschema.readthedocs.io/en/stable/), weitere Implementierungen im [offiziellen Tool-Verzeichnis](https://json-schema.org/implementations) | Draft- und Keyword-Abdeckung vergleichen; `format`, Referenzauflösung und Fehlermeldungen mit dem konkreten Validator testen. Dokkurator nutzt Ajv mit Draft 7 und `ajv-formats`. |
| Schema testen / Konformität vergleichen | [Bowtie](https://github.com/bowtie-json-schema/bowtie), [JSON-Schema-Test-Suite](https://github.com/json-schema-org/JSON-Schema-Test-Suite)                                                                                                        | Hilft, Implementierungsunterschiede sichtbar zu machen; ersetzt keine Tests der eigenen Schemas und YAML-Parsing-Pipeline.                                                        |
| Editieren und Schema-Kataloge           | [JSON Schema Tools](https://json-schema.org/tools), [SchemaStore](https://www.schemastore.org/json/) und Editor-Plugins                                                                                                                            | Nützlich für Autovervollständigung; Verknüpfung eines Schemas mit einer YAML-Datei muss zur jeweiligen Editorintegration passen.                                                  |
| Formulare                               | [JSON Forms](https://jsonforms.io/), [React JSON Schema Form](https://rjsf-team.github.io/react-jsonschema-form/)                                                                                                                                  | Generiert eine UI aus Daten-Schema, oft ergänzt durch eigene UI-Optionen.                                                                                                         |
| Typgenerierung                          | [json-schema-to-typescript](https://github.com/bcherny/json-schema-to-typescript), [quicktype](https://quicktype.io/)                                                                                                                              | Generierte statische Typen drücken nicht jeden Schema-Constraint aus und validieren keine Eingabedaten zur Laufzeit.                                                              |

Das offizielle Tool-Verzeichnis weist ausdrücklich darauf hin, dass die
Aufnahme eines Tools keine Empfehlung oder vollständige Konformitätsaussage ist.
Vor einer Toolentscheidung sollten unterstützter Dialekt, Formate,
Remote-Referenzen und die Ausgabeform konkreter Fehler geprüft werden.

## Bewertung für Dokkurator

### Reicht Draft 7 für häufige Metadatenanforderungen?

**Nach aktuellem Stand: ja, für die typischen Anforderungen an Metadaten eines
einzelnen Dokuments.** Die bestehende Entscheidung, Draft 7 als normalisierten
Vertrag zu verwenden, passt zum Ziel, auf Markdown, YAML, Git und offenen
Formaten aufzubauen, statt ein proprietäres Dokumentmodell zu etablieren.

Das Repository enthält bereits überprüfbare Beispiele für:

- Pflichtfelder, Enum, Mindestlänge, Muster, Listen und eindeutige primitive
  Werte in kompakten Schemas;
- `if`/`then` bei Entscheidungen, `oneOf` bei API-Authentifizierung,
  geschlossene verschachtelte Objekte und `$ref` auf vorab bereitgestellte
  Schemas in vollständigen Draft-7-Schemas.

Keines dieser Beispiele erfordert eine Dokkurator-eigene Metadaten-Regelsprache.
Wenn ein Projekt künftig eine Beziehung zwischen Dokumenten oder eine
kontextabhängige Regel braucht, sollte diese als ergänzende Regel mit Zugriff
auf den erforderlichen Kontext modelliert werden, nicht durch Überladung des
Metadatenschemas.

Draft 7 ist kein Versprechen, dass alle Validatoren gleich arbeiten:
Dokkurators Validator legt den Dialekt fest, lädt `$ref`-Ressourcen explizit
vorab und lädt während der Validierung nichts aus dem Netz. Er aktiviert
`format`-Prüfung über Ajv Formats. Schemas, die `format` oder externe
Referenzen verwenden, sind daher nur dann portabel, wenn Konsumenten diese
Verhaltensweisen ebenfalls festlegen.

### Braucht die komplexe Schema-Syntax eine einfachere DocType-Syntax?

**Noch nicht belegt.** Die kompakte Syntax vereinfacht die häufigen
feldbezogenen Anforderungen. Objektweite Regeln, Verzweigungen,
Zusammensetzungen und Referenzen benötigen wie bei anderen
JSON-Schema-Verbrauchern das vollständige Schema. Das ist sichtbar komplexer,
bleibt aber ein verbreitetes und in Tools unterstütztes Format. Die
Beispielsammlung dokumentiert bereits den Wechselpunkt und Beispiele.

Sinnvolle nächste Schritte mit geringem Interoperabilitätsrisiko:

1. Anwendungsfälle aus realen Projekten sammeln und festhalten, welche
   Schema-Regel sie ausdrücken sollen.
2. Bei wiederholter Reibung zuerst Dokumentation, Copy-and-paste-Beispiele,
   Schema-Autovervollständigung oder präzisere Fehlermeldungen verbessern.
   Dokkurator ordnet Ajv-Fehler bereits den YAML-Quellpositionen zu.
3. Eine kürzere DocType-Abstraktion nur für ein wiederkehrendes, klar
   abgegrenztes Muster erwägen. Sie sollte in Draft 7 expandieren und dieselbe
   Schema-Semantik behalten, statt ein zweites Regelmodell einzuführen.
4. Einen neueren Dialekt nur bei nachgewiesenem Bedarf prüfen, etwa wenn
   `unevaluatedProperties` in häufigen zusammengesetzten Schemas echte
   Konfigurationslast beseitigt. Dann Draft-Migration, Validatorabdeckung und
   Konsumentenkompatibilität explizit testen.

## Bezug zur Dokkurator-Vision

Dokkurator soll Struktur und Auffindbarkeit ergänzen, ohne Eigentümer der
Dokumente zu werden. Die Dokumente bleiben in ihren Repositories und ohne
Dokkurator nutzbar. JSON Schema unterstützt dieses Prinzip: DocType-Metadaten
können von unabhängigen Werkzeugen verstanden und geprüft werden. Der Validator
und Loader können projektspezifische Anforderungen ergänzen, ohne das
Frontmatter-Format oder die Dokumente an Dokkurator zu binden.

**Empfehlung:** Draft 7 und die Trennung zwischen kompakten Feldern,
vollständigem Schema und ergänzenden Kontextregeln beibehalten. Die offenen
Fragen als Bedarfserhebung weiterführen, nicht als Anlass, vorzeitig einen
eigenen Regel- oder Kurzsyntaxdialekt zu entwerfen.

## Quellen

- JSON Schema: [aktuelle Spezifikationsübersicht](https://json-schema.org/specification), [Draft-7-Release-Notes](https://json-schema.org/draft-07/json-schema-release-notes), [2019-09-Release-Notes](https://json-schema.org/draft/2019-09/release-notes), [2020-12-Release-Notes](https://json-schema.org/draft/2020-12/release-notes).
- JSON Schema: [Tool-Verzeichnis](https://json-schema.org/implementations), [Bedingungen](https://json-schema.org/understanding-json-schema/reference/conditionals), [Schema-Komposition](https://json-schema.org/understanding-json-schema/reference/combining).
- Ajv: [Unterstützte JSON-Schema-Versionen und Keywords](https://ajv.js.org/json-schema.html).
- Anwendungsfälle: [OpenAPI 3.1.1](https://spec.openapis.org/oas/v3.1.1.html), [Kubernetes-Validierung von Custom Resources](https://kubernetes.io/docs/tasks/extend-kubernetes/custom-resources/custom-resource-definitions/#validation).
- Python-Implementierung: [python-jsonschema Dokumentation](https://python-jsonschema.readthedocs.io/en/stable/).
- Dokkurator: [Vision](../concept/vision.md), [Entscheidung für Draft 7](../adr/0002-use-json-schema-for-doctype-metadata.md), [Loader-Schemaformat](../../packages/loader/README.md#metadata-compact-fields-or-json-schema), [Metadaten-Schema-Spezifikation](../../packages/validator/docs/specs/metadata-schemas.md), [Beispielsammlung und Validierung](../../examples/documentation/validation.md).
