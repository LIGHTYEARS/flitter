import assert from "node:assert/strict";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { afterEach, describe, it } from "node:test";
import { spawn } from "../process.ts";
import type { StatusEntry } from "./git.ts";
import {
  captureGitStatus,
  getCurrentBranch,
  getGitDiff,
  isGitRepository,
  parsePortalainStatus,
  statusEntryToChangeType,
} from "./git.ts";

// Derive the monorepo root dynamically:
// This file is at packages/util/src/git/git.test.ts → 4 levels up
const FLITTER_ROOT = path.resolve(import.meta.dirname ?? __dirname, "../../../../");

// Temp dirs for captureGitStatus tests (clean git repos = fast, no dirty-state penalty)
const tmpDirs: string[] = [];

function makeTmpGitRepo(): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "flitter-git-test-"));
  tmpDirs.push(dir);
  // Initialize a git repo with one commit so captureGitStatus has something to work with
  const execSync = require("node:child_process").execFileSync;
  execSync("git", ["init"], { cwd: dir, stdio: "ignore" });
  execSync("git", ["config", "user.email", "test@test.com"], { cwd: dir, stdio: "ignore" });
  execSync("git", ["config", "user.name", "Test"], { cwd: dir, stdio: "ignore" });
  fs.writeFileSync(path.join(dir, "hello.txt"), "hello");
  execSync("git", ["add", "."], { cwd: dir, stdio: "ignore" });
  execSync("git", ["commit", "-m", "init"], { cwd: dir, stdio: "ignore" });
  return dir;
}

afterEach(() => {
  for (const dir of tmpDirs) {
    try { fs.rmSync(dir, { recursive: true, force: true }); } catch { /* best-effort */ }
  }
  tmpDirs.length = 0;
});

// ---------------------------------------------------------------------------
// parsePortalainStatus — unit tests
// ---------------------------------------------------------------------------

describe("parsePortalainStatus", () => {
  it("parses a modified file (y=M)", () => {
    const entries = parsePortalainStatus(" M path/to/file.ts\0");
    assert.equal(entries.length, 1);
    assert.equal(entries[0]!.x, " ");
    assert.equal(entries[0]!.y, "M");
    assert.equal(entries[0]!.path, "path/to/file.ts");
  });

  it("parses an added file (x=A)", () => {
    const entries = parsePortalainStatus("A  path/to/new.ts\0");
    assert.equal(entries.length, 1);
    assert.equal(entries[0]!.x, "A");
    assert.equal(entries[0]!.y, " ");
    assert.equal(entries[0]!.path, "path/to/new.ts");
  });

  it("parses a deleted file (y=D)", () => {
    const entries = parsePortalainStatus(" D path/to/deleted.ts\0");
    assert.equal(entries.length, 1);
    assert.equal(entries[0]!.x, " ");
    assert.equal(entries[0]!.y, "D");
    assert.equal(entries[0]!.path, "path/to/deleted.ts");
  });

  it("parses a renamed file with origPath", () => {
    const entries = parsePortalainStatus("R  new/path.ts\0old/path.ts\0");
    assert.equal(entries.length, 1);
    assert.equal(entries[0]!.x, "R");
    assert.equal(entries[0]!.path, "new/path.ts");
    assert.equal(entries[0]!.origPath, "old/path.ts");
  });

  it("parses an untracked file (??)", () => {
    const entries = parsePortalainStatus("?? untracked.ts\0");
    assert.equal(entries.length, 1);
    assert.equal(entries[0]!.x, "?");
    assert.equal(entries[0]!.y, "?");
    assert.equal(entries[0]!.path, "untracked.ts");
  });

  it("parses multiple entries in a single output", () => {
    const output = " M file1.ts\0A  file2.ts\0?? file3.ts\0";
    const entries = parsePortalainStatus(output);
    assert.equal(entries.length, 3);
    assert.equal(entries[0]!.path, "file1.ts");
    assert.equal(entries[1]!.path, "file2.ts");
    assert.equal(entries[2]!.path, "file3.ts");
  });

  it("returns empty array for empty input", () => {
    assert.deepEqual(parsePortalainStatus(""), []);
  });

  it("returns empty array for whitespace-only input", () => {
    assert.deepEqual(parsePortalainStatus("   "), []);
  });

  it("handles mixed renames and normal entries", () => {
    const output = " M regular.ts\0R  renamed.ts\0original.ts\0?? new.ts\0";
    const entries = parsePortalainStatus(output);
    assert.equal(entries.length, 3);
    assert.equal(entries[0]!.path, "regular.ts");
    assert.equal(entries[1]!.path, "renamed.ts");
    assert.equal(entries[1]!.origPath, "original.ts");
    assert.equal(entries[2]!.path, "new.ts");
  });
});

// ---------------------------------------------------------------------------
// statusEntryToChangeType — unit tests
// ---------------------------------------------------------------------------

