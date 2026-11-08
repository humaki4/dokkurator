---
doctype: task
title: Konfiguration für Remark und DocType-Regeln erproben
status: draft
component: validation
tags: [configuration, remark, doctypes, rule-packs]
---

# Konfiguration für Remark und DocType-Regeln erproben

**Entwurf · noch nicht abgestimmt.** Die folgenden Schritte, Zuständigkeiten und
Konfigurationsbeispiele sind Diskussionsgrundlage. Eine Entscheidung über die
Standard-Laufzeit oder Änderungen öffentlicher APIs steht aus.

## Ausgangslage

Core bereitet die Validator-Konfiguration bereits je Quelle vor. Projektregeln
bilden die Basis, die Quelle kann einzelne Regelwerte ersetzen. Widersprüchliche
Plugin-Bindungen unter demselben Namespace führen zu einem Konfigurationsfehler.
Der Loader erzeugt einen Remark-AST, während der Validator heute den Originaltext
mit ESLint prüft. Legacy-Regeln in DocType-Definitionen werden bei der
Vorbereitung abgelehnt.

- [Konfigurationsauflösung](../../packages/config/src/resolution.ts)
- [Validierungsfluss in Core](../../packages/core/src/validation-use-cases.ts)
- [DocType-Vorbereitung](../../packages/validator/src/doc-types/doc-types.ts)

## Vorgeschlagene Architektur

| Ebene | Verantwortung |
| --- | --- |
| Projekt | Bindet vertrauenswürdige Rule Packs an Namespaces und setzt allgemeine Vorgaben. Die Registrierung macht Regeln verfügbar. |
| Quelle | Beschreibt Dokumentauswahl, DocType-Verzeichnis und lokale Regelwerte. |
| DocType / Domain Pack | Liefert Schemas, Strukturvorgaben und Regelwerte für bekannte Typen. Ein deklaratives Pack referenziert Regeln über ihre IDs. |
| Config und Core | Lösen Einstellungen im jeweiligen Projekt- und Quellkontext auf und bereiten die Validierung vor. |
| Loader | Liefert Markdown-AST, Originaltext und Frontmatter. |
| Validator | Wählt den DocType und die wirksamen Regeln aus, führt Markdown-Prüfungen über Unified aus und führt deren Befunde mit den bestehenden Metadaten- und Strukturdiagnosen zusammen. |

Dieselbe Quelle kann in zwei Projekten unterschiedliche Regelbindungen haben.
Ein Namespace bleibt innerhalb eines Projekts eindeutig. Allgemeine Regeln
gelten auch für untypisierte Dokumente und für erlaubte unbekannte Typen.
DocType-spezifische Regeln greifen nach erfolgreicher Auswahl eines bekannten
Typs. Regeln zur Typauswahl bleiben auf Projekt- oder Quellenebene.

## Konfigurationsoptionen

| Modell | Vorteil | Grenze |
| --- | --- | --- |
| ESLint-nahe Projektkonfiguration und deklarative DocType-Regeln | Bekannte Trennung von `plugins` und `rules`. Typbezogene Einstellungen können mit dem DocType weitergegeben werden. | Dokkurator definiert die Auflösung und übersetzt Remark-Optionen. |
| Regelprofile ausschließlich im Projekt, gegebenenfalls nach DocType ausgewählt | Kleiner Einstieg ohne neues DocType-Format. | Projekte müssen die Zuordnung pflegen. Der DocType trägt seine Regeln beim Transfer nicht mit. |
| Native `.remarkrc` oder `remarkConfig` | Bestehende Remark-Presets und CLI-Konfigurationen sind direkt nutzbar. | Die dateibasierte Suche kennt den Dokkurator-Projektkontext und die Frontmatter-Typauswahl nicht. Parser-Erweiterungen und Transformationen können zusätzliche Anforderungen an den AST stellen. |
| Deklarative YAML-Auswahl auch für Packs | Portable Quellkonfiguration und kontrollierbare Pack-Auswahl. | Der Host braucht einen Katalog zugelassener Packs und eine Versionsauflösung. |

