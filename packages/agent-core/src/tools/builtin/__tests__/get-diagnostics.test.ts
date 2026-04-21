/**
 * Tests for TOOL-02: get_diagnostics
 *
 * 逆向: amp-cli-reversed/modules/1381_unknown_U5R.js
 *   Tool that shells out to language-specific checkers.
 */
import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { ToolContext } from "../../types";
import { GetDiagnosticsTool } from "../get-diagnostics";

// ─── Helpers ─────────────────────────────────────────────

let testDir: string;

function makeContext(cwd?: string): ToolContext {
  return {
    workingDirectory: cwd ?? testDir,
    signal: new AbortController().signal,
    threadId: "test-thread",
    config: { settings: {} as never, secrets: {} as never },
  };
}

beforeEach(() => {
  testDir = join(tmpdir(), `flitter-diag-${Date.now()}-${Math.random().toString(36).slice(2)}`);
  mkdirSync(testDir, { recursive: true });
});

afterEach(() => {
  try {
    rmSync(testDir, { recursive: true, force: true });
  } catch {
    // cleanup best-effort
  }
});

// ─── Tests ───────────────────────────────────────────────

describe("GetDiagnosticsTool", () => {
  it("has correct tool spec", () => {
    expect(GetDiagnosticsTool.name).toBe("get_diagnostics");
    expect(GetDiagnosticsTool.source).toBe("builtin");
    expect(GetDiagnosticsTool.isReadOnly).toBe(true);
    expect(GetDiagnosticsTool.inputSchema.required).toContain("path");
  });

  it("returns error for missing path parameter", async () => {
    const result = await GetDiagnosticsTool.execute({}, makeContext());
    expect(result.status).toBe("error");
    expect(result.error).toContain("path");
  });

  it("returns error for non-existent path", async () => {
    const result = await GetDiagnosticsTool.execute(
      { path: "/nonexistent/path/xyz" },
      makeContext(),
    );
    expect(result.status).toBe("error");
    expect(result.error).toContain("not found");
  });

  it("returns 'unknown' language message for unsupported file types", async () => {
    const filePath = join(testDir, "test.txt");
    writeFileSync(filePath, "hello world");

    const result = await GetDiagnosticsTool.execute({ path: filePath }, makeContext());
    expect(result.status).toBe("done");
    expect(result.content).toContain("No diagnostics checker available");
  });

  it("detects TypeScript from file extension", async () => {
    // Create a minimal TS file with an error
    const filePath = join(testDir, "bad.ts");
    writeFileSync(filePath, "const x: number = 'oops';");

    const result = await GetDiagnosticsTool.execute({ path: filePath }, makeContext());
    // We don't assert specific diagnostics since tsc may not be available in test env
    expect(result.status).toBe("done");
    expect(result.data).toBeDefined();
    expect((result.data as Record<string, unknown>).language).toBe("typescript");
  }, 15000);

  it("detects language from directory markers (tsconfig.json)", async () => {
    writeFileSync(join(testDir, "tsconfig.json"), "{}");
    writeFileSync(join(testDir, "index.ts"), "export const x = 1;");

    const result = await GetDiagnosticsTool.execute({ path: testDir }, makeContext());
    expect(result.status).toBe("done");
    expect((result.data as Record<string, unknown>).language).toBe("typescript");
  }, 15000);

  it("detects Python from .py extension", async () => {
    const filePath = join(testDir, "main.py");
    writeFileSync(filePath, "import os\nprint('hello')");

    const result = await GetDiagnosticsTool.execute({ path: filePath }, makeContext());
    expect(result.status).toBe("done");
    expect((result.data as Record<string, unknown>).language).toBe("python");
  });

  it("detects Go from go.mod directory marker", async () => {
    writeFileSync(join(testDir, "go.mod"), "module example.com/test\n\ngo 1.21\n");
    writeFileSync(join(testDir, "main.go"), "package main\n\nfunc main() {}\n");

    const result = await GetDiagnosticsTool.execute({ path: testDir }, makeContext());
    expect(result.status).toBe("done");
    // Language detection works regardless of whether go is installed
    expect((result.data as Record<string, unknown>).language).toBe("go");
  }, 15000);

  it("detects Rust from Cargo.toml directory marker", async () => {
    writeFileSync(
      join(testDir, "Cargo.toml"),
      '[package]\nname = "test"\nversion = "0.1.0"\nedition = "2021"\n',
    );
    mkdirSync(join(testDir, "src"), { recursive: true });
    writeFileSync(join(testDir, "src", "main.rs"), "fn main() {}\n");

    const result = await GetDiagnosticsTool.execute({ path: testDir }, makeContext());
    expect(result.status).toBe("done");
    // Language detection works regardless of whether cargo is installed
    expect((result.data as Record<string, unknown>).language).toBe("rust");
  }, 15000);

  it("resolves relative paths against workingDirectory", async () => {
    // Use a .py file so it triggers the python checker (even if ruff isn't available)
    const filePath = join(testDir, "relative.py");
    writeFileSync(filePath, "x = 1");

    const result = await GetDiagnosticsTool.execute({ path: "relative.py" }, makeContext());
    expect(result.status).toBe("done");
  });
});
