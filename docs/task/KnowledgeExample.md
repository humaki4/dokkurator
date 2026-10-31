---
doctype: task
title: Example for knowledge use
status: open
component: knowledge
tags: [examples, knowledge, cli]
---

# Example for Using Knowledge CLI

## Ziel

Anfänger sollen in wenigen Schritten sehen, wie Dokkurator Dokumente
indexiert und per CLI durchsucht. Das Beispiel erweitert das bestehende
[`examples/validator`](../../examples/validator) und legt kein zweites Projekt
an: dieselben Dokumente, DocTypes und dieselbe Projektkonfiguration werden
weiterverwendet.

## Voraussetzung

Zuerst [Indexierung trotz ungültiger Frontmatter](./index-invalid-documents.md)
umsetzen. Validator und Indexer sind unabhängig; die Fehlersammlung wird nicht
für Knowledge ausgeschlossen.

## Ausgangslage

- `examples/validator` ist ein Projekt-Root mit `dokkurator.config.mjs`,
  `documents/valid` (8 Dokumente), `documents/invalid` und
  `_dokkurator/.doctypes` (8 DocTypes).
- Die CLI (`index`, `diff`, `search`, `doctype list`) sucht vom
  Arbeitsverzeichnis aufwärts nach der Projektkonfiguration und legt den Index
  unter `.dokkurator/index.db` ab.
- Ohne konfigurierte Sources ist der Projektordner die Source `root`; ein
  `source add` ist daher vermutlich nicht nötig (prüfen).

## Vorschlag für das Beispiel

Die vorhandenen Dokumente in `documents/valid` werden indexiert. Sie haben
bereits Metadaten (`doctype`, `title`, `status`, ...) und Überschriften, daher
sind Volltext- und Metadatensuche sofort demonstrierbar, etwa `status:accepted`,
`doctype:decision` oder Volltext wie `ESLint`. Ablauf für Einsteiger:

```sh
pnpm install
pnpm --filter @dokkurator/cli... build
cd examples/validator
pnpm run knowledge:index
pnpm run knowledge:search -- "status:accepted"
```

## Was zu tun ist

1. **Klären**
   - Wird `documents/invalid` mitindexiert? Falls ja: bewusst belassen oder
     über die Konfiguration ausschließen, damit Suchergebnisse verständlich
     bleiben.
   - Reichen die vorhandenen Metadaten (`status`, `doctype`, `title`) für
     sinnvolle Suchen? Falls nicht, minimal ergänzen, ohne Validator-Beispiele
     und deren Tests zu brechen.
   - Wie verhält sich `minimal/` mit eigener `dokkurator.config.mjs` (eigener
     Projekt-Root, nicht Teil des Index)?
2. **`examples/validator/package.json`**: `@dokkurator/cli` als
   `workspace:*` ergänzen; Scripts `knowledge:index`, `knowledge:search`,
   `knowledge:diff` hinzufügen. Lockfile ohne breite Upgrades aktualisieren.
3. **`.gitignore`**: `.dokkurator/index.db*` ausschließen.
4. **Funktionsprüfung**: `index`, alle README-Suchen, dann ein Dokument ändern,
   `diff` und erneut `index` ausführen.
5. **README**: `examples/validator/README.md` um den Abschnitt „Knowledge per
   CLI ausprobieren“ erweitern. Kurz halten: Voraussetzungen, Start in drei
   Befehlen, Suchbeispiele, Link zur [CLI-Referenz](../../apps/cli/docs/commands.md).
6. **Einordnung**: In `examples/README.md` erwähnen, dass der Knowledge-Teil
   optional ist und der Validator-Minimalstart unverändert bleibt.

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
- Bestehende Validator-Beispiele und -Tests laufen unverändert.
