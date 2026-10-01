# Git-Checkout- und Update-Semantik

Status: Entwurf, noch nicht umgesetzt

Abhängigkeit: `core-and-loader-boundaries.md`

## Ziel

Den Loader-Vertrag für das Öffnen, Vorbereiten und Aktualisieren konfigurierter
Git-Sources eindeutig festlegen. Insbesondere darf keine Operation einen
vorhandenen lokalen Zustand überraschend überschreiben, einen anderen Remote
verwenden als den konfigurierten oder Git-spezifische Entscheidungen an Core
oder CLI delegieren.

Dieses Dokument beschreibt das Zielverhalten. Es ändert noch keine öffentliche
API und behauptet nicht, dass die derzeitige Implementierung diesen Vertrag
bereits erfüllt.

## Geltungsbereich und Begriffe

Eine **lokale Source** hat in der Projektkonfiguration kein `remote`. Ihr Pfad
wird ausschließlich als vorhandene lokale Source geöffnet. Auch wenn der Pfad
ein Git-Repository ist, wird er von Dokkurator weder geklont noch aktualisiert.

Ein **verwalteter Checkout** gehört zu einer Source mit konfiguriertem
`remote.url`. Sein Zielpfad wird von Dokkurator vorbereitet und bei einem
expliziten Sync aktualisiert. Nur für diesen Source-Typ gelten die nachfolgenden
Remote-, Branch- und Update-Regeln.

Ein **gültiger Checkout** ist ein existierendes Git-Working-Tree-Root genau am
konfigurierten Pfad. Ein Unterverzeichnis eines übergeordneten Repositories ist
kein gültiger Checkout. Git-Worktrees sind gültig, sofern Git den
konfigurierten Pfad selbst als Toplevel meldet. Bare Repositories sind keine
gültigen Checkouts, weil Dokumente aus einem Working Tree gelesen werden.

Die konfigurierte **Checkout-Identität** besteht aus Source-ID, normalisierter
`remote.url` und optionalem `remote.branch`. Die Source-ID bestimmt weiterhin
die fachliche Identität im Index; Remote und Branch bestimmen, welcher lokale
Git-Zustand dafür zulässig ist.

## Besitzmodell und Nutzerfälle

Die entscheidende Grenze ist nicht, ob ein Verzeichnis Git verwendet, sondern
wer seinen Zustand kontrolliert:

> Ohne `remote` gehört der lokale Zustand dem Nutzer. Mit `remote` gehört der
> Checkout Dokkurator.

| Source-Typ | Typischer Nutzerfall | Eigentümer des lokalen Zustands | Verhalten von Dokkurator |
| --- | --- | --- | --- |
| Lokales Dateisystem ohne Git | Manuell gepflegte Dokumente, Export oder generierter Ordner | Nutzer | Dateien lesen und indexieren |
| Lokales Git-Repository | Aktives Entwicklungsverzeichnis | Entwickler | Working Tree lesen und Git-Metadaten verwenden, aber Git-Zustand nie verändern |
| Verwaltetes Remote-Git | Externe Dokumentation automatisch beziehen | Dokkurator | Checkout anlegen, prüfen und synchronisieren |

Lokales Dateisystem und lokales Git sind keine unterschiedlichen
Konfigurationsarten. Beide werden mit einem lokalen `path` und ohne `remote`
deklariert. Der Loader erkennt Git nur, um reichhaltigere Metadaten und eine
geeignete Änderungsermittlung anzubieten. Der Nutzer muss diese technische
Unterscheidung nicht konfigurieren.

Ein verwaltetes Remote-Git ist dagegen bewusst kein Entwicklungsverzeichnis.
Sein Pfad liegt ausschließlich unter `checkouts.directory/<source-id>` und gilt
als wiederherstellbarer Cache. Nutzer und andere Prozesse dürfen ihn lesen,
aber nicht verändern. Ein Nutzer darf den gesamten Checkout löschen und durch
`prepare` neu erzeugen lassen; Dokkurator löscht oder ersetzt ihn ohne einen
ausdrücklichen Reparaturauftrag dennoch nicht selbstständig.

## Grundsätze

1. `open` liest nur vorhandenen lokalen Zustand. Es klont, fetcht, wechselt
   keinen Branch und verändert keine Git-Konfiguration.
2. `prepare` stellt einen fehlenden verwalteten Checkout durch Clone her. Ein
   bereits gültiger Checkout wird nur validiert, nicht aktualisiert.
3. `sync` aktualisiert nur einen bereits vorhandenen, gültigen verwalteten
   Checkout. Es klont keinen fehlenden Checkout.
4. Dokkurator führt weder Merge noch Rebase, Reset, Stash oder Clean aus.
5. Ein Update ist ausschließlich ein Fast-forward des dafür vorgesehenen
   lokalen Branches auf den explizit gefetchten Remote-Branch.
