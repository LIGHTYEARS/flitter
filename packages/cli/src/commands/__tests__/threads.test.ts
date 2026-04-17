/**
 * Threads 命令处理器测试
 *
 * 测试 handleThreadsList, handleThreadsNew, handleThreadsContinue,
 * handleThreadsArchive, handleThreadsDelete 的核心流程:
 * - 线程列表 (table/json 格式, limit)
 * - 创建新线程
 * - 继续已有线程 (存在/不存在)
 * - 归档线程
 * - 删除线程 (存在/不存在)
 * - ThreadStore 不可用时的错误处理
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
  handleThreadsList,
  handleThreadsNew,
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
