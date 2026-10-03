# Dokkurator Core

Core orchestriert Projekte und Sources über die öffentlichen APIs von Config,
Loader, Validator und Knowledge. Fachregeln und Adapter bleiben in diesen Paketen.
Die Use-Cases werden bei ihrem Aufruf asynchron geladen und liegen unter
`document-use-cases`, `validation-use-cases` und `index-use-cases`.

## Lokale Dokumente prüfen

```js
import { createDokkurator } from "@dokkurator/core";

const app = createDokkurator({ root: process.cwd() });
await app.open();
try {
  const result = await app.validate();
  console.log(result);
} finally {
  await app.close();
}
```

Ohne konfigurierte Sources wird das Projektverzeichnis als Source `root` verwendet.
Die Defaults suchen Markdown rekursiv und DocTypes unter `_dokkurator/.doctypes`.
Ein Projektpfad, eine DocType-Definition und ein Dokument reichen für den Einstieg.
Das [minimale Beispiel](../../examples/validator/README.md) zeigt diesen Ablauf.

`validate({ sourceId: "docs" })` beschränkt die Prüfung auf eine Source.
Core lädt deren Konfiguration, DocTypes und Originaltexte, bereitet die Schemas
und recommended-Regeln vor und führt für jedes Dokument `lint` aus. Laden und
Vorbereitung sind asynchron; jede einzelne Regelausführung bleibt synchron.

Das Ergebnis enthält `results` und `errors`. Unter `results` steht pro Source
`{ sourceId, documents }`. Jedes Dokument enthält `path`, `status`, `diagnostics`
und `suppressedDiagnostics`. Warnungen allein ergeben `passed`. Fehlende Quellen,
ungültige Konfiguration oder Regelabstürze stehen separat in `errors` mit Phase
und Handlungsempfehlung. Eine fehlgeschlagene Source verhindert nicht die Prüfung
weiterer Sources. Ungültiges Dokument-YAML wird als Parse-Finding gemeldet.
Fehler beim Laden der Projektkonfiguration selbst lassen bereits `open()`
fehlschlagen; sie werden nicht einer einzelnen Source zugeschrieben.

Projektkonfiguration wird bei `open()` aufgelöst; Source-Konfiguration und
Dokumente werden bei jeder Validierung erneut geladen. Nach Änderungen an der
Projektkonfiguration wird die App geschlossen und erneut geöffnet.

## Eigene Regeln und Schemas

Die optionale `dokkurator.config.mjs` verwendet die vorhandene Config-Auflösung:

```js
import company from "./company-plugin.mjs";
import common from "./common.schema.json" with { type: "json" };

export default {
  documents: { directory: "docs" },
  validator: {
    schemas: { [common.$id]: common },
    plugins: { company },
    rules: { "company/check": "warn" },
  },
};
```

Projekt- und Repository-Regeln sowie vorab geladene Schemas werden zusammengeführt;
Repository-Werte überschreiben gleichnamige Projektwerte. Unterschiedliche Plugins
unter demselben Namespace werden als Konfigurationskonflikt abgelehnt. Core kennt
keine konkreten Rule-IDs. Nicht auflösbare Schema-Referenzen scheitern bei der
Vorbereitung; während der Regelausführung werden keine Ressourcen nachgeladen.

## Lifecycle und Index

`createDokkurator({ root })` erzeugt eine geschlossene App. `open()` entdeckt die
Projektkonfiguration und meldet Source-Readiness. Es gibt keinen Index-Schalter:

| Methode                                             | Knowledge-Index                                      |
| --------------------------------------------------- | ---------------------------------------------------- |
| `open`, `validate`, `listDocTypes`, `listDocuments` | wird nicht benötigt oder geöffnet                    |
| `prepare`, `sync`, `diff`, `search`                 | wird beim ersten Aufruf geöffnet und wiederverwendet |

Alle fachlichen Methoden benötigen eine geöffnete App. Wiederholtes `open()` und
`close()` bleibt unschädlich. `close()` wartet auf bereits gestartete Operationen
und schließt den eventuell geöffneten Index. Eine spätere Öffnung lädt die
Projektkonfiguration neu und erzeugt den Index wieder erst bei Bedarf.

Validierung und Inspektion klonen oder aktualisieren keine Sources. Fehlende
Checkouts müssen über den bestehenden Preparation-Use-Case vorbereitet werden.
Core startet keine Watcher und bestimmt keine Textausgabe oder Prozess-Exit-Codes.