6. Validierungsfehler werden vor der ersten mutierenden Git-Operation erkannt,
   soweit dies mit lokalem Zustand möglich ist.
7. Loader besitzt Prüfung, Git-Befehle und Fehlerklassifikation. Core
   orchestriert nur `prepare` und `sync`; CLI stellt strukturierte Fehler dar.
8. Bei lokalen Sources bedeutet `sync` ausschließlich, den gegenwärtigen
   Datei- beziehungsweise Working-Tree-Zustand neu zu erfassen und zu
   indexieren. Es ist keine Git-Synchronisation.

## Operationen

### Öffnen

Für eine lokale Source gilt der Pfad als öffnungsfähig, wenn er ein Verzeichnis
ist. Der Loader wählt wie bisher anhand des lokalen Zustands einen Git- oder
Filesystem-Adapter. Ein fehlender Pfad ergibt `missing-local-source`.

Bei einem lokalen Git-Repository sind alle üblichen Entwicklerzustände
zulässig: ein anderer Branch, detached HEAD, lokale Commits, Änderungen in
Index und Working Tree sowie nicht ignorierte Dateien. Dokkurator führt dort
niemals Clone, Fetch, Pull, Checkout, Reset, Stash, Clean oder Änderungen an
Remotes und Branches aus.

Lesen und Indexieren einer lokalen Git-Source müssen dieselbe sichtbare
Wahrheit verwenden: den aktuellen Working Tree einschließlich nicht
ignorierter lokaler Änderungen. Commit-basierte Git-Diffs dürfen als
Optimierung dienen, aber nicht dazu führen, dass `list` beziehungsweise `read`
eine andere Version zeigen als der Knowledge-Index. Die konkrete inkrementelle
Strategie für uncommitted und untracked Dateien wird bei der Umsetzung mit der
bereits geplanten Source-Diff-Arbeit abgestimmt.

Für einen verwalteten Checkout prüft `open` ausschließlich:

- Der Pfad existiert als Verzeichnis.
- Der Pfad ist selbst das Root eines nicht-baren Git-Working-Trees.
- `origin` existiert und seine Fetch-URL entspricht der konfigurierten URL.
- Wenn ein Branch konfiguriert ist, ist genau dieser Branch ausgecheckt.
- Wenn kein Branch konfiguriert ist, stimmt der ausgecheckte Branch mit dem beim
  Clone festgehaltenen Remote-Default-Branch überein.

`open` benötigt keinen Netzwerkzugriff. Es prüft deshalb weder, ob der Remote
erreichbar ist, noch ob der lokale Branch aktuell ist. Lokale Änderungen sind
für das reine Öffnen zulässig: Listen und Lesen sollen weiterhin den Working
Tree einschließlich nicht ignorierter Änderungen abbilden.

Ein Identitätsfehler wird nicht als fehlender Checkout ausgegeben. Der Pfad ist
vorhanden, aber gehört nicht sicher zur konfigurierten Source; die konkrete
Fehlerursache muss erhalten bleiben.

### Vorbereiten

`prepare` unterscheidet anhand des Pfadzustands:

| Zustand am Zielpfad | Verhalten |
| --- | --- |
| Pfad fehlt | Remote in den Zielpfad klonen |
| Leeres Verzeichnis | Wie fehlender Pfad behandeln; Clone darf dieses Verzeichnis verwenden |
| Nicht leeres Nicht-Git-Verzeichnis | Abbrechen; Inhalte weder löschen noch überschreiben |
| Datei oder anderer Nicht-Verzeichnis-Eintrag | Abbrechen |
| Gültiger, passender Checkout | Unverändert öffnen |
| Git-Repository mit falschem/fehlendem `origin` | Abbrechen; Remote nicht automatisch umschreiben |
| Passender Checkout auf falschem oder detached Branch | Abbrechen; Branch nicht in `prepare` wechseln |

Beim Clone mit konfiguriertem Branch wird genau dieser Branch ausgecheckt. Ist
der Branch am Remote nicht vorhanden, schlägt `prepare` als Konfigurations- oder
Remote-Fehler fehl. Ohne konfigurierten Branch übernimmt Git den Default-Branch
des Remotes. Dieser beim Clone ermittelte Default-Branch bleibt für alle
späteren Updates dieses Checkouts maßgeblich; ein später extern ausgecheckter
Branch wird nicht zum neuen Standard. Das Ergebnis muss ein angehängter lokaler
Branch mit Upstream zum entsprechenden `origin`-Branch sein.

Ein fehlgeschlagener Clone darf keinen scheinbar gültigen Teil-Checkout
zurücklassen. Soweit Git bereits ein neues Zielverzeichnis angelegt hat und
dieses eindeutig zum laufenden Clone gehört, soll der Loader es bereinigen.
Vorher vorhandene Pfade oder Inhalte werden nie bereinigt.

### Aktualisieren

