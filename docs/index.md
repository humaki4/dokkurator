---
doctype: index
title: Dokkurator documentation
status: draft
section: docs
---

# Dokkurator documentation

Start with the [project README](../README.md) for the use case and current
implementation status. The documentation distinguishes implemented capabilities
from intended architecture; architecture documents remain drafts.

## Getting started

- [Runnable Validator example](../examples/validator/README.md): validate one document, then explore schemas and custom rules.
- [Project configuration](./configuration.md): sources, paths, JavaScript configuration, and defaults.
- [CLI reference](../apps/cli/docs/commands.md): currently available commands.

## Concepts and architecture

- [Vision](./concept/vision.md), [problem](./concept/problem-statement.md), and [scope](./concept/scope.md).
- [Core concepts](./concept/coreconcepts.md) and [glossary](./concept/glossary.md).
- [Architecture overview](./architecture/overview.md): package responsibilities and implemented versus planned flows.
- [Core API](../packages/core/README.md): project workflows and validation.

## Decisions and development

- [Project decisions](./adr/), [Loader decisions](../packages/loader/docs/adr/), and [Validator decisions](../packages/validator/docs/adrs/).
- [Development tasks](./task/): implementation plans; an open task does not imply the feature is available.
- [Research](./research/): exploratory notes, not API contracts or product promises.
- [Validator proposals](../packages/validator/docs/proposals/): designs under discussion; current usage is documented in the [Validator README](../packages/validator/README.md).
