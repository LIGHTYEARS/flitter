/**
 * Threads 命令处理器测试
 *
 * 测试 handleThreadsList, handleThreadsNew, handleThreadsContinue,
 * handleThreadsArchive, handleThreadsDelete, handleThreadsExport,
 * handleThreadsMarkdown, handleThreadsRename, handleThreadsLabel,
 * handleThreadsSearch, handleThreadsUsage 的核心流程
 */

import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, it } from "node:test";
import type { ThreadStore } from "@flitter/data";
import { BehaviorSubject } from "@flitter/util";
import type { CliContext } from "../../context";
import {
  handleThreadsArchive,
  handleThreadsContinue,
  handleThreadsDelete,
  handleThreadsExport,
  handleThreadsLabel,
  handleThreadsList,
  handleThreadsMarkdown,
  handleThreadsNew,
  handleThreadsRename,
  handleThreadsSearch,
  handleThreadsUsage,
  renderThreadAsMarkdown,
} from "../threads";

// ─── Mock ThreadStore ────────────────────────────────────

function createMockThreadStore() {
  const threads = new Map<string, BehaviorSubject<Record<string, unknown>>>();
  const entriesSubject = new BehaviorSubject<Record<string, unknown>[] | null>(null);

  return {
    store: {
      observeThreadEntries() {
        return entriesSubject;
      },
      getThread(id: string) {
        return threads.get(id);
      },
      getThreadSnapshot(id: string) {
        return threads.get(id)?.getValue();
      },
      setCachedThread(snapshot: Record<string, unknown>) {
        const existing = threads.get(snapshot.id as string);
        if (existing) {
          existing.next(snapshot);
          return existing;
        }
        const subject = new BehaviorSubject(snapshot);
        threads.set(snapshot.id as string, subject);
        return subject;
      },
      deleteThread(id: string) {
        const existed = threads.has(id);
        threads.delete(id);
        return existed;
      },
      getCachedThreadIds() {
        return Array.from(threads.keys());
      },
    } as unknown as ThreadStore,
    threads,
    entriesSubject,
  };
}

// ─── Stdout/Stderr capture ───────────────────────────────

function captureOutput() {
  const stdout: string[] = [];
  const stderr: string[] = [];
  const origStdoutWrite = process.stdout.write;
  const origStderrWrite = process.stderr.write;

  process.stdout.write = ((chunk: string | Uint8Array) => {
    stdout.push(String(chunk));
    return true;
  }) as typeof process.stdout.write;

  process.stderr.write = ((chunk: string | Uint8Array) => {
    stderr.push(String(chunk));
    return true;
  }) as typeof process.stderr.write;

  return {
    stdout,
    stderr,
    restore() {
      process.stdout.write = origStdoutWrite;
      process.stderr.write = origStderrWrite;
    },
  };
}

// ─── Context fixture ─────────────────────────────────────

const ctx: CliContext = {
  executeMode: false,
  isTTY: true,
  headless: false,
  streamJson: false,
  verbose: false,
};

// ─── handleThreadsList 测试 ──────────────────────────────

