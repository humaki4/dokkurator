import { describe, expect, test } from "vitest";

import { loadConfig } from "../src/config.js";

describe("server configuration", () => {
  test("uses local defaults", () => {
    expect(loadConfig({})).toEqual({
      host: "127.0.0.1",
      port: 3000,
    });
  });

  test("reads host and port from the environment", () => {
    expect(loadConfig({ HOST: "0.0.0.0", PORT: "8080" })).toEqual({
      host: "0.0.0.0",
      port: 8080,
    });
  });

  test.each(["0", "65536", "3.14", "invalid"])(
    "rejects invalid port %s",
    (port) => {
      expect(() => loadConfig({ PORT: port })).toThrow(
        "PORT must be an integer between 1 and 65535",
      );
    },
  );
});
