---
title: "Instanz, Domain Packs und ausführbare Erweiterungen"
doctype: task
status: draft
component: core
---

# Research: Dokkurator-Instanz, Domain Packs und ausführbare Erweiterungen

## Ausgangslage

Dokkurator verarbeitet dezentrale Dokumentations-Repositories. Domain Packs liefern zusammengehörige fachliche Bausteine wie DocTypes und Regeln; künftig könnten sie auch Named Queries mitbringen. Ein zentral betriebener Dokkurator-Server wird von Administratoren konfiguriert, während Nutzer der lokalen CLI ihre Instanz selbst verwalten.

Bisher wurde erwogen, alle Bestandteile eines Domain Packs beim Import in ein Dokumentationsprojekt zu kopieren. Für **ausführbaren Code** wird diese Entscheidung neu bewertet: Rules und programmierbare Named Queries sollen nicht in die einzelnen Dokumentations-Repositories kopiert, sondern in einer **Dokkurator-Root-Konfiguration pro Instanz** verwaltet werden.

Das ist ein bewusster Unterschied zur bisherigen Domain-Pack-Importidee und muss mit ihr abgeglichen werden.

## Ziel

Untersuchen, wie eine Dokkurator-Instanz Domain Packs und ausführbare Erweiterungen zentral, reproduzierbar und kontrolliert verwalten kann, während Dokumente dezentral in Git-Repositories bleiben.

Die Lösung soll sowohl für eine lokale CLI-Instanz als auch für einen zentralen Server funktionieren, ohne zwei inkompatible Konfigurationsmodelle einzuführen.

## Vorläufige Leitentscheidungen

- Die **Dokkurator-Instanz** besitzt eine Root-Konfiguration und verwaltet dort die installierten Domain Packs und ausführbaren Erweiterungen.
- **Ausführbare Rules und Named Queries verbleiben auf Instanzebene**; sie werden nicht in jedes Dokumentations-Repository kopiert.
- Bei einem Server dürfen **nur berechtigte Administratoren** ausführbaren Code installieren oder ändern.
- Die Root-Konfiguration **kann selbst in Git liegen**; eingeschränkte Schreib-/Merge-Berechtigungen sollen dann die administrative Kontrolle unterstützen.
- Bei lokaler Nutzung übernimmt die nutzende Person die Instanzverwaltung selbst.
- Domain Packs dürfen zusammengehörige Ressourcen liefern. **Beim Import keine feingranulare Auswahl einzelner Bestandteile**: Die Einheit wird als Ganzes übernommen. Der genaue Zielort der einzelnen Ressourcentypen ist noch zu klären.
- DocTypes bleiben eigenständig; keine Vererbung und kein geteiltes Schema zwischen DocTypes als Voraussetzung.
- Die zentrale Instanz ist eine **Verwaltungs- und Ausführungsgrenze**, keine Vorgabe für einen bestimmten Hosting- oder Git-Anbieter.

**Noch keine Entscheidung:** Ob DocType-Definitionen ausschließlich in den Dokumentations-Repositories oder auch zentral liegen können. Die Ablage ausführbarer Ressourcen entscheidet das nicht automatisch.

## Konzeptionelle Architektur

```text
Dokkurator Root (Verzeichnis oder Git-Repository)
├── instance.yaml              # Quellen, Projekte, aktivierte Packs, Policies
├── packs/
│   └── software/
│       ├── doctypes/           # sofern zentral abgelegt / verwaltet
│       ├── rules/              # ausführbare Rule-Implementierungen
│       └── queries/            # ausführbare Named Queries
└── projects/                   # Projektzuordnung / Freigaben

              lädt / registriert
                     │
                     ▼
Dokkurator Runtime
├── Loader / Model
├── Validator + Rule Registry
├── Knowledge + Named Query Registry
└── CLI oder Server API
                     ▲
                     │ liest Dokumente
                     │
Dokumentations-Repos A, B, C
├── Markdown + Frontmatter
├── ggf. lokale DocTypes
└── ggf. deklarative Pack-/Ruleset-Zuordnung
```

Die Verzeichnisstruktur ist illustrativ und **keine Festlegung auf Dateinamen oder Manifest-Schema**.

## Verantwortlichkeiten und Vertrauensgrenzen

| Akteur / Ebene        | Verantwortlichkeit                                                              | Zu klären                                               |
| --------------------- | ------------------------------------------------------------------------------- | ------------------------------------------------------- |
| Instanzadministrator  | Packs installieren, ausführbaren Code freigeben, Quellen/Policies konfigurieren | Welche Rechte sind delegierbar?                         |
| Repository-Maintainer | Dokumente und ggf. lokale DocTypes pflegen                                      | Darf er Rulesets anfordern oder nur deklarieren?        |
| Normaler Anwender     | Einfache Suche und freigegebene Named Queries ausführen                         | Welche Queries/Quellen sind sichtbar?                   |
| Rule-/Query-Autor     | Erweiterungen entwickeln und testen                                             | Wie werden sie geprüft, versioniert und veröffentlicht? |
| Runtime               | Erweiterungen registrieren und mit begrenztem Kontext ausführen                 | Welches Sicherheits- und Ressourcenmodell?              |

