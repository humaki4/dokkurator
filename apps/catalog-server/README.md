# Catalog Server

Fastify service for the Dokkurator catalog. The service currently exposes only
its prepared OpenAPI contract; catalog routes will be added later.

## Development

Copy `.env.example` to `.env` when local values should differ from the defaults,
then run:

```sh
pnpm --filter @dokkurator/catalog-server dev
```

The server listens on `http://127.0.0.1:3000` by default. Its OpenAPI document is
available at `/openapi.json`.

## Commands

- `pnpm --filter @dokkurator/catalog-server build` builds the production server.
- `pnpm --filter @dokkurator/catalog-server start` starts the production build.
- `pnpm --filter @dokkurator/catalog-server generate:openapi` updates
  `openapi/openapi.json` for clients such as `explorer-ui`.