`sync` lässt den Loader vor dem Update dieselben Identitätsprüfungen wie `open`
durchführen. Zusätzlich muss der Working Tree vollständig sauber sein. Als
lokale Änderungen gelten Änderungen im Index oder Working Tree sowie nicht
ignorierte untracked Dateien. Ignorierte Dateien blockieren das Update nicht.

Danach gilt folgende Reihenfolge:

1. Den vorgesehenen Branch bestimmen: den konfigurierten Branch oder den beim
   Clone ermittelten Remote-Default-Branch.
2. Sicherstellen, dass HEAD nicht detached ist und genau dieser Branch
   ausgecheckt ist.
3. Sicherstellen, dass `origin` zur konfigurierten URL passt.
4. Nur den vorgesehenen Branch von `origin` fetchen.
5. Sicherstellen, dass der Remote-Branch existiert.
6. Die Beziehung zwischen lokalem HEAD und `origin/<branch>` bestimmen.
7. Nur bei einem reinen Rückstand den lokalen Branch per Fast-forward
   aktualisieren.

Das Ergebnis hängt von der Revisionsbeziehung ab:

| Revisionsbeziehung | Ergebnis |
| --- | --- |
| Lokal und Remote identisch | Erfolg ohne Änderung |
| Lokal ist Vorfahr des Remotes | Fast-forward auf den Remote-Stand |
| Remote ist Vorfahr des lokalen Branches | Abbruch: lokaler Branch ist voraus |
| Beide Seiten enthalten eigene Commits | Abbruch: Branches sind divergiert |
| Beziehung nicht bestimmbar | Abbruch mit Git-Ursache |

Damit ist ein allgemeines `git pull` nicht Teil der Zielsemantik. Insbesondere
dürfen nutzer- oder repositoriespezifische Pull-Konfigurationen keinen Merge
oder Rebase auslösen. Ebenso wird kein beliebiger Tracking-Branch verwendet:
Quelle des Updates ist immer der aus der Konfiguration und dem oben definierten
Branch abgeleitete `origin`-Branch.

Schlägt das Fast-forward nach erfolgreichem Fetch fehl, bleibt der lokale
Branch unverändert; aktualisierte Remote-Tracking-Refs sind als unvermeidlicher
lokaler Fetch-Effekt zulässig. Nach einem erfolgreichen Update muss der
Working Tree weiterhin sauber sein und HEAD dem gefetchten Remote-Commit
entsprechen.

Andere Prozesse dürfen einen verwalteten Checkout lesen. Gleichzeitige
Schreibzugriffe während `prepare`, `sync` oder Reparatur werden nicht
unterstützt. Die Umsetzung muss diese schreibenden Operationen mindestens
innerhalb einer Dokkurator-Instanz serialisieren; ob zusätzlich ein
prozessübergreifendes Lock erforderlich ist, bleibt eine Detailentscheidung.

## Force-Push-Erkennung und Reparatur

Ein fehlgeschlagener Fast-forward ist nicht automatisch eindeutig ein
Force-Push. Dieselbe Revisionsbeziehung kann durch lokale Commits oder durch
eine umgeschriebene Remote-Historie entstehen. Die Diagnose verwendet deshalb
drei Revisionen:

- den lokalen HEAD vor dem Fetch;
- den Stand von `origin/<branch>` vor dem Fetch;
- den Stand von `origin/<branch>` nach dem Fetch.

Entspricht der lokale HEAD vor dem Fetch dem alten Remote-Stand und ist der
neue Remote-Stand kein Nachfolger davon, wurde die veröffentlichte Historie
zurückgesetzt oder umgeschrieben. Das wird als
`remote-history-rewritten` klassifiziert. Weicht der lokale HEAD bereits vom
alten Remote-Stand ab, wurde der verwaltete Checkout lokal verändert; je nach
Revisionsbeziehung lautet der Fehler `local-commits` oder `diverged`. Ist der
alte Remote-Stand beim ersten prüfbaren Sync nicht vorhanden, kann die Ursache
nicht sicher unterschieden werden und bleibt `diverged`.

Zusätzlich soll der Loader den zuletzt erfolgreich synchronisierten Commit als
verwaltetes Checkout-Metadatum festhalten. Damit bleibt die Diagnose auch dann
stabil, wenn Remote-Tracking-Refs zwischenzeitlich verändert oder gelöscht
wurden. Dieses technische Metadatum gehört zum Checkout-Zustand, nicht zur
fachlichen Source-ID und nicht zum Knowledge-Index.

Eine umgeschriebene Remote-Historie wird nicht automatisch per Reset
übernommen. Dafür ist ein expliziter **Reparaturmodus** vorgesehen. Seine
Semantik lautet:

1. Prüfen, dass der Zielpfad unter dem aufgelösten `checkouts.directory` liegt
   und exakt der gewählten Source-ID zugeordnet ist.
