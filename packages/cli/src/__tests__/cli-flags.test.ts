/**
 * CLI flags unit tests
 *
 * Tests for the 6 new top-level CLI flags:
 * --model, --api-key, --system-prompt, --max-turns, --print, --pipe
 *
 * Also tests the CliContext extension (Task 2):
 * - --print and --pipe imply executeMode
 * - --max-turns parsing
 * - All flag values pass through to CliContext
 *
 * 逆向参考: i$T flag definitions (chunk-006.js:38263-38279)
 *           S8() context builder (2002_unknown_S8.js)
 */

import { describe, expect, test } from "bun:test";
import { resolveCliContext } from "../context";
import { createProgram } from "../program";

// ── Helper ────────────────────────────────────────────────

/**
 * Parse argv through Commander and return the opts object.
 * Commander expects first two argv elements to be node + script.
 */
function parseOpts(args: string[]): Record<string, unknown> {
  const program = createProgram("0.0.0-test");
  program.exitOverride();
  // Suppress Commander's default output/error handlers so tests don't throw
  program.configureOutput({
    writeOut: () => {},
    writeErr: () => {},
  });
  program.parse(["node", "flitter", ...args]);
  return program.opts();
}

/**
 * Parse argv through Commander and return the resolved CliContext.
 */
function parseContext(args: string[]) {
  const program = createProgram("0.0.0-test");
  program.exitOverride();
  program.configureOutput({
    writeOut: () => {},
    writeErr: () => {},
  });
  program.parse(["node", "flitter", ...args]);
  return resolveCliContext(program);
}

// ── Task 1: Commander option parsing ──────────────────────

describe("Commander flag parsing", () => {
  test("--model is recognized and parsed", () => {
    const opts = parseOpts(["--model", "claude-sonnet-4-20250514"]);
    expect(opts.model).toBe("claude-sonnet-4-20250514");
  });

  test("--api-key is recognized and parsed", () => {
    const opts = parseOpts(["--api-key", "sk-test-key-123"]);
    expect(opts.apiKey).toBe("sk-test-key-123");
  });

  test("--system-prompt is recognized and parsed", () => {
    const opts = parseOpts(["--system-prompt", "You are a helpful assistant"]);
    expect(opts.systemPrompt).toBe("You are a helpful assistant");
  });

  test("--max-turns is a string from Commander", () => {
    const opts = parseOpts(["--max-turns", "5"]);
    // Commander passes option values as strings; CliContext parses to number
    expect(opts.maxTurns).toBe("5");
    expect(typeof opts.maxTurns).toBe("string");
  });

  test("--print / -p is a boolean flag", () => {
    const opts = parseOpts(["--print"]);
    expect(opts.print).toBe(true);
  });

  test("-p short form works", () => {
    const opts = parseOpts(["-p"]);
    expect(opts.print).toBe(true);
  });

  test("--pipe is a boolean flag", () => {
    const opts = parseOpts(["--pipe"]);
    expect(opts.pipe).toBe(true);
  });

  test("flags default to undefined/false when not provided", () => {
    const opts = parseOpts([]);
    expect(opts.model).toBeUndefined();
    expect(opts.apiKey).toBeUndefined();
    expect(opts.systemPrompt).toBeUndefined();
    expect(opts.maxTurns).toBeUndefined();
    expect(opts.print).toBeUndefined();
    expect(opts.pipe).toBeUndefined();
  });
});

// ── Task 2: CliContext extension ──────────────────────────

describe("CliContext flag integration", () => {
  test("--print implies executeMode", () => {
    const ctx = parseContext(["--print"]);
    expect(ctx.print).toBe(true);
    expect(ctx.executeMode).toBe(true);
  });

  test("--pipe implies executeMode", () => {
    const ctx = parseContext(["--pipe"]);
    expect(ctx.pipe).toBe(true);
    expect(ctx.executeMode).toBe(true);
  });

  test("--max-turns=0 is treated as unlimited (undefined)", () => {
    const ctx = parseContext(["--max-turns", "0"]);
    expect(ctx.maxTurns).toBeUndefined();
  });

  test("--max-turns=3 is parsed correctly as number", () => {
    const ctx = parseContext(["--max-turns", "3"]);
    expect(ctx.maxTurns).toBe(3);
  });

  test("--max-turns with non-numeric value is treated as unlimited", () => {
    const ctx = parseContext(["--max-turns", "abc"]);
    expect(ctx.maxTurns).toBeUndefined();
  });

  test("--max-turns with negative value is treated as unlimited", () => {
    const ctx = parseContext(["--max-turns", "-1"]);
    expect(ctx.maxTurns).toBeUndefined();
  });

  test("--model passes through to CliContext", () => {
    const ctx = parseContext(["--model", "claude-sonnet-4-20250514"]);
    expect(ctx.model).toBe("claude-sonnet-4-20250514");
  });

  test("--api-key passes through to CliContext", () => {
    const ctx = parseContext(["--api-key", "sk-test-key-123"]);
    expect(ctx.apiKey).toBe("sk-test-key-123");
  });

  test("--system-prompt passes through to CliContext", () => {
    const ctx = parseContext(["--system-prompt", "Be concise"]);
    expect(ctx.systemPrompt).toBe("Be concise");
  });

  test("existing flags remain unchanged", () => {
    const ctx = parseContext(["--execute", "--verbose"]);
    expect(ctx.executeMode).toBe(true);
    expect(ctx.verbose).toBe(true);
    // New flags default properly
    expect(ctx.print).toBe(false);
    expect(ctx.pipe).toBe(false);
    expect(ctx.maxTurns).toBeUndefined();
    expect(ctx.model).toBeUndefined();
    expect(ctx.apiKey).toBeUndefined();
    expect(ctx.systemPrompt).toBeUndefined();
  });

  test("--print and --pipe together both imply executeMode", () => {
    const ctx = parseContext(["--print", "--pipe"]);
    expect(ctx.print).toBe(true);
    expect(ctx.pipe).toBe(true);
    expect(ctx.executeMode).toBe(true);
  });

  test("all flags combined", () => {
    const ctx = parseContext([
      "--model",
      "claude-sonnet-4-20250514",
      "--api-key",
      "sk-test",
      "--system-prompt",
      "You are X",
      "--max-turns",
      "10",
      "--print",
      "--pipe",
    ]);
    expect(ctx.model).toBe("claude-sonnet-4-20250514");
    expect(ctx.apiKey).toBe("sk-test");
    expect(ctx.systemPrompt).toBe("You are X");
    expect(ctx.maxTurns).toBe(10);
    expect(ctx.print).toBe(true);
    expect(ctx.pipe).toBe(true);
    expect(ctx.executeMode).toBe(true);
  });
});
