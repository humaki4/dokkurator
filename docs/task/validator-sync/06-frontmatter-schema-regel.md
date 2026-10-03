# 06 — Metadatenprüfung in die ESLint-Runtime integrieren

Status: vorgeschlagen, nicht begonnen.

Abhängigkeiten: 05.

## Outcome

Frontmatter wird durch die in Task 03 gewählte Integration gegen das DocType-Schema geprüft; Dokkurator implementiert keine eigenen Schema-Keywords.

## Schritte

- Die gewählte Plugin-Regel integrieren oder eine dünne ESLint-Regel um Ajv und yaml umsetzen.
- Frontmatter-Werte und Schema-Auswahl mit dem Loader-Vertrag abgleichen.
- Pflichtfelder, Typen, enum, pattern, Grenzwerte und Bedingungen durch Ajv prüfen lassen.
- YAML-Syntaxfehler und doppelte Schlüssel gemäß vereinbarter Parse-Fehlerpolitik berichten.
- Verschachtelte Schemafehler auf Felder abbilden; fehlende Felder sinnvoll am Elternobjekt oder Frontmatter verorten.
- Wiederverwendung vorkompilierter Schemas erlauben, ohne mutable Dokumentzustände zwischen Aufrufen zu teilen.
- Gleiche Metadatenprüfung für direkte ESLint-Nutzung und die Fassade ermöglichen.

## Abnahmekriterien

- Die Evaluationsfälle aus Task 03 sind für die endgültige Integration geprüft.
- Fehlende, skalare und ungültige Metadaten erzeugen klare Diagnosen.
- Bedingte Pflichtfelder und verschachtelte Fehler sind korrekt lokalisiert.
- Die Ausführung bleibt synchron und benötigt nur vorbereitete Daten.

## Umfangsgrenze

Keine eigene required/type/enum-Regelfamilie; keine automatische Schema-Netzwerkabfrage.

## Grundlage

[Task-Übersicht](./README.md) · [Validator-Spezifikation 2](../../../packages/validator/spec/Validator%20Specification%202%20-%20ESLint%20and%20Context%20Validation.md)
