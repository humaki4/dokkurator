import { afterEach, expect, test } from "vitest";

import { buildApp } from "./app.js";

const apps: Awaited<ReturnType<typeof buildApp>>[] = [];

afterEach(async () => {
  await Promise.all(apps.splice(0).map(async (app) => app.close()));
});

test("becomes ready with all features loaded", async () => {
  const app = await buildApp();
  apps.push(app);

  await expect(app.ready()).resolves.toBe(app);
});
