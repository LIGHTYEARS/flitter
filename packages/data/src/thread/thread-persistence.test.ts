/**
 * Tests for ThreadPersistence — JSON file I/O with atomic writes.
 */
import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import * as fs from "node:fs";
import * as fsp from "node:fs/promises";
import * as path from "node:path";
import * as os from "node:os";
import type { ThreadSnapshot } from "@flitter/schemas";
import { ThreadPersistence } from "./thread-persistence";
import { ThreadStore } from "./thread-store";

let tmpDir: string;

function makeThread(id: string, title?: string): ThreadSnapshot {
  return {
    id,
    v: 1,
    title,
    messages: [
      {
        role: "user" as const,
        content: [{ type: "text" as const, text: "hello" }],
        messageId: 1,
      },
    ],
  } as ThreadSnapshot;
}

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "flitter-persist-"));
});

afterEach(async () => {
  await fsp.rm(tmpDir, { recursive: true, force: true });
});

describe("ThreadPersistence", () => {
  describe("save", () => {
    it("should write thread to JSON file", async () => {
      const p = new ThreadPersistence({ baseDir: tmpDir });
      const thread = makeThread("t1", "Hello");
      await p.save(thread);

      const filePath = path.join(tmpDir, "t1.json");
      assert.ok(fs.existsSync(filePath));

      const content = JSON.parse(await fsp.readFile(filePath, "utf-8"));
      assert.equal(content.id, "t1");
      assert.equal(content.title, "Hello");
    });

    it("should create base directory if missing", async () => {
      const nested = path.join(tmpDir, "sub", "dir");
      const p = new ThreadPersistence({ baseDir: nested });
      await p.save(makeThread("t1"));
      assert.ok(fs.existsSync(path.join(nested, "t1.json")));
    });

    it("should overwrite existing file", async () => {
      const p = new ThreadPersistence({ baseDir: tmpDir });
      await p.save(makeThread("t1", "v1"));
      await p.save(makeThread("t1", "v2"));

      const content = JSON.parse(await fsp.readFile(path.join(tmpDir, "t1.json"), "utf-8"));
      assert.equal(content.title, "v2");
    });

    it("should not leave tmp files after successful save", async () => {
      const p = new ThreadPersistence({ baseDir: tmpDir });
      await p.save(makeThread("t1"));
      const files = await fsp.readdir(tmpDir);
      assert.equal(files.filter((f) => f.endsWith(".tmp")).length, 0);
    });
  });

  describe("load", () => {
    it("should load and validate thread", async () => {
      const p = new ThreadPersistence({ baseDir: tmpDir });
      await p.save(makeThread("t1", "Test"));
      const loaded = await p.load("t1");
      assert.ok(loaded);
      assert.equal(loaded.id, "t1");
      assert.equal(loaded.title, "Test");
    });

    it("should return null for non-existent file", async () => {
      const p = new ThreadPersistence({ baseDir: tmpDir });
      const loaded = await p.load("nonexistent");
      assert.equal(loaded, null);
    });

    it("should return null for corrupted JSON", async () => {
      await fsp.writeFile(path.join(tmpDir, "bad.json"), "not-json{{", "utf-8");
      const p = new ThreadPersistence({ baseDir: tmpDir });
      const loaded = await p.load("bad");
      assert.equal(loaded, null);
    });

    it("should return null for invalid schema", async () => {
      await fsp.writeFile(path.join(tmpDir, "invalid.json"), JSON.stringify({ foo: "bar" }), "utf-8");
      const p = new ThreadPersistence({ baseDir: tmpDir });
      const loaded = await p.load("invalid");
      assert.equal(loaded, null);
    });
  });

  describe("delete", () => {
    it("should remove thread file", async () => {
      const p = new ThreadPersistence({ baseDir: tmpDir });
      await p.save(makeThread("t1"));
      await p.delete("t1");
      assert.ok(!fs.existsSync(path.join(tmpDir, "t1.json")));
    });

    it("should not throw for non-existent file", async () => {
      const p = new ThreadPersistence({ baseDir: tmpDir });
      await p.delete("nonexistent"); // Should not throw
    });
  });

  describe("list", () => {
    it("should list thread IDs", async () => {
      const p = new ThreadPersistence({ baseDir: tmpDir });
      await p.save(makeThread("a"));
      await p.save(makeThread("b"));
      await p.save(makeThread("c"));
      const ids = (await p.list()).sort();
      assert.deepEqual(ids, ["a", "b", "c"]);
    });

    it("should ignore tmp files", async () => {
      const p = new ThreadPersistence({ baseDir: tmpDir });
      await p.save(makeThread("t1"));
      await fsp.writeFile(path.join(tmpDir, "t2.json.tmp"), "temp", "utf-8");
      const ids = await p.list();
      assert.deepEqual(ids, ["t1"]);
    });

    it("should return empty for missing directory", async () => {
      const p = new ThreadPersistence({ baseDir: path.join(tmpDir, "nonexistent") });
      const ids = await p.list();
      assert.deepEqual(ids, []);
    });
  });

  describe("loadAll", () => {
    it("should load all valid threads", async () => {
      const p = new ThreadPersistence({ baseDir: tmpDir });
      await p.save(makeThread("t1", "First"));
      await p.save(makeThread("t2", "Second"));
      const all = await p.loadAll();
      assert.equal(all.length, 2);
      const titles = all.map((t) => t.title).sort();
      assert.deepEqual(titles, ["First", "Second"]);
    });

    it("should skip corrupted files", async () => {
      const p = new ThreadPersistence({ baseDir: tmpDir });
      await p.save(makeThread("t1", "Good"));
      await fsp.writeFile(path.join(tmpDir, "bad.json"), "corrupt", "utf-8");
      const all = await p.loadAll();
      assert.equal(all.length, 1);
      assert.equal(all[0].id, "t1");
    });
  });

  describe("autoSave", () => {
    it("should persist dirty threads on interval", async () => {
      const p = new ThreadPersistence({ baseDir: tmpDir, throttleMs: 50 });
      const store = new ThreadStore();
      const thread = makeThread("t1", "auto");
      store.setCachedThread(thread, { scheduleUpload: true });

      const handle = p.startAutoSave(store);
      // Wait for auto-save to fire
      await new Promise((r) => setTimeout(r, 120));
      handle.dispose();

      const loaded = await p.load("t1");
      assert.ok(loaded);
      assert.equal(loaded.title, "auto");
      // Dirty should be cleared
      assert.deepEqual(store.getDirtyThreadIds(), []);
    });

    it("should stop on dispose", async () => {
      const p = new ThreadPersistence({ baseDir: tmpDir, throttleMs: 30 });
      const store = new ThreadStore();
      const handle = p.startAutoSave(store);
      handle.dispose();

      // Mark dirty after dispose
      store.setCachedThread(makeThread("t1"), { scheduleUpload: true });
      await new Promise((r) => setTimeout(r, 100));
      // Should not have saved
      assert.equal(await p.load("t1"), null);
    });

    it("should handle multiple dirty threads", async () => {
      const p = new ThreadPersistence({ baseDir: tmpDir, throttleMs: 50 });
      const store = new ThreadStore();
      store.setCachedThread(makeThread("a", "A"), { scheduleUpload: true });
      store.setCachedThread(makeThread("b", "B"), { scheduleUpload: true });

      const handle = p.startAutoSave(store);
      await new Promise((r) => setTimeout(r, 120));
      handle.dispose();

      const a = await p.load("a");
      const b = await p.load("b");
      assert.ok(a);
      assert.ok(b);
      assert.equal(a.title, "A");
      assert.equal(b.title, "B");
    });
  });
});
