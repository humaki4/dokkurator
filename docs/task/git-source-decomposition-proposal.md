---
doctype: task
title: GitSource entlang seiner Verantwortlichkeiten zerlegen
status: proposed
component: loader
tags: [loader, source-adapters, git, architecture]
---

# GitSource entlang seiner Verantwortlichkeiten zerlegen

## Ausgangslage

`packages/loader/src/source-adapter/git-source.ts` bündelt mehrere Aufgaben in
einer langen Datei. `GitSource` implementiert die Source-Adapter-API, führt
Git-Kommandos aus, liest und filtert Dateipfade, baut Quellenmetadaten und
verwaltet zugleich Clone-/Update-Vorgänge für Checkouts.

Die Datei enthält unter anderem:

- Erkennen des Repository-Roots und Erstellen eines Checkouts;
- Lesen und Auflisten von Working-Tree-Dateien;
- Lesen einer Datei aus einer Commit-Revision;
- Ermitteln von Repository-Kontext, Remotes, Branch und HEAD;
- Sammeln des letzten Datei-Commits und des Working-Tree-Status;
- Aufbauen von committed File-States und Vergleichen von Revisionen;
- Pfadnormalisierung, Pfadvalidierung und Status-Mapping.

Dadurch ist die Adapter-Fassade zugleich Lifecycle-Service und Implementierung
mehrerer unterschiedlicher Git-Abfragen. Das erschwert es, die Zuständigkeit
einer Änderung zu erkennen und die jeweiligen Teile gezielt zu testen.

## Ziel

Die Git-Implementierung soll in kleinere, intern zusammengehörige Module
aufgeteilt werden. `GitSource` bleibt die von Loader unterstützte Adapterklasse
und koordiniert die nötigen Operationen. Die öffentliche Source-Adapter-API,
ihre bestehenden Laufzeitsemantiken und die Package-Grenzen werden durch diese
Zerlegung nicht geändert.

## Vorgeschlagene Verantwortlichkeiten

Eine mögliche interne Aufteilung innerhalb von
`packages/loader/src/source-adapter/`:

| Modul | Verantwortung |
| --- | --- |
| `git-source.ts` | Öffentliche `GitSource`-Klasse und Koordination von `list()`, `read()` und `diff()` |
| `git-repository.ts` | Repository-Kontext, Root-Ermittlung, Revision/Branch/Remote-Metadaten und Git-Statusabfragen |
| `git-files.ts` | Git-Dateiliste, Source-ID-/Repository-Pfad-Abbildung und committed File-State-Ermittlung |
| `git-metadata.ts` | Mapping von Git-Status und letzter Commit-Information auf Loader-eigene Metadatentypen |
| `git-checkout.ts` | Interne Clone-/Update-Primitiven für die von `local-source.ts` angebotenen Lifecycle-Operationen |

Die Modulnamen und genaue Zuordnung sind Implementierungsentscheidungen.
Entscheidend ist eine Kohäsion nach Verantwortung; die Zerlegung soll nicht
lediglich Methoden anhand ihrer Position oder Dateilänge verteilen.

## Abgrenzung des Checkout-Lifecycles

`GitSource` ist primär der Adapter für Lesen, Auflisten, Metadaten und
Änderungsermittlung. Clone und Update verändern den Repository-Zustand und
gehören zum expliziten Source-Lifecycle.

Empfehlung:

- `openConfiguredSource()`, `prepareConfiguredSource()` und
  `updateConfiguredSource()` bleiben die Loader-seitigen Einstiegspunkte für
  den konfigurierten Lifecycle.
- `local-source.ts` koordiniert diese Use Cases.
- Falls Git-spezifische Low-Level-Operationen ausgelagert werden, bleiben sie
  interne Hilfsfunktionen desselben Loader-Packages.
- Die öffentliche `GitSource`-Klasse erhält keine zusätzlichen
  Checkout-Verantwortlichkeiten, sofern dafür keine bewusst gewünschte
  öffentliche API-Änderung beschlossen wird.

Die bestehende Architekturentscheidung verortet Source-Adapter und lokale
Git-Implementierung in Loader. Die Aufteilung begründet daher weder ein neues
Package noch öffentliche Unterpfade.

## Bewusst nicht vorgeschlagen

- Keine Änderung an `SourceAdapter`, `DocumentSource`, `SourceState` oder
  anderen öffentlichen Typen.
- Keine neuen Exports aus `@dokkurator/loader` für interne Git-Helper.
- Kein Verlegen von Git-Code in Core, Knowledge oder die CLI.
- Keine gleichzeitige Änderung der Checkout-Semantik. Insbesondere sollten
  Remote-Identitätsprüfung, Branch-Regeln und Fast-Forward-Politik als eigener
  Lifecycle-Schritt behandelt werden, nicht beiläufig mit der Dateiaufteilung.
- Kein Austausch von `simple-git` und keine Änderung der Git-Kommandos allein
  zum Zweck der Zerlegung.

## Vorgehensvorschlag

1. Öffentliche und getestete Semantik von `GitSource` festhalten: Listen,
   Working-Tree- und Commit-Lesezugriffe, Metadaten, Subdirectory-Roots und Diff.
2. Reine Hilfslogik zuerst intern extrahieren, ohne Verhalten zu ändern.
3. Repository-Abfragen und Metadaten-Mapping als zusammenhängende Einheiten
   isolieren.
4. Checkout-Primitiven zuletzt aus dem Adapter herauslösen und
   `local-source.ts` als Lifecycle-Koordinator erhalten.
5. Nach jedem Schritt Adaptertests sowie Loader-Typecheck ausführen und
   prüfen, dass keine Hilfsdatei packageübergreifend importiert wird.

## Akzeptanzkriterien

- `GitSource` und die bestehende Loader-Root-API behalten ihre Signaturen und
  beobachtbare Semantik.
- Keine Git-interne Datei wird über einen Export-Subpath öffentlich.
- Adapterverträge und Helper bleiben in `@dokkurator/loader`.
- Git-Checkout-/Update-Vorgänge laufen weiterhin nur über explizite
  Lifecycle-Operationen.
- Bestehende Git-Source-Tests laufen unverändert; neue Helper erhalten
  fokussierte Tests, wenn sie eigenständige Logik enthalten.
- Die Zerlegung verursacht keine zyklischen Imports und keine Duplikation von
  Pfad-, Metadaten- oder Statuslogik.

## Offene Frage

Die genaue Grenze zwischen `git-repository.ts`, `git-files.ts` und
`git-metadata.ts` sollte während der Implementierung anhand der Abhängigkeiten
festgelegt werden. Wenn ein Helper nur von `GitSource` verwendet wird und keine
eigenständige Kohäsion gewinnt, sollte er dort verbleiben, statt ein Modul nur
zur Verringerung der Zeilenzahl anzulegen.
