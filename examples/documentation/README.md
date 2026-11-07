# Dokumente validieren und durchsuchen

Eine gemeinsame Sammlung zeigt zwei gleichwertige Abläufe: Dokumentqualität
prüfen und Dokumente über Knowledge finden. Beide verwenden dieselben
24 Dokumente, acht DocTypes und dieselbe Projektkonfiguration. Alle Daten bleiben lokal.

## Vorbereitung

Im Repository-Stammverzeichnis (Node.js `>=22.13.0 <23` oder `>=24.0.0`, pnpm `>=10 <11`):

```sh
pnpm install
pnpm --filter @dokkurator/cli... build
cd examples/documentation
```

## Ablauf wählen

| Dokumente validieren                         | Dokumente durchsuchen                                  |
| -------------------------------------------- | ------------------------------------------------------ |
| Metadaten, Struktur und eigene Regeln prüfen | Inhalte indexieren, Volltext und Metadaten durchsuchen |
| `pnpm validate`                              | `pnpm index`, danach `pnpm search ESLint`              |
| [Validierungsanleitung](./validation.md)     | [Knowledge/Search-Anleitung](./search.md)              |

Die Sammlung enthält absichtlich fehlerhafte Dokumente: `validate` endet mit
Exit-Code 1. `index` nimmt trotzdem alle 24 Dokumente auf. Validierung benötigt
keinen Index; Suche setzt einen Indexlauf voraus.

## Gemeinsame Dateien

```text
documentation/
├── dokkurator.config.mjs   # Dokumentpfad, Schema und eigene Regeln
├── documents/             # acht gültige und 16 negative Beispiele
├── _dokkurator/.doctypes/  # acht DocType-Definitionen
├── schemas/
├── rules/
└── validate.mjs           # direkte Core-Einbindung
```

[ESLint](../eslint/README.md) prüft dieselbe Sammlung über eine eigene Integration.
[Minimalvalidierung](../minimal-validation/README.md) ist ein separates Beispiel
mit einem Dokument und einem Compact-DocType.

```sh
pnpm test
pnpm typecheck
pnpm lint
```
