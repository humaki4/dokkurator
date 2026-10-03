---
doctype: task
title: Interaktiver CLI-Modus
status: open
---

# Interaktiver CLI-Modus

Status: Nachgelagerter Produkt- und Architektur-Task  
Abhängigkeit: stabiler Core-Lifecycle aus `core-and-loader-boundaries.md`

## Ziel

Einen optionalen interaktiven Dokkurator-Modus konzipieren, der eine geöffnete
Core-App über mehrere Benutzereingaben hinweg wiederverwendet.

## Zu klärende Punkte

- Startsyntax und Abgrenzung zu den bestehenden Einmal-Kommandos.
- Erhalt der Skriptfähigkeit und Rückwärtskompatibilität.
- Prompt, History, Hilfe, Autovervollständigung und Beenden.
- Parsing und Wiederverwendung der bestehenden Commander-Kommandos.
- Verhalten von `open()`, `close()` und erneutem Öffnen.
- Abbruch laufender Operationen sowie `SIGINT`-/`SIGTERM`-Semantik.
- Darstellung gesammelter Source-Fehler und Exit-Status im interaktiven Modus.
- Umgang mit geänderter Projekt- oder Repository-Konfiguration.
- Tests für mehrere aufeinanderfolgende Kommandos und Cleanup.

## Erwartetes Ergebnis

- Entscheidung, ob und wie ein interaktiver Modus angeboten wird.
- Host-Konzept ohne interaktive Verantwortung in `@dokkurator/core`.
- Die nicht-interaktive CLI bleibt weiterhin für Skripte nutzbar.
