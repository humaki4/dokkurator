# Explorer UI

Placeholder for Dokkurator's planned browser reference application. This folder
currently contains a React/TypeScript/Vite starter, including its starter screen.
It does not yet connect to Catalog Server or offer document search or navigation.

For a working Dokkurator example, start with the
[documentation example](../../examples/documentation/README.md). The intended UI scope is
outlined in the [architecture draft](../../docs/architecture/explorer-ui.md).

## Development

From the repository root after installing workspace dependencies:

```sh
pnpm --filter explorer-ui dev
pnpm --filter explorer-ui build
pnpm --filter explorer-ui lint
```

These commands run or check the placeholder application.