Vorschlag für den Prototyp ist die Projektkonfiguration mit einzeln registrierten
Remark-Regeln. Als Folge kann ein DocType etwa diese Werte beitragen:

```yaml
rules:
  remark/final-newline: error
  remark/maximum-line-length: [warn, 100]
```

Ein späterer Regelwert ersetzt im Vorschlag den gesamten früheren Wert derselben
ID, einschließlich Optionen. Das entspricht dem heutigen Projekt-/Quellen-Merge.
Verbindliche Vorgaben und deren Verhältnis zu `off` brauchen eine eigene
Entscheidung.

## Abgleich mit bestehenden Tasks

- [Konfigurationsebenen](configuration-layers.md) stützt die Trennung zwischen
  Quellbeschreibung und vertrauenswürdiger Anwendung. Heute kann
  `loadRepositoryConfig()` auch in einer Nicht-Root-Quelle JavaScript laden.
  Vor einer Pack-Einbindung aus fremden Quellen ist zu klären, welcher
  Konfigurationscode überhaupt importiert werden darf.
- [Optionale DocTypes](optional-doctypes/01-behavior-spec.md) liefert die
  Fallmatrix für untypisierte Dokumente, unbekannte Typen und kaputtes YAML.
  DocType-Regelkonfiguration liegt dort ausdrücklich außerhalb des Umfangs.
  Sie ist hier als Folgeaufgabe vorgeschlagen.
- [Editorposition für Pflichtüberschriften](required-headings-editor-location.md)
  fordert konsistente Positionen und einen Nachweis in VS Code über ESLint.
  Vor einem Laufzeitwechsel muss geklärt werden, wie dieser Nachweis und der
  Editorpfad künftig aussehen.
- [Loader-/Knowledge-Grenze](restore-loader-boundary.md) bleibt mit diesem
  Zuschnitt vereinbar. Die dokumentlokale Validierung braucht keinen Index.

## Vorgehen und Nachweis

1. **Konfigurationsvertrag abstimmen.** Eine lokale und eine entfernte Quelle
   modellieren. Festlegen, wer Packs importieren darf, wie unbekannte IDs und
   Namespace-Konflikte gemeldet werden und welche Einstellungen überschreibbar
   sind. Zwei Projekte sollen dieselbe Quelle mit unterschiedlichen Bindungen
   derselben Regel-ID prüfen können.
2. **Remark auf Projektebene erproben.** Zwei registrierte Regeln auf dem
   vorhandenen AST mit Originaltext ausführen und VFile-Meldungen in bestehende
   Diagnosen übertragen. Positionen, Schweregrade und Unterdrückungen an
   vorhandenen Beispielen prüfen.
3. **DocType-Regeln separat erproben.** Zwei bekannte DocTypes in derselben
   Quelle erhalten unterschiedliche Einstellungen. Ein untypisiertes Dokument
   durchläuft weiterhin die allgemeinen Prüfungen. Das neue Regelmodell und der
   Umgang mit Legacy-Regeln werden ausdrücklich festgelegt.
4. **Über den Standardpfad entscheiden.** CLI-Ausgabe, Exit-Status, Formatter
   und den Editorfall gegen den ESLint-Pfad prüfen. Anschließend über
   Kompatibilität der öffentlichen APIs und die künftige ESLint-Integration
   entscheiden.

Der Prototyp ist auf ein Pack, zwei Projekte, eine gemeinsame Quelle und zwei
DocTypes begrenzt. Preset-Vererbung, beliebige Remark-Transformationen und
dokumentübergreifende Regeln sind mögliche Folgeaufgaben.

- [ESLint-Regelkonfiguration](https://eslint.org/docs/latest/use/configure/rules)
- [Remark-Lint-Konfiguration](https://github.com/remarkjs/remark-lint#configure)
- [Unified-Ausführung auf einem AST](https://github.com/unifiedjs/unified#processorruntree-file-done)
