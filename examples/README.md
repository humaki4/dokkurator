# Dokkurator ausprobieren

Dieser Ordner enthält ausführbare Beispiele, die ausschließlich die öffentlichen
Paket-APIs verwenden. Die Beispiele gehören zum Workspace und benötigen keine
separat veröffentlichten Pakete.

- [Validator](./validator/README.md): einfacher Start mit `npm start` und einem
  Compact-DocType; optional acht weitere DocTypes, gültige und fehlerhafte
  Dokumente, direkte ESLint-Nutzung und eine eigene Regel.

Die Installation verwendet derzeit lokale Workspace-Pakete. Die Beispiele
lassen sich nach deren Installation und Build auch mit npm oder yarn starten;
für eine eigenständige Installation müssen später Paketartefakte oder konkrete
veröffentlichte Versionen bereitgestellt werden.

Beispiele für Knowledge und die spätere Kontextvalidierung kommen in einer
gesonderten Aufgabe hinzu.
