---
title: Glossary
status: concept
---

# Glossary

## Document

A Markdown file managed in a repository or local directory.
Documents remain independent of Dokkurator and are the primary source of information.

## Frontmatter

Structured metadata embedded at the beginning of a Markdown document, typically using YAML.
Dokkurator uses Frontmatter for metadata such as document type, identifiers, status, tags, or references.

## DocType

A definition describing the expected structure and semantics of a category of documents.

A DocType may contain:

- metadata definitions,
- a Markdown template,
- validation rules.
  All parts are optional.

## Template

An optional Markdown structure associated with a DocType.
Templates provide guidance when creating documents but do not replace validation rules.

## Rule

A validation rule applied to documents.
Rules may validate metadata, document structure, content, references, or relationships.

## Validator

The component responsible for evaluating documents against configured DocTypes and rules.

## Identifier

A stable identifier used to reference a document independently of its file path.

## Reference

An explicit relationship from one document or entity to another.
References can be used to build relationships and navigation across repositories.

## Knowledge

The component responsible for indexing documents and making their metadata and relationships queryable.

## Index

A derived representation of documentation used for search, queries, and relationship resolution.
The index is not the source of truth and can be rebuilt from the original documents.

## Repository

A Git repository containing documentation.
Dokkurator may process documentation from one or multiple repositories.

## CLI

The command-line interface for accessing Dokkurator functionality such as validation, indexing, and queries.

It can be used locally, in CI pipelines, by scripts, or by AI agents.

## Hub

A reference application that provides central access to documentation distributed across repositories.
The Hub uses Dokkurator's reusable components for search, navigation, validation information, and relationships while keeping the original repositories as the source of truth.

## Documentation Health

Derived information about the state and quality of a documentation collection.
This may include validation results, unresolved references, missing metadata, or outdated documents.
