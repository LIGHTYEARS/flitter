import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { spawn } from "./process.ts";

describe("spawn", () => {
  it("echo hello returns stdout containing 'hello'", async () => {
    const result = await spawn("echo", ["hello"]);
    assert.match(result.stdout, /hello/);
  });

  it("captures stderr output", async () => {
    const result = await spawn("bash", ["-c", "echo err >&2"]);
    assert.match(result.stderr, /err/);
  });

  it("successful command returns exitCode 0", async () => {
    const result = await spawn("true", []);
    assert.equal(result.exitCode, 0);
  });

  it("failing command returns non-zero exitCode without rejecting", async () => {
    const result = await spawn("false", []);
    assert.ok(result.exitCode !== 0, `Expected non-zero exit code, got ${result.exitCode}`);
  });

  it("command not found (ENOENT) rejects", async () => {
    await assert.rejects(
      () => spawn("nonexistent_command_xyz_123", []),
      (err: unknown) => {
        assert.ok(err instanceof Error);
        return true;
      },
    );
  });

  it("cwd option works", async () => {
    const result = await spawn("pwd", [], { cwd: "/tmp" });
    assert.match(result.stdout.trim(), /\/tmp/);
  });

  it("timeout option kills long-running process", async () => {
    await assert.rejects(
      () => spawn("sleep", ["10"], { timeout: 100 }),
      (err: unknown) => {
        assert.ok(err instanceof Error);
        return true;
      },
    );
  });

  it("signal option aborts process", async () => {
    const ac = new AbortController();
    const promise = spawn("sleep", ["10"], { signal: ac.signal });
    // Abort after a short delay
    setTimeout(() => ac.abort(), 50);
    await assert.rejects(
      () => promise,
      (err: unknown) => {
        assert.ok(err instanceof Error);
        return true;
      },
    );
  });
});
