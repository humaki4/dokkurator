---
doctype: task
title: Validator-Beispiele auf einen einfachen CLI-Einstieg reduzieren
status: open
component: examples
---

# Validator-Beispiele auf einen einfachen CLI-Einstieg reduzieren

## Voraussetzung

[04](04-cli-integration.md) und die Festlegungen aus
[Vorbereitung der gemeinsamen Beispieldaten](05a-shared-example-data.md).
Die ESLint-Auslagerung erfolgt in [05b](05b-eslint-example.md); beide Änderungen
müssen abgestimmt sein, damit die Integration erhalten bleibt.

## Ziel

Die Beispiele richten sich an Nutzer. Der Standardweg besteht aus Dokumenten,
DocTypes, einer verständlichen Konfiguration und CLI-Aufrufen. Weniger sichtbare
Hilfsdateien und Skripte sind ein ausdrückliches Abnahmekriterium.

## Umfang

- `start`/`demo` auf die CLI-Validierung des Minimalprojekts umstellen, etwa
  `dokkurator --project minimal validate`; die gesamte Sammlung über einen
  weiteren CLI-Aufruf prüfen. JSON mit `--format json` demonstrieren.
- `src/run.mjs` mit eigener Berichtsausgabe und Gruppenauswahl entfernen.
  `demo:valid` und `demo:invalid` samt ausschließlich zugehörigen Tests entfernen;
  gültige und ungültige Dokumente bleiben durch ihre Ordner erkennbar.
- Genau ein kurzes ausführbares JS-Beispiel für die direkte Core-Einbindung
  behalten, vorzugsweise `validate.mjs` im Beispiel-Root: öffnen, validieren,
  Ergebnis ausgeben und zuverlässig schließen. Keine Setup-Helfer oder eigene
  Formatter-Implementierung. Den bisherigen Minimalrunner entsprechend kürzen.
- Das virtuelle Beispiel vollständig entfernen: `virtual.mjs`,
  `prepare-virtual-project.mjs`, `virtual.dokkurator.config.mjs`, zugehöriger
  Test, Script und README-Abschnitt. Keine Ersatzdemo mit temporären Dateien.
- Die erweiterte Konfiguration übersichtlich halten: JSON-Schema direkt mit
  der unterstützten Node-Importsyntax importieren, `prepare-resources.mjs`
  entfernen, Custom Rule unter `rules/no-todo.mjs` verständlich ablegen.
- Nach der ESLint-Auslagerung den bisherigen `src`-Ordner auflösen. Tests neben
  die zugehörige Implementierung bzw. Konfiguration legen. Test- und
  Typecheck-/Lint-Skripte auf die verbleibenden Dateien anpassen.

## Abnahme

- Minimaler CLI-Lauf prüft ein Dokument und endet mit 0, ohne Indexvorbereitung.
- Sammlung prüft weiterhin 24 Dokumente, davon 14 fehlgeschlagen, und endet mit 1.
  Die beiden reinen Warnungsfälle bleiben erfolgreich; JSON ist parsebar.
- Ein einziges kleines JS-Beispiel demonstriert die direkte Einbindung.
- Kein `src`-Ordner, keine Virtual-Dateien und keine Gruppenrunner bleiben zurück.
- Die Sammlung enthält weiterhin acht DocTypes und die bestehenden Regelfälle;
  Bereinigung entfernt Demo-Infrastruktur, keine fachlichen Beispiele.
- CLI-Skripte und JS-Beispiel sind automatisiert geprüft. Entfallene Demos
  benötigen keine Kompatibilitätstests; relevante Regelabdeckung bleibt erhalten.
- Abhängigkeiten, Lockfile und Dateiverweise entsprechen dem reduzierten Umfang,
  ohne breite Upgrades. Keine öffentlichen Bibliotheks-APIs ändern.

## Prüfung

CLI samt Abhängigkeiten bauen; Beispieltests, Typecheck und Lint ausführen.
Neue CLI-Aufrufe und das JS-Beispiel starten. Verweise auf entfernte Dateien,
Scripts und `src` suchen. ESLint-Abnahme aus Task 05b mit ausführen.
