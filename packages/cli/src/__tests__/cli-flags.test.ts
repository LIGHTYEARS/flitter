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

// ── Part A: New CLI Flags ────────────────────────────────

describe("New CLI flag parsing (Part A)", () => {
  // 逆向: i$T dangerouslyAllowAll (chunk-006.js:38207-38211)
  test("--dangerously-allow-all is a boolean flag", () => {
    const opts = parseOpts(["--dangerously-allow-all"]);
    expect(opts.dangerouslyAllowAll).toBe(true);
  });

  test("--dangerously-allow-all defaults to undefined", () => {
    const opts = parseOpts([]);
    expect(opts.dangerouslyAllowAll).toBeUndefined();
  });

  test("--allowedTools accepts comma-separated list", () => {
    const opts = parseOpts(["--allowedTools", "Read,Write,Grep"]);
    expect(opts.allowedTools).toBe("Read,Write,Grep");
  });

  test("--disallowedTools accepts comma-separated list", () => {
    const opts = parseOpts(["--disallowedTools", "Bash,mcp__*"]);
    expect(opts.disallowedTools).toBe("Bash,mcp__*");
  });

  test("--no-shell-cmd is recognized", () => {
    const opts = parseOpts(["--no-shell-cmd"]);
    expect(opts.shellCmd).toBe(false);
  });

  test("--toolbox is a boolean flag", () => {
    const opts = parseOpts(["--toolbox"]);
    expect(opts.toolbox).toBe(true);
  });

  test("--include-co-authors is a boolean flag", () => {
    const opts = parseOpts(["--include-co-authors"]);
    expect(opts.includeCoAuthors).toBe(true);
  });

  test("--output-format accepts format string", () => {
    const opts = parseOpts(["--output-format", "json"]);
    expect(opts.outputFormat).toBe("json");
  });
});

describe("New CLI flags in CliContext (Part A)", () => {
  // 逆向: ua() in chunk-005.js:4080 — dangerouslyAllowAll wiring
  test("--dangerously-allow-all maps to ctx.dangerouslyAllowAll", () => {
    const ctx = parseContext(["--dangerously-allow-all"]);
    expect(ctx.dangerouslyAllowAll).toBe(true);
  });

  test("--allowedTools is split into array in context", () => {
    const ctx = parseContext(["--allowedTools", "Read,Write,Grep"]);
    expect(ctx.allowedTools).toEqual(["Read", "Write", "Grep"]);
  });

  test("--allowedTools handles whitespace in list", () => {
    const ctx = parseContext(["--allowedTools", "Read, Write , Grep"]);
    expect(ctx.allowedTools).toEqual(["Read", "Write", "Grep"]);
  });

  test("--disallowedTools is split into array in context", () => {
    const ctx = parseContext(["--disallowedTools", "Bash,mcp__dangerous"]);
    expect(ctx.disallowedTools).toEqual(["Bash", "mcp__dangerous"]);
  });

  test("--no-shell-cmd maps to ctx.noShellCmd=true", () => {
    const ctx = parseContext(["--no-shell-cmd"]);
    expect(ctx.noShellCmd).toBe(true);
  });

  test("without --no-shell-cmd, noShellCmd is undefined", () => {
    const ctx = parseContext([]);
    expect(ctx.noShellCmd).toBeUndefined();
  });

  test("--toolbox maps to ctx.toolbox=true", () => {
    const ctx = parseContext(["--toolbox"]);
    expect(ctx.toolbox).toBe(true);
  });

  test("--include-co-authors maps to ctx.includeCoAuthors=true", () => {
    const ctx = parseContext(["--include-co-authors"]);
    expect(ctx.includeCoAuthors).toBe(true);
  });

  test("--output-format json maps to ctx.outputFormat='json'", () => {
    const ctx = parseContext(["--output-format", "json"]);
    expect(ctx.outputFormat).toBe("json");
  });

  test("--output-format markdown maps correctly", () => {
    const ctx = parseContext(["--output-format", "markdown"]);
    expect(ctx.outputFormat).toBe("markdown");
  });

  test("--output-format with invalid value maps to undefined", () => {
    const ctx = parseContext(["--output-format", "xml"]);
    expect(ctx.outputFormat).toBeUndefined();
  });

  test("new flags default to undefined when not provided", () => {
    const ctx = parseContext([]);
    expect(ctx.dangerouslyAllowAll).toBeUndefined();
    expect(ctx.allowedTools).toBeUndefined();
    expect(ctx.disallowedTools).toBeUndefined();
    expect(ctx.noShellCmd).toBeUndefined();
    expect(ctx.toolbox).toBeUndefined();
    expect(ctx.includeCoAuthors).toBeUndefined();
    expect(ctx.outputFormat).toBeUndefined();
  });
});

// ── Part B: New CLI Commands ─────────────────────────────

describe("New CLI commands (Part B)", () => {
  test("review command is registered", () => {
    const program = createProgram("0.0.0-test");
    const reviewCmd = program.commands.find(
      (c: { name: () => string }) => c.name() === "review",
    );
    expect(reviewCmd).toBeDefined();
  });

  test("mcp doctor subcommand is registered", () => {
    const program = createProgram("0.0.0-test");
    const mcpCmd = program.commands.find(
      (c: { name: () => string }) => c.name() === "mcp",
    );
    expect(mcpCmd).toBeDefined();
    const doctorCmd = mcpCmd?.commands?.find(
      (c: { name: () => string }) => c.name() === "doctor",
    );
    expect(doctorCmd).toBeDefined();
  });

  test("mcp approve subcommand is registered", () => {
    const program = createProgram("0.0.0-test");
    const mcpCmd = program.commands.find(
      (c: { name: () => string }) => c.name() === "mcp",
    );
    const approveCmd = mcpCmd?.commands?.find(
      (c: { name: () => string }) => c.name() === "approve",
    );
    expect(approveCmd).toBeDefined();
  });

  test("mcp oauth subcommand is registered with login/logout", () => {
    const program = createProgram("0.0.0-test");
    const mcpCmd = program.commands.find(
      (c: { name: () => string }) => c.name() === "mcp",
    );
    const oauthCmd = mcpCmd?.commands?.find(
      (c: { name: () => string }) => c.name() === "oauth",
    );
    expect(oauthCmd).toBeDefined();
    const loginCmd = oauthCmd?.commands?.find(
      (c: { name: () => string }) => c.name() === "login",
    );
    expect(loginCmd).toBeDefined();
    const logoutCmd = oauthCmd?.commands?.find(
      (c: { name: () => string }) => c.name() === "logout",
    );
    expect(logoutCmd).toBeDefined();
  });

  test("threads dashboard subcommand is registered", () => {
    const program = createProgram("0.0.0-test");
    const threadsCmd = program.commands.find(
      (c: { name: () => string }) => c.name() === "threads",
    );
    const dashCmd = threadsCmd?.commands?.find(
      (c: { name: () => string }) => c.name() === "dashboard",
    );
    expect(dashCmd).toBeDefined();
  });
});
