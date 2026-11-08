---
doctype: task
title: Projektregel und Kompatibilität entwerfen
status: draft
---

# Projektregel und Kompatibilität entwerfen

## Aufgabe

Nach Abstimmung der Verhaltens-Spec den kleinsten Konfigurationsvertrag entwerfen.
Vorhandene `validator.rules` und ESLint-Regeloptionen bevorzugen. Keine parallele
Policy-Konfiguration einführen, solange die bestehende Regelkonfiguration ausreicht.

Ein möglicher Entwurf für den strengen Modus, noch keine beschlossene API:

```js
export default {
  validator: {
    rules: {
      'dokkurator/doctype': ['error', { required: true, allowUnknown: false }],
    },
  },
};
```

Vorgeschlagene Defaults: `required: false`, `allowUnknown: true`. Beide Optionen
sind unabhängig; die vier Kombinationen stehen in der Verhaltens-Spec.
Ohne explizite Einstellung gilt die optionale Zuordnung mit erlaubten unbekannten Typnamen. Der Default der
DocType-Regel darf dafür nicht einfach `off` werden: Ungültige ausdrückliche
Zuordnungen müssen weiterhin geprüft werden.

## Zu liefernde Entscheidungen

1. Endgültige Regeloptionen und Defaults passend zur akzeptierten Spec.
2. Bedeutung von `error`, `warn`, `off` und Unterdrückungen: Empfehlung ist die
   bestehende ESLint-Semantik. Eine nicht abschaltbare Compliance-Policy ist
   nicht Gegenstand dieses Vorhabens.
3. Source-Überschreibungen und Ersatz kompletter Regeloptionen anhand der
   bestehenden Config-Auflösung dokumentieren und mit einem Beispiel belegen.
4. Unabhängige Steuerung der DocType-Pflicht und unbekannter Typnamen konkretisieren.
   Zusätzliche Felder bleiben Sache des Schemas; kein globales Feldverbot.
   Verhalten von `$schema` bei erlaubtem unbekanntem Typ ausdrücklich festlegen:
   Empfehlung ist keine Schema-Auflösung und keine DocType-spezifische Prüfung.
5. Öffentliche Verträge inventarisieren: insbesondere `DocTypeSelection`,
   `PreparedDocTypeRegistry.selectDocType`, Regeloptionen und empfohlene Defaults.
   Ein neuer Auswahlzustand kann bestehende exhaustive Aufrufer betreffen.
   Alternativen prüfen, bevor diese API geändert wird.
6. Migration beschreiben: Bisher implizite Pflicht wird optional. Projekte mit
   bisher gewünschter Pflicht erhalten eine explizite Einstellung.

## Abnahme

Ein kopierbares Beispiel je beschlossenem Modus, definierte Prioritäten,
Validierung fehlerhafter Optionen und eine Liste aller öffentlichen Änderungen
liegen vor. Diese Änderungen sind vor Implementierung gemäß AGENTS.md ausdrücklich
bestätigt. Eine Bestätigung dieses Planungsentwurfs allein erteilt diese Freigabe nicht.

## YAML-Fehler und Regeln pro DocType

Abgestimmte Richtung: Ist wegen beschädigten Frontmatters kein Typ bestimmbar,
entscheidet die globale DocType-Regel gemäß der bestätigten YAML-Fallmatrix
in der Delta-Spec. Eine zusätzliche Syntaxregel ist nicht vorgesehen.
Heute meldet `dokkurator/doctype` YAML-Syntaxfehler; `metadata-schema` überspringt
solche Dokumente. Neue Optionen an `metadata-schema` sind nicht vorgesehen. Es darf keine
doppelten Meldungen für dieselbe nicht bestimmbare Typzuordnung geben.

Aktueller Stand: Loader liest weiterhin die ältere `rules.yml`-Struktur mit
`name`, `field`, `severity`. Validator weist nichtleere `definition.rules` jedoch
bei der Vorbereitung zurück. Eine aktive Regelkonfiguration pro DocType gibt es
somit derzeit nicht. Metadaten-Schema und `structure.requiredHeadings` sind
DocType-spezifisch, Aktivierung und Schweregrad der ESLint-Regeln dagegen global
beziehungsweise Source-bezogen. Regelüberschreibungen pro DocType bleiben ausdrücklich außerhalb dieses Vorhabens.
