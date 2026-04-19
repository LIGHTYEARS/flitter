/**
 * ToolboxService — unit tests
 *
 * Covers: directory scanning, tool registration, duplicate detection,
 *         non-existent directories, dispose cleanup.
 *
 * Uses mock spawn and temporary directories to test end-to-end flow
 * without real subprocesses.
 */

import assert from "node:assert/strict";
import * as fs from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { afterEach, beforeEach, describe, it } from "node:test";
import { EventEmitter } from "node:events";
import { Readable, Writable } from "node:stream";
import { ToolRegistry } from "../tools/registry";
import { ToolboxService } from "./toolbox-service";
import type { SpawnFn } from "./describe";

// ─── Test helpers ────────────────────────────────────────

let testDir: string;
let registry: ToolRegistry;

function setupTestDir(): string {
  const dir = join(tmpdir(), `toolbox-test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

function writeScript(dir: string, name: string, content: string): string {
  const path = join(dir, name);
  fs.writeFileSync(path, content);
  fs.chmodSync(path, 0o755);
  return path;
}

/**
 * Create a mock spawn function keyed by script path.
 * Each path maps to a JSON describe output.
 */
function createScriptSpawn(
  scripts: Record<string, { name: string; description: string; inputSchema?: Record<string, unknown> }>,
): SpawnFn {
  return (command, _args, options) => {
    const child = new EventEmitter() as ReturnType<SpawnFn>;
    const stdoutStream = new Readable({ read() {} });
    const stderrStream = new Readable({ read() {} });
    const stdinStream = new Writable({ write(_chunk, _enc, cb) { cb(); } });

    child.stdout = stdoutStream;
    child.stderr = stderrStream;
    child.stdin = stdinStream;
    child.killed = false;
    child.kill = () => { child.killed = true; return true; };
    child.pid = 12345;

    setImmediate(() => {
      const action = options.env.TOOLBOX_ACTION;
      const scriptDef = scripts[command];

      if (action === "describe" && scriptDef) {
        const json = JSON.stringify({
          name: scriptDef.name,
          description: scriptDef.description,
          inputSchema: scriptDef.inputSchema ?? {
            type: "object",
            properties: {},
          },
        });
        stdoutStream.push(Buffer.from(json));
        stdoutStream.push(null);
        stderrStream.push(null);
        child.emit("close", 0);
      } else if (action === "execute" && scriptDef) {
        stdoutStream.push(Buffer.from("Executed successfully"));
        stdoutStream.push(null);
        stderrStream.push(null);
        child.emit("close", 0);
      } else {
        stdoutStream.push(null);
        stderrStream.push(Buffer.from("Unknown script or action"));
        stderrStream.push(null);
        child.emit("close", 1);
      }
    });

    return child;
  };
}

// ─── Test suite ─────────────────────────────────────────

describe("ToolboxService", () => {
  beforeEach(() => {
    testDir = setupTestDir();
    registry = new ToolRegistry();
  });

  afterEach(() => {
    // Clean up temp dir
    try {
      fs.rmSync(testDir, { recursive: true, force: true });
    } catch {
      // ignore cleanup errors
    }
  });

  it("scans a directory and registers tools", async () => {
    const scriptPath1 = writeScript(testDir, "run-tests", "#!/bin/bash\n");
    const scriptPath2 = writeScript(testDir, "deploy", "#!/bin/bash\n");

    const spawn = createScriptSpawn({
      [scriptPath1]: { name: "run-tests", description: "Run tests" },
      [scriptPath2]: { name: "deploy", description: "Deploy app" },
    });

    const service = new ToolboxService(registry, [testDir], { spawn });
    await service.scan();

    assert.ok(registry.has("tb__run-tests"));
    assert.ok(registry.has("tb__deploy"));

    const status = service.getStatus();
    assert.equal(status.type, "ready");
    assert.equal(status.toolCount, 2);
  });

  it("skips non-existent directories", async () => {
    const spawn = createScriptSpawn({});
    const service = new ToolboxService(registry, ["/nonexistent/dir"], { spawn });
    await service.scan();

    assert.equal(service.getStatus().type, "ready");
    assert.equal(service.getStatus().toolCount, 0);
  });

  it("skips .md files and hidden files", async () => {
    writeScript(testDir, "README.md", "# readme");
    writeScript(testDir, ".hidden", "hidden");
    const scriptPath = writeScript(testDir, "real-tool", "#!/bin/bash\n");

    const spawn = createScriptSpawn({
      [scriptPath]: { name: "real-tool", description: "A real tool" },
    });

    const service = new ToolboxService(registry, [testDir], { spawn });
    await service.scan();

    assert.ok(registry.has("tb__real-tool"));
    assert.equal(service.getTools().filter((t) => t.status === "registered").length, 1);
  });

  it("detects duplicate tool names", async () => {
    const dir2 = setupTestDir();
    const scriptPath1 = writeScript(testDir, "tool-a", "#!/bin/bash\n");
    const scriptPath2 = writeScript(dir2, "tool-a-copy", "#!/bin/bash\n");

    // Both scripts describe themselves as "my-tool" → same tb__my-tool name
    const spawn = createScriptSpawn({
      [scriptPath1]: { name: "my-tool", description: "First" },
      [scriptPath2]: { name: "my-tool", description: "Second" },
    });

    const service = new ToolboxService(registry, [testDir, dir2], { spawn });
    await service.scan();

    // Only one should be registered
    assert.equal(service.getStatus().toolCount, 1);

    const tools = service.getTools();
    const duplicates = tools.filter((t) => t.status === "duplicate");
    assert.equal(duplicates.length, 1);

    // Clean up second dir
    fs.rmSync(dir2, { recursive: true, force: true });
  });

  it("marks failed probes correctly", async () => {
    writeScript(testDir, "broken-tool", "#!/bin/bash\nexit 1");

    // Spawn returns exit code 1 for unknown scripts
    const spawn = createScriptSpawn({});

    const service = new ToolboxService(registry, [testDir], { spawn });
    await service.scan();

    const tools = service.getTools();
    assert.equal(tools.length, 1);
    assert.equal(tools[0].status, "failed");
  });

  it("dispose unregisters all tools", async () => {
    const scriptPath = writeScript(testDir, "my-tool", "#!/bin/bash\n");

    const spawn = createScriptSpawn({
      [scriptPath]: { name: "my-tool", description: "A tool" },
    });

    const service = new ToolboxService(registry, [testDir], { spawn });
    await service.scan();

    assert.ok(registry.has("tb__my-tool"));

    service.dispose();

    assert.ok(!registry.has("tb__my-tool"));
  });

  it("cleans up old registrations on re-scan", async () => {
    const scriptPath = writeScript(testDir, "tool-v1", "#!/bin/bash\n");

    const spawn = createScriptSpawn({
      [scriptPath]: { name: "tool-v1", description: "V1" },
    });

    const service = new ToolboxService(registry, [testDir], { spawn });
    await service.scan();

    assert.ok(registry.has("tb__tool-v1"));

    // Remove the script file
    fs.unlinkSync(scriptPath);

    // Re-scan — the tool should be unregistered
    await service.scan();

    assert.ok(!registry.has("tb__tool-v1"));
    assert.equal(service.getStatus().toolCount, 0);
  });

  it("registered tool executes via ToolRegistry", async () => {
    const scriptPath = writeScript(testDir, "exec-tool", "#!/bin/bash\n");

    const spawn = createScriptSpawn({
      [scriptPath]: {
        name: "exec-tool",
        description: "Executable tool",
        inputSchema: { type: "object", properties: { arg: { type: "string" } } },
      },
    });

    const service = new ToolboxService(registry, [testDir], { spawn });
    await service.scan();

    const tool = registry.get("tb__exec-tool");
    assert.ok(tool);

    // Execute the tool
    const result = await tool.execute(
      { arg: "test" },
      {
        workingDirectory: "/tmp",
        signal: new AbortController().signal,
        threadId: "test-thread",
        config: { settings: {} as never, secrets: {} as never },
      },
    );

    assert.equal(result.status, "done");
    assert.equal(result.content, "Executed successfully");
  });
});
