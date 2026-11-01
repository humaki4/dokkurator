# Merker: Regeln und Struktur in DocTypes

- Welche Regeln und Optionen werden im DocType konfiguriert? Welches YAML-Format passt dafür?
- Welche Einstellungen gehören in die ESLint-Konfiguration, welche in den DocType (z. B. Aktivierung, Severity, Optionen)?
- Statt `requiredHeadings` eher `headings`? Sind aufgeführte Überschriften grundsätzlich erforderlich?
- Kann und soll das Template als erforderliche Dokumentstruktur dienen?
  - Wäre das einfacher als eine separate Strukturdefinition?
  - Wie werden optionale Abschnitte und Abweichungen beschrieben?
- Wo gehört das JSON-Schema-ADR hin: zur DocType-Definition oder zum Validator?
  - Welche Teile legen das DocType-Format fest, welche nur dessen Validierung?
- wenn dokkurator aktiviert ist, sollen trotzdem auch Dateien ohne frontmatter/docType erlaubt sein
- es sollen auch unbekannt doctypes erlaubt sein
- jedenfalls soll es konfigurierbar sein (langsamer übergang)
- alte rule config entfernen
