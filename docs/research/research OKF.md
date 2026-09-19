
# Open Knowledge Format (OKF): Ökosystem, Adoption und Relevanz für Dokkurator

**Stand:** 19. September 2026

## Kurzfassung

Das von Google Cloud im Juni 2026 veröffentlichte **Open Knowledge Format (OKF)** entwickelt sich auffällig schnell.

OKF selbst ist bewusst sehr klein gehalten:
- Markdown als Inhalt
- YAML Frontmatter als strukturierte Metadaten
- Dateien und Verzeichnisse als Bundle
- Links zwischen Dokumenten als Beziehungen
- optionale Informationen zu Provenance, Verification und Lifecycle

Google positioniert OKF ausdrücklich als **offenes Austauschformat**, nicht als fertiges Knowledge-Management-System oder Framework.

Innerhalb von nur rund drei Monaten sind jedoch bereits mehrere unabhängige Implementierungen entstanden:
- Parser und Validatoren
- CLI-Tools
- Graph-Implementierungen
- Search
- MCP-Server
- Agent Skills
- Visualisierungen
- Wiki-Systeme
- Git-basierte Knowledge-Systeme

Der bisher deutlich stärkste externe Adopter ist **LangChain mit OpenWiki**. OpenWiki verwendet inzwischen OKF v0.2 als Ausgabeformat und ergänzt es um automatische Dokumentgenerierung, Git-Integration, Grounded Claims, Connectors, Agent-Integration und einen Graph Viewer.

Ein etabliertes, sprachübergreifend dominierendes OKF-Framework ist derzeit **noch nicht erkennbar**.

Dagegen bleiben mehrere Ebenen offen, die OKF bewusst nicht löst und die weiterhin gut zu Dokkurator passen:

- fachliche DocTypes
- zusätzliche Schemas und Regeln
- dokumentübergreifende Validierung
- Source Adapter
- mehrere Git-Repositories
- zentraler Index
- Query-Abstraktion
- Berechtigungen
- Knowledge Health
- zentrale UI / Hub

---

# 1. Was ist OKF?

Google Cloud veröffentlichte OKF am **12. Juni 2026**.

Google beschreibt das Problem als fehlende portable Kontextinformation für AI-Systeme und Agents. Wissen wie Schemas, Metrikdefinitionen, Runbooks oder fachlicher Kontext soll nicht ausschließlich in proprietären Plattformen liegen.

OKF v0.1 bestand deshalb bewusst nur aus:

```text
directory
 ├── index.md
 ├── concept-a.md
 └── concept-b.md
```

mit Dokumenten wie:

```yaml
---
type: ArchitectureDecision
title: Authentication Architecture
tags:
  - authentication
---
```

und normalem Markdown darunter.

Das Ziel ist keine neue Dokumentationsanwendung, sondern ein interoperables Format, das Menschen, Tools und Agents gleichermaßen lesen können.

Google nennt beispielsweise als mögliche Producer:
- Menschen
- eigene Scripts
- Google ADK Agents
- LangChain Agents
- Exporte aus Datenkatalogen
und als mögliche Quellen unter anderem Dataplex, Unity Catalog oder Collibra. Das bedeutet allerdings **nicht**, dass diese Produkte bereits offiziell OKF unterstützen. Google beschreibt hier mögliche Integrationspfade.

---

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


# 3. LangChain OpenWiki

OpenWiki ist aktuell der wichtigste OKF-Adopter außerhalb von Google.
Das GitHub-Repository weist derzeit ungefähr **16.000 Stars und mehr als 1.000 Forks** auf. Diese Zahlen gelten jedoch für OpenWiki als Ganzes und sind nicht mit „16.000 OKF-Nutzern“ gleichzusetzen.
## Grundidee

OpenWiki erstellt automatisch Dokumentation aus vorhandenen Informationsquellen.

Für Code:

```text
source repository
      ↓
Deep Agent
      ↓
generated documentation
      ↓
OKF wiki
```

