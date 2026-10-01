# Dokkurator CLI – Benutzerreferenz

## Aufruf und globale Optionen

```text
dokkurator [--project <directory>] <command>
```

| Option                  | Bedeutung                                      | Standard                              |
| ----------------------- | ---------------------------------------------- | ------------------------------------- |
| `-h`, `--help`          | Hilfe für die aktuelle Befehlsebene anzeigen   | –                                     |
| `-V`, `--version`       | CLI-Version anzeigen                           | –                                     |
| `--project <directory>` | Projekt-Root mit dem Verzeichnis `.dokkurator` | Arbeitsverzeichnis beim Programmstart |

Die globale Option steht vor dem Befehl:

```bash
dokkurator --project ../documentation index
```

Ohne `--project` sucht die CLI vom Arbeitsverzeichnis aufwärts nach
`.dokkurator/config.yaml`. Wird keine Datei gefunden, gilt das aktuelle
Arbeitsverzeichnis als neuer Projekt-Root.

## Dateien und Verzeichnisse

```text
<project-root>/
└── .dokkurator/
    ├── config.yaml     # Repository-Konfiguration
    └── index.db        # standardmäßiger Knowledge-Index
```

Fehlt `config.yaml`, behandeln Verwaltungsbefehle das Projekt als leere
Konfiguration. `source add` legt Verzeichnis und Datei automatisch an.
Verarbeitungsbefehle melden dagegen, dass keine Sources konfiguriert sind.

Beispielkonfiguration:

```yaml
sources:
  - id: handbook
    path: repos/handbook
  - id: architecture
    path: ../architecture-docs
  - id: remote-handbook
    remote:
      url: https://github.com/example/handbook.git
      branch: main
```

Eigenschaften einer Source:

| Eigenschaft     | Pflicht | Bedeutung                                                                                     |
| --------------- | ------- | --------------------------------------------------------------------------------------------- |
| `id`            | ja      | Stabiler, projektweit eindeutiger Schlüssel im Index                                          |
| `path`          | bedingt | Lokaler Repository-Pfad, relativ zum Projekt-Root; absolute Pfade werden ebenfalls akzeptiert |
| `remote.url`    | bedingt | Git-URL; erforderlich, wenn kein lokaler Pfad angegeben ist                                   |
| `remote.branch` | nein    | Auszucheckender Branch                                                                        |

Remote-Sources ohne `path` werden unter
`.dokkurator/checkouts/<source-id>` verwaltet. Ausschließlich `prepare` klont
einen fehlenden Checkout. Andere Source-verarbeitende Befehle verändern einen
fehlenden Checkout nicht, sondern verweisen auf den passenden Prepare-Aufruf.
`prepare` fragt nicht interaktiv nach einer Bestätigung. `index` und `watch`
aktualisieren vorhandene Remote-Checkouts vor der inkrementellen Indexierung.

### Authentifizierung für Remote-Sources

Dokkurator implementiert keinen eigenen Login und speichert keine
Zugangsdaten. Der Source-Adapter führt das lokal installierte Git aus und nutzt
dessen vorhandene Authentifizierung:

- SSH-URLs wie `git@github.com:organisation/handbook.git` verwenden
  SSH-Agent, Schlüssel und `~/.ssh/config`.
- HTTPS-URLs verwenden den eingerichteten Git Credential Helper, etwa den
  Betriebssystem-Schlüsselbund oder einen Provider-spezifischen Helper.
- In CI muss Git vor dem Dokkurator-Aufruf nicht-interaktiv eingerichtet sein,
  beispielsweise über einen kurzlebigen SSH-Key oder den Credential Helper des
  CI-Systems.

Tokens oder Passwörter sollen nicht in `remote.url` eingetragen werden, weil
die URL in `.dokkurator/config.yaml` gespeichert wird. Fehlt eine gültige
Git-Anmeldung, schlägt Clone, Fetch oder Pull mit der entsprechenden Git-
Fehlermeldung fehl. Interaktive OAuth- und Provider-Login-Flows sind nicht Teil
dieser Implementierung.

## `source list`

