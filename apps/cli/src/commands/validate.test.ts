import { resolve } from "node:path";
import { createDokkurator } from "@dokkurator/core";
import { beforeEach, expect, test, vi } from "vitest";
import { createCommand } from "../command.js";

vi.mock("@dokkurator/core", () => ({ createDokkurator: vi.fn() }));

const app = {
  open: vi.fn(),
  loadFormatter: vi.fn(),
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
  app.loadFormatter.mockResolvedValue({
    format: vi.fn().mockResolvedValue(""),
  });
  app.open.mockResolvedValue({ sources: [] });
  app.validate.mockResolvedValue({ results: [], errors: [] });
});

test("lists validate and its optional source argument in help", async () => {
  let output = "";
  const command = createCommand({ writeOut: (text) => (output += text) });
  expect(command.helpInformation()).toContain("validate [options] [source-id]");
  command.exitOverride();
  command.commands.find((child) => child.name() === "validate")!.exitOverride();
  await expect(
    command.parseAsync(["validate", "--help"], { from: "user" }),
  ).rejects.toMatchObject({ code: "commander.helpDisplayed" });
  expect(output).toContain("validate [options] [source-id]");
  expect(output).toContain("--format <name>");
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

test.each([undefined, "stylish", "json", "json-with-metadata"])(
  "formats the complete report once with %s on stdout",
  async (format) => {
    const report = {
      results: [
        { sourceId: "one", documents: [{ path: "readme.md" }] },
        { sourceId: "two", documents: [{ path: "readme.md" }] },
      ],
      errors: [
        {
          sourceId: "missing",
          phase: "load",
          message: "Missing source",
          recovery: "run-prepare",
        },
      ],
    };
    const formatted = JSON.stringify(report);
    const formatter = { format: vi.fn().mockResolvedValue(formatted) };
    app.loadFormatter.mockResolvedValue(formatter);
    app.validate.mockResolvedValue(report);
    app.open.mockResolvedValue({
      sources: [{ sourceId: "missing", status: "preparation-required" }],
    });
    const writeOut = vi.fn();
    const writeErr = vi.fn();
    await createCommand({ writeOut, writeErr }).parseAsync(
      ["validate", ...(format ? ["--format", format] : [])],
      { from: "user" },
    );
    expect(app.loadFormatter).toHaveBeenCalledExactlyOnceWith(
      format ?? "stylish",
    );
    expect(app.validate).toHaveBeenCalledOnce();
    expect(formatter.format).toHaveBeenCalledExactlyOnceWith(report);
    expect(writeOut).toHaveBeenCalledExactlyOnceWith(formatted);
    expect(JSON.parse(writeOut.mock.calls[0]![0])).toEqual(report);
    expect(writeErr).not.toHaveBeenCalled();
    expect(app.close).toHaveBeenCalledOnce();
  },
);

test.each(["load", "format"])(
  "reports formatter %s failures and closes",
  async (stage) => {
    if (stage === "load")
      app.loadFormatter.mockRejectedValue(
        new Error("Unsupported validation formatter: unknown"),
      );
    else
      app.loadFormatter.mockResolvedValue({
        format: vi.fn().mockRejectedValue(new Error("broken formatter")),
      });
    const writeOut = vi.fn();
    await expect(
      createCommand({ writeOut }).parseAsync(
        ["validate", "--format", "unknown"],
        { from: "user" },
      ),
    ).rejects.toThrow(
      stage === "load"
        ? "Unsupported validation formatter: unknown"
        : "Failed to format validation report as unknown",
    );
    expect(writeOut).not.toHaveBeenCalled();
    expect(app.close).toHaveBeenCalledOnce();
    if (stage === "load") expect(app.validate).not.toHaveBeenCalled();
  },
);