Für persönliches Wissen:

```text
Git
Notion
Slack
Gmail
Web
...
   ↓
connectors
   ↓
Agent
   ↓
OKF wiki
```

## Grounded Claims

Besonders interessant ist OpenWikis Konzept der **Grounded Claims**.
Eine relevante Aussage in einem generierten Dokument wird auf konkrete Quelldaten zurückgeführt.
Vereinfacht:

```text
"The service uses PostgreSQL"
             │
             ▼
repo://service/database.ts
commit abc123
```

Wenn sich diese Quelle verändert, kann OpenWiki erkennen, dass eine Aussage erneut geprüft werden muss.
Das überschneidet sich teilweise mit den für Dokkurator angedachten Bereichen:
- Evidence
- Code-Doc-Linking
- Drift
- Knowledge Health
OpenWiki sollte daher nicht nur als OKF-Consumer, sondern als relevantes verwandtes Projekt beobachtet werden.

## Unterschiede zu Dokkurator

OpenWiki konzentriert sich hauptsächlich auf:

> Wissen **generieren und aktuell halten**.

Dokkurator hat bisher einen anderen Schwerpunkt:

> bereits vorhandene dezentrale Dokumentation **strukturieren, validieren, indexieren und organisationsweit zugänglich machen**.

OpenWiki:

```text
sources
   ↓
AI generation
   ↓
wiki
```

Dokkurator:

```text
existing docs in many repositories
             ↓
collect
             ↓
validate
             ↓
index
             ↓
query
             ↓
Hub / CLI / Agents
```

Die Projekte überschneiden sich zunehmend, sind aber derzeit nicht identisch.

---

# Was passiert aktuell in der Community?

Die Entwicklung lässt sich grob in fünf Themen clustern.
## Interoperabilität
Das Hauptmotiv bleibt:

```text
Agent A
Agent B
Wiki
IDE
CLI
Search
    ↓
same files
```
Wissen soll nicht mehr ausschließlich in einem einzelnen Agent Memory oder SaaS-System liegen.

---
## Trust und Provenance

Mit zunehmender AI-generierter Dokumentation wird die Frage wichtiger:

> Warum sollte diese Information stimmen?

Daher entstehen Konzepte für:
- generated-by
- verified-by
- sources
- timestamps
- lifecycle
- staleness
- grounded claims
- attestations

---

## Agents als Knowledge Maintainer

Dokumentation wird zunehmend nicht nur **von Menschen für Menschen**, sondern auch von Agents erzeugt und gepflegt.

Das führt zum Muster:

```text
code / data / meetings / messages
              ↓
             agent
              ↓
        structured knowledge
              ↓
          Git / review
```

OpenWiki ist dafür derzeit das sichtbarste Beispiel.

---

## Git als Knowledge Storage

Mehrere Projekte verfolgen explizit:

```text
Markdown
+
Frontmatter
+
Git
```

als persistentes Knowledge-System.

Damit bleiben:
- History
- Diff
- Blame
- Branches
- Pull Requests
- Offline-Nutzung
- Tool-Unabhängigkeit
erhalten.

Commonplace beschreibt genau diese Eigenschaften als einen wesentlichen Vorteil seiner OKF-Unterstützung.

---

## Query, Graph und MCP entstehen außerhalb der Spec

OKF definiert bewusst nicht:
- wie gesucht wird
- welche Datenbank verwendet wird
- wie ein Graph gespeichert wird
- welche Query Language verwendet wird
- wie Agents zugreife
- wie organisationsweite Berechtigungen funktionieren
Daher experimentiert die Community gleichzeitig mit:

```text
filesystem search
BM25
custom query APIs
graph indexes
MCP
agent skills
local indexes
```

Ein eindeutiger Gewinner ist noch nicht erkennbar.

---

# Was könnte kurzfristig Commodity werden?

