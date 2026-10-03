---
doctype: task
title: Validierungsreports mit ESLint-Formattern
status: open
---

# Validierungsreports mit ESLint-Formattern

Status: geplant; noch nicht implementiert.

Abhängigkeit: [Core-Validator-Integration](./core-validator-integration.md).

## Ziel

Validierungsergebnisse lassen sich über eine kleine öffentliche API als lesbarer
Report oder JSON ausgeben. Die Formatnamen und die Ausgabe orientieren sich an
ESLint. Vorhandene ESLint-Formatter werden über dessen öffentliche API
wiederverwendet, statt ihre Darstellung nachzubauen.

Dokumentbefunde, unterdrückte Befunde und operative Source-Fehler bleiben
unterscheidbar. Die Formatierung führt keine erneute Validierung aus.

## Abgleich mit ESLint

Geprüft am 03.10.2026 anhand der offiziellen Dokumentation und der im Workspace
installierten Version ESLint 10.10.0.

ESLint bietet vier eingebaute Formate. Die CLI wählt sie über `--format`; die
Node-API lädt sie über `eslint.loadFormatter(name)`. Der geladene Formatter nimmt
`ESLint.LintResult[]` entgegen und liefert über `format(results)` einen String
oder ein Promise darauf. Schreiben ins Terminal oder in Dateien bleibt beim
Aufrufer. Quellen: [Formatter-Übersicht](https://eslint.org/docs/latest/use/formatters/),
[Node-API](https://eslint.org/docs/latest/integrate/nodejs-api#-eslintloadformatternameorpath).

| Format               | ESLint-Verhalten                                                                           | Geplanter Umfang                                                                                             |
| -------------------- | ------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------ |
| `stylish`            | Lesbare Terminalausgabe mit Dateien, Positionen, Schweregraden, Regeln und Zusammenfassung | Umsetzen; Standardformat                                                                                     |
| `json`               | JSON-Array der Dateiergebnisse                                                             | Umsetzen; Dokumentbefunde in ESLint-Struktur, Core-Erweiterungen gesondert festlegen                         |
| `json-with-metadata` | JSON mit `results` und `metadata`, einschließlich Regel-Metadaten                          | Umsetzen; Metadaten aus der verwendeten Regelkonfiguration sichern                                           |
| `html`               | HTML-Report für die Darstellung im Browser                                                 | Wiederverwendung prüfen; bei zusätzlichem Aufwand zunächst zurückstellen und die Einschränkung dokumentieren |

`json-with-metadata` ist nicht bloß die Dokkurator-Ergebnisliste mit zusätzlichen
Source-Angaben. ESLint liefert dabei insbesondere Metadaten der beteiligten
Regeln. Die JSON-Strukturen sollen diese Bedeutung erhalten; notwendige
Dokkurator-Erweiterungen werden ausdrücklich dokumentiert.
Quelle: [Formatbeschreibung](https://eslint.org/docs/latest/use/formatters/#json-with-metadata).

## Ziel-API und asynchroner Ablauf

Der Aufruf folgt ESLints Trennung von Validierung, Formatter-Laden und
Formatierung. `validate()` liefert weiterhin strukturierte Daten; keine
`format`-Methode am Ergebnis und kein angepasster Promise-Vertrag:

```js
const report = await app.validate();
const formatter = await app.loadFormatter("stylish");
const text = await formatter.format(report);
console.log(text);
```

`app.loadFormatter()` verwendet standardmäßig `stylish`. Für den Dokkurator-
Wrapper gilt einheitlich `format(report): Promise<string>`. Ein Report kann
mehrfach und in verschiedenen Formaten ausgegeben werden.

Der geladene Dokkurator-Formatter ist ein dünner Adapter: Er nimmt den
vollständigen Core-Report entgegen und übergibt dessen Dokumentbefunde im
passenden Format an den geladenen ESLint-Formatter. Die gleiche Aufrufstruktur
bedeutet nicht, dass das Core-Ergebnis selbst ein `ESLint.LintResult[]` ist.

Die Ausgabe gehört nicht in `dokkurator.config.mjs`: Formatwahl, Terminal-/Datei-
Ausgabe und Exit-Code bleiben Aufgaben der aufrufenden Anwendung. Formatierung
soll auch nach `app.close()` auf dem bereits erzeugten Report funktionieren.
Der Formatter muss dafür die benötigten Daten aus dem Report verwenden können,
ohne eine offene Anwendung oder erneute Source-Zugriffe vorauszusetzen.

## Wie eng an ESLint orientieren?

Bei Aufruf, Formatnamen und Dokumentbefunden ist die Orientierung sinnvoll:
Unsere Regeln laufen bereits in ESLint und erzeugen dort reguläre Nachrichten.
Regel-ID, Meldung, Schweregrad, Position, Fixes und Suggestions haben dieselbe
fachliche Bedeutung. Dokkurator normalisiert lediglich ihre Darstellung und
fügt Quellenidentität sowie die Phase hinzu.

Der vollständige Core-Report hat einen größeren Umfang: Er gruppiert Dokumente
nach Sources und enthält operative Fehler mit Phase und Recovery. Dafür gibt
es im ESLint-Dateiergebnis keinen gleichwertigen Vertrag. Deshalb die eigene
strukturierte API erhalten und nur die Dokumentbefunde adaptieren. Source-Fehler
nicht zur Wiederverwendung eines Formatters in scheinbare Lint-Befunde umwandeln.

Die Formatnamen orientieren sich an ESLint. Exakte Ausgabe-Kompatibilität gilt
für den Dokumentbefund-Teil; Erweiterungen für den gesamten Core-Report werden
separat festgelegt und dokumentiert. Insbesondere ist `json` nicht automatisch
ein unverändertes ESLint-Array, sobald zusätzlich operative Fehler abgebildet
werden müssen.

## Direkte ESLint-Plugin-Nutzung

Das vorhandene Dokkurator-Plugin benötigt keinen eigenen Formatter. Seine Regeln
melden über ESLints `context.report`; ESLint erstellt daraus selbst reguläre
Dateiergebnisse samt Regel-Metadaten. Die eingebauten Formatter funktionieren
bereits mit diesen Ergebnissen:

```sh
pnpm exec eslint --config eslint-plugin.config.mjs --format stylish documents
pnpm exec eslint --config eslint-plugin.config.mjs --format json documents
pnpm exec eslint --config eslint-plugin.config.mjs --format json-with-metadata documents
```

Bei direkter Plugin-Nutzung wäre auch `--format html` bereits ESLints Aufgabe;
ein Zurückstellen von HTML in Dokkurator betrifft nur die neue Core-Report-API.
Der geplante Adapter wird ausschließlich für die von `app.validate()` gelieferten
Dokkurator-Ergebnisse benötigt. Das Plugin bleibt ein normales ESLint-Plugin.

## Zuständigkeiten und Wiederverwendung

- Validator behält die synchrone Dokumentprüfung. Er erfasst bei Bedarf die für
  Formatter erforderlichen ursprünglichen ESLint-Daten und Regel-Metadaten
  während der ohnehin stattfindenden Vorbereitung/Prüfung.
- Core besitzt das Report-Ergebnis und ein separates internes Reporting-Modul.
  `app.loadFormatter` delegiert dorthin und liefert einen Formatter-Adapter;
  Formatierung wird nicht Bestandteil der Validator-Regelausführung oder der
  Lifecycle-Logik.
- Die Reporting-Integration lädt ESLint-Formatter über die öffentliche Root-API
  `import { ESLint } from "eslint"` und `loadFormatter`. Keine Imports aus
  `eslint/lib/...`, keine Kopien eingebauter Formatter und keine Export-Subpaths.
- Adapter und Metadatenbehandlung bleiben innerhalb der vorhandenen Pakete.
  Kein neues Reporting-Paket. Wenn Core ESLint direkt importiert, die direkte
  Dependency und den Lockfile-Eintrag passend ergänzen, ohne Versionsupgrade.
- Öffentliche Exports klein halten. `app.loadFormatter` soll keinen weiteren
  zwingenden Funktionsimport verlangen. Notwendige Ergebnistypen gezielt prüfen.

ESLint trennt selbst Regelausführung, Formatter-Laden und Ausgabe. Seine
Formatter liegen intern unter `lib/cli-engine/formatters`; dieser Pfad dient
hier nur der Architektur-Einordnung und ist kein zulässiger Importpfad.

## Vor der Umsetzung klären und nachweisen

### Adapter auf das ESLint-Ergebnisformat

Die bisherigen Dokkurator-Diagnosen sind keine `ESLint.LintResult[]`. Übersetzung
oder gezieltes Erhalten der originalen Daten festlegen:

- Absolute `filePath`-Werte aus der jeweiligen Source-Wurzel und dem Dokumentpfad;
  gleichnamige Dokumente verschiedener Sources dürfen nicht zusammenfallen.
- `messages`, `suppressedMessages`, numerische Schweregrade und Quellpositionen.
- Fehler-, Warnungs-, Fatal- und Fixable-Zähler sowie Fixes und Suggestions.
- Tatsächliche ESLint-Fatal-Information erhalten. Dokkurators Phase `parse` ist
  nicht automatisch ein fataler ESLint-Parserfehler.
- Vorhandene BOM-Korrekturen und Originaltextbezug der Dokkurator-Diagnosen
  berücksichtigen. Keine doppelte Korrektur beim Rückübersetzen.
- Source-ID und Revision für die vorhandene strukturierte API erhalten.

Der genaue ESLint-Vertrag ist in der
[Node-API](https://eslint.org/docs/latest/integrate/nodejs-api#-lintresult-type)
beschrieben. Fehlende Informationen nicht durch erfundene Werte ersetzen.

### Regel-Metadaten ohne erneutes Laden oder Prüfen

Die aktuelle normalisierte Validator-Ausgabe enthält keine Regel-Metadaten.
Diese müssen aus der tatsächlich verwendeten Konfiguration erhalten bleiben,
einschließlich Dokkurator-, Markdown- und eigener Plugin-Regeln.

Bei ESLint 10.10.0 ermittelt der von `loadFormatter` erzeugte Wrapper seine
`rulesMeta` über `getRulesMetaForResults`. Einfaches Übergeben eines zusätzlichen
Metadatenobjekts an `format` reicht deshalb nicht als angenommene Lösung.
Die öffentliche Integration muss mit einer passenden, bereits vorbereiteten
Konfiguration funktionieren; kein Rückgriff auf private Formatter-Module.
Quelle: [Regel-Metadaten-API](https://eslint.org/docs/latest/integrate/nodejs-api#-eslintgetrulesmetaforresultsresults).

Zuerst einen fokussierten Integrationsnachweis für alle drei Pflichtformate
und unterschiedliche Source-Konfigurationen durchführen. Falls die öffentliche
API nicht ausreicht, die konkrete Einschränkung und eine Alternative dokumentieren,
bevor eine eigene Formatter-Implementierung beschlossen wird.

### Operative Fehler im vollständigen Report

Source-, Lade-, Konfigurations- und unerwartete Laufzeitfehler sind bislang
separate Core-Fehler. ESLints Dateiergebnisformat hat dafür keinen gleichwertigen
Source-Fehlervertrag.

Vor der Implementierung die Ausgabe der separaten `errors` festlegen:
Textformate können einen ausdrücklich als operative Fehler gekennzeichneten
Abschnitt ergänzen. JSON braucht eine dokumentierte Erweiterung beziehungsweise
einen umschließenden Report-Vertrag; kein angehängter Text, der JSON ungültig macht.
Die JSON-Ergebnisse der Dokumentprüfung sollen weiterhin aus dem ESLint-Formatter
stammen. Auch Source-ID, Phase und Recovery müssen erhalten bleiben.

Die endgültige Abbildung im Integrationsnachweis festhalten. Keine erfundenen
Regel-IDs, Dateipositionen oder künstlichen ESLint-Parserfehler für Source-Fehler.
Fehler dürfen auch bei einer fehlgeschlagenen Source nicht verloren gehen.

## Umsetzungsschritte

1. Öffentliche ESLint-Formatter-Integration, Metadaten und Fehlerabbildung
   nachweisen und den Datenvertrag dokumentieren; Aufwand für `html` einordnen.
2. Notwendige Formatter-Daten während der Validierung erhalten und
   `app.loadFormatter` mit einem dünnen asynchronen Formatter-Adapter bereitstellen.
   Das Report-Ergebnis behält seinen Datenvertrag.
3. Reporting-Modul mit `stylish`, `json` und `json-with-metadata` integrieren;
   `html` bei einfacher Wiederverwendung ergänzen, sonst ausdrücklich auslassen.
4. Beispiele auf die gemeinsame Report-Ausgabe umstellen. Gruppenfilter der
   ausführlichen Sammlung erhalten, ohne Metadaten oder operative Fehler zu verlieren.
5. Anleitung, API-Dokumentation und fokussierte Tests ergänzen. Tests neben den
   zugehörigen Quelldateien nach dem Repository-Namensschema ablegen.

## Abnahme

- Die drei Pflichtformate verwenden die eingebauten ESLint-Formatter über eine
  unterstützte öffentliche API. Standard-ESLint und Dokkurator liefern für
  dieselben Dokumentbefunde äquivalente Reports.
- JSON-Verträge, Regel-Metadaten und Dokkurator-Erweiterungen sind dokumentiert
  und automatisiert geprüft. Metadaten verschiedener Sources bleiben korrekt.
- Positionen, Fixes, Suggestions, unterdrückte Befunde, Parserfehler, reine
  Warnungen, leere erfolgreiche Läufe und operative Fehler sind abgedeckt.
- Formatierung verändert keine Befunde oder Zähler, lintet nicht erneut und
  benötigt keine erneuten Source-/Schema-/Projektzugriffe oder einen Index.
- Wiederholte Formatierung, Formatwechsel und Formatierung nach `close()`
  funktionieren. Formatter erhalten bei Bedarf Kopien, da ESLint Ergebnisse sortiert.
- Unbekannte Formate liefern einen verständlichen Formatter-Fehler und werden
  nicht stillschweigend als anderes Format ausgegeben. Ist `html` zurückgestellt,
  wird es als noch nicht unterstützt gemeldet und im Beispiel dokumentiert.
- Report und Formatierung schreiben nicht selbst auf die Konsole oder ins
  Dateisystem und setzen keinen Prozess-Exit-Code. Beispiele übernehmen das.
- Bestehende strukturierte `results`/`errors` bleiben zugänglich und als Daten
  serialisierbar; interne Konfiguration gelangt nicht in die Datenausgabe.
- Paketgrenzen, direkte Dependencies, fokussierte Tests, betroffene Builds,
  Typechecks, Lint und Formatierung sind geprüft.

## Umfangsgrenze

Diese Aufgabe plant die Report-API und deren spätere Umsetzung. Das Anlegen
dieses Dokuments implementiert noch keinen Formatter. Keine neue CLI, keine
Knowledge-Funktionen, keine Veröffentlichung und keine zusätzlichen Formate
wie Markdown, SARIF oder JUnit. Drittanbieter-Formatter sind zunächst nicht Teil
der öffentlichen Dokkurator-API.
