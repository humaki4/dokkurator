# Ein Dokument validieren

Ein Dokument und ein Compact-DocType reichen für die erste Validierung.
Im Repository-Stammverzeichnis:

```sh
pnpm install
pnpm --filter @dokkurator/cli... build
cd examples/minimal-validation
pnpm start
```

Der Aufruf endet mit Exit-Code 0 und gibt bei Erfolg nichts aus. Ein Index ist
nicht erforderlich. `dokkurator.config.mjs` wählt nur den Ordner `documents` aus.
Dadurch gehört diese Anleitung nicht zur geprüften Sammlung.

Die [DocType-Definition](./_dokkurator/.doctypes/guide/definition.yml) verlangt
das Metadatenfeld `title` und die Überschrift `Einstieg`:

```yaml
name: guide
metadata:
  title:
    type: string
    required: true
structure:
  requiredHeadings: [Einstieg]
```

Entferne im [Dokument](./documents/guide.md) den Titel oder die Überschrift und
starte erneut `pnpm start`: Der Befund enthält die Position; der Exit-Code ist 1.
Stelle die entfernte Angabe anschließend wieder her.

Die [gemeinsame Sammlung](../documentation/README.md) zeigt umfangreichere
Validierung sowie Knowledge/Search mit denselben Dokumenten.
