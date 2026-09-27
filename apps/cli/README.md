# @dokkurator/cli

Die zentrale Kommandozeilenanwendung für ein Dokkurator-Projekt. Sie verwaltet
die konfigurierten Dokumentations-Repositories und bündelt die öffentlichen
Funktionen von DocType und Knowledge unter dem Befehl `dokkurator`.

## Schnellstart

Im Workspace:

```bash
pnpm install
pnpm --filter @dokkurator/cli build
pnpm --filter @dokkurator/cli start -- --help
```

Ein Projekt mit zwei lokalen Repositories konfigurieren und indexieren:

```bash
dokkurator source add . --id project
dokkurator source add ../shared-docs --id shared-docs
dokkurator source list
dokkurator index
dokkurator search "architecture decision"
```

## Projektkonfiguration

Die CLI verwendet diese Datei:

```text
<project-root>/.dokkurator/config.yaml
```

Ohne explizite Angabe sucht die CLI vom Arbeitsverzeichnis nach oben nach der
Config. Mit der globalen Option `--project <directory>` kann der Root
ausdrücklich gesetzt werden:

```bash
dokkurator --project /work/documentation source list
```

Die Config enthält stabile Source-IDs und Pfade relativ zum Projekt-Root:

```yaml
sources:
  - id: project
    path: .
  - id: shared-docs
    path: ../shared-docs
```

Der abgeleitete Knowledge-Index liegt standardmäßig in:

```text
<project-root>/.dokkurator/index.db
```

`.dokkurator/config.yaml` ist Benutzerkonfiguration. `index.db` sowie dessen
SQLite-Begleitdateien sind erzeugte Daten und sollten normalerweise nicht
versioniert werden.

## Dokumentation

Die vollständige Referenz mit allen Befehlen, Argumenten, Optionen, Defaults
und Auswirkungen steht in [docs/commands.md](./docs/commands.md).
Sie beschreibt außerdem die Verwendung bestehender Git-/SSH-Credentials für
Remote-Sources.

Die Architektur und der weitere Multi-Repository-Plan stehen in
[../../docs/task/multiRepo.md](../../docs/task/multiRepo.md).

## Entwicklung

```bash
pnpm --filter @dokkurator/cli typecheck
pnpm --filter @dokkurator/cli lint
pnpm --filter @dokkurator/cli test
pnpm --filter @dokkurator/cli build
```

Tests liegen direkt neben der jeweils geprüften Source-Datei, beispielsweise
`src/command.test.ts` neben `src/command.ts`.
