---
doctype: concept
title: Scope
status: draft
audience: [contributors, users]
tags: [product]
---

# Scope

Dokkurator focuses on adding structure, validation, and discoverability to documentation stored in open formats.

## In Scope

Initially, Dokkurator focuses on:

- Markdown documents,
- YAML Frontmatter for structured metadata,
- configurable document types,
- templates and validation rules,
- identifiers and references between documents,
- validation through libraries and CLI tools,
- indexing and querying distributed documentation,
- local repositories and file systems,
- a reference application for centralized access to distributed documentation.

The architecture should allow later integration with Git hosting platforms, editors, CI pipelines, and AI agents.

## Out of Scope

Dokkurator is not intended to provide:

- a proprietary document format,
- its own Markdown editor,
- plugins for existing Markdown editors
- Git hosting,
- a full document management system,
- a replacement for existing Markdown tools,
- a generic enterprise knowledge management platform.

The initial scope prioritizes reusable foundations over a feature-complete end-user platform.
