# Dokkurator ausprobieren

Die Beispiele gehören zum Workspace und verwenden öffentliche Paket-Root-APIs.
Installation und Build sind in den jeweiligen READMEs beschrieben.

- [Dokumente validieren und durchsuchen](./documentation/README.md): gemeinsame
  Sammlung mit acht DocTypes und 24 Dokumenten. Zwei gleichwertige Einstiege:
  [Validierung](./documentation/validation.md) und [Knowledge/Search](./documentation/search.md).
- [Minimalvalidierung](./minimal-validation/README.md): ein Dokument und ein
  Compact-DocType, ohne Index.
- [ESLint](./eslint/README.md): direkte Integration mit der gemeinsamen Sammlung,
  denselben DocTypes, Schemas und Regeln.

Validierung und Suche sind unabhängig: Absichtlich fehlerhafte Dokumente liefern
Validierungsbefunde und bleiben zugleich über Knowledge auffindbar.
