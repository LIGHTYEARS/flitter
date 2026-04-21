/**
 * Tests for GitFileWatcher — git-based file change detection
 *
 * Cross-references: amp-cli-reversed/modules/0305_unknown_vv.js (vv class)
 *                   amp-cli-reversed/modules/0303_unknown_FKT.js (NoOp)
 *                   amp-cli-reversed/modules/0306_GitFileWatcher_KKT.js (factory)
 *
 * Note: These tests use the REAL git repository that this project lives in.
 * They are read-only and should not affect the working tree.
 * The triggerScan tests use the actual repo root — they do not create temp
 * files, so they cannot corrupt state.
 */
import assert from "node:assert/strict";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { afterEach, beforeEach, describe, it } from "node:test";
import type { FileSystemEvent } from "./git-file-watcher";
import { createFileWatcher, GitFileWatcher, NoOpFileWatcher } from "./git-file-watcher";

describe("NoOpFileWatcher", () => {
  it("should return empty watched paths", () => {
    const watcher = new NoOpFileWatcher();
    assert.deepEqual(watcher.getWatchedPaths(), []);
  });

  it("should report not supported", () => {
    const watcher = new NoOpFileWatcher();
    assert.equal(watcher.isSupported(), false);
  });

  it("should not throw on watch/unwatch/dispose", async () => {
    const watcher = new NoOpFileWatcher();
    await watcher.watch("/tmp");
    watcher.unwatch("/tmp");
    watcher.dispose();
  });
});

describe("GitFileWatcher", () => {
  describe("static isRepo", () => {
    it("should detect the current project as a git repo", () => {
      // This test runs inside the flitter project which is a git repo
      assert.equal(GitFileWatcher.isRepo(process.cwd()), true);
    });

    it("should return false for a non-repo directory", () => {
      const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "non-repo-"));
      try {
        assert.equal(GitFileWatcher.isRepo(tmpDir), false);
      } finally {
        fs.rmSync(tmpDir, { recursive: true, force: true });
      }
    });
  });

  describe("isSupported", () => {
    it("should return true when git is available", () => {
      const watcher = new GitFileWatcher();
      // Git is available in the test environment
      assert.equal(watcher.isSupported(), true);
    });
  });

  describe("callback management", () => {
    it("should add and remove callbacks", () => {
      const watcher = new GitFileWatcher();
      const cb = (_events: FileSystemEvent[]) => {};

      watcher.onFileSystemEvent(cb);
      // Cannot directly inspect callbacks, but offFileSystemEvent should not throw
      watcher.offFileSystemEvent(cb);
      watcher.dispose();
    });

    it("should handle removing a non-registered callback gracefully", () => {
      const watcher = new GitFileWatcher();
      const cb = (_events: FileSystemEvent[]) => {};
      // Should not throw
      watcher.offFileSystemEvent(cb);
      watcher.dispose();
    });
  });

  describe("watch/unwatch", () => {
    it("should track watched paths after watch()", async () => {
      const watcher = new GitFileWatcher();
      try {
        await watcher.watch(process.cwd());
        const paths = watcher.getWatchedPaths();
        assert.ok(paths.length > 0, "Should have at least one watched path");
      } finally {
        watcher.dispose();
      }
    });

    it("should not duplicate watches for the same repo", async () => {
      const watcher = new GitFileWatcher();
      try {
        await watcher.watch(process.cwd());
        await watcher.watch(process.cwd());
        // Should still be just one entry (same repo root)
        assert.equal(watcher.getWatchedPaths().length, 1);
      } finally {
        watcher.dispose();
      }
    });

    it("should remove paths on dispose", async () => {
      const watcher = new GitFileWatcher();
      await watcher.watch(process.cwd());
      watcher.dispose();
      assert.deepEqual(watcher.getWatchedPaths(), []);
    });
  });

  describe("triggerScan with real git repo", () => {
    let tmpDir: string;

    beforeEach(() => {
      tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "gfw-test-"));
    });

    afterEach(() => {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    });

    it("should initialise on first scan of an unwatched path", async () => {
      // Initialise a bare git repo in the temp dir
      const { execSync } = await import("node:child_process");
      execSync("git init", { cwd: tmpDir, stdio: "ignore" });
      // Create an initial commit so HEAD exists
      fs.writeFileSync(path.join(tmpDir, "README.md"), "test");
      execSync("git add . && git commit -m init", { cwd: tmpDir, stdio: "ignore" });

      const watcher = new GitFileWatcher(100);
      try {
        await watcher.triggerScan(tmpDir);
        assert.ok(watcher.getWatchedPaths().length > 0);
      } finally {
        watcher.dispose();
      }
    });

    it("should detect new untracked files", async () => {
      const { execSync } = await import("node:child_process");
      execSync("git init", { cwd: tmpDir, stdio: "ignore" });
      fs.writeFileSync(path.join(tmpDir, "README.md"), "test");
      execSync("git add . && git commit -m init", { cwd: tmpDir, stdio: "ignore" });

      const watcher = new GitFileWatcher(0); // No cooldown
      const events: FileSystemEvent[] = [];
      watcher.onFileSystemEvent((evts) => events.push(...evts));

      try {
        // Initial scan — sets baseline
        await watcher.triggerScan(tmpDir, true);
        events.length = 0; // Clear initial events

        // Create a new file
        fs.writeFileSync(path.join(tmpDir, "new-file.txt"), "hello");

        // Trigger another scan — should detect the new file
        await watcher.triggerScan(tmpDir, true);

        assert.ok(events.length > 0, "Should have detected at least one event");
        const created = events.filter((e) => e.type === "created");
        assert.ok(created.length > 0, "Should have a 'created' event");
        assert.ok(
          created.some((e) => e.path.includes("new-file.txt")),
          "Should detect new-file.txt",
        );
      } finally {
        watcher.dispose();
      }
    });

    it("should respect scan cooldown", async () => {
      const { execSync } = await import("node:child_process");
      execSync("git init", { cwd: tmpDir, stdio: "ignore" });
      fs.writeFileSync(path.join(tmpDir, "README.md"), "test");
      execSync("git add . && git commit -m init", { cwd: tmpDir, stdio: "ignore" });

      const watcher = new GitFileWatcher(60_000); // 60s cooldown
      const events: FileSystemEvent[] = [];
      watcher.onFileSystemEvent((evts) => events.push(...evts));

      try {
        await watcher.triggerScan(tmpDir, true); // Force first scan
        events.length = 0;

        // Create a new file
        fs.writeFileSync(path.join(tmpDir, "cooldown-file.txt"), "hello");

        // Non-forced scan — should be skipped due to cooldown
        await watcher.triggerScan(tmpDir, false);
        assert.equal(events.length, 0, "Should skip scan within cooldown");

        // Forced scan — should still work
        await watcher.triggerScan(tmpDir, true);
        assert.ok(events.length > 0, "Force should bypass cooldown");
      } finally {
        watcher.dispose();
      }
    });
  });
});

describe("createFileWatcher factory", () => {
  it("should create GitFileWatcher for a git repo", () => {
    const watcher = createFileWatcher({ rootPath: process.cwd() });
    assert.ok(watcher.isSupported());
    watcher.dispose();
  });

  it("should create NoOpFileWatcher for a non-git directory", () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "no-git-"));
    try {
      const watcher = createFileWatcher({ rootPath: tmpDir });
      assert.equal(watcher.isSupported(), false);
      watcher.dispose();
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  it("should create GitFileWatcher when useGit is true", () => {
    const watcher = createFileWatcher({ useGit: true });
    assert.ok(watcher instanceof GitFileWatcher);
    watcher.dispose();
  });
});
