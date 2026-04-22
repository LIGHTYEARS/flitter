/**
 * Tests for OAuth cross-process file locking.
 *
 * Covers: lock acquisition, release, stale detection, concurrent attempts,
 * cleanup, and error handling.
 *
 * 逆向: dj() (acquire), ED() (release), yL() (read), zW() (stale check)
 * amp-cli-reversed/modules/1670_unknown_dj.js
 * amp-cli-reversed/modules/1671_unknown_ED.js
 * amp-cli-reversed/modules/1669_unknown_yL.js
 */

import assert from "node:assert/strict";
import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import { afterEach, beforeEach, describe, it } from "node:test";
import {
  acquireOAuthLock,
  getLockPath,
  isLockStale,
  type LockData,
  readOAuthLock,
  releaseOAuthLock,
  resetLockDir,
  STALE_LOCK_TIMEOUT_MS,
  setLockDir,
} from "./lock";

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

let tmpDir: string;

async function createTmpDir(): Promise<string> {
  return fs.mkdtemp(path.join(os.tmpdir(), "flitter-lock-test-"));
}

async function writeLockFile(serverName: string, data: LockData): Promise<void> {
  const lockPath = getLockPath(serverName);
  await fs.mkdir(path.dirname(lockPath), { recursive: true });
  await fs.writeFile(lockPath, JSON.stringify(data), "utf8");
}

// ---------------------------------------------------------------------------
// Setup / Teardown
// ---------------------------------------------------------------------------

