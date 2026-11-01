---
doctype: task
title: Validate-Befehl mit Core verbinden
status: done
component: cli
---

# Validate-Befehl mit Core verbinden

## Umfang

In `apps/cli/src/commands/validate.ts` einen Command registrieren und in
`command.ts` einbinden. Vertrag: `validate [source-id]`; `--project` bleibt die
globale Option. Ohne Source-ID alle effektiven Sources, einschließlich der
impliziten Source `root`, mit ID nur diese Source prüfen.

Über `withDokkurator` genau einmal `app.validate({ sourceId })` ausführen.
Keine eigene Konfigurationsauflösung, Dokumentauswahl oder Regelvorbereitung.
Den strukturierten Bericht für die spätere Ausgabe intern weiterreichen.
Dieser Task liefert die Anbindung, noch keinen fertigen Bericht.

## Abnahme

- Root-Hilfe und `validate --help` führen Befehl und optionales Argument auf.
- Command-Tests prüfen Weitergabe des Projektpfads und der Source-ID sowie
  genau einen Validate-Aufruf und das Schließen nach Erfolg/Operationsfehler.
- Unbekannte Source-IDs werden nicht als erfolgreicher leerer Lauf behandelt.
- Kein Aufruf von `prepare`, `sync`, `search` oder Indexfunktionen.
- Tests neben der Implementierung, etwa `commands/validate.test.ts`.

## Prüfung

CLI-Tests und CLI-Typecheck ausführen. Bestehende Commands bleiben unverändert.
Kein neuer öffentlicher Core-Vertrag und keine neue Paketabhängigkeit nötig.
