---
doctype: decision
title: Coordinate project workflows in Core
status: accepted
component: core
---

# Coordinate project workflows in Core

## Context

Multi-source workflows originally lived in the CLI. Embedded applications need
the same project configuration, preparation, indexing and validation without
Commander, terminal prompts or duplicated orchestration.

## Decision

`@dokkurator/core` owns application lifecycle and project workflows. It consumes
Config, Loader, Validator and Knowledge exclusively through their public roots.
Loader owns source adapters and parsing; Knowledge owns diff/index workflows and
index adapters; Validator owns local checks; Config owns discovery and resolution.

The CLI delegates workflows to Core and owns arguments, prompts, output, exit
codes and watcher lifetime. Source administration remains a host concern.
Libraries remain independently usable; Core is not a complete re-export layer.

Creation performs no I/O. Opening resolves project configuration and source
readiness without cloning, updating or opening the index. Explicit `prepare`
creates missing remote checkouts and initializes unindexed sources; `sync`
updates existing sources and delegates incremental indexing to Knowledge.

Validation and inspection require no Knowledge index. Core loads document text,
DocTypes and configuration, then delegates each document to synchronous Validator
linting. Validation findings do not gate indexing. Source failures remain separate
from document findings and do not prevent processing other sources.

## Alternatives

Keeping orchestration in CLI would duplicate it in embedded hosts. Moving it into
Loader or Knowledge would mix project lifecycle with source or storage logic.

## Consequences

Hosts share one application API while retaining control of interaction and
scheduling. Index resources are opened lazily and closed by Core. Git-specific
policy stays in Loader; future checkout hardening is a separate open task.

See the [lifecycle specification](../specs/project-lifecycle.md) and
[Core usage](../../README.md).