describe("OAuth file locking", () => {
  beforeEach(async () => {
    tmpDir = await createTmpDir();
    setLockDir(tmpDir);
  });

  afterEach(async () => {
    resetLockDir();
    await fs.rm(tmpDir, { recursive: true, force: true }).catch(() => {});
  });

  // =========================================================================
  // isLockStale
  // =========================================================================

  describe("isLockStale", () => {
    it("should detect a lock older than STALE_LOCK_TIMEOUT_MS as stale", () => {
      const lock: LockData = {
        pid: process.pid,
        timestamp: Date.now() - STALE_LOCK_TIMEOUT_MS - 1000,
        hostname: os.hostname(),
      };
      assert.equal(isLockStale(lock), true);
    });

    it("should not mark a fresh lock from the current process as stale", () => {
      const lock: LockData = {
        pid: process.pid,
        timestamp: Date.now(),
        hostname: os.hostname(),
      };
      assert.equal(isLockStale(lock), false);
    });

    it("should detect a dead PID on the same hostname as stale", () => {
      // PID 999999 is almost certainly not running
      const lock: LockData = {
        pid: 999999,
        timestamp: Date.now(),
        hostname: os.hostname(),
      };
      assert.equal(isLockStale(lock), true);
    });

    it("should not mark a lock from a different hostname as stale even with dead PID", () => {
      const lock: LockData = {
        pid: 999999,
        timestamp: Date.now(),
        hostname: "some-other-host-that-is-not-ours",
      };
      // Different hostname → can't check PID → not stale (unless timeout)
      assert.equal(isLockStale(lock), false);
    });
  });

  // =========================================================================
  // readOAuthLock
  // =========================================================================

  describe("readOAuthLock", () => {
    it("should return null when no lock file exists", async () => {
      const result = await readOAuthLock("test-server");
      assert.equal(result, null);
    });

    it("should read a valid lock file", async () => {
      const data: LockData = {
        pid: 12345,
        timestamp: Date.now(),
        hostname: "test-host",
      };
      await writeLockFile("test-server", data);
      const result = await readOAuthLock("test-server");
      assert.deepEqual(result, data);
    });

    it("should return null for an invalid lock file (missing pid)", async () => {
      const lockPath = getLockPath("test-server");
      await fs.mkdir(path.dirname(lockPath), { recursive: true });
      await fs.writeFile(lockPath, JSON.stringify({ timestamp: Date.now() }), "utf8");
      const result = await readOAuthLock("test-server");
      assert.equal(result, null);
    });

    it("should return null for malformed JSON", async () => {
      const lockPath = getLockPath("test-server");
      await fs.mkdir(path.dirname(lockPath), { recursive: true });
      await fs.writeFile(lockPath, "not valid json{{{", "utf8");
      const result = await readOAuthLock("test-server");
      assert.equal(result, null);
    });
  });

  // =========================================================================
  // acquireOAuthLock
  // =========================================================================

  describe("acquireOAuthLock", () => {
    it("should acquire lock when no lock exists", async () => {
      const result = await acquireOAuthLock("test-server");
      assert.equal(result.acquired, true);

      // Verify lock file was created with correct data
      const lock = await readOAuthLock("test-server");
      assert.ok(lock);
      assert.equal(lock.pid, process.pid);
      assert.equal(lock.hostname, os.hostname());
      assert.ok(Date.now() - lock.timestamp < 5000);
    });

    it("should fail to acquire when another live process holds the lock", async () => {
      // Write a lock file with our parent PID (always alive and signalable)
      const holderData: LockData = {
        pid: process.ppid,
        timestamp: Date.now(),
        hostname: os.hostname(),
      };
      await writeLockFile("test-server", holderData);

      const result = await acquireOAuthLock("test-server");
      assert.equal(result.acquired, false);
      if (!result.acquired) {
        assert.equal(result.holder.pid, process.ppid);
      }
    });

    it("should acquire lock when existing lock is stale (dead PID)", async () => {
      // Write a lock file with a dead PID
      const staleData: LockData = {
        pid: 999999,
        timestamp: Date.now(),
        hostname: os.hostname(),
      };
      await writeLockFile("test-server", staleData);

      const result = await acquireOAuthLock("test-server");
      assert.equal(result.acquired, true);

      // Verify our lock replaced the stale one
      const lock = await readOAuthLock("test-server");
      assert.ok(lock);
      assert.equal(lock.pid, process.pid);
    });

    it("should acquire lock when existing lock is stale (timed out)", async () => {
      // Write a lock file that's older than the stale timeout
      // Use parent PID (alive), but the lock is too old
      const staleData: LockData = {
        pid: process.ppid,
        timestamp: Date.now() - STALE_LOCK_TIMEOUT_MS - 1000,
        hostname: os.hostname(),
      };
      await writeLockFile("test-server", staleData);

      const result = await acquireOAuthLock("test-server");
      assert.equal(result.acquired, true);
    });

    it("should sanitize server names with special characters", async () => {
      const serverName = "https://example.com:8080/api";
      const result = await acquireOAuthLock(serverName);
      assert.equal(result.acquired, true);

      // Verify the lock file path uses sanitized name
      const lockPath = getLockPath(serverName);
      assert.ok(lockPath.includes("https___example_com_8080_api"));

      const lock = await readOAuthLock(serverName);
      assert.ok(lock);
      assert.equal(lock.pid, process.pid);
    });
  });

  // =========================================================================
  // releaseOAuthLock
  // =========================================================================

  describe("releaseOAuthLock", () => {
    it("should release a lock owned by the current process", async () => {
      // Acquire first
      const acq = await acquireOAuthLock("test-server");
      assert.equal(acq.acquired, true);

      // Release
      await releaseOAuthLock("test-server");

      // Verify lock file is gone
      const lock = await readOAuthLock("test-server");
      assert.equal(lock, null);
    });

    it("should not release a lock owned by another process", async () => {
      // Write a lock owned by parent PID (alive and signalable, but not us)
      const otherData: LockData = {
        pid: process.ppid,
        timestamp: Date.now(),
        hostname: os.hostname(),
      };
      await writeLockFile("test-server", otherData);

      // Try to release — should be a no-op
      await releaseOAuthLock("test-server");

      // Lock should still exist
      const lock = await readOAuthLock("test-server");
      assert.ok(lock);
      assert.equal(lock.pid, process.ppid);
    });

    it("should handle releasing when no lock exists (no-op)", async () => {
      // Should not throw
      await releaseOAuthLock("nonexistent-server");
    });

    it("should clean up lock file on release", async () => {
      await acquireOAuthLock("cleanup-test");
      // Verify file exists
      const lockPath = getLockPath("cleanup-test");
      const statBefore = await fs.stat(lockPath).catch(() => null);
      assert.ok(statBefore, "lock file should exist before release");

      await releaseOAuthLock("cleanup-test");
      const statAfter = await fs.stat(lockPath).catch(() => null);
      assert.equal(statAfter, null, "lock file should not exist after release");
    });
  });

  // =========================================================================
  // Concurrent lock attempts
  // =========================================================================

  describe("concurrent lock attempts", () => {
    it("second acquire should see the first process as holder", async () => {
      // First acquire
      const first = await acquireOAuthLock("concurrent-test");
      assert.equal(first.acquired, true);

      // Second acquire from the same process — re-reads the lock
      // Since the lock is held by our own PID (which is alive), it should
      // still report not-acquired (the lock file already exists and is valid)
      //
      // Note: In amp, the second call from the SAME process would also see
      // acquired: false because it checks the lock file on disk.
      // But since fs.link will EEXIST when the lock file already exists,
      // and the existing lock is by our PID (alive), it returns not-acquired.
      //
      // Wait — actually re-reading the amp code more carefully:
      // In dj(), if existing lock is found and NOT stale, it returns
      // { acquired: false, holder: existing }. Since our PID is alive,
      // calling acquire a second time returns false.
      const second = await acquireOAuthLock("concurrent-test");
      assert.equal(second.acquired, false);
      if (!second.acquired) {
        assert.equal(second.holder.pid, process.pid);
      }
    });

    it("after release, a new acquire should succeed", async () => {
      await acquireOAuthLock("reacquire-test");
      await releaseOAuthLock("reacquire-test");

      const result = await acquireOAuthLock("reacquire-test");
      assert.equal(result.acquired, true);
    });
  });

  // =========================================================================
  // Error handling
  // =========================================================================

  describe("error handling", () => {
    it("should throw on permission denied (non-writable directory)", async () => {
      // Create a read-only directory
      const readOnlyDir = path.join(tmpDir, "readonly");
      await fs.mkdir(readOnlyDir, { recursive: true, mode: 0o500 });
      setLockDir(readOnlyDir);

      await assert.rejects(
        () => acquireOAuthLock("perm-test"),
        (err: NodeJS.ErrnoException) => {
          // Should be EACCES or EPERM
          assert.ok(
            err.code === "EACCES" || err.code === "EPERM",
            `Expected EACCES or EPERM but got ${err.code}`,
          );
          return true;
        },
      );
    });

    it("should handle lock directory that does not exist yet", async () => {
      const nestedDir = path.join(tmpDir, "a", "b", "c", "locks");
      setLockDir(nestedDir);

      // Should succeed — ensureLockDir creates it recursively
      const result = await acquireOAuthLock("nested-test");
      assert.equal(result.acquired, true);

      // Verify the nested directory was created
      const stat = await fs.stat(nestedDir);
      assert.ok(stat.isDirectory());
    });
  });
});