2. Prüfen, dass es sich um einen verwalteten Checkout handelt; bei unklarer
   Identität oder einem Pfad außerhalb des Checkout-Verzeichnisses abbrechen.
3. Einen neuen Checkout der konfigurierten URL und des vorgesehenen Branches in
   einem temporären Geschwisterpfad vollständig herstellen und validieren.
4. Erst nach erfolgreicher Validierung den bisherigen Checkout ersetzen.
5. Bei einem Fehler den bisherigen Checkout unverändert lassen und den
   temporären Checkout kontrolliert entfernen.

Der Reparaturmodus verwirft sämtliche manuellen Änderungen und lokalen Commits
im bisherigen verwalteten Checkout. Er muss daher durch eine eigene explizite
Core-/CLI-Operation oder ein eindeutig benanntes Repair-Flag ausgelöst werden;
ein normales `prepare` oder `sync` darf ihn nie implizit aktivieren. CLI und
Dokumentation müssen vor dem Datenverlust warnen und Source-ID sowie Zielpfad
anzeigen. Die endgültige API- und Bestätigungsform wird bei der Umsetzung
festgelegt; Library und nicht-interaktive Hosts benötigen eine explizite
Opt-in-Möglichkeit ohne versteckte Rückfrage.

## URL- und Origin-Prüfung

Der Vergleich darf offenkundig äquivalente Schreibweisen normalisieren, aber
keine Netzwerkidentität erraten. Zulässig sind mindestens:

- Entfernen eines abschließenden `/`;
- Gleichbehandlung eines abschließenden `.git`;
- Normalisierung lokaler Dateipfade und `file://`-URLs auf einen absoluten
  kanonischen Pfad, soweit lokal auflösbar.

Unterschiedliche Hosts, Benutzer, Ports oder Repositorypfade bleiben
unterschiedlich. Ob SCP-artige SSH-URLs und `ssh://` als äquivalent gelten,
muss die Implementierung nur dann normalisieren, wenn dies ohne Verlust von
Host, Benutzer, Port und Pfad eindeutig möglich ist. Zugangsdaten und Tokens
dürfen in Fehlern nicht ausgegeben werden.

Fehlt `origin` oder stimmt seine Fetch-URL nicht überein, bricht die Operation
ab. Dokkurator fügt oder verändert Remotes nicht automatisch. Eine abweichende
Push-URL ist für Lese- und Updateoperationen unerheblich.

## Branch-Regeln

Ein explizit konfigurierter Branch ist bindend. Dokkurator wechselt bei
`prepare` oder `sync` nicht stillschweigend von einem anderen Branch dorthin,
weil dadurch lokale Arbeit oder die vom Nutzer gewählte Ansicht verändert
werden könnte. Der Fehler verweist darauf, den Branch manuell auszuchecken oder
die Konfiguration zu korrigieren.

Ohne konfigurierten Branch wird beim Clone der Remote-Default ermittelt und als
verwalteter Branch des Checkouts festgehalten. Spätere Änderungen am
Remote-Default oder am aktuell ausgecheckten Branch ändern diese Auswahl nicht
automatisch. Der verwaltete Branch muss einen gleichnamigen Branch auf `origin`
besitzen; ein anders benannter oder fehlender Upstream wird nicht automatisch
angelegt. Detached HEAD ist für verwaltete Checkouts weder öffnungs- noch
updatefähig. Für lokale Sources
bleibt detached HEAD dagegen zulässig, weil Dokkurator sie nicht verwaltet.

## Unerwartete Änderungen in verwalteten Checkouts

Lokale Änderungen in einem verwalteten Checkout blockieren nur das Git-Update,
nicht das Öffnen oder Lesen. Das gilt auch dann, wenn ein Fast-forward technisch
ohne Dateikonflikt möglich wäre. Dokkurator entscheidet nicht, ob lokale
Änderungen verworfen, committed oder gestasht werden sollen. Bei einer lokalen
Source sind dieselben Änderungen regulärer Nutzerzustand und werden indexiert.

Ein sauberer lokaler Branch mit zusätzlichen lokalen Commits wird ebenfalls
nicht aktualisiert. Selbst wenn der Remote unverändert ist, meldet `sync` den
Branch als voraus, damit ein verwalteter Checkout nicht unbemerkt zu einer
lokalen Veröffentlichungs- oder Entwicklungs-Branch wird.

## Fehlervertrag

Git-Lifecycle-Fehler sollen als öffentliche, maschinenlesbare Loader-Fehler mit
`sourceId`, sicher darstellbarer Ursache und einem stabilen Reason-Code
auftreten. Vorgesehene Gründe sind:

