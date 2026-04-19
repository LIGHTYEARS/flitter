/**
 * FileChangeTracker unit tests
 *
 * Covers: record, getLastEdit, revertLastEdit, getHistory, clear,
 * multiple files, multiple edits per file, empty history.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { FileChangeTracker } from "./file-change-tracker";

describe("FileChangeTracker", () => {
  // ─── record + getLastEdit ────────────────────────────────

  it("returns null for unknown file", () => {
    const tracker = new FileChangeTracker();
    assert.equal(tracker.getLastEdit("/no/such/file"), null);
  });

  it("records a change and retrieves it via getLastEdit", () => {
    const tracker = new FileChangeTracker();
    tracker.record("/file.txt", "old", "new");
    const last = tracker.getLastEdit("/file.txt");
    assert.ok(last);
    assert.equal(last.path, "/file.txt");
    assert.equal(last.oldContent, "old");
    assert.equal(last.newContent, "new");
    assert.equal(typeof last.timestamp, "number");
  });

  it("getLastEdit returns the most recent edit", () => {
    const tracker = new FileChangeTracker();
    tracker.record("/file.txt", "v0", "v1");
    tracker.record("/file.txt", "v1", "v2");
    const last = tracker.getLastEdit("/file.txt");
    assert.ok(last);
    assert.equal(last.oldContent, "v1");
    assert.equal(last.newContent, "v2");
  });

  it("getLastEdit does not remove the entry", () => {
    const tracker = new FileChangeTracker();
    tracker.record("/file.txt", "old", "new");
    tracker.getLastEdit("/file.txt");
    const still = tracker.getLastEdit("/file.txt");
    assert.ok(still);
    assert.equal(still.oldContent, "old");
  });

  // ─── revertLastEdit ──────────────────────────────────────

  it("revertLastEdit pops and returns the last edit", () => {
    const tracker = new FileChangeTracker();
    tracker.record("/file.txt", "v0", "v1");
    tracker.record("/file.txt", "v1", "v2");

    const reverted = tracker.revertLastEdit("/file.txt");
    assert.ok(reverted);
    assert.equal(reverted.oldContent, "v1");
    assert.equal(reverted.newContent, "v2");

    // After revert, the previous edit should be the last
    const prev = tracker.getLastEdit("/file.txt");
    assert.ok(prev);
    assert.equal(prev.oldContent, "v0");
    assert.equal(prev.newContent, "v1");
  });

  it("revertLastEdit returns null for unknown file", () => {
    const tracker = new FileChangeTracker();
    assert.equal(tracker.revertLastEdit("/nope"), null);
  });

  it("revertLastEdit returns null after all edits are reverted", () => {
    const tracker = new FileChangeTracker();
    tracker.record("/file.txt", "old", "new");
    tracker.revertLastEdit("/file.txt");
    assert.equal(tracker.revertLastEdit("/file.txt"), null);
    assert.equal(tracker.getLastEdit("/file.txt"), null);
  });

  // ─── getHistory ──────────────────────────────────────────

  it("getHistory returns all edits oldest-first", () => {
    const tracker = new FileChangeTracker();
    tracker.record("/file.txt", "v0", "v1");
    tracker.record("/file.txt", "v1", "v2");
    tracker.record("/file.txt", "v2", "v3");

    const history = tracker.getHistory("/file.txt");
    assert.equal(history.length, 3);
    assert.equal(history[0].oldContent, "v0");
    assert.equal(history[1].oldContent, "v1");
    assert.equal(history[2].oldContent, "v2");
  });

  it("getHistory returns empty array for unknown file", () => {
    const tracker = new FileChangeTracker();
    assert.deepEqual(tracker.getHistory("/nope"), []);
  });

  // ─── multiple files ──────────────────────────────────────

  it("tracks changes independently per file", () => {
    const tracker = new FileChangeTracker();
    tracker.record("/a.txt", "a0", "a1");
    tracker.record("/b.txt", "b0", "b1");

    assert.equal(tracker.getLastEdit("/a.txt")!.oldContent, "a0");
    assert.equal(tracker.getLastEdit("/b.txt")!.oldContent, "b0");

    tracker.revertLastEdit("/a.txt");
    assert.equal(tracker.getLastEdit("/a.txt"), null);
    assert.equal(tracker.getLastEdit("/b.txt")!.oldContent, "b0");
  });

  // ─── clear ───────────────────────────────────────────────

  it("clear removes all history", () => {
    const tracker = new FileChangeTracker();
    tracker.record("/a.txt", "a0", "a1");
    tracker.record("/b.txt", "b0", "b1");
    tracker.clear();

    assert.equal(tracker.getLastEdit("/a.txt"), null);
    assert.equal(tracker.getLastEdit("/b.txt"), null);
    assert.deepEqual(tracker.getHistory("/a.txt"), []);
  });
});
