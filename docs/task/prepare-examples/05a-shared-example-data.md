---
doctype: task
title: Gemeinsame Beispieldaten für Validator, ESLint und Knowledge vorbereiten
status: open
component: examples
---

# Gemeinsame Beispieldaten für Validator, ESLint und Knowledge vorbereiten

## Ziel

Vor der Beispielbereinigung festlegen und durch einen kleinen Lade-Smoke-Test
belegen, wie Validator, ESLint und das spätere Knowledge/Search-Beispiel dieselben
Dokumente, DocTypes, Schemas und Custom Rules verwenden. Keine Kopien der Sammlung
und kein neues Hilfspaket oder allgemeines Setup-Framework.

## Vorgeschlagene Festlegung

`examples/validator` bleibt der kanonische Datenbestand und das Dokkurator-Projekt.
Knowledge/Search wird als weiterer CLI-Ablauf auf demselben Projekt umgesetzt,
mit eigenem kurzen README-Abschnitt oder Guide. Dafür sind weder ein zweiter
Datenordner noch eine zweite Dokkurator-Konfiguration erforderlich.

`examples/validator-eslint` enthält nur seine spezifische ESLint-Konfiguration,
Scripts, README und Tests. Es verweist auf die Sammlung unter `../validator` und
verwendet deren Dokkurator-Konfiguration für Plugins, Schemas und Regeln wieder.
Ein solches gemeinsames Beispiel-Asset ist kein Import fremder Paketinternals;
alle Bibliotheksimporte bleiben öffentliche Paket-Root-APIs. Kein Import von
Implementierungen oder Testhelfern aus einem anderen Workspace-Paket.

## Umfang

- Relative Pfade für Dokumente, DocTypes und Ressourcen aus beiden
  Arbeitsverzeichnissen prüfen; Source-Pfade und ESLint-Dateimuster beachten.
- Festlegen, welche wenigen Dateien die Nutzer sehen und bearbeiten müssen.
  Eine kurze Verzeichnisübersicht in der Task-Übersicht dokumentieren.
- Mit einem Smoke-Test oder bestehenden öffentlichen APIs belegen, dass beide
  Einstiege dieselbe Sammlung und dieselben Regelressourcen laden können.
- Den bestehenden [Knowledge-Task](05d-knowledge-example.md) auf diesen aktuellen
  Ablauf bringen: vorhandene Scripts/Abhängigkeiten berücksichtigen, keine
  zweite Sammlung oder Konfiguration einführen.
- Fehlersammlung für Knowledge beibehalten. Die
  [tolerante Indexierung](05c-tolerant-indexing.md) bleibt Voraussetzung
  für die vollständige Search-Demo, blockiert aber nicht die Bereinigung.

## Abnahme

- Genau ein maßgeblicher Bestand der erweiterten Beispieldokumente, DocTypes,
  Schemas und Custom Rules ist benannt; keine Kopien oder generierten Duplikate.
- Der bewusst eigenständige Minimalfall bleibt klein und separat verständlich.
- Die Wiederverwendung funktioniert ohne neue Bibliotheks-APIs oder Exportsubpfade.
- Eine Änderung an einem gemeinsamen Dokument ist ohne Kopier-/Sync-Schritt
  für Validator und ESLint sichtbar; Knowledge verwendet denselben Source-Root.
- Knowledge-Einstieg beschreibt zunächst Volltext, einen Metadatenfilter und
  Ändern → `diff` → `index`; die ausführliche Umsetzung bleibt im Knowledge-Task.

## Prüfung

Pfadauflösung und Ressourcenladen aus beiden Beispielverzeichnissen prüfen.
Für die Vorbereitung ist noch kein funktionsfähiger Knowledge-Index erforderlich.