| Reason | Bedeutung | Empfohlene Handlung |
| --- | --- | --- |
| `missing-checkout` | Verwalteter Checkout fehlt | `prepare` für die Source ausführen |
| `missing-local-source` | Lokale Source fehlt | Pfad oder Konfiguration korrigieren |
| `checkout-path-conflict` | Ziel ist Datei oder nicht leeres Nicht-Git-Verzeichnis | Pfad manuell klären |
| `invalid-checkout` | Pfad ist kein geeignetes Git-Working-Tree-Root | Checkout/Pfad manuell klären |
| `missing-origin` | `origin` fehlt | Remote manuell ergänzen oder neu vorbereiten |
| `origin-mismatch` | `origin` gehört nicht zur konfigurierten URL | Konfiguration oder Checkout korrigieren |
| `branch-mismatch` | Anderer Branch ist ausgecheckt | Branch manuell wechseln oder Config korrigieren |
| `detached-head` | Verwalteter Checkout hat detached HEAD | Branch manuell auschecken |
| `dirty-worktree` | Lokale Änderungen verhindern Update | Änderungen committen, stashen oder verwerfen |
| `missing-remote-branch` | Vorgesehener Branch existiert nicht am Remote | Branch/Remote-Konfiguration korrigieren |
| `local-commits` | Lokaler Branch ist dem Remote voraus | Commits manuell veröffentlichen oder Checkout reparieren |
| `diverged` | Lokal und Remote sind auseinander gelaufen | Merge/Rebase/Reset bewusst manuell durchführen |
| `remote-history-rewritten` | Veröffentlichte Remote-Historie wurde zurückgesetzt oder umgeschrieben | Expliziten Reparaturmodus verwenden oder Remote korrigieren |
| `authentication-failed` | Remote-Zugriff wurde abgewiesen | Credential Helper, SSH-Agent oder CI-Credentials prüfen |
| `remote-unavailable` | Remote konnte nicht erreicht werden | Netzwerk/Remote prüfen und erneut synchronisieren |
| `git-command-failed` | Sonstiger Git-Fehler | Sichere Originalursache anzeigen und Git-Zustand prüfen |

Core reicht diese Klassifikation pro Source in seinen strukturierten
`prepare`-/`sync`-Ergebnissen weiter. Es leitet daraus keine Git-Aktionen ab.
CLI darf kurze Handlungsempfehlungen ergänzen, aber keine interaktive Reparatur
starten. Ausgaben müssen Credentials aus URLs und Git-Fehlertexten entfernen.

## Ergebnisvertrag

Für erfolgreiche Operationen soll der Loader neben dem Adapter ein
strukturiertes Ergebnis liefern, damit Core nicht aus Git-Zustand ableiten muss,
was geschehen ist:

- `open`: vorhandene Source geöffnet;
- `prepare`: `local`, `existing` oder `created`;
- `sync`: `unchanged` oder `fast-forwarded`, bei Fast-forward zusätzlich alte
  und neue Revision.
- Reparatur: `recreated`, zusätzlich alte Revision, neue Revision und
  reparierter Zielpfad.

Die genaue TypeScript-Form ist Teil der späteren Implementierung. Die Begriffe
sind hier semantisch festgelegt; bestehende Core-Ergebnisse müssen bei der
Umsetzung darauf abgebildet werden.

## Nicht-Ziele

- Automatisches Reparieren oder Ersetzen falscher Checkouts; eine ausdrücklich
  angeforderte, abgesicherte Reparatur bleibt erlaubt.
- Unterstützen frei konfigurierbarer Remote-Namen statt `origin`.
- Push, Merge, Rebase, Reset, Stash, Clean oder Konfliktauflösung.
- Aktualisieren lokaler Sources ohne konfiguriertes Remote.
- Wechseln von Branches in einem vorhandenen Checkout.
- Flache oder partielle Clone-Strategien als Teil dieses Vertrags.
- Freie Ablage verwalteter Remote-Checkouts außerhalb von
  `checkouts.directory/<source-id>`.

## Geplantes internes Refactoring

Die derzeitige Implementierung bündelt das Lesen lokaler Git-Sources und den
Lifecycle verwalteter Remote-Checkouts teilweise in `git-source.ts`. Das
Besitzmodell spricht für eine interne Trennung, ohne neue Workspace-Pakete oder
öffentliche Export-Subpfade einzuführen. Alle Source-Verträge und
Implementierungen bleiben gemäß Package-Grenze in `@dokkurator/loader` und
werden weiterhin nur über dessen öffentliche Root-API exportiert.

Eine mögliche interne Struktur ist:

```text
source-adapter/
  filesystem/
    file-system-source.ts
  git/
    git-source.ts
    git-working-tree.ts
  remote-git/
    managed-checkout.ts
    checkout-metadata.ts
    remote-url.ts
  source-adapter.ts
  source-diff.ts
```

Dabei besitzt `git/` ausschließlich das Lesen und Beschreiben eines vorhandenen
Working Trees. `remote-git/` besitzt Clone, Validierung, Fetch, Fast-forward,
Force-Push-Diagnose und Reparatur. `filesystem/` besitzt das Lesen
nicht-Git-basierter lokaler Verzeichnisse. Gemeinsam benötigte Verträge bleiben
auf der Ebene `source-adapter/`; eine Remote-Implementierung darf nicht über
einen neuen Package-Export an Core gekoppelt werden.

