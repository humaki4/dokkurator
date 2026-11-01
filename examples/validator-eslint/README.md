# Dieselbe Sammlung mit ESLint prüfen

Dieses Beispiel verwendet Dokumente, acht DocTypes, Schema und eigene Regel aus
[validator](../validator/README.md). Es enthält keine Kopien der Beispieldaten.

Einmalig im Repository-Stammverzeichnis:

```sh
pnpm install
pnpm --filter @dokkurator/core... build
cd examples/validator-eslint
pnpm start
```

`start` wechselt in das gemeinsame Projekt und führt
`eslint --config ../validator-eslint/eslint.config.mjs documents` aus.
So bleiben ESLints Dateimuster innerhalb seines Arbeitsverzeichnisses.
Die 24 Dokumente enthalten gezielte Fehler und zwei reine Warnungsfälle;
ESLint endet deshalb absichtlich mit Exit-Code 1.

[eslint.config.mjs](./eslint.config.mjs) lädt die DocTypes über die öffentliche
Core-API, schließt die Anwendung in `finally` und bereitet die gemeinsame
Validator-Konfiguration mit `prepareLintConfiguration` und `createLintConfig` vor.
Die Regel- und Schemapfade werden von der importierten Projektkonfiguration aus
aufgelöst. Änderungen an der Sammlung sind sofort auch hier sichtbar.

```sh
pnpm test
pnpm typecheck
pnpm lint
```

Der Vergleichstest prüft Regeln, Schweregrade und Positionen gegen Core ; ein CLI-Test prüft den Einstieg aus diesem Beispielverzeichnis.
