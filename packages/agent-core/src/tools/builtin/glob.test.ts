/**
 * GlobTool unit tests
 *
 * Covers ToolSpec shape, glob patterns, path-limited matching, no-match,
 * absolute paths, and execution profile.
 */
import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";
import { GlobTool, globExecutionProfile } from "./glob";
import type { ToolContext } from "../types";
import type { Config } from "@flitter/schemas";

// ---------------------------------------------------------------------------
// Fixture helpers
// ---------------------------------------------------------------------------

function createTestFixture(): { dir: string; cleanup: () => void } {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "flitter-search-test-"));
  fs.mkdirSync(path.join(dir, "src"), { recursive: true });
  fs.mkdirSync(path.join(dir, "test"), { recursive: true });
  fs.writeFileSync(
    path.join(dir, "src", "index.ts"),
    "export const hello = 'world';\nexport function greet() {}\n",
  );
  fs.writeFileSync(
    path.join(dir, "src", "utils.ts"),
    "export function add(a: number, b: number) { return a + b; }\n",
  );
  fs.writeFileSync(
    path.join(dir, "src", "component.tsx"),
    "import React from 'react';\nexport const App = () => <div>hello</div>;\n",
  );
  fs.writeFileSync(
    path.join(dir, "test", "index.test.ts"),
    "import { hello } from '../src';\nassert(hello === 'world');\n",
  );
  fs.writeFileSync(path.join(dir, "README.md"), "# Test Project\n");
  fs.writeFileSync(path.join(dir, "package.json"), '{"name":"test"}\n');
  return {
    dir,
    cleanup: () => fs.rmSync(dir, { recursive: true, force: true }),
  };
}

function createMockContext(cwd: string): ToolContext {
  return {
    workingDirectory: cwd,
    signal: new AbortController().signal,
    threadId: "test-thread",
    config: {} as Config,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("GlobTool", () => {
  let fixture: ReturnType<typeof createTestFixture>;
  let ctx: ToolContext;

  beforeEach(() => {
    fixture = createTestFixture();
    ctx = createMockContext(fixture.dir);
  });

  afterEach(() => {
    fixture.cleanup();
  });

  // ─── ToolSpec shape ──────────────────────────────────────

  it("has correct ToolSpec shape", () => {
    assert.equal(GlobTool.name, "Glob");
    assert.equal(GlobTool.source, "builtin");
    assert.equal(GlobTool.isReadOnly, true);
    assert.equal(typeof GlobTool.execute, "function");
    assert.ok(GlobTool.inputSchema);
    assert.ok(GlobTool.description);
  });

  // ─── **/*.ts matches all .ts files ──────────────────────

  it("**/*.ts matches all .ts files", async () => {
    const result = await GlobTool.execute({ pattern: "**/*.ts" }, ctx);
    assert.equal(result.status, "done");
    assert.ok(result.content);
    const lines = result.content.split("\n").filter(Boolean);
    // Should find index.ts, utils.ts, index.test.ts (3 .ts files)
    assert.ok(lines.length >= 3, `Expected >= 3 .ts files, got ${lines.length}`);
    assert.ok(lines.every((l: string) => l.endsWith(".ts")), "All results should be .ts files");
  });

  // ─── src/**/*.ts path-limited matching ──────────────────

  it("src/**/*.ts matches only src .ts files when path is set", async () => {
    const result = await GlobTool.execute(
      { pattern: "**/*.ts", path: "src" },
      ctx,
    );
    assert.equal(result.status, "done");
    assert.ok(result.content);
    const lines = result.content.split("\n").filter(Boolean);
    // Should find index.ts, utils.ts in src/ (2 .ts files) -- component.tsx is .tsx
    assert.ok(lines.length >= 2, `Expected >= 2 .ts files in src/, got ${lines.length}`);
    for (const line of lines) {
      assert.ok(
        line.includes(path.join(fixture.dir, "src")),
        `Result should be inside src/, got: ${line}`,
      );
    }
  });

  // ─── No match ───────────────────────────────────────────

  it("returns no-match message for non-matching pattern", async () => {
    const result = await GlobTool.execute(
      { pattern: "**/*.zzz_nonexistent" },
      ctx,
    );
    assert.equal(result.status, "done");
    assert.equal(result.content, "No files matched the pattern.");
  });

  // ─── Results contain absolute paths ─────────────────────

  it("results contain absolute paths", async () => {
    const result = await GlobTool.execute({ pattern: "**/*.ts" }, ctx);
    assert.equal(result.status, "done");
    assert.ok(result.content);
    const lines = result.content.split("\n").filter(Boolean);
    for (const line of lines) {
      assert.ok(
        path.isAbsolute(line),
        `Expected absolute path, got: ${line}`,
      );
    }
  });

  // ─── Execution profile ─────────────────────────────────

  it("globExecutionProfile returns correct resourceKeys", () => {
    const profile = globExecutionProfile({ path: "src" }, "/home/user/project");
    assert.ok(profile.resourceKeys);
    assert.equal(profile.resourceKeys.length, 1);
    assert.equal(profile.resourceKeys[0]!.key, "/home/user/project/src");
    assert.equal(profile.resourceKeys[0]!.mode, "read");
  });

  it("globExecutionProfile uses cwd when no path given", () => {
    const profile = globExecutionProfile({}, "/home/user/project");
    assert.ok(profile.resourceKeys);
    assert.equal(profile.resourceKeys[0]!.key, "/home/user/project");
  });
});