describe("handleThreadsList", () => {
  let output: ReturnType<typeof captureOutput>;

  beforeEach(() => {
    output = captureOutput();
    process.exitCode = undefined;
  });

  afterEach(() => {
    output.restore();
    process.exitCode = undefined;
  });

  it("should print 'No threads found.' when entries are null", async () => {
    const { store } = createMockThreadStore();
    await handleThreadsList({ threadStore: store }, ctx, {
      limit: "20",
      format: "table",
    });
    assert.equal(output.stdout.join(""), "No threads found.\n");
  });

  it("should print 'No threads found.' when entries are empty", async () => {
    const { store, entriesSubject } = createMockThreadStore();
    entriesSubject.next([]);
    await handleThreadsList({ threadStore: store }, ctx, {
      limit: "20",
      format: "table",
    });
    assert.equal(output.stdout.join(""), "No threads found.\n");
  });

  it("should print table format with header and entries", async () => {
    const { store, entriesSubject } = createMockThreadStore();
    entriesSubject.next([
      {
        id: "abc123def456",
        title: "Test Thread",
        userLastInteractedAt: 1700000000000,
      },
    ]);
    await handleThreadsList({ threadStore: store }, ctx, {
      limit: "20",
      format: "table",
    });
    const out = output.stdout.join("");
    assert.ok(out.includes("ID"));
    assert.ok(out.includes("Title"));
    assert.ok(out.includes("Last Active"));
    assert.ok(out.includes("abc123def456"));
    assert.ok(out.includes("Test Thread"));
  });

  it("should output JSON format", async () => {
    const { store, entriesSubject } = createMockThreadStore();
    const entries = [
      {
        id: "abc123",
        title: "Thread 1",
        userLastInteractedAt: 1700000000000,
      },
    ];
    entriesSubject.next(entries);
    await handleThreadsList({ threadStore: store }, ctx, {
      limit: "20",
      format: "json",
    });
    const out = output.stdout.join("");
    const parsed = JSON.parse(out);
    assert.equal(parsed.length, 1);
    assert.equal(parsed[0].id, "abc123");
  });

  it("should respect limit option", async () => {
    const { store, entriesSubject } = createMockThreadStore();
    const entries = Array.from({ length: 5 }, (_, i) => ({
      id: `thread-${i}`,
      title: `Thread ${i}`,
      userLastInteractedAt: 1700000000000 + i,
    }));
    entriesSubject.next(entries);
    await handleThreadsList({ threadStore: store }, ctx, {
      limit: "2",
      format: "json",
    });
    const out = output.stdout.join("");
    const parsed = JSON.parse(out);
    assert.equal(parsed.length, 2);
  });

  it("should use 'Untitled' for null title", async () => {
    const { store, entriesSubject } = createMockThreadStore();
    entriesSubject.next([
      {
        id: "abc123def456",
        title: null,
        userLastInteractedAt: 1700000000000,
      },
    ]);
    await handleThreadsList({ threadStore: store }, ctx, {
      limit: "20",
      format: "table",
    });
    const out = output.stdout.join("");
    assert.ok(out.includes("Untitled"));
  });

  it("should error when threadStore is not available", async () => {
    await handleThreadsList({}, ctx, { limit: "20", format: "table" });
    assert.equal(process.exitCode, 1);
    assert.ok(output.stderr.join("").includes("ThreadStore not available"));
  });
});

// ─── handleThreadsNew 测试 ───────────────────────────────