Listet alle konfigurierten Sources.

```bash
dokkurator source list
dokkurator source list --json
```

| Option   | Bedeutung                                                        |
| -------- | ---------------------------------------------------------------- |
| `--json` | Gibt die Source-Liste als JSON statt als tabellarischen Text aus |

## `source add [path]`

Fügt ein vorhandenes lokales Verzeichnis zur Config hinzu.

```bash
dokkurator source add ../handbook --id handbook
dokkurator source add --remote https://github.com/example/handbook.git --branch main --id handbook
```

| Argument/Option     | Pflicht             | Bedeutung                                                               |
| ------------------- | ------------------- | ----------------------------------------------------------------------- |
| `[path]`            | interaktiv optional | Pfad zum vorhandenen Verzeichnis, relativ zum Projekt-Root oder absolut |
| `--id <id>`         | interaktiv optional | Stabile Source-ID; ohne Wert wird der Verzeichnisname vorgeschlagen     |
| `--remote <url>`    | nein                | Git-Remote statt eines vorhandenen lokalen Pfads                        |
| `--branch <branch>` | nein                | Branch der Remote-Source                                                |

In einem Terminal fragt die CLI fehlende Werte ab. In CI oder bei umgeleiteter
Eingabe müssen Pfad und ID angegeben werden. Doppelte IDs und nicht vorhandene
Pfade werden abgelehnt. Gespeichert wird möglichst ein relativer Pfad.

## `source remove [id]`

Entfernt eine Source aus `.dokkurator/config.yaml`.

```bash
dokkurator source remove handbook
dokkurator source remove handbook --yes
dokkurator source remove handbook --keep-index --yes
```

| Argument/Option | Pflicht             | Bedeutung                                                  |
| --------------- | ------------------- | ---------------------------------------------------------- |
| `[id]`          | interaktiv optional | ID der zu entfernenden Source                              |
| `--yes`         | nein                | Überspringt die Sicherheitsabfrage, beispielsweise in CI   |
| `--keep-index`  | nein                | Behält bereits indexierte Dokumente und den Source-Zustand |

Standardmäßig entfernt der Befehl den Config-Eintrag und die Source atomisch
aus dem Knowledge-Index. Interaktiv werden beide Schritte bestätigt. Mit
`--yes` werden Config und Index ohne Rückfrage bereinigt; `--keep-index`
verhindert das Löschen aus dem Index. Das Repository beziehungsweise ein
verwalteter Checkout wird nie vom Dateisystem gelöscht.

## `prepare [source-id]`

Bereitet fehlende Checkouts vor und initialisiert Sources, für die noch kein
Knowledge-Indexzustand existiert. Ohne `source-id` werden alle Sources
nacheinander verarbeitet. Bereits vorhandene Remote-Checkouts werden dabei
nicht aktualisiert.

```bash
dokkurator prepare
dokkurator prepare handbook
```

| Argument/Option | Bedeutung                                          | Standard |
| --------------- | -------------------------------------------------- | -------- |
| `[source-id]`   | Nur diese Source vorbereiten; ohne ID alle Sources | alle     |

Fehlende lokale Sources werden nicht erzeugt. Fehler einer Source verhindern
nicht die Vorbereitung der folgenden Sources. Die CLI gibt Fehler und passende
Hinweise zur Korrektur gesammelt aus.

## `index [source-id]`

Indexiert Änderungen aus einer oder allen konfigurierten Sources. Ohne
`source-id` werden alle Sources nacheinander in denselben Index geschrieben.

```bash
dokkurator index
dokkurator index handbook
```

| Argument/Option | Bedeutung                                         | Standard |
| --------------- | ------------------------------------------------- | -------- |
| `[source-id]`   | Nur diese Source indexieren; ohne ID alle Sources | alle     |

Die Ausgabe nennt pro Source die Anzahl neu oder erneut indexierter sowie
entfernter Dokumente. `.git`, `.dokkurator`, `.nx`, `node_modules` und `dist`
werden standardmäßig von der Dokumenterkennung ausgeschlossen.

## `diff [source-id]`