**Wichtig:** Ein geschütztes Git-Repository kann Änderungen am Code organisatorisch einschränken. Es ist **keine Sandbox** für ausgeführten Code und ersetzt keine Laufzeit- und Datenzugriffskontrollen.

### Administrative Kontrolle im Git-Betrieb

Zu untersuchen:

- Geschützte Branches, Merge-Requests, Reviews und CI-Prüfungen für die Root-Konfiguration.
- Deployment/Reload: Wann werden Änderungen aktiv und wer löst das aus?
- Auditierbarkeit: Welche Version eines Packs und welche Konfigurationsrevision war aktiv?
- Umgang mit Geheimnissen: **Keine Secrets im Git-Repository**; Referenzen auf Secret Stores oder Umgebungsvariablen.
- Rechte des ausführenden Servers auf die Root-Konfiguration und auf Dokumentationsquellen.

### Lokaler Betrieb

Die lokale CLI liest dasselbe logische Instanzmodell aus einem lokalen Verzeichnis oder Git-Checkout. Es gibt keinen zentralen Administrator; die lokale Person entscheidet selbst, welche Packs sie installiert und welchem Code sie vertraut.

Zu prüfen: explizites lokales Projekt-/Root-Discovery-Verhalten, Konflikte mehrerer Konfigurationen sowie klare Anzeige der geladenen Versionen.

## Aufteilung der Domain-Pack-Bestandteile

| Bestandteil              | Vorläufige Behandlung                          | Begründung / offene Frage                                              |
| ------------------------ | ---------------------------------------------- | ---------------------------------------------------------------------- |
| DocTypes / Templates     | Offen: projektnah oder zentral, ggf. als Kopie | Sind Teil des Dokumentationsvertrags; Offline- und CI-Nutzung relevant |
| Fachliche Rules          | Zentral pro Instanz                            | Ausführbare Logik kontrolliert laden                                   |
| Named Queries            | Zentral pro Instanz                            | Ausführbare Logik und fachliche Standardabfragen                       |
| Regel-/Query-Metadaten   | Mit der jeweiligen Erweiterung                 | ID, Version, Parameter, Beschreibung, Abhängigkeiten                   |
| Projektzuordnungen       | Offen: Root und/oder deklarativ im Repo        | Lokale Nachvollziehbarkeit vs. zentrale Aktivierung                    |
| UI-/Editor-Konfiguration | Außerhalb dieses Researchs                     | Keine Editor-Spezifikation erforderlich                                |

Es sollte ausdrücklich möglich sein, dass **ein Domain Pack als vollständige Einheit importiert wird**, ohne dass alle enthaltenen Dateien physisch am selben Ort landen müssen. Ob dies als Installation statt Kopie verstanden wird, ist eine zu prüfende Begrifflichkeit.

## Erweiterungs- und Ausführungsmodell

Rules und Named Queries teilen wahrscheinlich Metadaten und Registry-Mechanismen, jedoch nicht zwangsläufig ihren Ausführungslifecycle.

### Gemeinsamer Vertrag – Research-Hypothese

- Stabile, möglichst namespacete ID und Version.
- Beschreibung, Autor/Quelle, ggf. Pack-Zugehörigkeit.
- Validierbares Parameter-Schema (besonders für Named Queries).
- Deklarierte benötigte Fähigkeiten der Runtime/Knowledge API.
- Registrierungs-, Konflikt- und Fehlerverhalten.
- Test- und Kompatibilitätsanforderungen.

### Unterschiedliche Ausführung

- **Rule:** wird vom Validator für Dokumente/Sammlungen/Knowledge-Kontext angestoßen und erzeugt Diagnostics.
- **Named Query:** wird gezielt aufgerufen, liest Knowledge-Daten und erzeugt ein typisiertes Query-Ergebnis.
- Gemeinsame Registry heißt nicht zwangsläufig gemeinsamer Runner.

Beispiel einer möglichen Named Query (rein konzeptionell):

```ts
export const servicesWithoutOwner = {
  id: "software.servicesWithoutOwner",
  parameters: {},
  async execute(context) {
    return context.knowledge.search({
      docType: "service",
      // Konkrete Filter-API noch zu definieren
    });
  },
};
```

