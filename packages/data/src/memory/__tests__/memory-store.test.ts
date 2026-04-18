/**
 * Tests for MemoryStore — JSON-backed user memory persistence.
 */

import assert from "node:assert/strict";
import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import { afterEach, beforeEach, describe, it } from "node:test";
import { MemoryStore } from "../memory-store";

let tmpDir: string;

beforeEach(async () => {
  tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "memory-store-test-"));
});

afterEach(async () => {
  await fs.rm(tmpDir, { recursive: true, force: true });
});

function makeStore(filename = "memory.json"): MemoryStore {
  return new MemoryStore(path.join(tmpDir, filename));
}

describe("MemoryStore", () => {
  it("starts with empty entries when file doesn't exist", async () => {
    const store = makeStore("nonexistent.json");
    const entries = await store.list();
    assert.deepEqual(entries, []);
  });

  it("add() persists a memory entry", async () => {
    const store = makeStore();
    await store.add("my-key", "my value");
    const entries = await store.list();
    assert.equal(entries.length, 1);
    assert.equal(entries[0].key, "my-key");
    assert.equal(entries[0].value, "my value");
    assert.ok(entries[0].createdAt);
    assert.ok(entries[0].updatedAt);
  });

  it("add() updates existing key", async () => {
    const store = makeStore();
    await store.add("dup-key", "original");
    await store.add("dup-key", "updated");
    const entries = await store.list();
    assert.equal(entries.length, 1);
    assert.equal(entries[0].value, "updated");
  });

  it("remove() deletes an entry", async () => {
    const store = makeStore();
    await store.add("del-key", "to delete");
    const removed = await store.remove("del-key");
    assert.equal(removed, true);
    const entries = await store.list();
    assert.equal(entries.length, 0);
  });

  it("remove() returns false for nonexistent key", async () => {
    const store = makeStore();
    const removed = await store.remove("ghost");
    assert.equal(removed, false);
  });

  it("get() retrieves a specific entry", async () => {
    const store = makeStore();
    await store.add("find-me", "found value");
    const entry = await store.get("find-me");
    assert.ok(entry);
    assert.equal(entry.key, "find-me");
    assert.equal(entry.value, "found value");
  });

  it("get() returns null for nonexistent key", async () => {
    const store = makeStore();
    const entry = await store.get("missing");
    assert.equal(entry, null);
  });

  it("persists to disk and survives reload", async () => {
    const filePath = path.join(tmpDir, "persistent.json");
    const store1 = new MemoryStore(filePath);
    await store1.add("persist-key", "persisted value", "test");

    // Create a new store instance pointing to the same file
    const store2 = new MemoryStore(filePath);
    const entry = await store2.get("persist-key");
    assert.ok(entry);
    assert.equal(entry.value, "persisted value");
    assert.equal(entry.source, "test");
  });

  it("getSystemPromptBlock() returns formatted text", async () => {
    const store = makeStore();
    await store.add("preferred-language", "TypeScript");
    await store.add("timezone", "UTC+8");
    const block = await store.getSystemPromptBlock();
    assert.ok(block.startsWith("# User Memories\n"));
    assert.ok(block.includes("- [preferred-language] TypeScript"));
    assert.ok(block.includes("- [timezone] UTC+8"));
  });

  it("getSystemPromptBlock() returns empty string for empty store", async () => {
    const store = makeStore();
    const block = await store.getSystemPromptBlock();
    assert.equal(block, "");
  });
});
