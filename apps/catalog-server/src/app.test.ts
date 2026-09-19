import { afterEach, describe, expect, test } from "vitest";

import { buildApp } from "./app.js";

const apps: Awaited<ReturnType<typeof buildApp>>[] = [];

afterEach(async () => {
  await Promise.all(apps.splice(0).map(async (app) => app.close()));
});

describe("catalog server", () => {
  test("becomes ready without opening a network port", async () => {
    const app = await buildApp();
    apps.push(app);

    await expect(app.ready()).resolves.toBe(app);
  });

  test("serves the prepared OpenAPI contract", async () => {
    const app = await buildApp();
    apps.push(app);

    const response = await app.inject({
      method: "GET",
      url: "/openapi.json",
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      openapi: "3.1.0",
      info: {
        title: "Dokkurator Catalog API",
        version: "0.0.0",
      },
      paths: {},
    });
  });
});