Die konkrete Verzeichnisverschiebung ist kein Selbstzweck. Vor der Umsetzung
wird geprüft, welche Dateien tatsächlich eine eigenständige Verantwortung
haben. Kleine Hilfen können im jeweiligen Modul bleiben. Entscheidend sind
getrennte Zuständigkeiten und testbare Operationen, nicht möglichst viele
Dateien.

## Testmatrix

Die Implementierung benötigt mindestens folgende fokussierte Loader-Tests:

### Öffnen

- Fehlender verwalteter Checkout und fehlende lokale Source.
- Lokales Nicht-Git-Verzeichnis wird als Filesystem-Source geöffnet.
- Lokales Git-Repository wird unabhängig von Remote, Branch, detached HEAD,
  lokalen Commits und Dirty-Zustand ohne Mutation geöffnet.
- Repository genau am Pfad gegenüber Unterverzeichnis eines anderen Repos.
- Bare Repository und Datei am Checkout-Pfad.
- Passendes, fehlendes und abweichendes `origin`.
- Explizit passender/falscher Branch sowie detached HEAD.
- Dirty Working Tree bleibt lesbar und wird durch `open` nicht verändert.

### Vorbereiten

- Clone in fehlenden Pfad und in leeres vorhandenes Verzeichnis.
- Abbruch bei nicht leerem Nicht-Git-Verzeichnis ohne Inhaltsänderung.
- Clone mit explizitem Branch und mit Remote-Default-Branch.
- Der beim Clone ermittelte Default-Branch bleibt bei späteren Syncs bindend,
  auch wenn sich der Remote-Default oder der lokal ausgecheckte Branch ändert.
- Fehlender Remote-Branch sowie Authentifizierungs-/Netzwerkfehler.
- Erneutes `prepare` eines passenden Checkouts ohne Fetch oder HEAD-Änderung.
- Vorhandener falscher Checkout wird weder umkonfiguriert noch ersetzt.
- Fehlgeschlagener Clone schützt vorher vorhandene Pfade und räumt nur den
  eigenen unvollständigen Zielpfad auf.

### Aktualisieren

- Identischer Stand ergibt `unchanged`.
- Rückständiger sauberer Branch wird ausschließlich fast-forwarded.
- Änderungen in Index, Working Tree und untracked Dateien blockieren; nur
  ignorierte Dateien blockieren nicht.
- Lokale Commits und divergierte Historie liefern verschiedene Fehlergründe.
- Eine zwischen zwei Fetches umgeschriebene Remote-Historie ergibt
  `remote-history-rewritten`; ein bereits vorher lokal abweichender HEAD wird
  nicht fälschlich als Force-Push diagnostiziert.
- Falscher Branch, detached HEAD und fehlender Remote-Branch.
- Pull-Konfiguration für Merge/Rebase beeinflusst das Ergebnis nicht.
- Fehler nach Fetch verändert HEAD und Working Tree nicht.
- URL-Fehler enthalten keine Credentials.

### Reparatur

- Reparatur ist ausschließlich für den exakten verwalteten Pfad unter
  `checkouts.directory/<source-id>` möglich.
- Lokale Sources und Pfade außerhalb des Checkout-Verzeichnisses werden nie
  gelöscht oder ersetzt.
- Dirty-Zustand und lokale Commits werden nur nach explizitem Repair-Auftrag
  verworfen.
- Ein vollständig validierter temporärer Clone ersetzt den alten Checkout.
- Fehlgeschlagener Clone oder fehlgeschlagene Validierung lässt den bisherigen
  Checkout unverändert und entfernt nur den eigenen temporären Pfad.
- Nach erfolgreicher Reparatur sind origin, Branch, HEAD und gespeicherte
  Checkout-Metadaten konsistent.

### Integration mit Core

- `open` und lesende Use-Cases erzeugen keine Git-Netzwerk- oder
  Checkout-Seiteneffekte.
- `prepare` klont nur fehlende verwaltete Checkouts und aktualisiert bestehende
  nicht.
- `sync` aktualisiert vorhandene Checkouts und klont fehlende nicht.
- `sync` einer lokalen Source führt keine Git-Netzwerk- oder
  Working-Tree-Mutation aus und indexiert den sichtbaren Dateistand.
- Reparatur erfordert ein explizites Opt-in und wird als `recreated`
  ausgewiesen.
- Ein Source-Fehler verhindert nicht die Verarbeitung weiterer Sources; Reason
  und Handlungsempfehlung bleiben im strukturierten Ergebnis erhalten.

## Nutzer-Dokumentation

Die Umsetzung ist erst vollständig, wenn die öffentliche Dokumentation das
Besitzmodell erklärt. Mindestens `docs/configuration.md`, die Loader-Dokumentation
und die CLI-Dokumentation beziehungsweise Command-Hilfe müssen konsistent
aktualisiert werden.

