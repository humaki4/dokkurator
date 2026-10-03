---
doctype: task
title: Fehlende Pflichtüberschriften im Editor sinnvoll markieren
status: open
tags: [bug]
---

# Fehlende Pflichtüberschriften im Editor sinnvoll markieren

Typ: Bug. Status: offen.

## Ausgangslage

Der Linter ist erfolgreich über das ESLint-Plugin im Dokkurator-Projekt
eingebunden. Die eigenen Dokkurator-Regeln erkennen Regelverletzungen.
Bei der Regel `dokkurator/required-headings` ist die Position der Fehlermarkierung
im VS-Code-Editor jedoch irreführend.

## Reproduktion

1. In einer DocType-Definition eine Pflichtüberschrift konfigurieren:

   ```yaml
   structure:
     requiredHeadings:
       - Responsibilities
   ```

2. Ein Markdown-Dokument mit gültigem Frontmatter und diesem DocType in VS Code
   öffnen.
3. Die Überschrift `Responsibilities` entfernen oder so umbenennen, dass die
   Anforderung nicht mehr erfüllt ist.
4. Die Fehlermarkierung der ESLint-Erweiterung betrachten.

## Tatsächliches Verhalten

Die fehlende Pflichtüberschrift wird erkannt und die Fehlermeldung ist korrekt.
Rot markiert wird jedoch das
YAML-Frontmatter, obwohl die Regelverletzung den Markdown-Inhalt betrifft.
Das beobachtete Problem betrifft eine eigene Dokkurator-Regel, keine Regel aus
`@eslint/markdown`.

## Erwartetes Verhalten

Die Diagnose soll im Editor sinnvoll dem betroffenen Markdown-Inhalt zugeordnet
werden, statt das gültige Frontmatter als fehlerhaft zu markieren.
Die bestehende, korrekte Fehlermeldung bleibt unverändert; nur die Position
der Diagnose wird angepasst.

Eine vollständig fehlende Überschrift hat keine eigene Textposition. Als Anker
soll deshalb die H1-Dokumentüberschrift verwendet werden: Die fehlende
Pflichtüberschrift betrifft die Struktur des gesamten Dokuments.

Das Projekt aktiviert `markdown/no-multiple-h1`, erlaubt also höchstens eine H1.
Die Regel verlangt jedoch keine H1. Fehlt sie, soll die Diagnose am ersten
Markdown-Inhaltsknoten nach dem Frontmatter verankert werden. Bei einem Dokument
ohne Inhalt ist eine geeignete Einfügeposition nach dem Frontmatter zu verwenden.
Sind mehrere H1 vorhanden, wird deterministisch die erste gewählt; den separaten
Verstoß meldet weiterhin die Markdown-Regel.

## Technischer Ansatz

`required-headings-rule.ts` meldet fehlende Überschriften derzeit mit
`node: frontmatter.node ?? node`. Die Diagnose wird damit ausdrücklich am
Frontmatter verankert. Die Positionswahl in der Regel prüfen und anpassen;
anschließend kontrollieren, ob ESLint und die eingebettete Runtime die Position
unverändert weitergeben.

## Abnahme

- Eine fehlende Pflichtüberschrift erzeugt weiterhin einen Fehler mit dem Namen
  der fehlenden Überschrift.
- Gültiges YAML-Frontmatter wird dafür nicht rot markiert.
- Bei vorhandener H1 wird diese als Anker der Diagnose markiert.
- Ohne H1 wird der erste Markdown-Inhaltsknoten verwendet; ohne Inhalt eine
  Einfügeposition nach dem Frontmatter.
- Bei mehreren H1 wird die erste gewählt, unabhängig von der separaten
  Markdown-Diagnose.
- Direkte ESLint-Ausführung und eingebettete Validierung liefern dieselben
  Positionen; gezielte Tests sichern das Verhalten ab.
- Die Darstellung wird mit der ESLint-Erweiterung in VS Code überprüft.
