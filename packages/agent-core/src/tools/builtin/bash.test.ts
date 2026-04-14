/**
 * Tests for BashTool
 *
 * Uses real subprocesses (echo, sleep, pwd, cat, etc.)
 * via node:test and node:assert/strict.
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { BashTool } from "./bash";
import type { ToolContext } from "../types";

function createMockContext(overrides?: Partial<ToolContext>): ToolContext {
  return {
    workingDirectory: process.cwd(),
    signal: new AbortController().signal,
    threadId: "test-thread",
    config: {} as any,
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
    const schema = BashTool.inputSchema as any;
    assert.equal(schema.type, "object");
    assert.ok(schema.properties.command);
    assert.equal(schema.properties.command.type, "string");
    assert.ok(schema.properties.timeout);
    assert.equal(schema.properties.timeout.type, "number");
    assert.ok(schema.properties.description);
    assert.equal(schema.properties.description.type, "string");
    assert.deepEqual(schema.required, ["command"]);
  });

  it("executionProfile is { serial: true }", () => {
    assert.deepEqual(BashTool.executionProfile, { serial: true });
  });
});

// ─── Basic commands ──────────────────────────────────────

describe("BashTool basic commands", () => {
  it("captures stdout from echo", async () => {
    const result = await BashTool.execute(
      { command: "echo 'hello'" },
      createMockContext(),
    );
    assert.equal(result.status, "done");
    assert.ok(result.content?.includes("hello"));
  });

  it("captures stderr output", async () => {
    const result = await BashTool.execute(
      { command: "echo 'err' >&2" },
      createMockContext(),
    );
    assert.equal(result.status, "done");
    assert.ok(result.content?.includes("err"));
    const data = result.data as any;
    assert.ok(data.stderr.includes("err"));
  });

  it("returns status 'done' and exitCode 0 for successful command", async () => {
    const result = await BashTool.execute(
      { command: "echo 'ok'" },
      createMockContext(),
    );
    assert.equal(result.status, "done");
    const data = result.data as any;
    assert.equal(data.exitCode, 0);
  });

  it("returns status 'done' with non-zero exitCode for failing command", async () => {
    const result = await BashTool.execute(
      { command: "false" },
      createMockContext(),
    );
    assert.equal(result.status, "done");
    const data = result.data as any;
    assert.equal(data.exitCode, 1);
  });

  it("data contains stdout, stderr, and exitCode", async () => {
    const result = await BashTool.execute(
      { command: "echo 'out' && echo 'err' >&2" },
      createMockContext(),
    );
    assert.equal(result.status, "done");
    const data = result.data as any;
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
    const data = result.data as any;
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
    const result = await BashTool.execute(
      { command: "echo 'short output'" },
      createMockContext(),
    );
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
    const result = await BashTool.execute(
      { command: "echo 'hello' | cat" },
      createMockContext(),
    );
    assert.equal(result.status, "done");
    assert.ok(result.content?.includes("hello"));
  });
});

// ─── Input validation ────────────────────────────────────

describe("BashTool input validation", () => {
  it("returns error for empty command", async () => {
    const result = await BashTool.execute(
      { command: "" },
      createMockContext(),
    );
    assert.equal(result.status, "error");
    assert.ok(result.error?.includes("non-empty"));
  });

  it("returns error for non-string command", async () => {
    const result = await BashTool.execute(
      { command: 123 as any },
      createMockContext(),
    );
    assert.equal(result.status, "error");
    assert.ok(result.error?.includes("non-empty"));
  });
});