describe("handleThreadsNew", () => {
  let output: ReturnType<typeof captureOutput>;

  beforeEach(() => {
    output = captureOutput();
    process.exitCode = undefined;
  });

  afterEach(() => {
    output.restore();
    process.exitCode = undefined;
  });

  it("should create a new thread and print its ID", async () => {
    const { store, threads } = createMockThreadStore();
    await handleThreadsNew({ threadStore: store }, ctx, {});
    const out = output.stdout.join("");
    assert.ok(out.startsWith("Created thread: "));
    // UUID format check
    const id = out.replace("Created thread: ", "").trim();
    assert.match(id, /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
    // Thread should be in the store
    assert.ok(threads.has(id));
  });

  it("should error when threadStore is not available", async () => {
    await handleThreadsNew({}, ctx, {});
    assert.equal(process.exitCode, 1);
    assert.ok(output.stderr.join("").includes("ThreadStore not available"));
  });
});

// ─── handleThreadsContinue 测试 ──────────────────────────

describe("handleThreadsContinue", () => {
  let output: ReturnType<typeof captureOutput>;

  beforeEach(() => {
    output = captureOutput();
    process.exitCode = undefined;
  });

  afterEach(() => {
    output.restore();
    process.exitCode = undefined;
  });

  it("should print continue message for existing thread", async () => {
    const { store, threads } = createMockThreadStore();
    const snapshot = { id: "test-id-123", v: 0, messages: [], relationships: [] };
    threads.set("test-id-123", new BehaviorSubject(snapshot));

    await handleThreadsContinue({ threadStore: store }, ctx, "test-id-123");
    const out = output.stdout.join("");
    assert.ok(out.includes("Continuing thread: test-id-123"));
    assert.ok(out.includes("flitter --thread-id test-id-123"));
  });

  it("should error for non-existent thread", async () => {
    const { store } = createMockThreadStore();
    await handleThreadsContinue({ threadStore: store }, ctx, "nonexistent");
    assert.equal(process.exitCode, 1);
    assert.ok(output.stderr.join("").includes('Thread "nonexistent" not found'));
  });

  it("should error when threadStore is not available", async () => {
    await handleThreadsContinue({}, ctx, "any-id");
    assert.equal(process.exitCode, 1);
    assert.ok(output.stderr.join("").includes("ThreadStore not available"));
  });
});

// ─── handleThreadsArchive 测试 ───────────────────────────

describe("handleThreadsArchive", () => {
  let output: ReturnType<typeof captureOutput>;

  beforeEach(() => {
    output = captureOutput();
    process.exitCode = undefined;
  });

  afterEach(() => {
    output.restore();
    process.exitCode = undefined;
  });

  it("should archive an existing thread", async () => {
    const { store, threads } = createMockThreadStore();
    const snapshot = { id: "test-id-123", v: 0, messages: [], relationships: [] };
    threads.set("test-id-123", new BehaviorSubject(snapshot));

    await handleThreadsArchive({ threadStore: store }, ctx, "test-id-123");
    const out = output.stdout.join("");
    assert.ok(out.includes("Archived thread: test-id-123"));
    // Verify the thread snapshot was updated with archived: true
    const updated = threads.get("test-id-123")?.getValue();
    assert.equal(updated.archived, true);
  });

  it("should error for non-existent thread", async () => {
    const { store } = createMockThreadStore();
    await handleThreadsArchive({ threadStore: store }, ctx, "nonexistent");
    assert.equal(process.exitCode, 1);
    assert.ok(output.stderr.join("").includes('Thread "nonexistent" not found'));
  });

  it("should error when threadStore is not available", async () => {
    await handleThreadsArchive({}, ctx, "any-id");
    assert.equal(process.exitCode, 1);
    assert.ok(output.stderr.join("").includes("ThreadStore not available"));
  });
});

// ─── handleThreadsDelete 测试 ────────────────────────────

describe("handleThreadsDelete", () => {
  let output: ReturnType<typeof captureOutput>;

  beforeEach(() => {
    output = captureOutput();
    process.exitCode = undefined;
  });

  afterEach(() => {
    output.restore();
    process.exitCode = undefined;
  });

  it("should delete an existing thread", async () => {
    const { store, threads } = createMockThreadStore();
    const snapshot = { id: "test-id-123", v: 0, messages: [], relationships: [] };
    threads.set("test-id-123", new BehaviorSubject(snapshot));

    await handleThreadsDelete({ threadStore: store }, ctx, "test-id-123");
    const out = output.stdout.join("");
    assert.ok(out.includes("Deleted thread: test-id-123"));
    // Thread should be removed from the store
    assert.equal(threads.has("test-id-123"), false);
  });

  it("should error for non-existent thread", async () => {
    const { store } = createMockThreadStore();
    await handleThreadsDelete({ threadStore: store }, ctx, "nonexistent");
    assert.equal(process.exitCode, 1);
    assert.ok(output.stderr.join("").includes('Thread "nonexistent" not found'));
  });

  it("should error when threadStore is not available", async () => {
    await handleThreadsDelete({}, ctx, "any-id");
    assert.equal(process.exitCode, 1);
    assert.ok(output.stderr.join("").includes("ThreadStore not available"));
  });
});

// ─── handleThreadsExport 测试 ───────────────────────────

describe("handleThreadsExport", () => {
  let output: ReturnType<typeof captureOutput>;

  beforeEach(() => {
    output = captureOutput();
    process.exitCode = undefined;
  });

  afterEach(() => {
    output.restore();
    process.exitCode = undefined;
  });

  it("should export thread as JSON", async () => {
    const { store, threads } = createMockThreadStore();
    const snapshot = {
      id: "test-export-123",
      v: 1,
      title: "Test Export",
      messages: [
        {
          role: "user",
          content: [{ type: "text", text: "hello" }],
          messageId: 1,
        },
      ],
      relationships: [],
    };
    threads.set("test-export-123", new BehaviorSubject(snapshot));

    await handleThreadsExport({ threadStore: store }, ctx, "test-export-123");
    const out = output.stdout.join("");
    const parsed = JSON.parse(out);
    assert.equal(parsed.id, "test-export-123");
    assert.equal(parsed.title, "Test Export");
    assert.equal(parsed.messages.length, 1);
  });

  it("should error for non-existent thread", async () => {
    const { store } = createMockThreadStore();
    await handleThreadsExport({ threadStore: store }, ctx, "nonexistent");
    assert.equal(process.exitCode, 1);
    assert.ok(output.stderr.join("").includes('Thread "nonexistent" not found'));
  });

  it("should error when threadStore is not available", async () => {
    await handleThreadsExport({}, ctx, "any-id");
    assert.equal(process.exitCode, 1);
    assert.ok(output.stderr.join("").includes("ThreadStore not available"));
  });
});

// ─── handleThreadsMarkdown 测试 ─────────────────────────

describe("handleThreadsMarkdown", () => {
  let output: ReturnType<typeof captureOutput>;

  beforeEach(() => {
    output = captureOutput();
    process.exitCode = undefined;
  });

  afterEach(() => {
    output.restore();
    process.exitCode = undefined;
  });

  it("should render thread as markdown", async () => {
    const { store, threads } = createMockThreadStore();
    const snapshot = {
      id: "test-md-123",
      v: 1,
      title: "Test Markdown",
      messages: [
        {
          role: "user",
          content: [{ type: "text", text: "What is 2+2?" }],
          messageId: 1,
        },
        {
          role: "assistant",
          content: [{ type: "text", text: "2+2 is 4." }],
          messageId: 2,
          state: { type: "complete", stopReason: "end_turn" },
        },
      ],
      relationships: [],
    };
    threads.set("test-md-123", new BehaviorSubject(snapshot));

    await handleThreadsMarkdown({ threadStore: store }, ctx, "test-md-123");
    const out = output.stdout.join("");
    assert.ok(out.includes("# Test Markdown"), "should contain title heading");
    assert.ok(out.includes("## User"), "should contain user section");
    assert.ok(out.includes("What is 2+2?"), "should contain user message");
    assert.ok(out.includes("## Assistant"), "should contain assistant section");
    assert.ok(out.includes("2+2 is 4."), "should contain assistant message");
  });

  it("should error for empty thread", async () => {
    const { store, threads } = createMockThreadStore();
    const snapshot = {
      id: "test-empty",
      v: 0,
      messages: [],
      relationships: [],
    };
    threads.set("test-empty", new BehaviorSubject(snapshot));

    await handleThreadsMarkdown({ threadStore: store }, ctx, "test-empty");
    assert.equal(process.exitCode, 1);
    assert.ok(output.stderr.join("").includes("Cannot render an empty thread"));
  });

  it("should error for non-existent thread", async () => {
    const { store } = createMockThreadStore();
    await handleThreadsMarkdown({ threadStore: store }, ctx, "nonexistent");
    assert.equal(process.exitCode, 1);
    assert.ok(output.stderr.join("").includes('Thread "nonexistent" not found'));
  });

  it("should error when threadStore is not available", async () => {
    await handleThreadsMarkdown({}, ctx, "any-id");
    assert.equal(process.exitCode, 1);
    assert.ok(output.stderr.join("").includes("ThreadStore not available"));
  });
});

// ─── renderThreadAsMarkdown 测试 ─────────────────────────

describe("renderThreadAsMarkdown", () => {
  it("should include frontmatter with thread metadata", () => {
    const md = renderThreadAsMarkdown({
      id: "test-id",
      v: 1,
      title: "My Thread",
      agentMode: "smart",
      messages: [],
      relationships: [],
    } as any);
    assert.ok(md.includes("---"), "should contain frontmatter delimiters");
    assert.ok(md.includes("title: My Thread"), "should contain title in frontmatter");
    assert.ok(md.includes("threadId: test-id"), "should contain threadId");
    assert.ok(md.includes("agentMode: smart"), "should contain agentMode");
  });

  it("should render tool_use blocks", () => {
    const md = renderThreadAsMarkdown({
      id: "test-id",
      v: 1,
      messages: [
        {
          role: "assistant",
          content: [
            {
              type: "tool_use",
              id: "tu_123",
              name: "Read",
              input: { file_path: "/tmp/test.ts" },
            },
          ],
          messageId: 1,
          state: { type: "complete", stopReason: "tool_use" },
        },
      ],
      relationships: [],
    } as any);
    assert.ok(md.includes("**Tool Use:** `Read`"), "should contain tool use block");
    assert.ok(md.includes("/tmp/test.ts"), "should contain tool input");
  });

  it("should render tool_result blocks", () => {
    const md = renderThreadAsMarkdown({
      id: "test-id",
      v: 1,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "tool_result",
              toolUseID: "tu_123",
              output: "file contents here",
              status: "done",
            },
          ],
          messageId: 2,
        },
      ],
      relationships: [],
    } as any);
    assert.ok(md.includes("**Tool Result** (done)"), "should contain tool result");
    assert.ok(md.includes("file contents here"), "should contain tool output");
  });
});

