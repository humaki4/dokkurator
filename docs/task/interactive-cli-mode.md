---
doctype: task
title: Interactive CLI mode
status: open
---

# Interactive CLI mode

Status: subsequent product and architecture task

Dependency: stable [Core lifecycle](../../packages/core/docs/specs/project-lifecycle.md)

## Goal

Design an optional interactive Dokkurator mode that reuses an open Core app
across multiple user inputs.

## Questions to resolve

- Startup syntax and distinction from existing one-shot commands.
- Preserving scriptability and backward compatibility.
- Prompt, history, help, autocompletion and exit.
- Parsing and reusing existing Commander commands.
- Behavior of `open()`, `close()` and reopening.
- Cancellation of running operations and `SIGINT`/`SIGTERM` semantics.
- Display of collected source errors and exit status in interactive mode.
- Handling changes to project or repository configuration.
- Tests for multiple consecutive commands and cleanup.

## Expected outcome

- A decision on whether and how to offer an interactive mode.
- A host design without interactive responsibilities in `@dokkurator/core`.
- The non-interactive CLI remains usable for scripts.
