/**
 * Tests for TOOL-16: format_file tool
 *
 * 逆向: amp-cli-reversed/chunk-006.js:29161-29166
 * 逆向: amp-cli-reversed/chunk-005.js:13203 (AlR = "format_file")
 */
import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { ToolContext } from "../../types";
import { detectFormatter, FormatFileTool } from "../format-file";

// ─── Helpers ─────────────────────────────────────────────

let testDir: string;

beforeEach(() => {
  testDir = join(
    tmpdir(),
    `flitter-test-format-${Date.now()}-${Math.random().toString(36).slice(2)}`,
  );
  mkdirSync(testDir, { recursive: true });
});

afterEach(() => {
  try {
    rmSync(testDir, { recursive: true, force: true });
  } catch {
    // cleanup best-effort
  }
});

function makeContext(overrides: Partial<ToolContext> = {}): ToolContext {
  return {
    workingDirectory: testDir,
    signal: new AbortController().signal,
    threadId: "test-thread",
    config: {} as ToolContext["config"],
    ...overrides,
  };
}

// ─── Tool Spec ──────────────────────────────────────────

describe("FormatFileTool spec", () => {
  it("has the correct name", () => {
    expect(FormatFileTool.name).toBe("format_file");
  });

  it("is a builtin tool", () => {
    expect(FormatFileTool.source).toBe("builtin");
  });

  it("is not read-only", () => {
    expect(FormatFileTool.isReadOnly).toBe(false);
  });

  it("requires path parameter", () => {
    const required = (FormatFileTool.inputSchema as Record<string, unknown>).required as string[];
    expect(required).toContain("path");
  });
});

// ─── Validation ─────────────────────────────────────────

describe("FormatFileTool validation", () => {
  it("errors on missing path", async () => {
    const result = await FormatFileTool.execute({}, makeContext());
    expect(result.status).toBe("error");
    expect(result.error).toContain("Missing required parameter");
  });

  it("errors on nonexistent file", async () => {
    const result = await FormatFileTool.execute(
      { path: join(testDir, "nonexistent.ts") },
      makeContext(),
    );
    expect(result.status).toBe("error");
    expect(result.error).toContain("not found");
  });

  it("errors on directory path", async () => {
    const result = await FormatFileTool.execute({ path: testDir }, makeContext());
    expect(result.status).toBe("error");
    expect(result.error).toContain("directory");
  });
});

// ─── Formatter detection (unit tests — no subprocess spawn) ──

describe("detectFormatter", () => {
  it("selects gofmt for .go files", () => {
    const config = detectFormatter("/tmp/main.go", testDir);
    expect(config.kind).toBe("gofmt");
    expect(config.command[0]).toBe("gofmt");
    expect(config.command).toContain("-w");
  });

  it("selects rustfmt for .rs files", () => {
    const config = detectFormatter("/tmp/lib.rs", testDir);
    expect(config.kind).toBe("rustfmt");
    expect(config.command[0]).toBe("rustfmt");
  });

  it("selects ruff for .py files", () => {
    const config = detectFormatter("/tmp/app.py", testDir);
    expect(config.kind).toBe("ruff");
    expect(config.command[0]).toBe("ruff");
    expect(config.command).toContain("format");
  });

  it("selects ruff for .pyi files", () => {
    const config = detectFormatter("/tmp/types.pyi", testDir);
    expect(config.kind).toBe("ruff");
  });

  it("selects biome for .ts when biome.json exists", () => {
    writeFileSync(join(testDir, "biome.json"), "{}");
    const config = detectFormatter("/tmp/index.ts", testDir);
    expect(config.kind).toBe("biome");
    expect(config.command).toContain("biome");
    expect(config.command).toContain("--write");
  });

  it("selects biome for .tsx when biome.jsonc exists", () => {
    writeFileSync(join(testDir, "biome.jsonc"), "{}");
    const config = detectFormatter("/tmp/App.tsx", testDir);
    expect(config.kind).toBe("biome");
  });

  it("selects prettier for .ts without biome config", () => {
    const config = detectFormatter("/tmp/index.ts", testDir);
    expect(config.kind).toBe("prettier");
    expect(config.command).toContain("prettier");
    expect(config.command).toContain("--write");
  });

  it("selects prettier for .js files without biome config", () => {
    const config = detectFormatter("/tmp/app.js", testDir);
    expect(config.kind).toBe("prettier");
  });

  it("selects prettier for .json files without biome config", () => {
    const config = detectFormatter("/tmp/data.json", testDir);
    expect(config.kind).toBe("prettier");
  });

  it("selects prettier for .css files without biome config", () => {
    const config = detectFormatter("/tmp/style.css", testDir);
    expect(config.kind).toBe("prettier");
  });

  it("selects prettier for .md files without biome config", () => {
    const config = detectFormatter("/tmp/README.md", testDir);
    expect(config.kind).toBe("prettier");
  });

  it("falls back to prettier for unknown extensions", () => {
    const config = detectFormatter("/tmp/unknown.xyz", testDir);
    expect(config.kind).toBe("prettier");
  });

  it("includes the file path in the command", () => {
    const config = detectFormatter("/tmp/main.go", testDir);
    expect(config.command).toContain("/tmp/main.go");
  });
});
