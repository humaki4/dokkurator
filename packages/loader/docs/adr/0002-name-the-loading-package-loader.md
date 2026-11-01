---
doctype: decision
title: Name the loading package Loader
status: accepted
component: loader
---

# Name the loading package Loader

## Context

The former `@dokkurator/doctype` package loads documents and DocType definitions
and owns source adapters. Its name confused the domain concept DocType with the
broader technical responsibility of loading sources.

## Decision

Name the package `@dokkurator/loader`. Preserve DocType domain terminology and
existing loading symbols. Expose supported integrations only through the package
root. Source contracts, filesystem/Git implementations and normalized source
metadata belong to Loader; index adapters belong to Knowledge.

Loader is a library without its former demo CLI. User-facing workflows belong
to the central CLI through Core. Do not introduce export subpaths or new packages
merely to organize adapter implementations.

## Consequences

Consumers import `@dokkurator/loader`; a DocType remains a document model, not a
package. Loader has no CLI-only dependency on Commander or Config. The rename
changes the module name, not the meaning of public DocType symbols.
