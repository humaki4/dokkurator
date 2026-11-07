# Dokumente indexieren und durchsuchen

Nach [Installation und Build](./README.md#vorbereitung), im Verzeichnis
`examples/documentation`:

```sh
pnpm run index
pnpm run search ESLint
pnpm run search status:accepted
```

Der erste Indexlauf lädt alle 24 Dokumente aus `documents`, einschließlich der
absichtlichen Fehlerbeispiele. Validierung und Suche sind unabhängig: Auch bei
ungültigem YAML bleibt der Markdown-Inhalt durchsuchbar. Diese Dokumente haben
im Index leere Metadaten und keinen DocType; `validate` meldet die Fehler weiterhin.
Die vorhandenen Dokumente, DocTypes und die Projektkonfiguration werden gemeinsam
verwendet. Der [Minimalfall](../minimal-validation/README.md) ist ein eigener Projekt-Root und
gehört nicht zur konfigurierten Sammlung `documents`.

Suchtreffer werden als JSON ausgegeben. Weitere Suchvarianten:

| Ziel      | Befehl                                                                        |
| --------- | ----------------------------------------------------------------------------- |
| Phrase    | `pnpm run search '"Synchrone Validierung"'`                                   |
| AND       | `pnpm run search doctype:decision status:accepted`                            |
| OR        | `pnpm run search doctype:guide OR doctype:runbook`                            |
| Klammern  | `pnpm run search '(doctype:guide OR doctype:runbook) AND audience:developer'` |
| Begrenzen | `pnpm run search ESLint --limit 3`                                            |

Die äußeren einfachen Anführungszeichen übergeben den Ausdruck als ein Argument;
bei der Phrasensuche bleiben die inneren doppelten Anführungszeichen für die
Suchsyntax erhalten.

Ergänze in [documents/valid/decision.md](./documents/valid/decision.md) am Ende
beispielsweise den Satz `KnowledgeProbe ist jetzt auffindbar.` und führe aus:

```sh
pnpm run diff
pnpm run search KnowledgeProbe
pnpm run index
pnpm run search KnowledgeProbe
pnpm run diff
```

Das erste `diff` zeigt eine Änderung; es verändert den Index nicht. Daher liefert
die erste Suche noch `[]`. Nach `index` findet die Suche das geänderte Dokument,
und das letzte `diff` meldet `0 changes`. `index` arbeitet inkrementell: Ein weiterer
Lauf ohne Änderungen meldet `0 indexed`. Entferne den ergänzten Satz anschließend
und indexiere erneut, um den Ausgangszustand wiederherzustellen.

Der lokale Index liegt unter `.dokkurator/index.db` und wird von Git ignoriert.
Weitere Optionen stehen in der [CLI-Referenz](../../apps/cli/docs/commands.md).