// ─── handleThreadsRename 测试 ───────────────────────────

describe("handleThreadsRename", () => {
  let output: ReturnType<typeof captureOutput>;

  beforeEach(() => {
    output = captureOutput();
    process.exitCode = undefined;
  });

  afterEach(() => {
    output.restore();
    process.exitCode = undefined;
  });

  it("should rename an existing thread", async () => {
    const { store, threads } = createMockThreadStore();
    const snapshot = {
      id: "rename-123",
      v: 1,
      title: "Old Name",
      messages: [
        { role: "user", content: [{ type: "text", text: "hi" }], messageId: 1 },
      ],
      relationships: [],
    };
    threads.set("rename-123", new BehaviorSubject(snapshot));

    await handleThreadsRename({ threadStore: store }, ctx, "rename-123", "New Name");
    const out = output.stdout.join("");
    assert.ok(out.includes('Renamed thread rename-123 to "New Name"'));
    // Verify the snapshot was updated
    const updated = threads.get("rename-123")?.getValue();
    assert.equal(updated?.title, "New Name");
  });

  it("should reject empty name", async () => {
    const { store } = createMockThreadStore();
    await handleThreadsRename({ threadStore: store }, ctx, "any-id", "   ");
    assert.equal(process.exitCode, 1);
    assert.ok(output.stderr.join("").includes("Thread name cannot be empty"));
  });

  it("should reject name longer than 256 characters", async () => {
    const { store } = createMockThreadStore();
    const longName = "a".repeat(257);
    await handleThreadsRename({ threadStore: store }, ctx, "any-id", longName);
    assert.equal(process.exitCode, 1);
    assert.ok(output.stderr.join("").includes("Thread name cannot exceed 256 characters"));
  });

  it("should error for empty thread", async () => {
    const { store, threads } = createMockThreadStore();
    const snapshot = {
      id: "empty-thread",
      v: 0,
      title: null,
      messages: [],
      relationships: [],
    };
    threads.set("empty-thread", new BehaviorSubject(snapshot));

    await handleThreadsRename({ threadStore: store }, ctx, "empty-thread", "New Name");
    assert.equal(process.exitCode, 1);
    assert.ok(output.stderr.join("").includes("Cannot rename an empty thread"));
  });

  it("should error for non-existent thread", async () => {
    const { store } = createMockThreadStore();
    await handleThreadsRename({ threadStore: store }, ctx, "nonexistent", "Name");
    assert.equal(process.exitCode, 1);
    assert.ok(output.stderr.join("").includes('Thread "nonexistent" not found'));
  });

  it("should error when threadStore is not available", async () => {
    await handleThreadsRename({}, ctx, "any-id", "Name");
    assert.equal(process.exitCode, 1);
    assert.ok(output.stderr.join("").includes("ThreadStore not available"));
  });
});