**Abhängigkeit:** Eine programmierbare Query kann nur dann backendunabhängig bleiben, wenn sie über eine stabile, ausreichend ausdrucksstarke Knowledge API arbeitet; direkter Zugriff auf SQLite oder OpenSearch sollte nicht als Standard vorausgesetzt werden.

## Sicherheit und Mandantentrennung

Zu untersuchen sind mindestens vier unabhängige Ebenen:

1. **Installationsberechtigung:** Wer darf ausführbare Erweiterungen aufnehmen/ändern?
2. **Ausführungsberechtigung:** Wer darf welche Named Query aufrufen?
3. **Datenberechtigung:** Welche Dokumente, Relationen und Aggregate darf ein Aufrufer sehen?
4. **Laufzeitsicherheit:** Was darf der Erweiterungscode technisch tun?

Eine Named Query darf **keinen unbeschränkten Knowledge-Zugriff** allein durch ihre Admin-Freigabe erhalten. Datenzugriff muss abhängig vom anfragenden Benutzer bzw. dessen Scope durchgesetzt werden – inklusive Traversierungen, Trefferzahlen, Aggregaten und Fehlerausgaben.

Bei ausführbarem JS/TS-Code sind zusätzlich zu prüfen:

- Vertrauensmodell: vertrauenswürdige Admin-Plugins vs. echte Sandbox (bewusste Entscheidung).
- Dateisystem-/Netzwerkzugriffe und Secret-Zugriff.
- Zeit-, Speicher-, Ergebnis- und Graph-Tiefenlimits.
- Umgang mit Endlosschleifen, Abstürzen, Nebenwirkungen und transitive Dependencies.
- Provenienz und Prüfbarkeit installierter Pakete.

**Nicht voraussetzen:** Ein übergebenes `context.knowledge`-Objekt allein ist eine wirksame Sandbox. In gewöhnlicher JS/TS-Laufzeit kann ausführbarer Code weitere Prozessrechte besitzen, sofern keine zusätzliche Isolation besteht.

## Reproduzierbarkeit und Lebenszyklus

Die zentrale Verwaltung verbessert die Wartung, schafft aber die Gefahr unterschiedlicher Ergebnisse zwischen lokaler CI und zentralem Server.

Research-Fragen:

- Wie wird ein Pack/Ruleset zuverlässig versioniert und gepinnt (Manifest, Lockfile, Commit-SHA)?
- Wie wird dokumentiert, mit welcher Rule-Version und welchem Knowledge-Stand ein Diagnostic erzeugt wurde?
- Wie können CI-Jobs denselben Ruleset-Stand nutzen, ohne zentrale Serverberechtigungen zu benötigen?
- Können Root-Config und installierte Erweiterungen unabhängig aktualisiert werden?
- Wie werden Pack-Konflikte, Änderungen an IDs, Rücknahmen und fehlende Abhängigkeiten behandelt?
- Können Queries bei Indexänderungen kontrolliert migriert oder deaktiviert werden?

**Vorerst außerhalb des Scopes:** Ein umfassendes automatisches Domain-Pack-Update- oder Migrationssystem.

## Research-Aufgaben

1. **Installationsmodell:** Installation, Kopie oder Referenz – insbesondere bei gemischten Pack-Inhalten.
2. **Konfigurationshierarchie:** Instanz, Projekt, Repository; Vorrang und Aktivierungsregeln.
3. **Extensibility API:** Registry- und Ausführungsvertrag für Rules und Named Queries.
4. **Sicherheitsmodell:** Admin-Freigabe, Aufruferberechtigungen, Zugriffsscopes, Laufzeitisolation.
5. **Reproduzierbarkeit:** Git/Lockfile/Versionierung, lokaler CI-Lauf und Serverlauf.
6. **Fehlerszenarien:** fehlerhafte Erweiterung, inkompatibles Pack, langsame Query, deaktiviertes Pack.

## Erwartete Research-Ergebnisse

- Entscheidungsdokument zur Ablage und Installation von Domain-Pack-Bestandteilen.
- Verantwortungs- und Berechtigungsmatrix.
- Minimaler Root-Konfigurationsentwurf (lokal und Server).
- Registry-/Extension-Vertragsentwurf, getrennt für Rules und Named Queries.
- Sicherheits- und Reproduzierbarkeitskonzept mit expliziten Grenzen.
- Offene Punkte für die anschließende Implementierungsspezifikation.

## Out of Scope

- Gestaltung eines Editors oder einer Admin-Oberfläche.
- Vollständige Domain-Pack-Update-Infrastruktur.
- Fachliche Definition einzelner Rules oder Queries.
- Details des Knowledge-Datenmodells und der Suchindex-Optimierung (separates Research).
- Festlegung auf GitLab/GitHub oder einen bestimmten Server-Deployment-Stack.
