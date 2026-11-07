---
doctype: task
title: ESLint-Integration in ein eigenes Nutzerbeispiel auslagern
status: done
component: examples
---

# ESLint-Integration in ein eigenes Nutzerbeispiel auslagern

## Voraussetzung

[Gemeinsame Beispieldaten](05a-shared-example-data.md); mit der
[Validator-Bereinigung](05-examples.md) abstimmen.

## Umfang

`examples/eslint` als eigenes privates Workspace-Beispiel anlegen.
Die ESLint-Integration aus `examples/documentation` dorthin verschieben, ohne
Dokumente, DocTypes, Schemas oder Custom Rule zu kopieren.

Eine gut lesbare `eslint.config.mjs` als Standardweg zeigen. Die zweite vorhandene
Einbindungsvariante nur bei eigenständigem Erklärwert als optionales Beispiel
behalten; gemeinsame Vorbereitung nicht vervielfachen. Notwendige Vorbereitung
möglichst direkt in der Konfiguration zeigen. Den bisherigen `setup.mjs`-Aufbau
nicht unverändert als neues `src`-Gerüst übernehmen.

Vergleichstests für Core/ESLint und die relevanten Regelfälle erhalten und an die
neue Struktur anpassen. Tests neben der zugehörigen Konfiguration platzieren.
ESLint-spezifische Abhängigkeiten und Scripts aus dem Validator-Beispiel entfernen,
sofern dessen verbleibende Dateien sie nicht benötigen. Neue Manifeste und
Lockfile gezielt aktualisieren.

## Abnahme

- README erklärt in wenigen Befehlen Installation/Build und direkten ESLint-Lauf.
- Derselbe gemeinsame Datenbestand liefert die bisherigen Regelbefunde und
  Positionen; Warnungen und Fehler bleiben unterscheidbar.
- Nutzer können die Konfiguration ohne Lesen mehrerer Setup-Dateien verstehen.
- Keine Virtual-Demo und kein neues `src`-Hilfsgerüst im ESLint-Beispiel.
- ESLint-Lauf, Vergleichstests, Typecheck und Lint funktionieren vom neuen Ordner.
- Verweise aus Validator-README und Beispielübersicht zeigen auf den neuen Ort.

## Prüfung

Betroffene Pakete bauen, beide Beispielpakete prüfen und ESLint tatsächlich auf
der gemeinsamen Sammlung ausführen. Erwartete Fehler der Negativsammlung prüfen.
Nach veralteten Pfaden und nicht mehr benötigten Abhängigkeiten suchen.
