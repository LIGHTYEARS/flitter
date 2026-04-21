/**
 * Tests for BashTool
 *
 * Uses real subprocesses (echo, sleep, pwd, cat, etc.)
 * via node:test and node:assert/strict.
 */

import assert from "node:assert/strict";
import { mkdtempSync, rmdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, it } from "node:test";
import type { Config } from "@flitter/schemas";
import type { ToolContext } from "../types";
import { BashTool } from "./bash";

interface BashResultData {
  stdout: string;
  stderr: string;
  exitCode: number;
}

function createMockContext(overrides?: Partial<ToolContext>): ToolContext {
  return {
    workingDirectory: process.cwd(),
    signal: new AbortController().signal,
    threadId: "test-thread",
    config: {} as unknown as Config,
    ...overrides,
  };
}

// ─── ToolSpec shape ──────────────────────────────────────

describe("BashTool ToolSpec shape", () => {
  it("has name 'Bash' and source 'builtin'", () => {
    assert.equal(BashTool.name, "Bash");
    assert.equal(BashTool.source, "builtin");
  });

  it("inputSchema has command as required, timeout and description as optional", () => {
    const schema = BashTool.inputSchema as Record<string, unknown>;
    const properties = schema.properties as Record<string, Record<string, unknown>>;
    assert.equal(schema.type, "object");
    assert.ok(properties.command);
    assert.equal(properties.command.type, "string");
    assert.ok(properties.timeout);
    assert.equal(properties.timeout.type, "number");
    assert.ok(properties.description);
    assert.equal(properties.description.type, "string");
    assert.deepEqual(schema.required, ["command"]);
  });

  it("executionProfile includes serial and disableTimeout", () => {
    assert.deepEqual(BashTool.executionProfile, { serial: true, disableTimeout: true });
  });
});

// ─── Basic commands ──────────────────────────────────────

describe("BashTool basic commands", () => {
  it("captures stdout from echo", async () => {
    const result = await BashTool.execute({ command: "echo 'hello'" }, createMockContext());
    assert.equal(result.status, "done");
    assert.ok(result.content?.includes("hello"));
  });

  it("captures stderr output", async () => {
    const result = await BashTool.execute({ command: "echo 'err' >&2" }, createMockContext());
    assert.equal(result.status, "done");
    assert.ok(result.content?.includes("err"));
    const data = result.data as BashResultData;
    assert.ok(data.stderr.includes("err"));
  });

  it("returns status 'done' and exitCode 0 for successful command", async () => {
    const result = await BashTool.execute({ command: "echo 'ok'" }, createMockContext());
    assert.equal(result.status, "done");
    const data = result.data as BashResultData;
    assert.equal(data.exitCode, 0);
  });

  it("returns status 'done' with non-zero exitCode for failing command", async () => {
    const result = await BashTool.execute({ command: "false" }, createMockContext());
    assert.equal(result.status, "done");
    const data = result.data as BashResultData;
    assert.equal(data.exitCode, 1);
  });

  it("data contains stdout, stderr, and exitCode", async () => {
    const result = await BashTool.execute(
      { command: "echo 'out' && echo 'err' >&2" },
      createMockContext(),
    );
    assert.equal(result.status, "done");
    const data = result.data as BashResultData;
    assert.ok(typeof data.stdout === "string");
    assert.ok(typeof data.stderr === "string");
    assert.ok(typeof data.exitCode === "number");
    assert.ok(data.stdout.includes("out"));
    assert.ok(data.stderr.includes("err"));
    assert.equal(data.exitCode, 0);
  });
});

// ─── Timeout ─────────────────────────────────────────────

describe("BashTool timeout", () => {
  it("kills process that exceeds timeout and reports timed out", { timeout: 15000 }, async () => {
    const result = await BashTool.execute(
      { command: "sleep 10", timeout: 200 },
      createMockContext(),
    );
    assert.equal(result.status, "done");
    assert.ok(result.content?.includes("timed out"));
  });

  it("timed out result includes exitCode in data", { timeout: 15000 }, async () => {
    const result = await BashTool.execute(
      { command: "sleep 10", timeout: 200 },
      createMockContext(),
    );
    const data = result.data as BashResultData;
    assert.ok(typeof data.exitCode === "number");
    assert.ok(result.content?.includes("200ms"));
  });
});

// ─── AbortSignal ─────────────────────────────────────────

describe("BashTool abort signal", () => {
  it("returns cancelled error when signal is aborted", { timeout: 15000 }, async () => {
    const controller = new AbortController();

    // Abort after a short delay
    setTimeout(() => controller.abort(), 100);

    const result = await BashTool.execute(
      { command: "sleep 10" },
      createMockContext({ signal: controller.signal }),
    );

    assert.equal(result.status, "error");
    assert.ok(result.error?.includes("cancelled"));
  });
});

// ─── Output truncation ──────────────────────────────────

