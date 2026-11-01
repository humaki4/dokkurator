import { resolve } from "node:path";
import { createDokkurator } from "@dokkurator/core";
import { beforeEach, expect, test, vi } from "vitest";
import { createCommand } from "../command.js";

vi.mock("@dokkurator/core", () => ({ createDokkurator: vi.fn() }));

const app = {
  open: vi.fn(),
  validate: vi.fn(),
  close: vi.fn(),
  prepare: vi.fn(),
  sync: vi.fn(),
  search: vi.fn(),
  index: vi.fn(),
};

beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(createDokkurator).mockReturnValue(
    app as unknown as ReturnType<typeof createDokkurator>,
  );
  app.open.mockResolvedValue({ sources: [] });
  app.validate.mockResolvedValue({ results: [], errors: [] });
});

test("lists validate and its optional source argument in help", async () => {
  let output = "";
  const command = createCommand({ writeOut: (text) => (output += text) });
  expect(command.helpInformation()).toContain("validate [source-id]");
  command.exitOverride();
  command.commands.find((child) => child.name() === "validate")!.exitOverride();
  await expect(
    command.parseAsync(["validate", "--help"], { from: "user" }),
  ).rejects.toMatchObject({ code: "commander.helpDisplayed" });
  expect(output).toContain("validate [options] [source-id]");
  expect(createDokkurator).not.toHaveBeenCalled();
});

test.each([undefined, "docs", "root"])(
  "delegates source %s once and closes the app",
  async (sourceId) => {
    await createCommand().parseAsync(
      ["--project", "/project", "validate", ...(sourceId ? [sourceId] : [])],
      { from: "user" },
    );
    expect(createDokkurator).toHaveBeenCalledExactlyOnceWith({
      root: "/project",
    });
    expect(app.open).toHaveBeenCalledOnce();
    expect(app.validate).toHaveBeenCalledExactlyOnceWith({ sourceId });
    expect(app.close).toHaveBeenCalledOnce();
    for (const operation of [app.prepare, app.sync, app.search, app.index])
      expect(operation).not.toHaveBeenCalled();
  },
);

test("uses the default project path", async () => {
  await createCommand({}, { cwd: "/tmp" }).parseAsync(["validate"], {
    from: "user",
  });
  expect(createDokkurator).toHaveBeenCalledWith({ root: resolve("/tmp") });
});

test("closes after a structured source operation error", async () => {
  app.validate.mockResolvedValue({
    results: [],
    errors: [
      {
        sourceId: "docs",
        phase: "load",
        message: "Missing source",
        recovery: "run-prepare",
      },
    ],
  });
  await createCommand().parseAsync(["validate", "docs"], { from: "user" });
  expect(app.validate).toHaveBeenCalledExactlyOnceWith({ sourceId: "docs" });
  expect(app.close).toHaveBeenCalledOnce();
});

test.each(["Unknown source: unknown", "Validation failed"])(
  "propagates %s and closes the app",
  async (message) => {
    app.validate.mockRejectedValue(new Error(message));
    await expect(
      createCommand().parseAsync(["validate", "unknown"], { from: "user" }),
    ).rejects.toThrow(message);
    expect(app.validate).toHaveBeenCalledExactlyOnceWith({
      sourceId: "unknown",
    });
    expect(app.close).toHaveBeenCalledOnce();
  },
);