Die Nutzer-Dokumentation muss mindestens beantworten:

- Wann ein Nutzer nur `path` und wann er `remote` konfiguriert.
- Dass lokales Dateisystem und lokales Git dieselbe Konfigurationsart sind.
- Dass Dokkurator ein lokales Git-Repository niemals aktualisiert oder dessen
  Branch beziehungsweise Working Tree verändert.
- Dass ein Remote-Checkout ausschließlich unter
  `checkouts.directory/<source-id>` liegt, von Dokkurator verwaltet wird und
  kein Entwicklungsverzeichnis ist.
- Dass verwaltete Checkouts als Cache gelöscht und durch `prepare` neu erzeugt
  werden können.
- Welche Operationen `open`, `prepare`, `sync` und Reparatur ausführen.
- Warum Dirty-Zustand, lokale Commits, Branch-Abweichungen und Force-Pushes bei
  einem verwalteten Checkout abbrechen.
- Dass Reparatur den bisherigen verwalteten Checkout samt manuellen Änderungen
  ersetzt und deshalb ausdrücklich bestätigt beziehungsweise angefordert
  werden muss.
- Wie Credentials bereitgestellt werden und dass sie weder in der
  Konfiguration noch in Fehlerausgaben erscheinen dürfen.

Ein kurzes Konfigurationsbeispiel soll den Normalfall sichtbar machen:

```yaml
sources:
  - id: local-docs
    path: ../my-project

  - id: external-docs
    remote:
      url: https://example.com/docs.git
      branch: main
```

Der erste Eintrag kann ein normales Verzeichnis oder ein Entwickler-Checkout
sein und bleibt vollständig unter Nutzerkontrolle. Der zweite Eintrag wird in
`checkouts.directory/external-docs` von Dokkurator verwaltet.

## Offene Detailentscheidungen vor der Umsetzung

- Ob der Loader fehlgeschlagene Clone-Verzeichnisse selbst atomar über ein
  temporäres Geschwisterverzeichnis verhindert oder kontrolliert bereinigt.
- Ob Updates gegen konkurrierende Prozesse durch ein Dokkurator-Lock geschützt
  werden müssen.
- Welche URL-Normalisierungen über die oben garantierte Mindestmenge hinaus
  unterstützt werden.
- Wo und in welchem Format der beim Clone gewählte Default-Branch und die letzte
  erfolgreich synchronisierte Revision atomar gespeichert werden.
- Ob ein verwalteter Branch zusätzlich einen passenden Git-Upstream
  konfiguriert haben muss oder der festgehaltene Branch zusammen mit
  `origin/<branch>` hinreichend ist. Die Update-Quelle bleibt in beiden Fällen
  explizit.
- Ob Reparatur als eigene Core-/CLI-Operation oder als explizite Option von
  `prepare` angeboten wird und wie die CLI-Bestätigung gestaltet ist.

## Arbeitsplan

### 1. Öffentliche Semantik und Typen festziehen

- Das Besitzmodell in Loader-Typen abbilden, ohne eine zweite
  Konfigurationsquelle einzuführen.
- Strukturierte Ergebnisse für Öffnen, Prepare, Sync und Reparatur definieren.
- Stabile Loader-Fehler einschließlich sicherer Ursachen und Reason-Codes
  festlegen.
- Persistenzort und Format für Branch- und letzte Sync-Metadaten entscheiden.

### 2. Loader intern nach Verantwortungen trennen

- Filesystem-Lesen, lokales Git-Lesen und Managed-Checkout-Lifecycle gemäß der
  vorgeschlagenen internen Struktur entkoppeln.
- Bestehende öffentliche Loader-Root-Exports kompatibel halten oder bewusst in
  einem dokumentierten API-Schritt migrieren.
- Workspace-Abhängigkeiten und Package-Grenzen unverändert respektieren;
  insbesondere keine internen Loader-Pfade aus Core importieren.

### 3. Lokale Sources korrigieren und absichern

- Filesystem- und Git-Erkennung ausschließlich lokal und ohne Mutation halten.
- Working-Tree-Semantik zwischen `list`, `read`, `diff` und Indexierung
  vereinheitlichen, einschließlich uncommitted und untracked Dateien.
- Lokale Sources in `prepare` und `sync` niemals durch Git-Befehle verändern.

### 4. Managed-Checkout-Lifecycle implementieren

- Zielpfad, origin, Branch und Checkout-Metadaten validieren.
- Clone mit explizitem Branch oder einmalig ermitteltem Remote-Default-Branch
  implementieren.
- Fetch plus expliziten Fast-forward ohne `git pull` implementieren.
- Dirty-Zustand, lokale Commits, Divergenz und umgeschriebene Remote-Historie
  getrennt klassifizieren.