Bei folgenden Bereichen zeichnet sich bereits starke Überschneidung zwischen Implementierungen ab:

### Sehr wahrscheinlich Commodity

```text
Markdown parsing
YAML frontmatter parsing
OKF parsing
OKF validation
link resolution
graph extraction
bundle traversal
formatting
basic linting
Mermaid graph export
MCP read access
```

Mehrere unabhängige Projekte implementieren diese Funktionen bereits heute.

Diese Bereiche sollte Dokkurator möglichst nicht unnötig neu erfinden.

---

# Was ist dagegen noch weitgehend offen?

## Fachliche DocTypes

OKF verlangt im Wesentlichen:

```yaml
type: something
```

Es definiert aber nicht, was beispielsweise ein:

```text
ArchitectureDecision
Requirement
Incident
Meeting
Policy
Procedure
Project
Risk
```

beinhalten muss.

Hier bleibt Raum für:

```text
DocType
   ↓
schema
   ↓
rules
   ↓
templates
```

---

## Fachliche Validation

OKF kann prüfen:

```text
Ist dieses Dokument syntaktisch gültiges OKF?
```

Dokkurator könnte prüfen:

```text
Ist dies eine vollständige Architecture Decision?

Hat eine akzeptierte Entscheidung einen Owner?

Referenziert dieses Requirement seine übergeordnete Capability?

Existiert das referenzierte Dokument?

Ist die referenzierte Entscheidung deprecated?
```

Das ist eine höhere Abstraktionsebene.

---

## Cross-Repository Knowledge

Viele Tools betrachten weiterhin primär:

```text
one bundle
one repository
```

Dokkurator interessiert dagegen:

```text
repo A ─┐
repo B ─┤
repo C ─┼─→ common index
repo D ─┘
```

---

## Authorization

Bei organisationsweitem Wissen entsteht unmittelbar das Problem:

```text
user
  ↓
query
  ↓
only documents user may access
```

Google adressiert das mit Knowledge Catalog.

Eine allgemein nutzbare Open-Source-Lösung ist bislang nicht als Standard erkennbar.

---

## Source Adapter

Auch die Abstraktion:

```text
Filesystem
Git
GitLab
GitHub
...
   ↓
SourceAdapter
```

ist nicht Teil von OKF.

---

## Organisationsweite Knowledge Health

Beispielsweise:

```text
outdated docs
broken references
unowned documents
contradicting knowledge
missing documents
code-doc drift
unused docs
```

ist ebenfalls keine Kernaufgabe der Spezifikation.

---

# Auswirkungen auf Dokkurator

Die ursprüngliche Architektur sollte vor diesem Hintergrund teilweise neu bewertet werden.

## DocType

Weiterhin sinnvoll, aber möglichst als Erweiterung von offenen Formaten.

Statt:

```text
Dokkurator Format
```

eher:

```text
Markdown
  ↓
OKF / compatible metadata
  ↓
Dokkurator DocType
```

Ein DocType beschreibt dann nicht mehr das komplette Basisformat, sondern die **fachliche Semantik**.

---

## Validator

Weiterhin ein starker eigenständiger Bereich.

Trennung:

```text
OKF Validator
      ↓
Format korrekt?

Dokkurator Validator
      ↓
fachlich korrekt?
organisatorisch vollständig?
Beziehungen valide?
Knowledge konsistent?
```

---

## Knowledge

Hier sollte geprüft werden, welche Funktionen bereits bestehende OKF-Libraries übernehmen können.

Insbesondere:

```text
parsing
basic graph
links
bundle traversal
```

müssen wahrscheinlich nicht dauerhaft Dokkurator-eigene Implementierungen sein.

Eigene Abstraktionen für:

```text
index
query
storage
cross-repo knowledge
authorization
```

bleiben dagegen sinnvoll.

---

## Hub