Vergleicht den aktuellen Stand einer oder aller Sources mit dem zuletzt
erfolgreich gespeicherten Indexzustand. Der Index wird nicht verändert.

```bash
dokkurator diff
dokkurator diff handbook
```

| Argument/Option | Bedeutung                                     | Standard |
| --------------- | --------------------------------------------- | -------- |
| `[source-id]`   | Nur diese Source prüfen; ohne ID alle Sources | alle     |

Die Ausgabe unterscheidet `added`, `modified` und `deleted`. Existiert noch kein
Index, erscheinen alle erkannten Dokumente als neu.

## `search <query...>`

Durchsucht einen vorhandenen Knowledge-Index und gibt Treffer als JSON aus.

```bash
dokkurator search authentication
dokkurator search status:accepted AND "access token"
dokkurator search owner.team:platform OR tags:security
dokkurator search "(draft OR proposed) AND owner:platform" --limit 50
dokkurator search authentication --source handbook
```

| Argument/Option        | Bedeutung                                       | Standard     |
| ---------------------- | ----------------------------------------------- | ------------ |
| `<query...>`           | Volltext- und/oder Metadatenabfrage             | erforderlich |
| `--limit <number>`     | Maximale Trefferzahl, positive Ganzzahl         | `20`         |
| `--source <source-id>` | Treffer auf eine konfigurierte Source begrenzen | alle         |

Leerzeichen zwischen Suchausdrücken wirken wie `AND`. Unterstützt werden
ausdrückliches `AND`, `OR`, Klammern, Anführungszeichen und Metadatenfilter in
der Form `key:value`. `AND` bindet stärker als `OR`.

## `doctype list [source-id]`

Lädt und parst die DocType-Definitionen aus einer oder allen Sources. Die
Ausgabe erfolgt als JSON und enthält die jeweilige Source-ID.

```bash
dokkurator doctype list
dokkurator doctype list handbook
```

| Argument/Option | Bedeutung                                    | Standard |
| --------------- | -------------------------------------------- | -------- |
| `[source-id]`   | Nur diese Source laden; ohne ID alle Sources | alle     |

## `doctype documents [source-id]`

Lädt und parst Markdown-Dokumente aus einer oder allen Sources. Die Ausgabe
erfolgt als JSON und enthält Inhalt, Metadaten, Überschriften, Links,
Referenzen und Source-Metadaten.

```bash
dokkurator doctype documents
dokkurator doctype documents handbook
```

| Argument/Option | Bedeutung                                    | Standard |
| --------------- | -------------------------------------------- | -------- |
| `[source-id]`   | Nur diese Source laden; ohne ID alle Sources | alle     |

## `watch [source-id]`

Indexiert zunächst den aktuellen Stand und beobachtet anschließend lokale
Änderungen. Ereignisse werden pro Source zusammengefasst und lösen die
hash-basierte inkrementelle Indexierung aus.

```bash
dokkurator watch
dokkurator watch handbook
```

| Argument/Option | Bedeutung                                         | Standard |
| --------------- | ------------------------------------------------- | -------- |
| `[source-id]`   | Nur diese Source beobachten; ohne ID alle Sources | alle     |

Der Watcher läuft bis `Ctrl+C` beziehungsweise `SIGTERM`. Remote-Sources werden
beim Start aktualisiert; danach wird der lokale Checkout beobachtet. Debounce,
Dokumentverzeichnis und Indexdatei stammen ausschließlich aus der Projekt- und
Repository-Konfiguration.

## Interaktive und automatisierte Verwendung

Nur die Verwaltungsbefehle fragen interaktiv nach fehlenden Werten oder einer
Bestätigung. Für Skripte sollten alle Werte explizit gesetzt werden:

```bash
dokkurator --project "$PROJECT_ROOT" source add "$REPOSITORY" --id handbook
dokkurator --project "$PROJECT_ROOT" source remove handbook --yes
dokkurator --project "$PROJECT_ROOT" index handbook
```

Bei Fehlern schreibt die CLI eine Meldung nach stderr und beendet sich mit
Status `1`. Erfolgreiche Befehle verwenden Status `0`.
