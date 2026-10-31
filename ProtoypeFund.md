# Bewerbung Dokkurator

## Allgemeine Informationen

Title: Dokkurator. Wir machen dezentrale Dokumentation gemeinsam auffindbar und ihre Qualität überprüfbar.

## Kurze Projektbeschreibung

Dokkurator hilft Teams, dezentrale Dokumentation in offenen Formaten nach gemeinsamen Regeln zu pflegen: Es prüft Qualität bereits bei der Erstellung und macht verteiltes Wissen anhand einheitlicher Metadaten gezielt auffindbar.

## Projektbeschreibung

Der Kern von Dokkurator sind DocTypes: Teams definieren welche Metadaten und fachlichen Regeln gelten für z. B. ADRs oder Specs gelten.

Diese Definitionen steuern Qualitätsprüfungen und ermöglichen gezielte Abfragen über Dokumentgrenzen hinweg: Was gilt noch, wer ist zuständig, welche Entscheidung ersetzt eine andere? Die Volltextsuche funktioniert zunächst ohne DocTypes. DocTypes lassen sich so schrittweise ergänzen und so das Suchergebnis verbessern.

Dokkurator ist bewusst modular gebaut, damit sich die Teile dort einsetzen lassen, wo Teams ohnehin arbeiten. Die Validierung läuft lokal in der IDE, per CLI oder in der CI-Pipeline. Den Index kann jede\*r lokal aufbauen, um alle erreichbaren Quellen zu durchsuchen. Alternativ läuft er zentral auf einem Server und steht allen zur Verfügung.

## Gesellschaftliche Herausforderung

Wissen entsteht heute dezentral: in Softwareprojekten, aber auch in Verwaltung, Forschung und Vereinen. Informationen sind vorhanden, aber über verschiedene Quellen verteilt, schwer auffindbar, schlecht miteinander verknüpft oder nur mit implizitem Vorwissen verständlich. Proprietäre Plattformen schaffen zusätzliche Abhängigkeiten und erschweren den selbstbestimmten Umgang mit Informationen.

Das erschwert Zusammenarbeit und Beteiligung. Mit der zunehmenden Nutzung generativer KI gewinnt dieses Problem weiter an Bedeutung: auch Agenten benötigen vorhandenes, verlässliches Wissen als Kontext.

Offene Formate wie Markdown ermöglichen zwar langfristige Zugänglichkeit und digitale Souveränität. Sie allein reichen jedoch nicht aus. Es fehlt eine einfache Antwort auf Fragen wie: Welche Dokumente gelten, was gehört zusammen, wer ist zuständig, was wurde abgelöst? Ohne verlässliche Metadaten und Beziehungen bleibt die Einordnung schwierig.

Deshalb braucht es Werkzeuge, mit denen Dokumentation ähnlich wie Quellcode stärker typisiert, strukturiert und validiert wird und sich in bestehende Arbeitsweisen integrieren lassen. Zum anderen braucht es Tools die Informationen aus verteilten Quellen zusammenführen, verknüpfen und durchsuchbar machen, ohne die dezentrale Verantwortung für die Inhalte aufzugeben.

## Technische Umsetzung

Dokkurator entsteht als modularer Baukasten aus TypeScript-/Node.js-Bibliotheken mit pnpm und Nx. Wo möglich, werden etablierte Open-Source-Werkzeuge und Standards weiterverwendet, statt bestehende Funktionen neu zu entwickeln. Die einzelnen Bibliotheken können getrennt veröffentlicht und von anderen Projekten genutzt werden.

Drei eigenständige Komponenten bilden den Kern:

- DocTypes definieren projektspezifische Metadaten, Strukturen und Regeln auf Basis von JSON Schema. Markdown und YAML-Frontmatter werden mit unified/remark verarbeitet.
- Validator nutzt Ajv, ESLint und @eslint/markdown für automatisierte Qualitätsprüfungen. Eigene Regeln können jederzeit hinzugefügt werden.
- Knowledge indexiert Volltext, Metadaten und Dokumentbeziehungen, aber auch Datei- und Berechtigungsinformationen, zunächst mit SQLite.

Quellen-Adapter erschließen Dateisystem und Git über einen lokalen Git-Client. Der Core verbindet diese Bibliotheken über eine gemeinsame Konfiguration und API. Die Konfiguration kann global oder in den jeweiligen Repositories erfolgen. Die CLI macht Validierung und Suche lokal sowie in CI nutzbar. Eine experimentelle Fastify-/React-Referenz zeigt die Serverintegration.

Lokal werden nur zugängliche Quellen indexiert. Serverseitig ergänzen GitLab-OAuth, Quellberechtigungen und nutzerabhängige Suchfilter die gemeinsame Nutzung. Die Quelldokumente bleiben unverändert an ihrem ursprünglichen Speicherort.

## Aktueller Stand

