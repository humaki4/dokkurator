# Dokkurator ausprobieren

Die Beispiele gehören zum Workspace und verwenden öffentliche Paket-Root-APIs.
Installation und Build sind in den jeweiligen READMEs beschrieben.

- [Validator](./validator/README.md): CLI-Minimalstart mit einem Compact-DocType,
  Sammlung mit acht DocTypes und 24 Dokumenten, eigene Regel und ein kurzes
  JS-Beispiel für Core. Validierung benötigt keinen Knowledge-Index.
- [ESLint](./validator-eslint/README.md): direkte Integration mit derselben
  Sammlung, denselben DocTypes, Schemas und Regeln.

Der optionale Knowledge-CLI-Ablauf verwendet ebenfalls das Validator-Projekt.
Er ist als Vorschau dokumentiert und wartet auf tolerante Indexierung für die
absichtlich fehlerhaften YAML-Dokumente. Der Validator-Minimalstart funktioniert
unabhängig davon.
