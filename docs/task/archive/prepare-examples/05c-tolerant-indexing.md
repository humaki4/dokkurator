---
doctype: task
title: Dokumente trotz ungültiger Frontmatter indexieren
status: done
component: knowledge
tags: [indexing, loader, cli]
---

# Dokumente trotz ungültiger Frontmatter indexieren

Das verbindliche Verhalten und seine Testabdeckung sind in der
[Knowledge-Spec](../../../packages/knowledge/docs/specs/tolerant-indexing.md) beschrieben.

## Ziel

Validator und Indexer sind unabhängig. Dokumente werden unabhängig von
Validierungsbefunden indexiert und bleiben per Volltext auffindbar. Auch
syntaktisch ungültige YAML-Frontmatter darf die Indexierung nicht verhindern.
Das gilt generell für Knowledge, Core und die CLI, nicht nur für Beispiele.

## Bestätigte Ausgangslage

Knowledge ruft in `packages/knowledge/src/index/incremental-index.ts`
`loadDocument` ohne `parseErrors: "collect"` auf. Loader wirft standardmäßig
bei YAML-Parse- und Konvertierungsfehlern einen `DocumentParseError`.
Da alle geänderten Dokumente vor `applySourceUpdate` geladen werden, verhindert
ein solches Dokument das gesamte Update dieser Source einschließlich Checkpoint.
Andere Sources werden durch Core weiterhin unabhängig verarbeitet.

Schemafehler, fehlende oder unbekannte DocTypes und Validator-Regelbefunde sind
bereits keine Indexierungssperre: der Indexierungspfad ruft den Validator nicht auf.
Das Problem liegt im strikten Frontmatter-Parsing.

Loader unterstützt bereits `parseErrors: "collect"`. Dabei bleiben Markdown-Inhalt,
Überschriften, Links, Originaltext und Source erhalten; Metadaten sind bei
fehlerhafter Frontmatter `undefined`, Parse-Diagnosen werden separat gesammelt.
Knowledge bildet fehlende Metadaten bereits auf `{}` ab und lässt den DocType weg.

## Umsetzung

- Im generellen Indexierungspfad tolerantes Frontmatter-Parsing verwenden,
  einschließlich revisionierter Git-Lesevorgänge. Keine Validator-Prüfung als
  Voraussetzung hinzufügen.
- Bei ungültiger Frontmatter den Markdown-Inhalt und Source-Pfad indexieren;
  keine möglicherweise falschen Metadaten oder DocTypes aus fehlerhaftem YAML
  übernehmen. Gültige Metadaten weiterhin unverändert indexieren, auch wenn
  sie nicht dem DocType-Schema entsprechen.
- Den Umgang mit Parse-Diagnosen dokumentieren: Sie sind keine fatalen
  Indexfehler; Validator bleibt für Validierungsbefunde zuständig.
- Echte Lese-, Source- und Datenbankfehler weiterhin als Fehler behandeln und
  die atomare Speicherung von Dokumenten und Checkpoint erhalten.
- Öffentliche Paket-Root-APIs und die bestehenden Paketgrenzen einhalten.

## Prüfung und Akzeptanzkriterien

- Eine Source mit gültigen Dokumenten, ungültigem YAML und YAML-Konvertierungsfehlern
  wird vollständig indexiert. Alle Markdown-Inhalte sind per Volltext auffindbar.
- Schemawidrige Metadaten, fehlende und unbekannte DocTypes sowie Regelverstöße
  verhindern die Indexierung nicht; gültig geparste Metadaten bleiben suchbar.
- Nach erfolgreicher Indexierung zeigt `diff` keine Änderungen; ein weiterer
  `index` indexiert keine unveränderten Dokumente erneut.
- Änderungen von gültiger zu ungültiger Frontmatter und zurück aktualisieren
  Inhalt und Metadaten korrekt; veraltete Metadaten verschwinden.
- Löschen und erneute Indexierung entfernen auch fehlerhafte Dokumente korrekt.
- Dateisystem- und Git-Sources, Core `prepare`/`sync` und CLI `index` abdecken.
- Validator-Verhalten und bestehende Validator-Tests bleiben unverändert.
- Tests neben den entsprechenden Implementierungen ergänzen; fokussierte Tests,
  Typprüfungen und Builds ausführen.

## Abhängiges Beispiel

[Knowledge-Beispiel](05d-knowledge-example.md) anschließend ohne umgebungsabhängigen
Ausschluss der Fehlersammlung abschließen. Die gemeinsame Konfiguration bleibt
unverändert; die README erklärt, dass auch absichtlich fehlerhafte Dokumente
indexiert werden. Alle Suchbeispiele und der Ablauf Ändern → `diff` → `index`
werden gegen die vollständige Sammlung geprüft.

## Umsetzung und Prüfung

Beide Knowledge-Einstiege (`indexDocuments` und `indexDocumentChanges`) laden
Frontmatter jetzt mit `parseErrors: "collect"`. Git liest weiterhin die Revision
des Diffs. Signaturen, Rückgabetypen und strikter Loader-Default bleiben erhalten.

Regressionstests decken vollständige und inkrementelle Indexierung, YAML-Syntax-
und Konvertierungsfehler, Metadatenwechsel, Löschung, unveränderte Checkpoints,
Git-Revisionsbindung, Leseprobleme, SQLite-Rollback sowie Core und CLI ab.
Knowledge-README und CLI-Referenz erklären die Trennung von Indexierung und
Validierung. Die ausführbare Beispieldokumentation bleibt Aufgabe von 05d.
