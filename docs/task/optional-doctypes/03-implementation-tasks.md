---
doctype: task
title: Umsetzung und Nachweis der optionalen DocTypes
status: draft
---

# Umsetzung und Nachweis der optionalen DocTypes

Erst nach akzeptierter Verhaltens-Spec und Konfigurationsentscheidung beginnen.
Die folgenden Aufgaben sind Planung, keine bereits ausgeführten Änderungen.

## A – Validator an die akzeptierte Spec anpassen

**Ergebnis:** Optionale Typzuordnung ist der Default; explizite Zuordnungen und
die konfigurierte Pflicht folgen der Akzeptanzmatrix.

- Alle Verbraucher der Typauswahl prüfen, insbesondere DocType-, Metadaten-
  und Überschriftenregel. Untypisierte Dokumente und erlaubte unbekannte Typnamen dürfen keine
  DocType-spezifischen Folgefehler auslösen.
- YAML-Fehler gemäß bestätigter Vier-Fälle-Matrix prüfen; Position und
  Regel-Schweregrad nachweisen, ohne doppelte Zuordnungsbefunde.
- Keine DocType-Regelkonfiguration oder neuen Optionen an `metadata-schema`.
- Bestehende Schema- und `$schema`-Semantik erhalten; keine Metadaten verändern.
- Regeloptionen validieren und das empfohlene Preset entsprechend einstellen.

**Nachweis:** Fokussierte Tests zur Matrix neben den jeweiligen Quelldateien;
bestehende Schema-, Positions- und Strukturtests weiter erfolgreich. Tests nach
`sourceFileName.test.ts` beziehungsweise sinnvollen Themengruppen benennen.

## B – Projektkonfiguration und Aufrufwege nachweisen

**Ergebnis:** Gleiche Regeln gelten bei direkter Validator-Nutzung, eigenständiger
ESLint-Integration und Core-Validierung einschließlich CLI-Anbindung.

- Bestehenden Weg `validator.rules` → Config-Auflösung → Core → Validator nutzen.
- Alle vier Kombinationen von Typ-Pflicht und erlaubten unbekannten Namen sowie
  Source-Überschreibung und fehlende Konfiguration testen.
- Ein untypisiertes Dokument passiert die Standardvalidierung; ein fehlerhaftes
  Dokument mit bekanntem Typ schlägt weiterhin fehl; der Pflichtmodus weist das
  untypisierte Dokument zurück. Allgemeine Markdown-Regeln bleiben wirksam.
- CLI-Ausgabe und Exit-Code anhand der tatsächlich vorhandenen CLI-Anbindung
  prüfen. Keine zweite Validierungsengine oder separate CLI-Policy einführen.
- Auswirkungen auf Knowledge/Indexierung prüfen: fehlende Typzuordnung ist kein
  Ladefehler. Bestehende tolerante Indexierung nicht in diesem Task neu entwerfen.

**Nachweis:** Kleine Integrationstests über öffentliche Paket-Root-APIs;
bestehende Tests für betroffene Aufrufwege. Keine internen Cross-Package-Imports.

## C – Beispiele, Migration und Abschluss

**Ergebnis:** Anwender können den Standard und die gewünschte Pflicht einstellen.

- Je ein Beispiel ohne Frontmatter, mit freiem Frontmatter, mit erlaubtem
  unbekanntem Typ und mit gültigem bekanntem Typ.
- Pflichtmodus und Ablehnung unbekannter Typnamen getrennt dokumentieren;
  zusätzliche Felder anhand des jeweiligen Schemas erklären. Negative Beispiele behalten ihren fachlichen Zweck.
- Bestehende Erwartungen an Berichte, Fehlerzahlen und Exit-Codes prüfen;
  geänderte Zahlen aus dem neuen Vertrag ableiten, nicht pauschal ersetzen.
- Dokumentation des bisherigen Pflichtverhaltens suchen und aktualisieren.
- Die in der Delta-Spec benannten dauerhaften Paket-Specs auf den vollständigen
  neuen Vertrag aktualisieren. Auswahl und konfigurierbare Diagnose unterscheiden.
- Neue und geänderte Anforderungen mit konkreten Testnachweisen versehen;
  bestehende Nachweise auf weiterhin zutreffende Aussagen prüfen.
- Delta-Spec als abgeschlossene Änderungshistorie kennzeichnen und auf die
  aktualisierten dauerhaften Specs verlinken. Keine konkurrierenden Verträge pflegen.
- Fokussierte Tests sowie Typechecks/Builds der betroffenen Pakete ausführen.

**Abnahme:** Akzeptanz- und YAML-Matrix nachgewiesen, dauerhafte Specs mit
Implementierung und Tests abgeglichen, Migration dokumentiert, keine
unbeabsichtigte API-Änderung. Keine Änderungen an Package-Grenzen, Abhängigkeiten
oder Loader-Adapter-Verantwortung ohne gesonderten Bedarf.
