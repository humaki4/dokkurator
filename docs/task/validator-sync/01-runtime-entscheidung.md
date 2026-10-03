# Entscheidung: synchrone lokale Validator-Runtime

Status: für Aufgabe 01 angenommen, 2026-10-03. Die nachstehenden Typen sind
Verträge für Aufgaben 04/05, noch keine exportierte API. Die Kontextphase und
die übrigen offenen Entscheidungen der Spezifikation bleiben außerhalb des Umfangs.

## Runtime und geprüfte Versionen

Lokales Linting verwendet `new Linter({ configType: "flat" }).verify(text,
flatConfig, { filename })`. Die vollständig explizite Konfiguration registriert
Plugin-Objekte, `language: "markdown/gfm"`, Dateimuster und ausgewählte Regeln.
Es gibt keine automatische Konfigurationssuche, dynamischen Plugin-Importe oder
Codeblock-Prozessoren. ESLint übernimmt Regelaufrufe und AST-Traversierung;
`verifyAndFix` wird nicht verwendet.

Nachgewiesen ist **ESLint 10.10.0 + @eslint/markdown 8.0.3 auf Node.js 22.23.1**.
Diese Kombination ist im Validator-Manifest exakt festgelegt und im Lockfile
aufgelöst. Weitere Versionen sind nicht durch diesen Versuch freigegeben.
Beide Pakete deklarieren Node.js `^20.19.0 || ^22.13.0 || >=24`; das Repository
beschränkt zusätzlich auf `>=22.13.0 <23 || >=24.0.0`. Andere zulässige Node-Versionen
wurden hier nicht getestet.

`eslint` und `@eslint/markdown` sind direkte Runtime-Abhängigkeiten von Validator,
auch wenn ESLint bereits als Entwicklungswerkzeug im Root vorhanden ist.
Nach der Umsetzung von Aufgabe 04 ist eine eigene dünne Ajv-/yaml-Integration
festgelegt; Aufgabe 03 wurde auf Wunsch übersprungen. Ajv, ajv-formats und yaml
sind direkte Validator-Runtime-Abhängigkeiten; Loader-Abhängigkeiten werden nicht
intern konsumiert.

Der reproduzierbare Versuch liegt in
[eslint-runtime.test.ts](../../../packages/validator/test/eslint-runtime.test.ts).
`# Title\n\n# Title\n` liefert unmittelbar ein Array mit
`markdown/no-duplicate-headings`, `duplicateHeading`, Schwere 2 und Position
3:1–3:8. Weitere Fälle belegen Warning/Off, Markdown-Suppressionen, getrennte
Aufrufe, unbekannte Regeln, ungültige Optionen, Regelabsturz und fehlendes
Dateimuster. Die bestehende Code-Lint-Konfiguration wird dabei nicht geladen.

## Eingabe und Vorbereitung

Die künftige Root-API erhält eine synchrone Operation:

```ts
// Zielvertrag; PreparedLintConfiguration wird in Aufgabe 04 konkretisiert.
interface LintInput {
  readonly originalText: string;
  readonly source: {
    readonly sourceId: string;
    readonly path: string;
    readonly revision?: string;
  };
  readonly configuration: PreparedLintConfiguration;
}

function lint(input: LintInput): LintResult;
```

`originalText` ist der vollständig geladene, unveränderte Originaltext inklusive
Frontmatter, BOM und Zeilenenden, nicht `ParsedDocument.content`. Aufgabe 02
stellt den Loader-Vertrag dafür bereit. `sourceId` und der quellrelative `path`
identifizieren das Dokument; `revision` erhält bei Bedarf die geladene Revision.
Identität wird in jeder Diagnose erhalten und niemals allein aus dem ESLint-
Dateinamen abgeleitet.

Der ESLint-Dateiname ist ein logischer, relativer POSIX-Pfad für Config-Matching,
kein Dateisystemzugriff und keine URL. Die Vorbereitung legt eine eindeutige
Zuordnung von Quellpfad zu passendem Markdown-Dateinamen fest; absolute Pfade,
URLs, andere Erweiterungen und ausgeschlossene Pfade dürfen nicht unbemerkt zu
einem scheinbar erfolgreichen Lauf ohne Regeln führen.

`PreparedLintConfiguration` enthält die aufgelöste DocType-Auswahl bzw. Registry
von `ParsedDocType` aus `@dokkurator/loader`, vollständig registrierte Plugins,
eine explizite Flat Config und gegebenenfalls vorbereitete synchrone
Schema-Validatoren. Keine Dateipfade oder URLs, die zur Laufzeit noch geladen
werden müssen, keine Promises und keine asynchronen Schema-Validatoren.
Die genaue Repräsentation und DocType-Auswahl folgen in Aufgabe 04.

