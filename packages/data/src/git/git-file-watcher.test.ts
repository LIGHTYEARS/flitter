/**
 * Tests for GitFileWatcher.
 * 逆向: amp-cli-reversed/modules/0305_unknown_vv.js
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { GitFileWatcher } from "./git-file-watcher";

describe("GitFileWatcher", () => {
  describe("parseGitStatus", () => {
    it("should parse untracked files", () => {
      const output = "?? newfile.ts\n?? another.ts\n";
      const changes = GitFileWatcher.parseGitStatus(output);
      assert.equal(changes.length, 2);
      assert.equal(changes[0].path, "newfile.ts");
      assert.equal(changes[0].status, "??");
      assert.equal(changes[1].path, "another.ts");
      assert.equal(changes[1].status, "??");
    });

    it("should parse modified files", () => {
      const output = " M src/index.ts\nM  README.md\n";
      const changes = GitFileWatcher.parseGitStatus(output);
      assert.equal(changes.length, 2);
      assert.equal(changes[0].path, "src/index.ts");
      assert.equal(changes[0].status, "M");
      assert.equal(changes[1].path, "README.md");
      assert.equal(changes[1].status, "M");
    });

    it("should parse added files", () => {
      const output = "A  new.ts\n";
      const changes = GitFileWatcher.parseGitStatus(output);
      assert.equal(changes.length, 1);
      assert.equal(changes[0].path, "new.ts");
      assert.equal(changes[0].status, "A");
    });

    it("should parse deleted files", () => {
      const output = " D removed.ts\nD  deleted.ts\n";
      const changes = GitFileWatcher.parseGitStatus(output);
      assert.equal(changes.length, 2);
      assert.equal(changes[0].path, "removed.ts");
      assert.equal(changes[0].status, "D");
      assert.equal(changes[1].path, "deleted.ts");
      assert.equal(changes[1].status, "D");
    });

    it("should handle empty output", () => {
      const changes = GitFileWatcher.parseGitStatus("");
      assert.equal(changes.length, 0);
    });

    it("should handle mixed statuses", () => {
      const output = "?? new.ts\n M modified.ts\n D deleted.ts\nA  added.ts\n";
      const changes = GitFileWatcher.parseGitStatus(output);
      assert.equal(changes.length, 4);
      assert.equal(changes[0].status, "??");
      assert.equal(changes[1].status, "M");
      assert.equal(changes[2].status, "D");
      assert.equal(changes[3].status, "A");
    });
  });

  describe("lifecycle", () => {
    it("should create with default options", () => {
      const watcher = new GitFileWatcher();
      assert.equal(watcher.disposed, false);
      watcher.dispose();
      assert.equal(watcher.disposed, true);
    });

    it("should track cumulative changes", () => {
      const watcher = new GitFileWatcher();
      const changes = watcher.getCumulativeChanges();
      assert.equal(changes.created, 0);
      assert.equal(changes.modified, 0);
      assert.equal(changes.deleted, 0);
      watcher.dispose();
    });

    it("should register and unregister callbacks", () => {
      const watcher = new GitFileWatcher();
      const cb = () => {};
      watcher.onFileSystemEvent(cb);
      watcher.offFileSystemEvent(cb);
      watcher.dispose();
    });

    it("should not start after dispose", () => {
      const watcher = new GitFileWatcher();
      watcher.dispose();
      watcher.start(); // should be a no-op
      assert.equal(watcher.disposed, true);
    });
  });

  describe("isRepo", () => {
    it("should detect current directory as git repo", () => {
      // This test runs in the flitter repo, so it should detect git
      const result = GitFileWatcher.isRepo(process.cwd());
      assert.equal(result, true);
    });

    it("should return false for non-repo directory", () => {
      const result = GitFileWatcher.isRepo("/tmp");
      assert.equal(result, false);
    });
  });
});
