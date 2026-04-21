/**
 * Tests for CLI-27: `tools use` command
 *
 * 逆向: amp-cli-reversed/chunk-004.js:25484-25511 — `tools use <name>`
 * 逆向: amp-cli-reversed/chunk-004.js:25377 — sM0 arg parsing
 */
import { describe, expect, it, mock, spyOn } from "bun:test";
import type { ToolRegistry, ToolResult, ToolSpec } from "@flitter/agent-core";
import type { Config } from "@flitter/schemas";
import { handleToolsUse, parseCliArgsToInput } from "../tools";

// ─── Helpers ─────────────────────────────────────────────

function createMockRegistry(tools: Record<string, Partial<ToolSpec>> = {}): ToolRegistry {
  return {
    get(name: string) {
      return tools[name] as ToolSpec | undefined;
    },
    list: () => Object.values(tools) as ToolSpec[],
    getToolDefinitions: () => [],
    has: (name: string) => name in tools,
    register: () => {},
  } as unknown as ToolRegistry;
}

const mockConfig: Config = {
  settings: {} as never,
  secrets: {} as never,
};

// ─── parseCliArgsToInput ──────────────────────────────────

describe("parseCliArgsToInput", () => {
  it("parses simple --key value pairs", () => {
    const result = parseCliArgsToInput(["--path", "/tmp/file.txt"]);
    expect(result).toEqual({ path: "/tmp/file.txt" });
  });

  it("parses multiple key-value pairs", () => {
    const result = parseCliArgsToInput(["--path", "/tmp/file.txt", "--pattern", "TODO"]);
    expect(result).toEqual({ path: "/tmp/file.txt", pattern: "TODO" });
  });

  it("handles boolean flags (no value)", () => {
    const result = parseCliArgsToInput(["--recursive"]);
    expect(result).toEqual({ recursive: true });
  });

  it("handles duplicate keys as arrays", () => {
    const result = parseCliArgsToInput(["--include", "*.ts", "--include", "*.js"]);
    expect(result).toEqual({ include: ["*.ts", "*.js"] });
  });

  it("returns empty object for empty args", () => {
    const result = parseCliArgsToInput([]);
    expect(result).toEqual({});
  });

  it("handles mixed flags and key-value pairs", () => {
    const result = parseCliArgsToInput(["--path", "/tmp", "--verbose", "--count", "5"]);
    expect(result).toEqual({ path: "/tmp", verbose: true, count: "5" });
  });
});

// ─── handleToolsUse ───────────────────────────────────────

