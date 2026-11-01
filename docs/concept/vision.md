---
doctype: concept
title: Vision
status: draft
audience: [contributors, users]
tags: [product]
---

# Vision

Documentation is often distributed across repositories, inconsistently structured, and difficult to search, validate, or reuse.

Dokkurator builds on existing open formats and workflows instead of replacing them. Markdown remains the document format, Git remains the source of truth, and YAML Frontmatter is used as an established mechanism for structured metadata.

The goal is to make distributed documentation easier to find, validate, connect, and process by both humans and software systems.

## Core Idea

> Bring structure to documentation without taking ownership of the documentation

The source documents remain independent of Dokkurator.

## Principles

- Documentation stays in its original repositories.
- Markdown and YAML Frontmatter remain usable without Dokkurator.
- Existing editors and Git workflows continue to work.
- Structure is added through document types, metadata, rules, identifiers, and references.
- Core capabilities should be usable independently as libraries and CLI tools.
- Central applications may aggregate documentation without becoming its owner.

## Structured Documentation

Dokkurator therefore introduces optional structure through concepts such as:

- document types,
- metadata,
- document templates,
- validation rules

The amount of structure should remain adaptable to the needs of a project or organization.

## Open and Extensible

Teams can define their own DocTypes and add domain-specific ESLint rules.
The current implementation supports local document checks; cross-document
relationships and contextual checks are planned extensions.