Ein ausführbarer technischer Durchstich steht: Dokkurator liest lokale Verzeichnisse und Git-Repositories ein, verarbeitet Markdown und Frontmatter, synchronisiert Änderungen mit SQLite und bietet eine CLI-Volltextsuche. Einfache DocTypes, JSON-Schema-Prüfungen und vorhandene ESLint-Markdown-Regeln sind nutzbar; der Index erfasst bislang nur grundlegende Eigenschaften. Eine Demo mit Anleitung liegt im Repository.

Während der Förderung erweitern wir dies um fachliche und dokumentübergreifende Regeln, strukturierte Suche, Beziehungen und Qualitätsberichte. Eine experimentelle Fastify-/React-Referenz soll den Mehrbenutzerbetrieb mit GitLab-OAuth und Berechtigungsfiltern zeigen. Ein separater Vorläuferprototyp (Dory) erprobt bereits GitLab-Anmeldung und Zugriffskontrolle.

## Innovation

Werkzeuge wie Obsidian konzentrieren sich auf persönliche Wissenssammlungen, während Docusaurus und MkDocs die Veröffentlichung unterstützen. Im KI-Bereich entstehen zunehmend Lösungen, die vorhandenes Wissen explizit für Sprachmodelle aufbereiten.

Dokkurator setzt bereits bei der Erstellung und Pflege an. Es baut auf bestehenden Open-Source-Werkzeugen auf und verbindet sie über DocTypes: Dieselben Definitionen steuern fachliche Prüfungen und Suchen, auch über Dokumentgrenzen hinweg.

Bisher müssen Teams diese Werkzeuge selbst mit Parsern, Metadatenmodellen und Suchfunktionen verbinden. Ein Core stellt diese Funktionen über eine einfache Konfiguration und API bereit. Eine CLI macht die Lösung unmittelbar nutzbar. Andere Anwendungen können Validator und Suche als Bibliotheken übernehmen.

## Zielgruppe

Dokkurator richtet sich zunächst an Open-Source-Projekte und Softwareteams, deren Dokumentation über mehrere Repositories verteilt ist. Neben Entwickler\*innen profitieren auch fachlich Verantwortliche, die Anforderungen und Entscheidungen dokumentieren: Gemeinsame DocTypes erleichtern Qualitätsprüfungen und machen Zusammenhänge auffindbar.

Eine zweite Zielgruppe sind Entwickler\*innen offener Werkzeuge wie Editor-Erweiterungen und Wissensportale. Sie können die Bibliotheken für Validierung und Suche integrieren.

Langfristig könnten auch die öffentlichen Verwaltung, Wissenschaft und Zivilgesellschaft profitieren. (easyWebsite)[https://easywebsite.opencode.de/] auf openCode zeigt, dass Markdown und Git bereits in Verwaltungsprozessen eingesetzt werden. Fachspezifische DocTypes könnten solche Anwendungen ergänzen.

Erste Anwender\*innen wollen wir über Docs-as-Code-Communities, öffentliche Demos und Kontakte erreichen.

## Meilensteine

Das Grundgerüst steht als Prototyp; jeder Monat erweitert mehrere Bausteine und endet mit einem praktischen Beispiel.

- Monat 1: Indexmodell, Metadatenabfragen und Suchsyntax erweitern. Nachweis: CLI- und Agent-Suche.
- Monat 2: DocTypes, Schema-Validierung und ESLint-Regeln erweitern. Nachweis: CI-Pipeline, Linter in VSCode.
- Monat 3: Dokumentbeziehungen und Graph-Abfragen ergänzen. Nachweis: repoübergreifendes Softwareprojekt in erster Weboberfläche.
- Monat 4: Referenz- und Aktualitätsregeln ergänzen, Prüfergebnisse indexieren. Nachweis: Validierungsergebnisse in Index und Qualitätsberichte in Weboberfläche.
- Monat 5: GitLab-OAuth, Berechtigungsmetadaten und nutzerabhängige Suchfilter implementieren. Nachweis: berechtigungsgefilterte Suche in Server.
- Monat 6: Domain Packs erstellen und weitere reale Dokumentationsbestände erproben. Nachweis: veröffentlichte Domain Packs und dokumentierte Erprobung

## Motivation

In Softwareprojekten erleben wir ständig: Eine Information existiert irgendwo – man muss nur wissen, wo, oder die richtige Person fragen. Mit Doc-as-Code liegt Dokumentation nah am Code, verteilt sich aber über immer mehrere Repositories.

Mit "Dory" bauten wir einen ersten Prototyp und lernten: Einsammeln und Volltextsuche reichen nicht. Es muss auch erkennbar sein, was ein Dokument bedeutet, ob es noch gilt und wie es mit anderen Informationen zusammenhängt.

Daraus entstand Dokkurator: Dokumente nicht nur sammeln, sondern kuratieren. Wir möchten dabei helfen, Informationen strukturiert zu pflegen, zu prüfen und miteinander zu verknüpfen. Das hilft der KI und vor allem den Menschen.
