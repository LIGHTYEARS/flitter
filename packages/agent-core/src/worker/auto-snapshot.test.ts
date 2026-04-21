/**
 * Auto-snapshot tests
 *
 * Tests the git tree snapshot create/restore cycle.
 * Uses a real temporary git repo to verify actual git behavior.
 *
 * 逆向: amp-cli-reversed/chunk-002.js:21422-21500 (FwR, GwR)
 */
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, it } from "node:test";
import { createSnapshot, createSnapshots, isGitRepo, restoreSnapshot } from "./auto-snapshot";

function git(args: string[], cwd: string): string {
  return execFileSync("git", args, { cwd, encoding: "utf8" }).trim();
}

describe("auto-snapshot", () => {
  let repoDir: string;

  beforeEach(() => {
    // Create a temp directory with a git repo
    repoDir = mkdtempSync(join(tmpdir(), "flitter-snapshot-test-"));
    git(["init"], repoDir);
    git(["config", "user.email", "test@test.com"], repoDir);
    git(["config", "user.name", "Test"], repoDir);

    // Create initial commit so HEAD exists
    writeFileSync(join(repoDir, "initial.txt"), "initial content");
    git(["add", "-A"], repoDir);
    git(["commit", "-m", "initial"], repoDir);
  });

  afterEach(() => {
    try {
      rmSync(repoDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  // ─── isGitRepo ─────────────────────────────────────────

  describe("isGitRepo", () => {
    it("returns true for a git repo", async () => {
      assert.equal(await isGitRepo(repoDir), true);
    });

    it("returns false for a non-git directory", async () => {
      const nonGitDir = mkdtempSync(join(tmpdir(), "flitter-nongit-"));
      try {
        assert.equal(await isGitRepo(nonGitDir), false);
      } finally {
        rmSync(nonGitDir, { recursive: true, force: true });
      }
    });
  });

  // ─── createSnapshot ────────────────────────────────────

  describe("createSnapshot", () => {
    it("creates a snapshot with valid treeOID", async () => {
      const result = await createSnapshot(repoDir, "thread-1", 0);
      assert.equal(result.repoRoot, repoDir);
      assert.ok(result.treeOID.length >= 7, "treeOID should be a git hash");
      assert.ok(/^[0-9a-f]+$/.test(result.treeOID), "treeOID should be hex");
    });

    it("creates a ref under refs/flitter/snapshots/", async () => {
      await createSnapshot(repoDir, "thread-1", 42);
      // The ref should exist
      const refOID = git(["rev-parse", "refs/flitter/snapshots/thread-1/42"], repoDir);
      assert.ok(refOID.length > 0);
    });

    it("captures uncommitted changes in snapshot", async () => {
      // Modify a file (unstaged)
      writeFileSync(join(repoDir, "initial.txt"), "modified content");
      writeFileSync(join(repoDir, "new-file.txt"), "new file");

      const result = await createSnapshot(repoDir, "thread-1", 1);
      assert.ok(result.treeOID.length >= 7);

      // The tree should differ from HEAD because we have uncommitted changes
      const headTree = git(["rev-parse", "HEAD^{tree}"], repoDir);
      assert.notEqual(result.treeOID, headTree, "snapshot tree should differ from HEAD tree");
    });
  });

  // ─── createSnapshots ───────────────────────────────────

  describe("createSnapshots", () => {
    it("creates snapshots for multiple roots", async () => {
      const results = await createSnapshots([repoDir], "thread-1", 0);
      assert.equal(results.length, 1);
      assert.equal(results[0].repoRoot, repoDir);
    });

    it("skips non-git directories", async () => {
      const nonGitDir = mkdtempSync(join(tmpdir(), "flitter-nongit-"));
      try {
        const results = await createSnapshots([repoDir, nonGitDir], "thread-1", 0);
        assert.equal(results.length, 1);
        assert.equal(results[0].repoRoot, repoDir);
      } finally {
        rmSync(nonGitDir, { recursive: true, force: true });
      }
    });

    it("returns empty array for no git repos", async () => {
      const nonGitDir = mkdtempSync(join(tmpdir(), "flitter-nongit-"));
      try {
        const results = await createSnapshots([nonGitDir], "thread-1", 0);
        assert.equal(results.length, 0);
      } finally {
        rmSync(nonGitDir, { recursive: true, force: true });
      }
    });
  });

  // ─── restoreSnapshot ───────────────────────────────────

  describe("restoreSnapshot", () => {
    it("restores working directory to snapshot state", async () => {
      // Take snapshot of initial state
      const snapshot = await createSnapshot(repoDir, "thread-1", 0);

      // Make changes after snapshot
      writeFileSync(join(repoDir, "initial.txt"), "CHANGED after snapshot");
      writeFileSync(join(repoDir, "new-after-snapshot.txt"), "this should be removed");

      // Verify changes exist
      assert.equal(readFileSync(join(repoDir, "initial.txt"), "utf8"), "CHANGED after snapshot");
      assert.ok(existsSync(join(repoDir, "new-after-snapshot.txt")));

      // Restore to snapshot
      await restoreSnapshot(snapshot);

      // Verify restoration: original content restored
      assert.equal(readFileSync(join(repoDir, "initial.txt"), "utf8"), "initial content");
    });
  });

  // ─── empty repo (no HEAD) ─────────────────────────────

  describe("empty repo (no HEAD)", () => {
    it("creates snapshot even without initial commit", async () => {
      const emptyRepo = mkdtempSync(join(tmpdir(), "flitter-empty-"));
      try {
        git(["init"], emptyRepo);
        writeFileSync(join(emptyRepo, "file.txt"), "content");

        const result = await createSnapshot(emptyRepo, "thread-empty", 0);
        assert.ok(result.treeOID.length >= 7, "should create tree from empty repo");
      } finally {
        rmSync(emptyRepo, { recursive: true, force: true });
      }
    });
  });
});