Anwendungen laden Dokumente, DocTypes, Plugins und Schema-Abhängigkeiten vorab;
diese Vorbereitung darf asynchron sein. Schema-Referenzen werden dort aufgelöst
und kompiliert. Regeln und lokale Runtime führen keine Datei-, Netzwerk-,
SourceAdapter- oder Knowledge-Abfragen aus. Nur dafür geeignete lokale Plugins
werden unterstützt; `Linter` ist keine Sandbox für beliebigen Plugin-Code.
ESLint parst den Originaltext zunächst erneut. Eine AST-Übergabe oder eigene
lokale Rule-Runtime ist nicht vorgesehen.

## Ergebnisse und Fehler

```ts
interface LintResult {
  readonly status: "passed" | "failed";
  readonly diagnostics: readonly LintDiagnostic[];
  readonly suppressedDiagnostics: readonly LintDiagnostic[];
}

interface LintDiagnostic {
  readonly phase: "parse" | "lint";
  readonly sourceId: string;
  readonly path: string;
  readonly revision?: string;
  readonly ruleId: string | null;
  readonly messageId?: string;
  readonly severity: "warning" | "error";
  readonly message: string;
  readonly location?: {
    readonly line: number;
    readonly column: number;
    readonly endLine?: number;
    readonly endColumn?: number;
  };
}
```

Positionen sind 1-basiert und beziehen sich auf den Originaltext; Endpositionen
werden unverändert aus ESLint übernommen. Suggestions und Suppressionsgründe
werden in Aufgabe 05 strukturiert ergänzt, wenn benötigt. Keine Fixes werden
angewendet. Unterdrückte Meldungen beeinflussen den Status nicht. Mindestens
eine nicht unterdrückte Error-Diagnose ergibt `failed`; ausschließlich Warnings
oder keine Findings ergeben `passed`. Warning-Grenzwerte sind Anwendungspolitik.
`off` deaktiviert eine Regel und erzeugt keine Info-Diagnose. Lokales Linting
hat keinen unvollständigen Kontextstatus und behauptet keine Kontextprüfung.

| Fall                                                                              | Vertrag                                                     |
| --------------------------------------------------------------------------------- | ----------------------------------------------------------- |
| Dokument verletzt eine Regel                                                      | Diagnose mit Phase `lint`, kein Throw                       |
| Parser meldet ungültigen Dokumenttext                                             | Diagnose mit Phase `parse`, `ruleId: null`, Status `failed` |
| Unbekannte Regel, ungültige Optionen, ungültige Sprache oder Schema-Konfiguration | synchroner `LintConfigurationError`, kein `LintResult`      |
| Keine passende Config oder Dokument ausgeschlossen                                | `LintConfigurationError`, kein erfolgreicher Leerlauf       |
| Regel/Plugin wirft oder unerwarteter interner Fehler                              | synchroner `LintRuntimeError`, kein `LintResult`            |
| Laden einer Quelle oder Schema-Abhängigkeit scheitert                             | Fehler der Vorbereitung außerhalb von `lint`                |

Die operationalen Fehler erhalten `cause` sowie verfügbare Quellenidentität.
ESLint wirft bereits für unbekannte Regeln und ungültige Optionen; Regelabstürze
werfen ebenfalls. Die künftige Fassade muss Konfiguration vor der Ausführung
validieren, statt Exceptions anhand ihres Meldungstextes zu klassifizieren.
`fatal` allein unterscheidet keinen Konfigurationsfehler von einem Parse-Finding.
Insbesondere liefert `verify` bei nicht passender Flat Config eine regel-lose
Warning: Diese wird als Konfigurationsfehler behandelt, nicht als Dokumentproblem.
Unvollständig ausgeführte Regeln dürfen nach einem Absturz kein normales Ergebnis
liefern. Wiederholte Aufrufe dürfen keinen Suppressions- oder Dokumentzustand teilen.

## Migration

`validateDocument(docType, document): ValidationResult` bleibt unverändert
exportiert, einschließlich `valid` und `missingFields`. Bestehende Aufrufer und
Tests bleiben gültig. Die neue `lint`-Operation wird in Aufgabe 05 zusätzlich
exportiert; `ValidationResult` wird nicht für das neue Ergebnis umdefiniert.
Die bisherige Pflichtfeldprüfung wird weder automatisch auf ESLint umgeleitet
noch als vollständige Schema-Validierung ausgegeben. Eine spätere Entfernung
braucht eine eigene Migration mit aktualisierten Aufrufern.

## Quellen

- [ESLint Node.js API: Linter](https://eslint.org/docs/latest/integrate/nodejs-api#linter)
- [ESLint Flat-Config-Migration](https://eslint.org/docs/latest/use/migrate-to-9.0.0#linter-now-expects-flat-config-format)
- [Offizielles Markdown-Plugin](https://github.com/eslint/markdown)

Entscheidend für die Versionsfreigabe sind die installierten veröffentlichten
Pakete und die lokalen Tests, nicht der Stand des Upstream-Hauptbranches.
