### Phase A — Rename `@dokkurator/doctype` -> `@dokkurator/loader`

1. `git mv packages/doctype packages/loader`.
2. In `packages/loader/package.json`: rename `"name"` to `@dokkurator/loader`,
   remove the `bin` entry and `start` script, and remove CLI-only dependencies
   on `@dokkurator/config` and `commander`.
3. Remove the demo CLI files: `packages/loader/src/cli.ts`,
   `packages/loader/src/command.ts`, and
   `packages/loader/src/command.test.ts`. The package exposes only its library
   API; no replacement CLI is planned.
4. Update every workspace dependency + import of `@dokkurator/doctype` ->
   `@dokkurator/loader` (no symbol renames, only the module specifier):
   - `apps/cli/package.json`, `apps/cli/src/actions/doctype-actions.ts`,
     `apps/cli/src/actions/knowledge-actions.ts`, `apps/cli/src/project.ts`,
     `apps/cli/src/sync-source.ts`
   - `packages/knowledge/package.json`, `packages/knowledge/src/command.ts`,
     `packages/knowledge/src/index-adapter/index.ts`,
     `packages/knowledge/src/index-adapter/model.ts`,
     `packages/knowledge/src/index-adapter/sqlite/sqlite-index.ts`,
     `packages/knowledge/src/index/documents.ts` (+ `.test.ts`),
     `packages/knowledge/src/index/incremental-index.ts` (+ `.test.ts`),
     `packages/knowledge/src/index/index-documents.ts` (+ `.test.ts`)
   - `packages/validator/package.json`, `packages/validator/src/index.ts`,
     `packages/validator/src/legacy/validate-document.test.ts`
5. Update prose references (no code behavior change):
   `AGENTS.md` (package-boundary section references `@dokkurator/doctype`
   twice), `README.md`, `docs/adr/0001-use-simple-git-for-local-git-access.md`,
   `docs/architecture/source-adapters.md`, `docs/architecture/doctype.md`
   (consider renaming file to `loader.md` — confirm with user), `docs/task/multiRepo.md`,
   `docs/task/incremental-diff-loading.md`, `docs/configuration.md`,
   `docs/task/core-and-loader-boundaries.md`,
   `packages/knowledge/README.md`,
   `packages/validator/spec/Validator Specification.md`,
   `packages/loader/README.md` (rename header/examples). Rename
   `docs/architecture/doctype.md` to `docs/architecture/loader.md`, describe the
   component as Loader, and retain the DocType domain terminology.
   Leave `docs/research/researchDocTypes.md` untouched (historical/exploratory notes
   with future package name ideas like `@dokkurator/doctype-adr`, not current API).
6. Remove the previous Loader `dist` directory, run `pnpm install` to regenerate
   `pnpm-lock.yaml` workspace entries, then run
   `pnpm -r build && pnpm -r typecheck && pnpm -r test`. Inspect the packed
   Loader contents to confirm that stale CLI output is not shipped.
7. Grep for residual `@dokkurator/doctype`, `dokkurator-doctype`, and removed
   package CLI entry points to catch anything missed. Exclude this migration
   document and explicitly historical research notes, as well as generated
   coverage output.

## Akzeptanzkriterien

| ID   | Szenario                                            | Erwartetes Ergebnis                                                                                                                                                                                                          |
| ---- | --------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| AK01 | Loader-Paket wird im Workspace verwendet            | Paketverzeichnis ist `packages/loader`, der Manifestname ist `@dokkurator/loader`, und die öffentliche Package-API bleibt ausschließlich über den Root-Export erreichbar.                                                    |
| AK02 | Bestehende Loader-Funktionen werden verwendet       | Public Exports wie `loadDocType(s)`, `loadDocument(s)` und die Source-Adapter bleiben unter ihren bisherigen Symbolnamen verfügbar; nur Package-Importpfade ändern sich.                                                     |
| AK03 | Loader-Paket wird gebaut oder gepackt               | Es gibt keinen CLI-Bin-Eintrag und kein `start`-Script. Die Demo-CLI ist nicht mehr in `src` oder den ausgelieferten Build-Artefakten enthalten; `commander` und `@dokkurator/config` sind keine Loader-Abhängigkeiten mehr. |
| AK04 | Workspace-Pakete und Anwendungen importieren Loader | Aktive Imports und Workspace-Dependencies verwenden `@dokkurator/loader`; der Lockfile-Link zeigt auf `packages/loader`. Historische Forschungsnamen wie `@dokkurator/doctype-adr` sind davon ausgenommen.                   |
| AK05 | Workspace wird validiert                            | Build, Typecheck und Tests der Workspace-Pakete laufen nach der Umstellung erfolgreich durch.                                                                                                                                |
| AK06 | Aktive Dokumentation beschreibt das Paket           | Aktuelle Package-, Architektur- und Task-Dokumentation verwendet `@dokkurator/loader`; ausdrücklich historische Forschungsnotizen bleiben unverändert.                                                                       |

## Verifikation

- `pnpm -r build`, `pnpm -r typecheck` und `pnpm -r test` erfolgreich.
- Keine aktiven Imports, Dependencies, Bin-Einträge oder CLI-Dateien referenzieren `@dokkurator/doctype` beziehungsweise `dokkurator-doctype`.
- Loader-Packaging enthält weder einen CLI-Einstieg noch veraltete CLI-Build-Artefakte.