describe("handleToolsUse", () => {
  it("executes a tool and outputs content", async () => {
    const writeSpy = spyOn(process.stdout, "write").mockImplementation(() => true);
    const tools = {
      read: {
        name: "read",
        description: "Read a file",
        source: "builtin" as const,
        inputSchema: { type: "object", properties: { path: { type: "string" } } },
        execute: mock(
          async (): Promise<ToolResult> => ({
            status: "done",
            content: "file contents here",
          }),
        ),
      },
    };

    const registry = createMockRegistry(tools);

    await handleToolsUse(
      { toolRegistry: registry, config: mockConfig, workingDirectory: "/tmp" },
      "read",
      ["--path", "/tmp/file.txt"],
      {},
    );

    expect(tools.read.execute).toHaveBeenCalledTimes(1);
    const callArgs = (tools.read.execute as ReturnType<typeof mock>).mock.calls[0]![0] as Record<
      string,
      unknown
    >;
    expect(callArgs.path).toBe("/tmp/file.txt");

    // Check that content was written to stdout
    expect(writeSpy).toHaveBeenCalled();
    const output = writeSpy.mock.calls.map((c) => c[0]).join("");
    expect(output).toContain("file contents here");

    writeSpy.mockRestore();
  });

  it("reports error for unknown tool", async () => {
    const errSpy = spyOn(process.stderr, "write").mockImplementation(() => true);
    const outSpy = spyOn(process.stdout, "write").mockImplementation(() => true);
    const registry = createMockRegistry({});
    const prevExitCode = process.exitCode;

    await handleToolsUse(
      { toolRegistry: registry, config: mockConfig, workingDirectory: "/tmp" },
      "nonexistent",
      [],
      {},
    );

    expect(process.exitCode).toBe(1);
    const output = errSpy.mock.calls.map((c) => c[0]).join("");
    expect(output).toContain("not found");

    outSpy.mockRestore();
    errSpy.mockRestore();
    process.exitCode = prevExitCode;
  });

  it("--stream outputs JSON line", async () => {
    const outSpy = spyOn(process.stdout, "write").mockImplementation(() => true);
    const tools = {
      echo: {
        name: "echo",
        description: "Echo input",
        source: "builtin" as const,
        inputSchema: { type: "object", properties: {} },
        execute: mock(
          async (): Promise<ToolResult> => ({
            status: "done",
            content: "hello",
          }),
        ),
      },
    };

    const registry = createMockRegistry(tools);

    await handleToolsUse(
      { toolRegistry: registry, config: mockConfig, workingDirectory: "/tmp" },
      "echo",
      [],
      { stream: true },
    );

    const output = outSpy.mock.calls.map((c) => c[0]).join("");
    const parsed = JSON.parse(output.trim());
    expect(parsed.status).toBe("done");
    expect(parsed.result).toBe("hello");

    outSpy.mockRestore();
  });

  it("--only extracts a field from data", async () => {
    const outSpy = spyOn(process.stdout, "write").mockImplementation(() => true);
    const tools = {
      info: {
        name: "info",
        description: "Get info",
        source: "builtin" as const,
        inputSchema: { type: "object", properties: {} },
        execute: mock(
          async (): Promise<ToolResult> => ({
            status: "done",
            data: { version: "1.0.0", name: "flitter" },
          }),
        ),
      },
    };

    const registry = createMockRegistry(tools);

    await handleToolsUse(
      { toolRegistry: registry, config: mockConfig, workingDirectory: "/tmp" },
      "info",
      [],
      { only: "version" },
    );

    const output = outSpy.mock.calls.map((c) => c[0]).join("");
    expect(output.trim()).toBe("1.0.0");

    outSpy.mockRestore();
  });

  it("coerces number args from CLI", async () => {
    const outSpy = spyOn(process.stdout, "write").mockImplementation(() => true);
    const tools = {
      seek: {
        name: "seek",
        description: "Seek to offset",
        source: "builtin" as const,
        inputSchema: {
          type: "object",
          properties: { offset: { type: "number" }, path: { type: "string" } },
        },
        execute: mock(
          async (): Promise<ToolResult> => ({
            status: "done",
            content: "ok",
          }),
        ),
      },
    };

    const registry = createMockRegistry(tools);

    await handleToolsUse(
      { toolRegistry: registry, config: mockConfig, workingDirectory: "/tmp" },
      "seek",
      ["--offset", "42", "--path", "/tmp/file"],
      {},
    );

    const callArgs = (tools.seek.execute as ReturnType<typeof mock>).mock.calls[0]![0] as Record<
      string,
      unknown
    >;
    expect(callArgs.offset).toBe(42);
    expect(callArgs.path).toBe("/tmp/file");

    outSpy.mockRestore();
  });

  it("applies preprocessArgs before execution", async () => {
    const outSpy = spyOn(process.stdout, "write").mockImplementation(() => true);
    const tools = {
      legacy: {
        name: "legacy",
        description: "Legacy tool",
        source: "builtin" as const,
        inputSchema: { type: "object", properties: { file_path: { type: "string" } } },
        preprocessArgs: (args: Record<string, unknown>) => {
          // Alias "path" → "file_path"
          if (args.path && !args.file_path) {
            return { ...args, file_path: args.path };
          }
          return args;
        },
        execute: mock(
          async (): Promise<ToolResult> => ({
            status: "done",
            content: "done",
          }),
        ),
      },
    };

    const registry = createMockRegistry(tools);

    await handleToolsUse(
      { toolRegistry: registry, config: mockConfig, workingDirectory: "/tmp" },
      "legacy",
      ["--path", "/tmp/foo"],
      {},
    );

    const callArgs = (tools.legacy.execute as ReturnType<typeof mock>).mock.calls[0]![0] as Record<
      string,
      unknown
    >;
    expect(callArgs.file_path).toBe("/tmp/foo");

    outSpy.mockRestore();
  });
});
