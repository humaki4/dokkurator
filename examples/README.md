# Dokkurator ausprobieren

Dieser Ordner enthält ausführbare Beispiele, die ausschließlich die öffentlichen
Paket-APIs verwenden. Die Beispiele gehören zum Workspace und benötigen keine
separat veröffentlichten Pakete.

- [Validator](./validator/README.md): einfacher Start mit `pnpm start` und einem
  Compact-DocType; optional acht weitere DocTypes, gültige und fehlerhafte
  Dokumente, direkte ESLint-Nutzung und eine eigene Regel. Optional lässt sich
  dieselbe Sammlung über die Knowledge-CLI indexieren und durchsuchen.

Die Installation verwendet lokale Workspace-Pakete. Alle Validator-Läufe verwenden
`createDokkurator` und `app.validate()`, ohne Knowledge-Index. Die Beispiele bleiben im
pnpm-Workspace; eine Veröffentlichung ist derzeit nicht vorgesehen.

Der Knowledge-Teil ist optional; der Validator-Minimalstart bleibt unverändert.
Ein Beispiel für die spätere Kontextvalidierung folgt in einer gesonderten Aufgabe.
