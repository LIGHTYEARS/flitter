/**
 * @flitter/cli — ThreadPicker widget tests
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { ThreadPicker, ThreadPickerState } from "./thread-picker.js";
import type { ThreadPickerEntry } from "./thread-picker.js";

function makeEntries(): ThreadPickerEntry[] {
  return [
    { id: "t1", title: "Fix login bug", updatedAt: new Date().toISOString(), messageCount: 5, workspace: "/ws1" },
    { id: "t2", title: "Add search feature", updatedAt: new Date(Date.now() - 3600000).toISOString(), messageCount: 12, workspace: "/ws1" },
    { id: "t3", title: "Refactor TUI", updatedAt: new Date(Date.now() - 86400000).toISOString(), messageCount: 3, workspace: "/ws2" },
  ];
}

describe("ThreadPicker", () => {
  it("should create a ThreadPicker widget", () => {
    const picker = new ThreadPicker({
      threads: makeEntries(),
      isLoading: false,
      filterByWorkspace: false,
      onSelect: () => {},
      onCancel: () => {},
    });

    assert.ok(picker.config);
    assert.equal(picker.config.threads.length, 3);
  });

  it("should create state with default values", () => {
    const picker = new ThreadPicker({
      threads: makeEntries(),
      isLoading: false,
      filterByWorkspace: false,
      onSelect: () => {},
      onCancel: () => {},
    });

    const state = picker.createState();
    assert.ok(state instanceof ThreadPickerState);
  });

  it("should store config correctly", () => {
    const threads = makeEntries();
    const onSelect = (id: string) => { void id; };
    const onCancel = () => {};

    const picker = new ThreadPicker({
      threads,
      isLoading: true,
      loadError: "Network error",
      filterByWorkspace: true,
      currentWorkspace: "/ws1",
      onSelect,
      onCancel,
    });

    assert.equal(picker.config.threads.length, 3);
    assert.equal(picker.config.isLoading, true);
    assert.equal(picker.config.loadError, "Network error");
    assert.equal(picker.config.filterByWorkspace, true);
    assert.equal(picker.config.currentWorkspace, "/ws1");
  });
});

describe("ThreadPickerEntry", () => {
  it("should have correct structure", () => {
    const entry: ThreadPickerEntry = {
      id: "abc-123",
      title: "My thread",
      updatedAt: "2026-04-20T00:00:00Z",
      messageCount: 7,
      workspace: "/path/to/workspace",
    };

    assert.equal(entry.id, "abc-123");
    assert.equal(entry.title, "My thread");
    assert.equal(entry.messageCount, 7);
  });

  it("should allow optional workspace", () => {
    const entry: ThreadPickerEntry = {
      id: "t1",
      title: "Test",
      updatedAt: "2026-01-01",
      messageCount: 1,
    };

    assert.equal(entry.workspace, undefined);
  });
});
