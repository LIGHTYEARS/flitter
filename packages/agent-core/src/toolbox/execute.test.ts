/**
 * Toolbox execute handler — unit tests
 *
 * Covers: args passing, output collection, truncation, text-format args, timeout.
 */

import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import { Readable, Writable } from "node:stream";
import { describe, it } from "node:test";
import { argsToTextFormat, executeToolboxScript } from "./execute";
import type { SpawnFn } from "./describe";

// ─── Mock spawn factory ─────────────────────────────────

function createMockSpawn(opts: {
  stdout?: string;
  stderr?: string;
  exitCode?: number;
  delay?: number;
  error?: Error;
  captureStdin?: (data: string) => void;
}): SpawnFn {
  return (_command, _args, _options) => {
    const child = new EventEmitter() as ReturnType<SpawnFn>;
    const stdoutStream = new Readable({ read() {} });
    const stderrStream = new Readable({ read() {} });

    let stdinData = "";
    const stdinStream = new Writable({
      write(chunk, _enc, cb) {
        stdinData += chunk.toString();
        cb();
      },
      final(cb) {
        if (opts.captureStdin) opts.captureStdin(stdinData);
        cb();
      },
    });

    child.stdout = stdoutStream;
    child.stderr = stderrStream;
    child.stdin = stdinStream;
    child.killed = false;
    child.kill = () => { child.killed = true; return true; };
    child.pid = 12345;

    const emit = () => {
      if (opts.error) {
        child.emit("error", opts.error);
        return;
      }
      if (opts.stdout) stdoutStream.push(Buffer.from(opts.stdout));
      stdoutStream.push(null);
      if (opts.stderr) stderrStream.push(Buffer.from(opts.stderr));
      stderrStream.push(null);
      child.emit("close", opts.exitCode ?? 0);
    };

    if (opts.delay) {
      setTimeout(emit, opts.delay);
    } else {
      setImmediate(emit);
    }

    return child;
  };
}

// ─── executeToolboxScript ────────────────────────────────

describe("executeToolboxScript", () => {
  it("passes args as JSON on stdin and collects stdout", async () => {
    let capturedStdin = "";

    const result = await executeToolboxScript(
      "/fake/tool",
      { filter: "auth", verbose: true },
      {
        spawn: createMockSpawn({
          stdout: "Test passed!",
          captureStdin: (d) => { capturedStdin = d; },
        }),
      },
    );

    assert.equal(result.output, "Test passed!");
    assert.equal(result.exitCode, 0);
    assert.equal(result.truncated, false);
    assert.equal(capturedStdin, JSON.stringify({ filter: "auth", verbose: true }));
  });

  it("reports non-zero exit code", async () => {
    const result = await executeToolboxScript(
      "/fake/tool",
      {},
      {
        spawn: createMockSpawn({ stdout: "error output", exitCode: 1 }),
      },
    );

    assert.equal(result.exitCode, 1);
    assert.equal(result.output, "error output");
  });

  it("uses text format when format is text", async () => {
    let capturedStdin = "";

    await executeToolboxScript(
      "/fake/tool",
      { name: "test", count: 5 },
      {
        format: "text",
        spawn: createMockSpawn({
          stdout: "ok",
          captureStdin: (d) => { capturedStdin = d; },
        }),
      },
    );

    assert.ok(capturedStdin.includes("name: test"));
    assert.ok(capturedStdin.includes("count: 5"));
  });

  it("truncates output exceeding 30k chars", async () => {
    const longOutput = "x".repeat(35_000);

    const result = await executeToolboxScript(
      "/fake/tool",
      {},
      {
        spawn: createMockSpawn({ stdout: longOutput }),
      },
    );

    assert.equal(result.truncated, true);
    assert.ok(result.output.includes("[Output truncated]"));
    assert.ok(result.output.length <= 35_000); // Truncated + marker
  });

  it("handles spawn error gracefully", async () => {
    const result = await executeToolboxScript(
      "/fake/tool",
      {},
      {
        spawn: createMockSpawn({ error: new Error("ENOENT") }),
      },
    );

    assert.equal(result.exitCode, -1);
    assert.ok(result.output.includes("Failed to execute toolbox"));
  });

  it("handles timeout", async () => {
    const result = await executeToolboxScript(
      "/fake/tool",
      {},
      {
        timeout: 100,
        spawn: createMockSpawn({ stdout: "slow...", delay: 500 }),
      },
    );

    assert.equal(result.exitCode, -1);
    assert.ok(result.output.includes("[Execution timed out]"));
  });
});

// ─── argsToTextFormat (逆向: j5R) ────────────────────────

describe("argsToTextFormat", () => {
  it("serializes simple key-value pairs", () => {
    const result = argsToTextFormat({ name: "test", count: 42 });
    assert.ok(result.includes("name: test"));
    assert.ok(result.includes("count: 42"));
  });

  it("serializes booleans as true/false", () => {
    const result = argsToTextFormat({ flag: true, other: false });
    assert.ok(result.includes("flag: true"));
    assert.ok(result.includes("other: false"));
  });

  it("serializes null and undefined", () => {
    const result = argsToTextFormat({ a: null, b: undefined });
    assert.ok(result.includes("a: null"));
    assert.ok(result.includes("b: undefined"));
  });

  it("flattens arrays with index suffix", () => {
    const result = argsToTextFormat({ items: ["a", "b", "c"] });
    assert.ok(result.includes("items_0: a"));
    assert.ok(result.includes("items_1: b"));
    assert.ok(result.includes("items_2: c"));
  });

  it("flattens nested objects with key suffix", () => {
    const result = argsToTextFormat({ config: { host: "localhost", port: 8080 } });
    assert.ok(result.includes("config_host: localhost"));
    assert.ok(result.includes("config_port: 8080"));
  });

  it("ends with newline", () => {
    const result = argsToTextFormat({ x: 1 });
    assert.ok(result.endsWith("\n"));
  });
});
