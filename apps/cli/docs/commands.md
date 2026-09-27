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

Aktuell sucht die CLI nicht automatisch in Elternverzeichnissen nach einer
Config. Bei einem Aufruf außerhalb des Projekt-Roots muss daher `--project`
gesetzt werden.

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
```

Eigenschaften einer Source:

| Eigenschaft | Pflicht | Bedeutung                                                                                     |
| ----------- | ------- | --------------------------------------------------------------------------------------------- |
| `id`        | ja      | Stabiler, projektweit eindeutiger Schlüssel im Index                                          |
| `path`      | ja      | Lokaler Repository-Pfad, relativ zum Projekt-Root; absolute Pfade werden ebenfalls akzeptiert |

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
```

| Argument/Option | Pflicht             | Bedeutung                                                               |
| --------------- | ------------------- | ----------------------------------------------------------------------- |
| `[path]`        | interaktiv optional | Pfad zum vorhandenen Verzeichnis, relativ zum Projekt-Root oder absolut |
| `--id <id>`     | interaktiv optional | Stabile Source-ID; ohne Wert wird der Verzeichnisname vorgeschlagen     |

In einem Terminal fragt die CLI fehlende Werte ab. In CI oder bei umgeleiteter
Eingabe müssen Pfad und ID angegeben werden. Doppelte IDs und nicht vorhandene
Pfade werden abgelehnt. Gespeichert wird möglichst ein relativer Pfad.

## `source remove [id]`

Entfernt eine Source aus `.dokkurator/config.yaml`.

```bash
dokkurator source remove handbook
dokkurator source remove handbook --yes
```

| Argument/Option | Pflicht             | Bedeutung                                                |
| --------------- | ------------------- | -------------------------------------------------------- |
| `[id]`          | interaktiv optional | ID der zu entfernenden Source                            |
| `--yes`         | nein                | Überspringt die Sicherheitsabfrage, beispielsweise in CI |

Wichtig: Der Befehl entfernt derzeit ausschließlich den Config-Eintrag.
Bereits indexierte Daten dieser Source bleiben in `index.db` erhalten. Auch das
Repository-Verzeichnis selbst wird nicht gelöscht.

## `index [source-id]`

Indexiert Änderungen aus einer oder allen konfigurierten Sources. Ohne
`source-id` werden alle Sources nacheinander in denselben Index geschrieben.

```bash
dokkurator index
dokkurator index handbook
dokkurator index handbook --documents-directory docs
dokkurator index --index .cache/project.db
```

| Argument/Option                     | Bedeutung                                           | Standard               |
| ----------------------------------- | --------------------------------------------------- | ---------------------- |
| `[source-id]`                       | Nur diese Source indexieren; ohne ID alle Sources   | alle                   |
| `--documents-directory <directory>` | Dokumentverzeichnis relativ zur jeweiligen Source   | kompletter Source-Root |
| `--index <file>`                    | SQLite-Datei, relativ zum Projekt-Root oder absolut | `.dokkurator/index.db` |

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

| Argument/Option                     | Bedeutung                                     | Standard               |
| ----------------------------------- | --------------------------------------------- | ---------------------- |
| `[source-id]`                       | Nur diese Source prüfen; ohne ID alle Sources | alle                   |
| `--documents-directory <directory>` | Dokumentverzeichnis relativ zur Source        | kompletter Source-Root |
| `--index <file>`                    | Zu vergleichende SQLite-Datei                 | `.dokkurator/index.db` |

Die Ausgabe unterscheidet `added`, `modified` und `deleted`. Existiert noch kein
Index, erscheinen alle erkannten Dokumente als neu.

## `search <query...>`

Durchsucht einen vorhandenen Knowledge-Index und gibt Treffer als JSON aus.

```bash
dokkurator search authentication
dokkurator search status:accepted AND "access token"
dokkurator search owner.team:platform OR tags:security
dokkurator search "(draft OR proposed) AND owner:platform" --limit 50
```

| Argument/Option    | Bedeutung                               | Standard               |
| ------------------ | --------------------------------------- | ---------------------- |
| `<query...>`       | Volltext- und/oder Metadatenabfrage     | erforderlich           |
| `--limit <number>` | Maximale Trefferzahl, positive Ganzzahl | `20`                   |
| `--index <file>`   | Zu durchsuchende SQLite-Datei           | `.dokkurator/index.db` |

Leerzeichen zwischen Suchausdrücken wirken wie `AND`. Unterstützt werden
ausdrückliches `AND`, `OR`, Klammern, Anführungszeichen und Metadatenfilter in
der Form `key:value`. `AND` bindet stärker als `OR`.

## `doctype list [source-id]`

Lädt und parst die DocType-Definitionen aus einer oder allen Sources. Die
Ausgabe erfolgt als JSON und enthält die jeweilige Source-ID.

```bash
dokkurator doctype list
dokkurator doctype list handbook
dokkurator doctype list handbook --directory config/types
```

| Argument/Option           | Bedeutung                                    | Standard                |
| ------------------------- | -------------------------------------------- | ----------------------- |
| `[source-id]`             | Nur diese Source laden; ohne ID alle Sources | alle                    |
| `--directory <directory>` | DocType-Verzeichnis relativ zur Source       | `_dokkurator/.doctypes` |

## `doctype documents [source-id]`

Lädt und parst Markdown-Dokumente aus einer oder allen Sources. Die Ausgabe
erfolgt als JSON und enthält Inhalt, Metadaten, Überschriften, Links,
Referenzen und Source-Metadaten.

```bash
dokkurator doctype documents
dokkurator doctype documents handbook --directory docs
```

| Argument/Option           | Bedeutung                                    | Standard               |
| ------------------------- | -------------------------------------------- | ---------------------- |
| `[source-id]`             | Nur diese Source laden; ohne ID alle Sources | alle                   |
| `--directory <directory>` | Dokumentverzeichnis relativ zur Source       | kompletter Source-Root |

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
