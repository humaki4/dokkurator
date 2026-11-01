---
doctype: decision
title: Use JavaScript project configuration
status: accepted
component: configuration
---

# Use JavaScript project configuration

## Context

ESLint plugins and rules are JavaScript objects. Project and source configuration
must supply these resources before synchronous validation, while existing YAML
projects remain usable.

## Decision

Use `dokkurator.config.mjs` with an object default export for project and source
repository configuration. It takes precedence over legacy `.dokkurator/config.yaml`;
files are not implicitly merged. DocType definitions remain declarative YAML.

Config owns discovery, validation, defaults and project/source resolution. Core
consumes its resolved model. Project-only settings remain with the owning project;
source repositories may configure documents, DocTypes and Validator settings.
Project plugins/rules form the base; source rules replace complete entries by ID.
Conflicting plugin objects under the same namespace are errors.

Load modules, plugins and external schemas before local rule execution. JavaScript
configuration is trusted executable code, not a sandboxed repository policy format.
No mandatory organization-policy layer is established by this decision.

For JavaScript projects, source administration writes `.dokkurator/sources.yaml`
rather than serializing executable configuration. When present, that array replaces
the module's source declarations. Legacy YAML source administration retains its
existing file behavior.

## Alternatives

YAML-only configuration cannot directly hold imported ESLint plugin objects.
Implicitly merging both formats would obscure which file controls a setting.

## Consequences

Projects can use ordinary module imports and ESLint conventions. Applications
must trust executed configuration. Config discovery and resource preparation stay
outside synchronous linting. See the [Config reference](../../README.md).
