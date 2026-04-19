/**
 * thread-picker.test.ts — ThreadPicker unit tests
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  createThreadPicker,
  formatThreadLabel,
  type ThreadPickerEntry,
} from "./thread-picker.js";

// ─── Helper data ─────────────────────────────────────────

function createEntry(overrides: Partial<ThreadPickerEntry> = {}): ThreadPickerEntry {
  return {
    id: "abc12345-6789-0abc-def0-1234567890ab",
    title: "Fix bug in parser",
    date: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
    messageCount: 5,
    ...overrides,
  };
}

// ─── Tests ───────────────────────────────────────────────

describe("formatThreadLabel", () => {
  it("formats a thread entry as 'id — title — date — msgs'", () => {
    const entry = createEntry({ messageCount: 3 });
    const label = formatThreadLabel(entry);

    assert.ok(label.includes("abc12345"), "should contain truncated ID");
    assert.ok(label.includes("Fix bug in parser"), "should contain title");
    assert.ok(label.includes("3 msgs"), "should contain message count");
    assert.ok(label.includes("—"), "should use em-dash separator");
  });

  it("uses '(untitled)' for empty title", () => {
    const entry = createEntry({ title: "" });
    const label = formatThreadLabel(entry);
    assert.ok(label.includes("(untitled)"));
  });

  it("uses singular 'msg' for count of 1", () => {
    const entry = createEntry({ messageCount: 1 });
    const label = formatThreadLabel(entry);
    assert.ok(label.includes("1 msg"));
    assert.ok(!label.includes("1 msgs"));
  });

  it("shows relative date for recent entries", () => {
    const entry = createEntry({
      date: new Date(Date.now() - 5 * 60000).toISOString(), // 5 min ago
    });
    const label = formatThreadLabel(entry);
    assert.ok(label.includes("5m ago"), `Expected '5m ago' in: ${label}`);
  });

  it("shows relative date in hours", () => {
    const entry = createEntry({
      date: new Date(Date.now() - 3 * 3600000).toISOString(), // 3 hours ago
    });
    const label = formatThreadLabel(entry);
    assert.ok(label.includes("3h ago"), `Expected '3h ago' in: ${label}`);
  });

  it("shows relative date in days", () => {
    const entry = createEntry({
      date: new Date(Date.now() - 2 * 86400000).toISOString(), // 2 days ago
    });
    const label = formatThreadLabel(entry);
    assert.ok(label.includes("2d ago"), `Expected '2d ago' in: ${label}`);
  });
});

describe("createThreadPicker", () => {
  it("returns a FuzzyPicker widget", () => {
    const picker = createThreadPicker({
      threads: [createEntry()],
      onSelect: () => {},
      onCancel: () => {},
    });

    assert.ok(picker, "should return a widget");
    assert.equal(picker.constructor.name, "FuzzyPicker");
  });

  it("filters out archived threads", () => {
    const threads = [
      createEntry({ id: "a", archived: false }),
      createEntry({ id: "b", archived: true }),
      createEntry({ id: "c", archived: false }),
    ];

    const picker = createThreadPicker({
      threads,
      onSelect: () => {},
      onCancel: () => {},
    });

    // The FuzzyPicker should have 2 items (non-archived)
    assert.equal((picker as any).items.length, 2);
  });

  it("sorts threads by most recent first", () => {
    const threads = [
      createEntry({
        id: "old",
        date: new Date(Date.now() - 86400000).toISOString(), // 1 day ago
      }),
      createEntry({
        id: "new",
        date: new Date(Date.now() - 60000).toISOString(), // 1 min ago
      }),
    ];

    const picker = createThreadPicker({
      threads,
      onSelect: () => {},
      onCancel: () => {},
    });

    const items = (picker as any).items as ThreadPickerEntry[];
    assert.equal(items[0].id, "new", "newest thread should be first");
  });

  it("sets title on the FuzzyPicker", () => {
    const picker = createThreadPicker({
      threads: [createEntry()],
      onSelect: () => {},
      onCancel: () => {},
      title: "Pick a thread",
    });

    assert.equal((picker as any).title, "Pick a thread");
  });

  it("calls onSelect with thread ID on accept", () => {
    let selectedId: string | null = null;
    const picker = createThreadPicker({
      threads: [createEntry({ id: "test-thread-id" })],
      onSelect: (id) => { selectedId = id; },
      onCancel: () => {},
    });

    // Simulate acceptance by calling onAccept directly
    const onAccept = (picker as any).onAccept;
    onAccept(createEntry({ id: "test-thread-id" }), { hasUserInteracted: true });
    assert.equal(selectedId, "test-thread-id");
  });

  it("calls onCancel on dismiss", () => {
    let cancelled = false;
    const picker = createThreadPicker({
      threads: [createEntry()],
      onSelect: () => {},
      onCancel: () => { cancelled = true; },
    });

    const onDismiss = (picker as any).onDismiss;
    onDismiss();
    assert.ok(cancelled);
  });

  it("marks current thread as disabled", () => {
    const threads = [
      createEntry({ id: "current-thread" }),
      createEntry({ id: "other-thread" }),
    ];

    const picker = createThreadPicker({
      threads,
      onSelect: () => {},
      onCancel: () => {},
      currentThreadId: "current-thread",
    });

    const isDisabled = (picker as any).isItemDisabled;
    assert.ok(isDisabled);
    assert.ok(isDisabled(createEntry({ id: "current-thread" })));
    assert.ok(!isDisabled(createEntry({ id: "other-thread" })));
  });
});
