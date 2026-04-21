/**
 * Tests for TOOL-06: shell_command tool
 *
 * 逆向: amp-cli-reversed/modules/1299_unknown_q5T.js
 * 逆向: amp-cli-reversed/modules/2026_tail_anonymous.js:143002 (tool spec)
 */
import { describe, expect, it } from "bun:test";
import type { ToolContext } from "../../types";
import { ShellCommandTool } from "../shell-command";

// ─── Helpers ─────────────────────────────────────────────

function makeContext(overrides: Partial<ToolContext> = {}): ToolContext {
  return {
    workingDirectory: process.cwd(),
    signal: new AbortController().signal,
    threadId: "test-thread",
    config: {} as ToolContext["config"],
    ...overrides,
  };
}

// ─── Tool Spec ──────────────────────────────────────────

describe("ShellCommandTool spec", () => {
  it("has the correct name", () => {
    expect(ShellCommandTool.name).toBe("shell_command");
  });

  it("has serial execution and disableTimeout", () => {
    expect(ShellCommandTool.executionProfile?.serial).toBe(true);
    expect(ShellCommandTool.executionProfile?.disableTimeout).toBe(true);
  });

  it("is a builtin tool", () => {
    expect(ShellCommandTool.source).toBe("builtin");
  });

  it("accepts command, workdir, timeout_ms, login params", () => {
    const props = (ShellCommandTool.inputSchema as Record<string, unknown>).properties as Record<
      string,
      unknown
    >;
    expect(props.command).toBeDefined();
    expect(props.workdir).toBeDefined();
    expect(props.timeout_ms).toBeDefined();
    expect(props.login).toBeDefined();
  });
});

// ─── preprocessArgs ─────────────────────────────────────

describe("ShellCommandTool.preprocessArgs", () => {
  const preprocess = ShellCommandTool.preprocessArgs!;

  it("maps workdir → cwd", () => {
    const result = preprocess({ command: "ls", workdir: "/tmp" });
    expect(result.cwd).toBe("/tmp");
    expect(result.workdir).toBeUndefined();
  });

  it("maps timeout_ms → timeout", () => {
    const result = preprocess({ command: "ls", timeout_ms: 5000 });
    expect(result.timeout).toBe(5000);
    expect(result.timeout_ms).toBeUndefined();
  });

  it("strips login parameter", () => {
    const result = preprocess({ command: "ls", login: true });
    expect(result.login).toBeUndefined();
  });

  it("preserves command parameter", () => {
    const result = preprocess({ command: "echo hello" });
    expect(result.command).toBe("echo hello");
  });

  it("does not overwrite existing cwd with workdir", () => {
    const result = preprocess({ command: "ls", cwd: "/existing", workdir: "/other" });
    // cwd already set — workdir should not override
    expect(result.cwd).toBe("/existing");
  });

  it("inherits Bash cd interception", () => {
    const result = preprocess({ command: "cd /tmp && ls" });
    expect(result.cwd).toBe("/tmp");
    expect(result.command).toBe("ls");
  });

  it("maps all params together", () => {
    const result = preprocess({
      command: "pwd",
      workdir: "/home",
      timeout_ms: 10000,
      login: false,
    });
    expect(result.command).toBe("pwd");
    expect(result.cwd).toBe("/home");
    expect(result.timeout).toBe(10000);
    expect(result.login).toBeUndefined();
    expect(result.workdir).toBeUndefined();
    expect(result.timeout_ms).toBeUndefined();
  });
});

// ─── Execution ──────────────────────────────────────────

describe("ShellCommandTool.execute", () => {
  it("executes a simple echo command", async () => {
    const result = await ShellCommandTool.execute({ command: "echo hello" }, makeContext());
    expect(result.status).toBe("done");
    expect(result.content).toContain("hello");
  });

  it("uses workdir after preprocessArgs mapping", async () => {
    const args = ShellCommandTool.preprocessArgs!({ command: "pwd", workdir: "/tmp" });
    const result = await ShellCommandTool.execute(args, makeContext());
    expect(result.status).toBe("done");
    expect(result.content).toContain("/tmp");
  });

  it("returns error for empty command", async () => {
    const result = await ShellCommandTool.execute({ command: "" }, makeContext());
    expect(result.status).toBe("error");
  });

  it("returns error for missing command", async () => {
    const result = await ShellCommandTool.execute({}, makeContext());
    expect(result.status).toBe("error");
  });
});
