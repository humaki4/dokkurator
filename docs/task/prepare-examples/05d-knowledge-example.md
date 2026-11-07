---
doctype: task
title: Knowledge und Search mit gemeinsamen Beispieldaten demonstrieren
status: done
component: knowledge
tags: [examples, knowledge, cli]
---

# Knowledge und Search mit gemeinsamen Beispieldaten demonstrieren

## Ziel

Anfänger sollen in wenigen Schritten sehen, wie Dokkurator Dokumente
indexiert und per CLI durchsucht. Das Beispiel erweitert das bestehende
[`examples/documentation`](../../../examples/documentation) und legt kein zweites Projekt
an: dieselben Dokumente, DocTypes und dieselbe Projektkonfiguration werden
weiterverwendet.

## Voraussetzung

Die [Vorbereitung gemeinsamer Beispieldaten](05a-shared-example-data.md)
und die [Vereinfachung des Validator-Beispiels](05-examples.md)
berücksichtigen. ESLint liegt anschließend unter `examples/eslint`;
Knowledge verwendet weiterhin das Dokkurator-Projekt `examples/documentation`.
Keine Dokumente, DocTypes, Schemas oder Projektkonfiguration kopieren.

Zuerst [Indexierung trotz ungültiger Frontmatter](05c-tolerant-indexing.md)
umsetzen. Validator und Indexer sind unabhängig; die Fehlersammlung wird nicht
für Knowledge ausgeschlossen.

## Ausgangslage

- `examples/documentation` ist ein Projekt-Root mit `dokkurator.config.mjs`,
  `documents/valid` (8 Dokumente), `documents/invalid` und
  `_dokkurator/.doctypes` (8 DocTypes).
- Die CLI (`index`, `diff`, `search`, `doctype list`) sucht vom
  Arbeitsverzeichnis aufwärts nach der Projektkonfiguration und legt den Index
  unter `.dokkurator/index.db` ab.
- Ohne konfigurierte Sources ist der Projektordner die Source `root`; ein
  `source add` ist daher nicht nötig.

## Vorschlag für das Beispiel

Den Einstieg kurz halten: Volltextsuche, ein Metadatenfilter und anschließend
Ändern → `diff` → `index`. Weitere Suchvarianten als optionale Vertiefung
verlinken. Keine JS-Runner oder zusätzlichen Setup-Helfer einführen.

Die gesamte Sammlung einschließlich `documents/invalid` wird indexiert.
Die gültigen Dokumente in `documents/valid` haben
bereits Metadaten (`doctype`, `title`, `status`, ...) und Überschriften, daher
sind Volltext- und Metadatensuche sofort demonstrierbar, etwa `status:accepted`,
`doctype:decision` oder Volltext wie `ESLint`. Ablauf für Einsteiger:

```sh
pnpm install
pnpm --filter @dokkurator/cli... build
cd examples/documentation
pnpm run index
pnpm run search status:accepted
```

## Was zu tun ist

1. **Klären**
   - `documents/invalid` wird bewusst mitindexiert. README erklärt die
     Unabhängigkeit von Validierung und Suche; kein spezieller Ausschluss.
   - Reichen die vorhandenen Metadaten (`status`, `doctype`, `title`) für
     sinnvolle Suchen? Falls nicht, minimal ergänzen, ohne Validator-Beispiele
     und deren Tests zu brechen.
   - Wie verhält sich `examples/minimal-validation/` mit eigener `dokkurator.config.mjs` (eigener
     Projekt-Root, nicht Teil des Index)?
2. **`examples/documentation/package.json`**: Die CLI-Abhängigkeit und Scripts
   `index`, `search`, `diff` existieren bereits.
   Nach der Beispielbereinigung prüfen und nur bei Bedarf anpassen.
   Lockfile bei Manifeständerungen ohne breite Upgrades aktualisieren.
3. **`.gitignore`**: `.dokkurator/index.db*` ausschließen.
4. **Funktionsprüfung**: `index`, alle README-Suchen, dann ein Dokument ändern,
   `diff` und erneut `index` ausführen.
5. **Anleitung**: `examples/documentation/search.md` beschreibt Indexierung und Suche;
   `examples/documentation/README.md` verlinkt Validierung und Suche gleichwertig. Kurz halten: Voraussetzungen, Start in drei
   Befehlen, Suchbeispiele, Link zur [CLI-Referenz](../../../apps/cli/docs/commands.md).
6. **Einordnung**: In `examples/README.md` Validierung und Knowledge/Search als
   gleichwertige Abläufe vorstellen; Minimalvalidierung bleibt ein separates Beispiel.

## Suchbeispiele für die README

| Ziel            | Befehl                                                    |
| --------------- | --------------------------------------------------------- |
| Volltext        | `dokkurator search ESLint`                                |
| Phrase          | `dokkurator search "synchrone Validierung"`               |
| Metadatenfilter | `dokkurator search status:accepted`                       |
| AND             | `dokkurator search doctype:decision status:accepted`      |
| OR              | `dokkurator search doctype:guide OR doctype:runbook`      |
| Klammern        | `dokkurator search "(guide OR runbook) AND status:draft"` |
| Begrenzen       | `dokkurator search ESLint --limit 3`                      |

Werte werden nach Schritt 1 gegen die echten Dokumente geprüft. Erklären:
Treffer sind JSON, `index` ist inkrementell, `diff` ändert den Index nicht.

## Nicht-Ziele

- Kein zweites Beispielprojekt, keine eigene Konfiguration.
- Keine Remote-Sources, kein Watch-Modus, keine Multi-Repo-Einrichtung.
- Keine Änderungen an Validator-Verhalten oder dessen Tests.

## Akzeptanzkriterien

- Auf einem frischen Checkout genügen die README-Befehle zum Indexieren und
  Suchen.
- Alle README-Suchen liefern nachvollziehbare, nicht leere Treffer.
- Die verbleibenden Validator-Beispiele und deren Tests funktionieren weiterhin;
  die ausdrücklich geplante Entfernung von Virtual- und Gruppenrunnern ist
  keine Regression.

## Ergebnis und Prüfung

Der [Knowledge-Einstieg](../../../examples/documentation/search.md)
ist ausführbar dokumentiert; die Beispiele-Übersicht verlinkt Validierung und
Knowledge/Search als gleichwertige Abläufe. Die vorhandenen Scripts, Abhängigkeiten und Ignore-Regeln reichen aus.
Dokumente und Konfiguration wurden nicht geändert oder dupliziert.

Geprüft am 7. November 2026 mit einer temporären Kopie des gemeinsamen Projekts:

- CLI samt Abhängigkeiten erfolgreich gebaut.
- Erster Indexlauf: 24 Dokumente einschließlich ungültigem YAML; `examples/minimal-validation/`
  bleibt außerhalb der konfigurierten Sammlung `documents`.
- Alle sieben README-Suchen liefern Treffer: Volltext 2, Phrase 2,
  Metadatenfilter 2, AND 2, OR 7, Klammern 4 und begrenzte Suche 2.
- Für die Klammernsuche wird
  `(doctype:guide OR doctype:runbook) AND audience:developer` verwendet;
  der ursprünglich vorgeschlagene Statusfilter passt nicht zu diesen Dokumenten.
- Änderung an `documents/valid/decision.md`: `diff` zeigt eine Änderung;
  die Suche findet den neuen Text erst nach `index`. Danach zeigt `diff`
  null Änderungen und ein weiterer Indexlauf null indexierte Dokumente.
- Minimalvalidierung erfolgreich; erweiterte Validierung liefert weiterhin
  24 Dokumentergebnisse und den erwarteten Exit-Code 1.