// ─── handleThreadsLabel 测试 ────────────────────────────

describe("handleThreadsLabel", () => {
  let output: ReturnType<typeof captureOutput>;

  beforeEach(() => {
    output = captureOutput();
    process.exitCode = undefined;
  });

  afterEach(() => {
    output.restore();
    process.exitCode = undefined;
  });

  it("should add labels to a thread", async () => {
    const { store, threads } = createMockThreadStore();
    const snapshot = {
      id: "label-123",
      v: 1,
      messages: [
        { role: "user", content: [{ type: "text", text: "hi" }], messageId: 1 },
      ],
      relationships: [],
    };
    threads.set("label-123", new BehaviorSubject(snapshot));

    await handleThreadsLabel({ threadStore: store }, ctx, "label-123", ["bug", "urgent"]);
    const out = output.stdout.join("");
    assert.ok(out.includes("label-123"));
    assert.ok(out.includes("bug"));
    assert.ok(out.includes("urgent"));
    // Verify the snapshot was updated
    const updated = threads.get("label-123")?.getValue();
    assert.deepEqual(updated?.labels, ["bug", "urgent"]);
  });

  it("should merge with existing labels and deduplicate", async () => {
    const { store, threads } = createMockThreadStore();
    const snapshot = {
      id: "label-456",
      v: 1,
      labels: ["existing", "bug"],
      messages: [
        { role: "user", content: [{ type: "text", text: "hi" }], messageId: 1 },
      ],
      relationships: [],
    };
    threads.set("label-456", new BehaviorSubject(snapshot));

    await handleThreadsLabel({ threadStore: store }, ctx, "label-456", ["bug", "new"]);
    const updated = threads.get("label-456")?.getValue();
    assert.deepEqual(updated?.labels, ["existing", "bug", "new"]);
  });

  it("should error when no labels provided", async () => {
    const { store } = createMockThreadStore();
    await handleThreadsLabel({ threadStore: store }, ctx, "any-id", []);
    assert.equal(process.exitCode, 1);
    assert.ok(output.stderr.join("").includes("At least one label is required"));
  });

  it("should error for non-existent thread", async () => {
    const { store } = createMockThreadStore();
    await handleThreadsLabel({ threadStore: store }, ctx, "nonexistent", ["label"]);
    assert.equal(process.exitCode, 1);
    assert.ok(output.stderr.join("").includes('Thread "nonexistent" not found'));
  });

  it("should error when threadStore is not available", async () => {
    await handleThreadsLabel({}, ctx, "any-id", ["label"]);
    assert.equal(process.exitCode, 1);
    assert.ok(output.stderr.join("").includes("ThreadStore not available"));
  });
});