Die Bedeutung des Hubs nimmt durch OKF eher zu.
Google beschreibt selbst das Problem, dass einzelne Git Bundles organisationsweit weder ausreichend suchbar noch zentral governbar sind.
Der Dokkurator Hub könnte eine offene Alternative zu einem solchen zentralen Knowledge Layer darstellen:

```text
GitLab repositories
GitHub repositories
local repositories
other sources
          ↓
      Dokkurator
          ↓
     central index
          ↓
authorization-aware query
          ↓
          Hub
```

---

# 11. Verhältnis Dokkurator ↔ OpenWiki

Die beiden Projekte sollten nicht vorschnell als direkte Konkurrenten betrachtet werden.
### OpenWiki

Schwerpunkt:

```text
sources
  ↓
AI
  ↓
generate knowledge
  ↓
maintain wiki
```

### Dokkurator

Schwerpunkt:

```text
distributed existing knowledge
          ↓
structure
validate
collect
index
query
govern
          ↓
central access
```

Eine mögliche zukünftige Kombination wäre sogar:

```text
source code
    ↓
OpenWiki
    ↓
OKF documents
    ↓
Git repository
    ↓
Dokkurator
    ↓
organization-wide knowledge
```

OpenWiki wäre dann ein **Producer** und Dokkurator ein organisationsweiter **Consumer / Curator / Indexer**.

---

# Beobachtungspunkte

Das OKF-Ökosystem bewegt sich aktuell so schnell, dass vor größeren Eigenimplementierungen regelmäßig geprüft werden sollte:
1. Entwickelt sich eine der bestehenden Libraries zum De-facto-Standard?
2. Entsteht eine offizielle TypeScript-Implementierung?
3. Baut LangChain OpenWiki Query/Search weiter aus?
4. Entstehen gemeinsame DocType-/Schema-Konventionen?
5. Standardisiert OKF Beziehungen stärker?
6. Entsteht ein gemeinsames Schema-/Rule-System?
7. Wird MCP oder Agent Skills der bevorzugte Agent-Zugang?
8. Entsteht ein organisationsweiter Open-Source-Hub?
9. Adoptieren weitere große Frameworks OKF?
10. Unterstützen GitHub, GitLab, Backstage, Obsidian oder ähnliche Systeme OKF direkt?
Besonders relevant für Dokkurator wären die Punkte 2, 4, 6 und 8.

---
### Und ja: Das Ganze ist extrem frisch

OKF v0.1 wurde erst am **12. Juni 2026** veröffentlicht. Das separate GitHub-Repository wurde sogar erst im **August 2026** angelegt; v0.2 folgte ebenfalls bereits im August. Wir reden also über ein Ökosystem, das gerade einmal ungefähr **drei Monate** alt ist.

Das erklärt auch, warum die Tools, die wir gerade finden, praktisch alle aus Juni–September 2026 stammen.

### Trotzdem gibt es schon überraschend viel Reaktion

Das offizielle Google-Repo liegt aktuell bei ungefähr **500 Stars und 35 Forks**. Anfang September waren es noch rund 288 Stars. Das ist für ein so junges, ziemlich spezielles Format durchaus sichtbare Aufmerksamkeit — aber natürlich noch kein Beweis für breite produktive Nutzung.

Noch interessanter finde ich die Art der Aktivität. Im offiziellen Repo entstehen gerade konkrete Vorschläge zu Problemen wie:

- typisierten Beziehungen,
- `supersedes` / widersprechendem Wissen,
- Trust/Verification,
- Importen zwischen Bundles,
- Löschsemantik,
- JSON-Schema-Validierung,
- Wikilinks und alternativen Markdown-Konventionen.

Das sind keine reinen „cool project“-Kommentare, sondern ziemlich genau die Probleme, die auftreten, sobald man versucht, das Format tatsächlich als Wissensmodell zu benutzen.

Ein Beispiel: Jemand möchte ein offizielles JSON Schema für das Frontmatter beitragen, ausdrücklich um damit seine eigene Wiki-Implementierung zu validieren.
