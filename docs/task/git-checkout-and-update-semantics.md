# Git-Checkout- und Update-Semantik

Status: Nachgelagerter Architektur-Task  
Abhängigkeit: `core-and-loader-boundaries.md`

## Ziel

Den Loader-Vertrag für Vorbereitung, Öffnen und Aktualisieren konfigurierter
Git-Sources eindeutig festlegen.

## Zu klärende Punkte

- Wann gilt ein vorhandener Pfad als gültiger Checkout?
- Verhalten bei einem vorhandenen Nicht-Git-Verzeichnis.
- Prüfung und Behandlung eines falschen oder fehlenden `origin`.
- Branch-Auswahl, detached HEAD und fehlende Tracking-Branches.
- Verhalten bei lokalen Änderungen und divergierenden Branches.
- Exakte Semantik von Fetch, Checkout, Pull und möglichem Fast-forward-only.
- Fehlerklassifikation und Handlungsempfehlungen für Core und CLI.
- Abgrenzung zwischen lokalen Git-Sources und verwalteten Remote-Checkouts.
- Tests für Clone, erneutes Prepare, Update und typische Fehlerzustände.

## Erwartetes Ergebnis

- Öffentliche Loader-Operationen ohne versteckte Clone-/Update-Seiteneffekte.
- Ein belastbarer Vertrag, den Core für `prepare()` und `sync()` verwenden kann.
- Keine Git-spezifische Entscheidungslogik in Core oder CLI.