// ─── handleThreadsSearch 测试 ───────────────────────────

describe("handleThreadsSearch", () => {
  let output: ReturnType<typeof captureOutput>;

  beforeEach(() => {
    output = captureOutput();
    process.exitCode = undefined;
  });

  afterEach(() => {
    output.restore();
    process.exitCode = undefined;
  });

  it("should find threads matching query", async () => {
    const { store, entriesSubject } = createMockThreadStore();
    entriesSubject.next([
      { id: "thread-1", title: "Auth feature", userLastInteractedAt: 1700000000000 },
      { id: "thread-2", title: "Bug fix", userLastInteractedAt: 1700000001000 },
      { id: "thread-3", title: "Auth refactor", userLastInteractedAt: 1700000002000 },
    ]);

    await handleThreadsSearch({ threadStore: store }, ctx, "auth", {
      limit: "20",
      offset: "0",
    });
    const out = output.stdout.join("");
    assert.ok(out.includes("Auth feature"), "should find Auth feature");
    assert.ok(out.includes("Auth refactor"), "should find Auth refactor");
    assert.ok(!out.includes("Bug fix"), "should not find Bug fix");
  });

  it("should output JSON format", async () => {
    const { store, entriesSubject } = createMockThreadStore();
    entriesSubject.next([
      { id: "thread-1", title: "Test thread", userLastInteractedAt: 1700000000000 },
    ]);

    await handleThreadsSearch({ threadStore: store }, ctx, "test", {
      limit: "20",
      offset: "0",
      json: true,
    });
    const out = output.stdout.join("");
    const parsed = JSON.parse(out);
    assert.equal(parsed.length, 1);
    assert.equal(parsed[0].id, "thread-1");
    assert.equal(parsed[0].title, "Test thread");
  });

  it("should print 'No threads found' when no matches", async () => {
    const { store, entriesSubject } = createMockThreadStore();
    entriesSubject.next([
      { id: "thread-1", title: "Hello", userLastInteractedAt: 1700000000000 },
    ]);

    await handleThreadsSearch({ threadStore: store }, ctx, "zzz-no-match", {
      limit: "20",
      offset: "0",
    });
    const out = output.stdout.join("");
    assert.ok(out.includes("No threads found matching your query"));
  });

  it("should handle empty thread store", async () => {
    const { store } = createMockThreadStore();
    await handleThreadsSearch({ threadStore: store }, ctx, "query", {
      limit: "20",
      offset: "0",
    });
    const out = output.stdout.join("");
    assert.ok(out.includes("No threads found matching your query"));
  });

  it("should respect limit option", async () => {
    const { store, entriesSubject } = createMockThreadStore();
    entriesSubject.next([
      { id: "thread-1", title: "Test 1", userLastInteractedAt: 1700000000000 },
      { id: "thread-2", title: "Test 2", userLastInteractedAt: 1700000001000 },
      { id: "thread-3", title: "Test 3", userLastInteractedAt: 1700000002000 },
    ]);

    await handleThreadsSearch({ threadStore: store }, ctx, "test", {
      limit: "2",
      offset: "0",
      json: true,
    });
    const out = output.stdout.join("");
    const parsed = JSON.parse(out);
    assert.equal(parsed.length, 2);
  });

  it("should search by thread ID", async () => {
    const { store, entriesSubject } = createMockThreadStore();
    entriesSubject.next([
      { id: "abc-unique-id", title: "Some thread", userLastInteractedAt: 1700000000000 },
      { id: "xyz-other", title: "Other thread", userLastInteractedAt: 1700000001000 },
    ]);

    await handleThreadsSearch({ threadStore: store }, ctx, "abc-unique", {
      limit: "20",
      offset: "0",
      json: true,
    });
    const out = output.stdout.join("");
    const parsed = JSON.parse(out);
    assert.equal(parsed.length, 1);
    assert.equal(parsed[0].id, "abc-unique-id");
  });

  it("should error when threadStore is not available", async () => {
    await handleThreadsSearch({}, ctx, "query", { limit: "20", offset: "0" });
    assert.equal(process.exitCode, 1);
    assert.ok(output.stderr.join("").includes("ThreadStore not available"));
  });
});