describe("BashTool output truncation", () => {
  it("returns small output as-is without truncation", async () => {
    const result = await BashTool.execute({ command: "echo 'short output'" }, createMockContext());
    assert.equal(result.status, "done");
    assert.ok(!result.content?.includes("[output truncated"));
  });

  it("truncates output exceeding 30000 characters", async () => {
    // Generate >30000 chars: print 'x' repeated 35000 times
    const result = await BashTool.execute(
      { command: "python3 -c \"print('x' * 35000)\"" },
      createMockContext(),
    );
    assert.equal(result.status, "done");
    assert.ok(result.content?.includes("[output truncated"));
    assert.ok(result.content?.includes("chars omitted]"));
    // Truncated content should be around MAX_OUTPUT_LENGTH
    assert.ok((result.content?.length ?? 0) <= 31000);
  });
});

// ─── Working directory ───────────────────────────────────

describe("BashTool working directory", () => {
  it("uses the provided working directory", async () => {
    const tempDir = mkdtempSync(join(tmpdir(), "bash-tool-test-"));

    try {
      const result = await BashTool.execute(
        { command: "pwd" },
        createMockContext({ workingDirectory: tempDir }),
      );
      assert.equal(result.status, "done");
      assert.ok(result.content?.includes(tempDir));
    } finally {
      rmdirSync(tempDir);
    }
  });
});

// ─── Shell features ──────────────────────────────────────

describe("BashTool shell features", () => {
  it("supports pipe commands", async () => {
    const result = await BashTool.execute({ command: "echo 'hello' | cat" }, createMockContext());
    assert.equal(result.status, "done");
    assert.ok(result.content?.includes("hello"));
  });
});

// ─── Input validation ────────────────────────────────────

describe("BashTool input validation", () => {
  it("returns error for empty command", async () => {
    const result = await BashTool.execute({ command: "" }, createMockContext());
    assert.equal(result.status, "error");
    assert.ok(result.error?.includes("non-empty"));
  });

  it("returns error for non-string command", async () => {
    const result = await BashTool.execute(
      { command: 123 as unknown as string },
      createMockContext(),
    );
    assert.equal(result.status, "error");
    assert.ok(result.error?.includes("non-empty"));
  });
});

// ─── preprocessArgs: cd interception (GAP-TOOL-30) ──────

describe("BashTool preprocessArgs cd interception", () => {
  const preprocess = BashTool.preprocessArgs!;

  it("cmd alias still works", () => {
    const result = preprocess({ cmd: "echo hello" });
    assert.equal(result.command, "echo hello");
  });

  it("simple cd path rewrites cwd", () => {
    const result = preprocess({ command: "cd /tmp/foo" });
    assert.equal(result.cwd, "/tmp/foo");
    assert.equal(result.command, "true");
  });

  it("cd with && chain rewrites cwd and keeps remainder", () => {
    const result = preprocess({ command: "cd /tmp/foo && ls -la" });
    assert.equal(result.cwd, "/tmp/foo");
    assert.equal(result.command, "ls -la");
  });

  it("cd with ; chain rewrites cwd and keeps remainder", () => {
    const result = preprocess({ command: "cd /tmp/foo; npm install" });
    assert.equal(result.cwd, "/tmp/foo");
    assert.equal(result.command, "npm install");
  });

  it("cd with double-quoted path", () => {
    const result = preprocess({ command: 'cd "/tmp/path with spaces"' });
    assert.equal(result.cwd, "/tmp/path with spaces");
    assert.equal(result.command, "true");
  });

  it("cd with single-quoted path", () => {
    const result = preprocess({ command: "cd '/tmp/path with spaces'" });
    assert.equal(result.cwd, "/tmp/path with spaces");
    assert.equal(result.command, "true");
  });

  it("cd with ~ expands to HOME", () => {
    const home = process.env.HOME ?? process.env.USERPROFILE ?? "";
    const result = preprocess({ command: "cd ~/projects" });
    assert.equal(result.cwd, home + "/projects");
  });

  it("skips cd with dynamic path ($VAR)", () => {
    const result = preprocess({ command: "cd $WORKSPACE" });
    assert.equal(result.command, "cd $WORKSPACE");
    assert.equal(result.cwd, undefined);
  });

  it("skips cd with backtick substitution", () => {
    const result = preprocess({ command: "cd `pwd`" });
    assert.equal(result.command, "cd `pwd`");
    assert.equal(result.cwd, undefined);
  });

  it("does not intercept non-cd commands", () => {
    const result = preprocess({ command: "ls -la" });
    assert.equal(result.command, "ls -la");
    assert.equal(result.cwd, undefined);
  });

  it("explicit cwd takes precedence over cd", () => {
    const result = preprocess({ command: "cd /other", cwd: "/explicit" });
    assert.equal(result.cwd, "/explicit");
    // cd detection is skipped when cwd is already set
  });

  it("expands ~ in explicit cwd", () => {
    const home = process.env.HOME ?? process.env.USERPROFILE ?? "";
    const result = preprocess({ command: "ls", cwd: "~/foo" });
    assert.equal(result.cwd, home + "/foo");
  });
});