describe("statusEntryToChangeType", () => {
  it("returns 'untracked' for ??", () => {
    const entry: StatusEntry = { x: "?", y: "?", path: "f.ts" };
    assert.equal(statusEntryToChangeType(entry), "untracked");
  });

  it("returns 'renamed' for R in x", () => {
    const entry: StatusEntry = { x: "R", y: " ", path: "f.ts", origPath: "old.ts" };
    assert.equal(statusEntryToChangeType(entry), "renamed");
  });

  it("returns 'added' for A in x", () => {
    const entry: StatusEntry = { x: "A", y: " ", path: "f.ts" };
    assert.equal(statusEntryToChangeType(entry), "added");
  });

  it("returns 'deleted' for D in y", () => {
    const entry: StatusEntry = { x: " ", y: "D", path: "f.ts" };
    assert.equal(statusEntryToChangeType(entry), "deleted");
  });

  it("returns 'modified' for M in y", () => {
    const entry: StatusEntry = { x: " ", y: "M", path: "f.ts" };
    assert.equal(statusEntryToChangeType(entry), "modified");
  });

  it("returns 'modified' for MM (staged + unstaged)", () => {
    const entry: StatusEntry = { x: "M", y: "M", path: "f.ts" };
    assert.equal(statusEntryToChangeType(entry), "modified");
  });
});

// ---------------------------------------------------------------------------
// isGitRepository — integration tests
// ---------------------------------------------------------------------------

describe("isGitRepository", () => {
  it("returns true for the flitter repo root", async () => {
    const result = await isGitRepository(FLITTER_ROOT);
    assert.equal(result, true);
  });

  it("returns false for a non-git directory", async () => {
    const result = await isGitRepository("/tmp");
    assert.equal(result, false);
  });
});

// ---------------------------------------------------------------------------
// getCurrentBranch — integration tests
// ---------------------------------------------------------------------------

describe("getCurrentBranch", () => {
  it("returns a non-null string for the flitter repo", async () => {
    const branch = await getCurrentBranch(FLITTER_ROOT);
    assert.ok(
      typeof branch === "string" && branch.length > 0,
      `Expected a branch name, got: ${branch}`,
    );
  });

  it("branch name contains no newline characters", async () => {
    const branch = await getCurrentBranch(FLITTER_ROOT);
    assert.ok(branch !== null);
    assert.ok(!branch.includes("\n"), "Branch name should not contain newlines");
  });
});

// ---------------------------------------------------------------------------
// getGitDiff — integration tests
// ---------------------------------------------------------------------------

describe("getGitDiff", () => {
  it("returns a string for the flitter repo", async () => {
    const diff = await getGitDiff(FLITTER_ROOT);
    assert.equal(typeof diff, "string");
  });

  it("does not throw", async () => {
    await assert.doesNotReject(() => getGitDiff(FLITTER_ROOT));
  });
});

// ---------------------------------------------------------------------------
// captureGitStatus — integration tests
// ---------------------------------------------------------------------------

describe("captureGitStatus", () => {
  it("returns available: true for a git repo", async () => {
    const repo = makeTmpGitRepo();
    const snapshot = await captureGitStatus(repo);
    assert.equal(snapshot.available, true);
  });

  it("repositoryRoot is an absolute path", async () => {
    const repo = makeTmpGitRepo();
    const snapshot = await captureGitStatus(repo);
    assert.ok(
      snapshot.repositoryRoot.startsWith("/"),
      `Expected absolute path, got: ${snapshot.repositoryRoot}`,
    );
  });

  it("repositoryName is a non-empty string", async () => {
    const repo = makeTmpGitRepo();
    const snapshot = await captureGitStatus(repo);
    assert.ok(snapshot.repositoryName.length > 0, "repositoryName should be non-empty");
  });

  it("provider is 'git'", async () => {
    const repo = makeTmpGitRepo();
    const snapshot = await captureGitStatus(repo);
    assert.equal(snapshot.provider, "git");
  });

  it("branch is string or null", async () => {
    const repo = makeTmpGitRepo();
    const snapshot = await captureGitStatus(repo);
    assert.ok(
      snapshot.branch === null || typeof snapshot.branch === "string",
      "branch must be string or null",
    );
  });

  it("head is string or null", async () => {
    const repo = makeTmpGitRepo();
    const snapshot = await captureGitStatus(repo);
    assert.ok(
      snapshot.head === null || typeof snapshot.head === "string",
      "head must be string or null",
    );
  });

  it("files is an array", async () => {
    const repo = makeTmpGitRepo();
    const snapshot = await captureGitStatus(repo);
    assert.ok(Array.isArray(snapshot.files), "files should be an array");
  });

  it("capturedAt is close to Date.now()", async () => {
    const repo = makeTmpGitRepo();
    const before = Date.now();
    const snapshot = await captureGitStatus(repo);
    const after = Date.now();
    assert.ok(
      snapshot.capturedAt >= before && snapshot.capturedAt <= after,
      `capturedAt ${snapshot.capturedAt} should be between ${before} and ${after}`,
    );
  });

  it("returns available: false for a non-git directory", async () => {
    const snapshot = await captureGitStatus("/tmp");
    assert.equal(snapshot.available, false);
    assert.deepEqual(snapshot.files, []);
  });
});

// ---------------------------------------------------------------------------
// spawn — basic sanity from git module perspective
// ---------------------------------------------------------------------------

describe("spawn (sanity checks from git module)", () => {
  it("echo hello returns stdout containing 'hello' and exitCode 0", async () => {
    const result = await spawn("echo", ["hello"]);
    assert.match(result.stdout, /hello/);
    assert.equal(result.exitCode, 0);
  });

  it("false returns non-zero exit without rejecting", async () => {
    const result = await spawn("false", []);
    assert.ok(result.exitCode !== 0, `Expected non-zero exit code, got ${result.exitCode}`);
  });
});