// ─── handleThreadsUsage 测试 ────────────────────────────

describe("handleThreadsUsage", () => {
  let output: ReturnType<typeof captureOutput>;

  beforeEach(() => {
    output = captureOutput();
    process.exitCode = undefined;
  });

  afterEach(() => {
    output.restore();
    process.exitCode = undefined;
  });

  it("should show usage from assistant messages", async () => {
    const { store, threads } = createMockThreadStore();
    const snapshot = {
      id: "usage-123",
      v: 1,
      title: "Usage Test",
      messages: [
        {
          role: "user",
          content: [{ type: "text", text: "hi" }],
          messageId: 1,
        },
        {
          role: "assistant",
          content: [{ type: "text", text: "hello" }],
          messageId: 2,
          state: { type: "complete", stopReason: "end_turn" },
          usage: {
            model: "claude-sonnet-4-20250514",
            maxInputTokens: 200000,
            inputTokens: 1500,
            outputTokens: 500,
            cacheCreationInputTokens: 100,
            cacheReadInputTokens: 50,
            totalInputTokens: 1650,
            timestamp: "2026-04-12T10:00:00Z",
          },
        },
        {
          role: "assistant",
          content: [{ type: "text", text: "world" }],
          messageId: 3,
          state: { type: "complete", stopReason: "end_turn" },
          usage: {
            model: "claude-sonnet-4-20250514",
            maxInputTokens: 200000,
            inputTokens: 2000,
            outputTokens: 800,
            cacheCreationInputTokens: null,
            cacheReadInputTokens: 200,
            totalInputTokens: 2200,
            timestamp: "2026-04-12T10:01:00Z",
          },
        },
      ],
      relationships: [],
    };
    threads.set("usage-123", new BehaviorSubject(snapshot));

    await handleThreadsUsage({ threadStore: store }, ctx, "usage-123");
    const out = output.stdout.join("");
    assert.ok(out.includes("Thread: usage-123"));
    assert.ok(out.includes("Title: Usage Test"));
    assert.ok(out.includes("claude-sonnet-4-20250514"));
    assert.ok(out.includes("3,500"), "should sum input tokens (1500 + 2000)");
    assert.ok(out.includes("1,300"), "should sum output tokens (500 + 800)");
  });

  it("should print 'No usage recorded' when no assistant usage", async () => {
    const { store, threads } = createMockThreadStore();
    const snapshot = {
      id: "no-usage",
      v: 1,
      messages: [
        { role: "user", content: [{ type: "text", text: "hi" }], messageId: 1 },
      ],
      relationships: [],
    };
    threads.set("no-usage", new BehaviorSubject(snapshot));

    await handleThreadsUsage({ threadStore: store }, ctx, "no-usage");
    const out = output.stdout.join("");
    assert.ok(out.includes("No usage recorded for this thread yet"));
  });

  it("should error for non-existent thread", async () => {
    const { store } = createMockThreadStore();
    await handleThreadsUsage({ threadStore: store }, ctx, "nonexistent");
    assert.equal(process.exitCode, 1);
    assert.ok(output.stderr.join("").includes('Thread "nonexistent" not found'));
  });

  it("should error when threadStore is not available", async () => {
    await handleThreadsUsage({}, ctx, "any-id");
    assert.equal(process.exitCode, 1);
    assert.ok(output.stderr.join("").includes("ThreadStore not available"));
  });
});
