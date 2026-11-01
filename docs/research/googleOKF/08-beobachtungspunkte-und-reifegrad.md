---
doctype: research
title: Beobachtungspunkte und Reifegrad
status: in-progress
topic: open-knowledge-format
tags: [knowledge, interoperability]
sources:
  - https://github.com/google/open-knowledge
---

# Beobachtungspunkte und Reifegrad

**Stand:** 19. September 2026

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

---

[Inhaltsverzeichnis](README.md) · [Zurück: Zusammenspiel von Dokkurator und OpenWiki](07-zusammenspiel-mit-openwiki.md)
