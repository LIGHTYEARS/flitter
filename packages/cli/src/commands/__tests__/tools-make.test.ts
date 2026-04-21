/**
 * Tests for CLI-05: `tools make <name>` command
 *
 * 逆向: amp-cli-reversed/modules/2582_unknown_GL0.js
 * 逆向: amp-cli-reversed/modules/2594_unknown_oM0.js (toolbox dir resolution)
 */
import { afterEach, beforeEach, describe, expect, it, spyOn } from "bun:test";
import { existsSync, mkdirSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { handleToolsMake, resolveToolboxDir } from "../tools";

// ─── Helpers ─────────────────────────────────────────────

let testDir: string;

beforeEach(() => {
  testDir = join(
    tmpdir(),
    `flitter-test-toolbox-${Date.now()}-${Math.random().toString(36).slice(2)}`,
  );
  mkdirSync(testDir, { recursive: true });
  // Override FLITTER_TOOLBOX so we write to temp dir
  process.env.FLITTER_TOOLBOX = testDir;
});

afterEach(() => {
  delete process.env.FLITTER_TOOLBOX;
  try {
    rmSync(testDir, { recursive: true, force: true });
  } catch {
    // cleanup best-effort
  }
});

// ─── resolveToolboxDir ──────────────────────────────────

describe("resolveToolboxDir", () => {
  it("returns FLITTER_TOOLBOX when set", () => {
    process.env.FLITTER_TOOLBOX = "/absolute/path";
    expect(resolveToolboxDir()).toBe("/absolute/path");
  });

  it("falls back to AMP_TOOLBOX", () => {
    delete process.env.FLITTER_TOOLBOX;
    process.env.AMP_TOOLBOX = "/amp/tools";
    const result = resolveToolboxDir();
    expect(result).toBe("/amp/tools");
    delete process.env.AMP_TOOLBOX;
  });

  it("throws on relative paths", () => {
    process.env.FLITTER_TOOLBOX = "relative/path";
    expect(() => resolveToolboxDir()).toThrow("absolute paths only");
  });

  it("falls back to default when no env set", () => {
    delete process.env.FLITTER_TOOLBOX;
    delete process.env.AMP_TOOLBOX;
    const result = resolveToolboxDir();
    expect(result).toContain(".config/flitter/tools");
  });
});

// ─── handleToolsMake ────────────────────────────────────

describe("handleToolsMake", () => {
  it("creates a bun tool by default", () => {
    const outSpy = spyOn(process.stdout, "write").mockImplementation(() => true);
    const prevExitCode = process.exitCode;

    handleToolsMake("my-tool", {});

    const filePath = join(testDir, "my-tool.ts");
    expect(existsSync(filePath)).toBe(true);

    const content = readFileSync(filePath, "utf-8");
    expect(content).toContain("#!/usr/bin/env bun");
    expect(content).toContain("my-tool");

    const output = outSpy.mock.calls.map((c) => c[0]).join("");
    expect(output).toContain("Tool created at:");
    expect(output).toContain("flitter tools show tb__my-tool");
    expect(output).toContain("flitter tools use tb__my-tool");

    outSpy.mockRestore();
    process.exitCode = prevExitCode;
  });

  it("creates a bash tool with --bash", () => {
    const outSpy = spyOn(process.stdout, "write").mockImplementation(() => true);

    handleToolsMake("bash-tool", { bash: true });

    const filePath = join(testDir, "bash-tool.sh");
    expect(existsSync(filePath)).toBe(true);

    const content = readFileSync(filePath, "utf-8");
    expect(content).toContain("#!/usr/bin/env bash");

    outSpy.mockRestore();
  });

  it("creates a zsh tool with --zsh", () => {
    const outSpy = spyOn(process.stdout, "write").mockImplementation(() => true);

    handleToolsMake("zsh-tool", { zsh: true });

    const filePath = join(testDir, "zsh-tool.zsh");
    expect(existsSync(filePath)).toBe(true);

    const content = readFileSync(filePath, "utf-8");
    expect(content).toContain("#!/usr/bin/env zsh");

    outSpy.mockRestore();
  });

  it("zsh takes precedence over bash and bun", () => {
    const outSpy = spyOn(process.stdout, "write").mockImplementation(() => true);

    handleToolsMake("multi-tool", { zsh: true, bash: true, bun: true });

    expect(existsSync(join(testDir, "multi-tool.zsh"))).toBe(true);
    expect(existsSync(join(testDir, "multi-tool.sh"))).toBe(false);
    expect(existsSync(join(testDir, "multi-tool.ts"))).toBe(false);

    outSpy.mockRestore();
  });

  it("rejects invalid tool names", () => {
    const errSpy = spyOn(process.stderr, "write").mockImplementation(() => true);
    const prevExitCode = process.exitCode;

    handleToolsMake("invalid name with spaces", {});

    expect(process.exitCode).toBe(1);
    const output = errSpy.mock.calls.map((c) => c[0]).join("");
    expect(output).toContain("not a valid tool name");

    errSpy.mockRestore();
    process.exitCode = prevExitCode;
  });

  it("rejects empty tool name", () => {
    const errSpy = spyOn(process.stderr, "write").mockImplementation(() => true);
    const prevExitCode = process.exitCode;

    handleToolsMake("", {});

    expect(process.exitCode).toBe(1);

    errSpy.mockRestore();
    process.exitCode = prevExitCode;
  });

  it("rejects too-long tool names (>64 chars)", () => {
    const errSpy = spyOn(process.stderr, "write").mockImplementation(() => true);
    const prevExitCode = process.exitCode;

    handleToolsMake("a".repeat(65), {});

    expect(process.exitCode).toBe(1);

    errSpy.mockRestore();
    process.exitCode = prevExitCode;
  });

  it("refuses to overwrite existing file without --force", () => {
    const outSpy = spyOn(process.stdout, "write").mockImplementation(() => true);
    const errSpy = spyOn(process.stderr, "write").mockImplementation(() => true);
    const prevExitCode = process.exitCode;

    // Create first
    handleToolsMake("existing", {});
    process.exitCode = undefined;

    // Try to create again
    handleToolsMake("existing", {});

    expect(process.exitCode).toBe(1);
    const errOutput = errSpy.mock.calls.map((c) => c[0]).join("");
    expect(errOutput).toContain("already exists");
    expect(errOutput).toContain("--force");

    outSpy.mockRestore();
    errSpy.mockRestore();
    process.exitCode = prevExitCode;
  });

  it("overwrites existing file with --force", () => {
    const outSpy = spyOn(process.stdout, "write").mockImplementation(() => true);

    // Create first as bun
    handleToolsMake("overwrite-me", {});
    const firstContent = readFileSync(join(testDir, "overwrite-me.ts"), "utf-8");

    // Overwrite with bash (different extension, but same name logic)
    handleToolsMake("overwrite-me", { force: true, bash: true });

    // Now .sh exists
    expect(existsSync(join(testDir, "overwrite-me.sh"))).toBe(true);

    outSpy.mockRestore();
  });

  it("creates toolbox directory if it doesn't exist", () => {
    const outSpy = spyOn(process.stdout, "write").mockImplementation(() => true);
    const nestedDir = join(testDir, "nested", "deep", "dir");
    process.env.FLITTER_TOOLBOX = nestedDir;

    handleToolsMake("nested-tool", {});

    expect(existsSync(join(nestedDir, "nested-tool.ts"))).toBe(true);

    outSpy.mockRestore();
  });
});
