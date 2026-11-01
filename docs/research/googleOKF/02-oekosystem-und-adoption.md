---
doctype: research
title: Ökosystem und Adoption
status: in-progress
topic: open-knowledge-format
tags: [knowledge, interoperability]
sources:
  - https://github.com/google/open-knowledge
---

# Ökosystem und Adoption

**Stand:** 19. September 2026

## Erste unabhängige Implementierungen

Es entstehen parallel Implementierungen in mehreren Programmiersprachen.
**Go** `skosovsky/okf`
**Rust** `W4G1/okf`
**Dart** `conceptadev/okf`
**Ruby** `serradura/okf`

---

## August 2026 – MCP-Ökosystem entsteht

Mehrere unabhängige Projekte implementieren OKF-MCP-Server.
Beispielsweise bieten sie Agents Funktionen wie:

```text
list concepts
read concept
search
validate
graph
health report
write concept
```

Interessanterweise diskutieren einige Projekte bereits, wann **MCP überhaupt notwendig ist**.
Wenn ein Coding Agent direkten Filesystemzugriff und einen OKF-Agent-Skill besitzt, kann er Markdown unmittelbar lesen. Ein MCP-Server kann dann unnötigen Overhead erzeugen.

---

## 26. August 2026 – Google adressiert organisationsweite Nutzung

Google veröffentlicht einen weiteren Artikel mit dem expliziten Problem:

> Wie lassen sich OKF Bundles organisationsweit teilen, durchsuchen und mit Berechtigungen versehen?

Google stellt fest, dass ein Git-Repository pro Bundle zwar portabel ist, aber alleine keine organisationsweite Suche, Governance oder gemeinsame Zugriffskontrolle bietet.
Google verbindet OKF dafür mit seinem **Knowledge Catalog**.
Damit entsteht folgende Trennung:

```text
OKF
Format / portable knowledge

        ↓

Knowledge Catalog
zentraler Discovery-, Governance-
und Serving-Layer
```

Das ist für Dokkurator besonders relevant, weil es genau bestätigt, dass ein weiteres System **oberhalb von OKF** benötigt wird.
Google löst diesen Layer naturgemäß über seine Cloud-Produkte.
Eine offene, Git-zentrierte Variante desselben Problems bleibt interessant.

---

[Inhaltsverzeichnis](README.md) · [Zurück: Grundlagen des Open Knowledge Format](01-grundlagen.md) · [Weiter: LangChain OpenWiki](03-langchain-openwiki.md)
