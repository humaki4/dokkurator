---
doctype: architecture
title: Explorer UI
status: draft
component: explorer-ui
tags: [frontend]
---

# Explorer UI

This document describes the planned UI. The current application is a React/Vite
starter with no Catalog Server integration. The additional libraries and features
listed below are design options, not implemented functionality.

`Explorer UI` is the browser-based interface for searching, navigating and inspecting indexed documentation.

It consumes the Catalog Server API and contains no direct repository or database access.

## Technology

- React
- TypeScript
- Vite
- TanStack Query for server state and API access
- TanStack Router for routing
- CSS Modules for component styling
- global CSS for shared design tokens, light mode and dark mode
- generated API client based on OpenAPI where applicable
- Markdown rendering with Mermaid support

## Structure

A feature-based structure can group pages, hooks and feature-specific UI:

```text
src/
├── components/
│   └── shared UI components
│
├── features/
│   ├── search/
│   ├── documents/
│   ├── graph/
│   └── repositories/
│
├── hooks/
├── api/
└── styles/
```

## Responsibilities

- provide browser-based search, navigation, and document inspection;
- consume the Catalog Server API and render its document and relationship data;
- keep view state and user interaction in the browser application.

## Boundaries

- Repository configuration is file-based and managed outside the Explorer UI.
- An administrative UI for managing repositories is out of scope for the MVP.
- Administrative API endpoints for repository configuration are also out of scope for the MVP.
