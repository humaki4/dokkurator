---
doctype: task
title: Source-Root-Grenze bei symbolischen Links durchsetzen
status: open
component: loader
tags: [loader, source-adapters, filesystem, security]
---

# Source-Root-Grenze bei symbolischen Links durchsetzen

## Problembeschreibung

Die Datei- und Git-Adapter verhindern mit `resolveId()` lexikalische
Pfadtraversal wie `../outside.md`. Diese Prüfung vergleicht den mit `resolve()`
gebildeten Pfad mit dem konfigurierten Root. Sie berücksichtigt nicht, dass
Dateisystemkomponenten symbolische Links sein können.

Anschließende Dateioperationen folgen symbolischen Links:

- `FileSystemSource.read()` ruft `readFile()` auf dem geprüften Pfad auf.
- `GitSource.read()` macht dasselbe für Dateien aus dem Working Tree.
- `GitSource.toExistingSourceId()` verwendet `stat()`, das ebenfalls dem Link
  folgt. Ein versionierter Symlink, dessen Ziel eine reguläre Datei außerhalb
  des Source Roots ist, kann dadurch als Quelleintrag behandelt und gelesen
  werden.

Beispiel:

```text
source-root/
└── private.md -> /path/outside/source/private.md
```

`read("private.md")` bleibt lexikalisch unter `source-root`, liest tatsächlich
aber den Inhalt außerhalb davon. Ebenso können Pfadkomponenten wie
`linked-directory/document.md` über einen Symlink aus dem Root herausführen.
Die bestehende Prüfung gegen `../` schützt vor diesem Fall nicht.

Die Auflistung von `FileSystemSource` nimmt Symlink-Einträge momentan nicht als
reguläre Dateien oder Verzeichnisse auf. Das schützt `read()` nicht, da ein
Aufrufer eine bekannte Source-ID direkt lesen kann. Bei `GitSource` kann
`stat()` einem versionierten Symlink bis zu einer regulären Datei folgen.

## Erwartetes Verhalten

Ein Adapter darf über seine Source-ID nur Inhalte innerhalb des effektiv
konfigurierten Source Roots bereitstellen. Die Prüfung muss den tatsächlich
aufgelösten Dateisystempfad berücksichtigen, nicht nur den normalisierten
Source-ID-String.

Empfohlene Semantik:

- Ein Linkziel innerhalb des kanonisierten Roots darf gelesen werden.
- Ein Linkziel außerhalb des Roots wird mit einem klaren Root-Escape-Fehler
  abgelehnt.
- Ein defekter Link wird nicht als erfolgreicher Dateizugriff behandelt.
- Der Umgang mit Symlink-Einträgen in `list()` und `diff()` entspricht
  konsistent derselben Regel wie `read()`.
- Ein als Source Root konfigurierter Symlink wird entweder auf sein kanonisches
  Ziel normalisiert oder ausdrücklich abgelehnt; das Verhalten ist zu
  dokumentieren und zu testen.

Die Adapter dürfen bei einem abgelehnten Zugriff keinen Dateinhalt außerhalb
des Roots zurückgeben. Ein solcher Zugriff ist kein gewöhnlicher
`SourceNotFoundError`.

## Betroffene Stellen

- `packages/loader/src/source-adapter/file-system-source.ts`
  - `resolveId()` prüft nur lexikalische Pfade.
  - `read()` liest anschließend den aufgelösten Pfad.
  - `collectEntries()` definiert derzeit ein anderes Symlink-Verhalten als
    direkte Lesezugriffe.
- `packages/loader/src/source-adapter/git-source.ts`
  - `resolveId()` hat dieselbe lexikalische Grenze.
  - `read()` folgt möglichen Symlinks im Working Tree.
  - `toExistingSourceId()` benutzt `stat()` und kann ein Symlink-Ziel als
    reguläre Datei einstufen.
- `packages/loader/src/source-adapter/file-system-source.test.ts`
- `packages/loader/src/source-adapter/git-source.test.ts`

## Umsetzungshinweise

Kanonisiere Root und Datei-/Verzeichnisziel und prüfe, ob das kanonische Ziel
innerhalb des kanonischen Roots liegt. Die Validierung muss bei den Operationen
greifen, die tatsächlich auf Inhalte zugreifen; eine Prüfung nur während
`list()` reicht nicht, da `read()` auch direkt aufgerufen wird.

Eine gemeinsame interne Hilfsfunktion kann sinnvoll sein, sofern sie in Loader
bleibt und keine neue Package-Grenze oder öffentliche Export-Subpath erzeugt.
Für die Umsetzung ist außerdem zu prüfen, wie mit nicht vorhandenen Zielen,
defekten Links und Rennen zwischen Prüfung und Dateiöffnung umgegangen wird.

## Akzeptanzkriterien

- Lexikalische Traversal-Pfade außerhalb des Roots werden weiterhin abgelehnt.
- `read()` lehnt einen Symlink auf eine Datei außerhalb des Roots in beiden
  Adaptern ab.
- Ein Pfad mit einem Symlink-Verzeichnis als Zwischenkomponente kann ebenfalls
  keine Datei außerhalb des Roots lesen.
- Links auf Ziele innerhalb des Roots folgen der dokumentierten Semantik.
- `list()`, `read()` und `diff()` widersprechen sich nicht hinsichtlich der
  Behandlung von Symlink-Dateien.
- Tests verwenden temporäre Source Roots und externe Testdateien; sie verändern
  keine Dateien außerhalb ihrer aufgeräumten Testverzeichnisse.

## Nicht-Ziele

- Symlinks generell aus Git-Repositories verbannen.
- Git-Symlink-Inhalte oder Source-ID-Formate ändern.
- Die Source-Adapter-API oder Package-Grenzen ändern.