### 5. Abgesicherte Reparatur implementieren

- Reparatur auf den exakten verwalteten Checkout-Pfad begrenzen.
- Temporären Clone vollständig prüfen und den bisherigen Checkout erst danach
  ersetzen.
- Fehlerfälle ohne Verlust des bisherigen Checkouts behandeln.
- Explizite Core-/CLI-Auslösung und Warnung vor Datenverlust ergänzen.

### 6. Core und CLI integrieren

- Core nur über die öffentliche Loader-Root-API anbinden.
- Pro-Source-Ergebnisse und Fehler unverändert strukturiert weiterreichen.
- CLI-Ausgabe und Handlungsempfehlungen ergänzen, ohne Git-Entscheidungslogik
  oder automatische Reparatur in die CLI zu verschieben.

### 7. Tests und Dokumentation abschließen

- Die vollständige Testmatrix dieses Dokuments auf Loader- und Core-Ebene
  umsetzen.
- Focused Tests, Typechecks und Builds der betroffenen Pakete ausführen.
- Nach verschobenen Implementierungen und veralteten Importen suchen.
- Nutzer-Dokumentation und CLI-Hilfe gemäß dem Abschnitt oben aktualisieren.

## Akzeptanzkriterien

| ID | Kriterium |
| --- | --- |
| AK-01 | Eine Source ohne `remote` wird als nutzerverwaltete lokale Source behandelt; Git-Erkennung verändert weder Repository noch Working Tree. |
| AK-02 | `sync` indexiert bei lokalen Filesystem- und Git-Sources den sichtbaren Dateistand, ohne Fetch, Pull, Checkout oder andere Git-Mutationen auszuführen. |
| AK-03 | Eine Source mit `remote` liegt ausschließlich unter dem aufgelösten `checkouts.directory/<source-id>` und wird als Dokkurator-verwalteter Cache behandelt. |
| AK-04 | `open` führt weder Netzwerkzugriffe noch Clone- oder Update-Aktionen aus und meldet Identitätsfehler differenziert. |
| AK-05 | `prepare` klont nur einen fehlenden verwalteten Checkout; ein bestehender passender Checkout wird nicht gefetcht oder verändert. |
| AK-06 | Ein Clone ohne konfigurierten Branch verwendet den damaligen Remote-Default-Branch und hält diese Auswahl für spätere Syncs fest. |
| AK-07 | `sync` verwendet Fetch plus expliziten Fast-forward und wird nicht durch Git-Pull-, Merge- oder Rebase-Konfiguration beeinflusst. |
| AK-08 | Dirty-Zustand, lokaler Vorsprung, Divergenz und nachweislich umgeschriebene Remote-Historie liefern unterschiedliche stabile Reason-Codes. |
| AK-09 | Ein Force-Push wird durch Vergleich des bekannten alten Remote-/Sync-Stands mit dem Stand nach Fetch erkannt; nicht eindeutige Fälle werden nicht fälschlich als Force-Push bezeichnet. |
| AK-10 | Normales `prepare` und `sync` löschen, resetten, stashen oder überschreiben keinen vorhandenen Checkout. |
| AK-11 | Reparatur ist nur nach explizitem Opt-in und nur für den exakt zugeordneten verwalteten Checkout möglich; lokale Sources sind ausgeschlossen. |
| AK-12 | Eine fehlgeschlagene Reparatur erhält den bisherigen Checkout; eine erfolgreiche Reparatur liefert `recreated` und einen vollständig validierten neuen Checkout. |
| AK-13 | Andere Prozesse dürfen verwaltete Checkouts lesen; parallele Dokkurator-Schreiboperationen werden mindestens innerhalb einer Instanz verhindert. |
| AK-14 | Git-spezifische Entscheidungen und Implementierungen verbleiben in `@dokkurator/loader`; Core und CLI importieren ausschließlich dessen öffentliche Root-API. |
| AK-15 | Fehlerausgaben enthalten keine Credentials oder Tokens und bieten pro Reason eine verständliche Handlungsempfehlung. |
| AK-16 | Die fokussierten Loader-/Core-Tests, Typechecks und Builds bestehen, und es existieren keine veralteten internen Imports nach dem Refactoring. |
| AK-17 | Konfigurations-, Loader- und CLI-Dokumentation erklären die drei Nutzerfälle, das Besitzmodell, den Cache-Charakter sowie die destruktive Wirkung einer Reparatur konsistent. |

## Erwartetes Ergebnis der späteren Umsetzung

- Öffentliche Loader-Operationen ohne versteckte Clone-/Update-Seiteneffekte.
- Ein deterministischer, zerstörungsfreier Vertrag, den Core für `prepare()`
  und `sync()` verwenden kann.
- Keine Git-spezifische Entscheidungslogik in Core oder CLI.
- Maschinenlesbare Fehler und Ergebnisse statt Interpretation von
  Git-Fehlermeldungen durch Aufrufer.
