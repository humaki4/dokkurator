---
doctype: task
title: Exit-Codes für CLI-Validierung festlegen und umsetzen
status: done
component: cli
---

# Exit-Codes für CLI-Validierung festlegen und umsetzen

Umgesetzt: Die CLI leitet den Exit-Status aus dem vollständigen Bericht ab;
der Programmeinstieg setzt ihn nach Ausgabe und Aufräumen. Leere erfolgreiche
Läufe sind im Textbericht erkennbar. Direkte Command-Aufrufe ändern keinen
globalen Exit-Status. Geprüft mit 50 CLI-Tests einschließlich Prozess-Tests
des gebauten Einstiegs sowie CLI-Typecheck, Build und Lint.

## Voraussetzung

[02](02-reporting.md).

## Umfang

Den Exit-Status aus dem vollständigen Core-Bericht ableiten: 1, sobald ein
Dokument `status: failed` hat oder `errors` nicht leer ist; sonst 0.
Warnungen allein bleiben erfolgreich. Ein erfolgreicher leerer Dokumentbestand
bleibt Status 0 und wird im Textbericht als leer erkennbar.

Unbekannte Sources, ungültige CLI-Argumente, Konfigurations-, Laufzeit- und
Formatterfehler ergeben ebenfalls Status 1. Die bestehende Behandlung geworfener
Fehler im Programmeinstieg berücksichtigen. Keine zusätzlichen Fehlercodeklassen.
Kein hartes `process.exit()`, damit Ausgabe und Aufräumen abgeschlossen werden.
Die Entscheidung gehört in die CLI, nicht in Core oder Validator.

## Abnahme

- Prozess-Tests prüfen gültige Dokumente und reine Warnungen mit Status 0.
- Dokumentfehler, operative Fehler und gemischte Source-Ergebnisse liefern 1.
- Unbekannte Source, unbekanntes Format und ungültige Config liefern 1.
- Leere erfolgreiche Auswahl liefert 0; fehlgeschlagene Source liefert auch
  ohne Dokumentergebnisse 1.
- Alle Berichte werden trotz fehlgeschlagener Dokumente vollständig ausgegeben.
- Tests mit direktem Command-Aufruf hinterlassen keinen globalen Exit-Status.

## Prüfung

Gezielte CLI-Tests sowie Tests des gebauten Programmeinstiegs ausführen;
Prozess-Tests neben der zugehörigen Implementierung ablegen.
