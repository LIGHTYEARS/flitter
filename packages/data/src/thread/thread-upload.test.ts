/**
 * Tests for ThreadUploadManager — throttled upload pipeline with dedup.
 * 逆向: amp-cli-reversed/modules/1342_ThreadService_azT.js
 */
import assert from "node:assert/strict";
import { beforeEach, describe, it } from "node:test";
import type { ThreadSnapshot } from "@flitter/schemas";
import type { ThreadRemoteTransport } from "./thread-upload";
import { ThreadUploadManager } from "./thread-upload";
import type { ThreadEntry } from "./types";

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function makeSnapshot(id: string, version = 1): ThreadSnapshot {
  return {
    id,
    v: version,
    messages: [
      {
        role: "user" as const,
        content: [{ type: "text" as const, text: "hello" }],
        messageId: 1,
      },
    ],
  } as ThreadSnapshot;
}

class MockRemote implements ThreadRemoteTransport {
  uploaded: Array<{ id: string; v: number }> = [];
  uploadDelay = 0;
  shouldFail = false;

  async uploadThread(thread: ThreadSnapshot): Promise<void> {
    if (this.uploadDelay > 0) await delay(this.uploadDelay);
    if (this.shouldFail) throw new Error("upload failed");
    this.uploaded.push({ id: thread.id, v: thread.v });
  }

  async getThread(_id: string): Promise<ThreadSnapshot | null> {
    return null;
  }

  async listThreads(): Promise<ThreadEntry[]> {
    return [];
  }

  async deleteThread(_id: string): Promise<void> {}

  async searchThreads(_opts: {
    q: string;
    limit?: number;
  }): Promise<{ threads: never[]; hasMore: boolean }> {
    return { threads: [], hasMore: false };
  }
}

describe("ThreadUploadManager", () => {
  let snapshots: Map<string, ThreadSnapshot>;
  let remote: MockRemote;
  let manager: ThreadUploadManager;

  beforeEach(() => {
    snapshots = new Map();
    remote = new MockRemote();
    manager = new ThreadUploadManager({
      getThreadSnapshot: (id) => snapshots.get(id),
      remote,
      throttleMs: 50,
    });
  });

  describe("uploadThreadNow", () => {
    it("should upload a thread snapshot", async () => {
      const snap = makeSnapshot("t1", 1);
      snapshots.set("t1", snap);

      await manager.uploadThreadNow("t1");

      assert.equal(remote.uploaded.length, 1);
      assert.equal(remote.uploaded[0].id, "t1");
      assert.equal(remote.uploaded[0].v, 1);
    });

    it("should skip upload if thread not found", async () => {
      await manager.uploadThreadNow("nonexistent");
      assert.equal(remote.uploaded.length, 0);
    });

    it("should skip upload if version already uploaded", async () => {
      const snap = makeSnapshot("t1", 1);
      snapshots.set("t1", snap);
      manager.setUploadedVersion("t1", 1);

      await manager.uploadThreadNow("t1");
      assert.equal(remote.uploaded.length, 0);
    });

    it("should upload if version is newer than uploaded", async () => {
      const snap = makeSnapshot("t1", 3);
      snapshots.set("t1", snap);
      manager.setUploadedVersion("t1", 2);

      await manager.uploadThreadNow("t1");
      assert.equal(remote.uploaded.length, 1);
      assert.equal(manager.getUploadedVersion("t1"), 3);
    });

    it("should deduplicate concurrent uploads", async () => {
      remote.uploadDelay = 50;
      const snap = makeSnapshot("t1", 1);
      snapshots.set("t1", snap);

      // Start two concurrent uploads
      const p1 = manager.uploadThreadNow("t1");
      const p2 = manager.uploadThreadNow("t1");

      await Promise.all([p1, p2]);
      // Only one actual upload should have occurred
      assert.equal(remote.uploaded.length, 1);
    });
  });

  describe("markDirty / scheduleFlush / flushPendingUploads", () => {
    it("should flush dirty threads after throttle", async () => {
      const snap = makeSnapshot("t1", 1);
      snapshots.set("t1", snap);

      manager.markDirty("t1");

      // Not yet uploaded
      assert.equal(remote.uploaded.length, 0);

      // Wait for throttle
      await delay(100);

      assert.equal(remote.uploaded.length, 1);
      assert.equal(remote.uploaded[0].id, "t1");
    });

    it("should batch multiple dirty threads", async () => {
      snapshots.set("t1", makeSnapshot("t1", 1));
      snapshots.set("t2", makeSnapshot("t2", 1));

      manager.markDirty("t1");
      manager.markDirty("t2");

      await delay(100);

      assert.equal(remote.uploaded.length, 2);
    });

    it("should re-queue failed uploads", async () => {
      remote.shouldFail = true;
      snapshots.set("t1", makeSnapshot("t1", 1));

      manager.markDirty("t1");

      // Wait for first attempt
      await delay(100);
      assert.equal(remote.uploaded.length, 0);

      // Fix the remote and wait for retry
      remote.shouldFail = false;
      await delay(100);

      assert.equal(remote.uploaded.length, 1);
    });
  });

  describe("flush (synchronous trigger)", () => {
    it("should immediately trigger pending uploads", async () => {
      snapshots.set("t1", makeSnapshot("t1", 1));
      manager.markDirty("t1");

      // Flush immediately without waiting for throttle
      manager.flush();
      await delay(10);

      assert.equal(remote.uploaded.length, 1);
    });
  });

  describe("flushVersion", () => {
    it("should upload and verify version", async () => {
      snapshots.set("t1", makeSnapshot("t1", 5));

      await manager.flushVersion("t1", 5);
      assert.equal(remote.uploaded.length, 1);
      assert.equal(manager.getUploadedVersion("t1"), 5);
    });

    it("should throw if version not reached", async () => {
      snapshots.set("t1", makeSnapshot("t1", 3));

      const err = await manager.flushVersion("t1", 10).catch((e: Error) => e.message);
      assert.equal(err, "Failed to upload thread t1 to version 10");
    });
  });

  describe("dispose", () => {
    it("should drain dirty threads on dispose", async () => {
      snapshots.set("t1", makeSnapshot("t1", 1));
      manager.markDirty("t1");

      await manager.dispose();

      assert.equal(remote.uploaded.length, 1);
      assert.equal(manager.disposed, true);
    });
  });

  describe("removeThread", () => {
    it("should clean up tracking state for a thread", () => {
      manager.markDirty("t1");
      manager.setUploadedVersion("t1", 1);
      manager.removeThread("t1");

      assert.equal(manager.getUploadedVersion("t1"), undefined);
    });
  });
});
