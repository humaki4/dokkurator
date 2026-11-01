---
doctype: research
title: "„Die Daten gehören dem Nutzer“"
status: in-progress
topic: document-types
tags: [doctypes, standards]
sources: []
---

# „Die Daten gehören dem Nutzer“

Neben Docs-as-Code gibt es eine zweite relevante Bewegung: **Local-first Software**.
Die Grundidee lautet:

> Die Anwendung ist nicht der Eigentümer bzw. einzige Zugangspunkt zu den Daten.

Die Daten bleiben unabhängig von der Anwendung verfügbar.

---

## Obsidian

Obsidian speichert Notizen als normale Markdown-Dateien in einem lokalen Verzeichnis.
[How Obsidian stores data](https://obsidian.md/help/data-storage?utm_source=chatgpt.com)

Das entspricht sehr stark dem Dokkurator-Grundprinzip:

```text
Dokument gehört nicht Dokkurator.
Dokkurator liest und interpretiert das Dokument.
```

---

## Logseq

Logseq beschreibt sich als privacy-first und local-first.
Die Daten liegen lokal und können als Markdown auch von anderen Anwendungen gelesen werden.

[Logseq](https://logseq.com/?utm_source=chatgpt.com)

---

## Anytype

[Anytype](https://anytype.io/?utm_source=chatgpt.com)

Interessant ist insbesondere die Trennung zwischen Anwendung und zugrunde liegendem Sync-/Datenprotokoll.

---

## Solid

Das Solid-Projekt verfolgt ein noch grundsätzlicheres Modell.

Nutzer besitzen persönliche Datenspeicher, sogenannte **Pods**. Anwendungen greifen auf diese Daten zu, statt sie selbst exklusiv zu besitzen.
Dadurch kann ein Nutzer Anwendungen wechseln, ohne gleichzeitig seine Daten zu migrieren.

[Solid Project](https://solidproject.org/?utm_source=chatgpt.com)

---

## AT Protocol

Das AT Protocol verwendet persönliche Daten-Repositories.
Ein Repository enthält die von einem Nutzer veröffentlichten Records und ist unabhängig prüfbar und übertragbar.

[AT Protocol Data Repositories](https://atproto.com/guides/data-repos?utm_source=chatgpt.com)

Für Dokkurator ist weniger das konkrete Datenformat interessant als das Prinzip:

```text
dezentrale Quelle
+
identifizierbare Records
+
standardisiertes Datenmodell
+
zentral oder föderiert auswertbar
```

---

[Inhaltsverzeichnis](README.md) · [Zurück](09-developer-portals-und-docs-as-code.md) · [Weiter](11-moegliche-doctype-bibliothek.md)
