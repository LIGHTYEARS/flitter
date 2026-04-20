> **STATUS: COMPLETED** — This plan has been fully implemented and is kept for historical reference only.

# Thread Persistence & Continuation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Wire ThreadPersistence to auto-save dirty threads to disk, load existing threads on startup, and make `flitter threads continue` / `flitter --continue` actually resume a persisted thread.

**Architecture:** ThreadPersistence already implements atomic JSON save/load and a polling `startAutoSave(store)` method. ThreadStore already tracks dirty threads via `markDirty`/`getDirtyThreadIds`. The pieces exist — they just aren't connected. This plan wires: (1) `startAutoSave` on container creation, (2) `loadAll` on startup to hydrate ThreadStore, (3) `markDirty` on snapshot updates, and (4) the `--continue` flag to resolve the most recent thread from the hydrated store.

**Tech Stack:** TypeScript, Bun test runner, `@flitter/data` (ThreadStore, ThreadPersistence), `@flitter/flitter` (container.ts)

**Amp reference:** `amp-cli-reversed/modules/1244_ThreadWorker_ov.js:248-254` — amp's `threadReadWriter` auto-persists on every update. `amp-cli-reversed/chunk-002.js:~22400` — amp loads all local threads via `threadService.listLocalThreads()` on startup.

**Depends on:** Plan 1 (Container Wiring) — specifically Task 3 (`updateThreadSnapshot` wired to `threadStore.setCachedThread`).

---

## File Structure

| Action | Path | Responsibility |
|--------|------|----------------|
| Modify | `packages/flitter/src/container.ts` | Start auto-save, load threads on startup, mark dirty on update |
| Modify | `packages/data/src/thread/thread-store.ts` | Add `listRecentThreadIds()` method for `--continue` |
| Modify | `packages/cli/src/modes/interactive.ts` | Fix `resolveThread` to load from persistence |
| Modify | `packages/cli/src/commands/threads.ts` | Fix `handleThreadsContinue`, `handleThreadsArchive`, `handleThreadsDelete` to persist |
| Create | `packages/flitter/src/__tests__/thread-persistence-wiring.test.ts` | Tests |

---

### Task 1: Start `ThreadPersistence.startAutoSave` in container creation

**Why:** Without this, `ThreadStore.markDirty()` sets a flag that nobody reads. The auto-save timer polls dirty IDs and writes them to disk.

**Files:**
- Modify: `packages/flitter/src/container.ts:226-231`
- Test: `packages/flitter/src/__tests__/thread-persistence-wiring.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// packages/flitter/src/__tests__/thread-persistence-wiring.test.ts
import { describe, expect, it } from "bun:test";
import * as fs from "node:fs";
import * as path from "node:path";
import { createContainer, type ContainerOptions } from "../container";

const TEST_DATA_DIR = "/tmp/flitter-persistence-test-" + Date.now();

function makeContainerOpts(overrides?: Partial<ContainerOptions>): ContainerOptions {
  return {
    settings: {
      get: () => ({ model: "claude-sonnet-4-20250514" }),
      set: async () => {},
      watch: () => ({ unsubscribe: () => {} }),
      getPath: () => "/tmp/flitter-test/settings.json",
    } as any,
    secrets: {
      get: async () => undefined,
      set: async () => {},
      delete: async () => {},
    },
    workspaceRoot: "/tmp/flitter-test-workspace",
    dataDir: TEST_DATA_DIR,
    homeDir: "/tmp/flitter-test-home",
    configDir: "/tmp/flitter-test-config",
    ...overrides,
  };
}

describe("thread persistence: auto-save", () => {
  it("dirty threads are saved to disk within the auto-save interval", async () => {
    const container = await createContainer(makeContainerOpts());
    try {
      const threadId = "persist-test-1";
      // setCachedThread with scheduleUpload: true marks it dirty
      container.threadStore.setCachedThread(
        { id: threadId, v: 1, messages: [{ role: "user", content: [{ type: "text", text: "hello" }] }], relationships: [] } as any,
        { scheduleUpload: true },
      );

      // Wait for auto-save tick (default 1000ms, give 1500ms margin)
      await new Promise((r) => setTimeout(r, 1500));

      // Verify file exists on disk
      const filePath = path.join(TEST_DATA_DIR, `${threadId}.json`);
      expect(fs.existsSync(filePath)).toBe(true);

      const content = JSON.parse(fs.readFileSync(filePath, "utf-8"));
      expect(content.id).toBe(threadId);
      expect(content.messages).toHaveLength(1);
    } finally {
      await container.asyncDispose();
      // Cleanup
      fs.rmSync(TEST_DATA_DIR, { recursive: true, force: true });
    }
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd /Users/bytedance/workspace/flitter && bun test packages/flitter/src/__tests__/thread-persistence-wiring.test.ts`
Expected: FAIL — `startAutoSave` is never called, so no file is written.

- [ ] **Step 3: Wire `startAutoSave` in container creation**

In `packages/flitter/src/container.ts`, after the ThreadPersistence creation (around line 231), add:

```typescript
// After line 231 (after threadPersistence creation log):
let autoSaveDisposable: { dispose: () => void } | null = null;
if (threadPersistence) {
  autoSaveDisposable = threadPersistence.startAutoSave(threadStore);
  disposables.push({ dispose: () => autoSaveDisposable?.dispose() });
  log.info("ThreadPersistence auto-save started");
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd /Users/bytedance/workspace/flitter && bun test packages/flitter/src/__tests__/thread-persistence-wiring.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add packages/flitter/src/container.ts packages/flitter/src/__tests__/thread-persistence-wiring.test.ts
git commit -m "fix(container): start ThreadPersistence.startAutoSave on container creation

Dirty threads are now automatically persisted to disk every 1000ms.
The auto-save disposable is added to the container's cleanup chain."
```

---

### Task 2: Load persisted threads on container startup

**Why:** Without loading persisted threads, ThreadStore starts empty on every launch. The `--continue` flag and `flitter threads list` have nothing to show.

**Files:**
- Modify: `packages/flitter/src/container.ts` (after ThreadPersistence + auto-save setup)
- Test: `packages/flitter/src/__tests__/thread-persistence-wiring.test.ts` (append)

- [ ] **Step 1: Write the failing test**

Append to the test file:

```typescript
describe("thread persistence: load on startup", () => {
  it("threads persisted to disk are loaded into ThreadStore on container creation", async () => {
    // Pre-populate disk with a thread file
    fs.mkdirSync(TEST_DATA_DIR, { recursive: true });
    const threadId = "preexisting-thread-1";
    const threadData = {
      id: threadId,
      v: 1,
      title: "Old conversation",
      messages: [
        { role: "user", content: [{ type: "text", text: "saved message" }] },
      ],
      relationships: [],
      env: "local",
      agentMode: "normal",
    };
    fs.writeFileSync(
      path.join(TEST_DATA_DIR, `${threadId}.json`),
      JSON.stringify(threadData),
    );

    const container = await createContainer(makeContainerOpts());
    try {
      // The thread should be in ThreadStore
      const snapshot = container.threadStore.getThreadSnapshot(threadId);
      expect(snapshot).not.toBeUndefined();
      expect(snapshot!.id).toBe(threadId);
      expect(snapshot!.messages).toHaveLength(1);
      expect(snapshot!.messages[0].content[0].text).toBe("saved message");
    } finally {
      await container.asyncDispose();
      fs.rmSync(TEST_DATA_DIR, { recursive: true, force: true });
    }
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd /Users/bytedance/workspace/flitter && bun test packages/flitter/src/__tests__/thread-persistence-wiring.test.ts`
Expected: FAIL — `loadAll` is never called, so `getThreadSnapshot` returns `undefined`.

- [ ] **Step 3: Load threads after persistence is created**

In `packages/flitter/src/container.ts`, after the auto-save wiring, add:

```typescript
// Load persisted threads into ThreadStore
if (threadPersistence) {
  try {
    const persisted = await threadPersistence.loadAll();
    for (const thread of persisted) {
      threadStore.setCachedThread(thread);
    }
    log.info("Loaded persisted threads", { count: persisted.length });
  } catch (err) {
    log.warn("Failed to load persisted threads", { error: err });
  }
}
```

Note: `setCachedThread` without `{ scheduleUpload: true }` does NOT mark the thread dirty — so loading doesn't immediately trigger a re-save loop.

- [ ] **Step 4: Run test to verify it passes**

Run: `cd /Users/bytedance/workspace/flitter && bun test packages/flitter/src/__tests__/thread-persistence-wiring.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add packages/flitter/src/container.ts packages/flitter/src/__tests__/thread-persistence-wiring.test.ts
git commit -m "fix(container): load persisted threads into ThreadStore on startup

Calls threadPersistence.loadAll() and feeds each snapshot into
threadStore.setCachedThread() (without scheduleUpload to avoid
marking them dirty). This hydrates ThreadStore so threads list
and --continue work across process restarts."
```

---

### Task 3: Mark threads dirty on `updateThreadSnapshot`

**Why:** Plan 1 Task 3 wires `updateThreadSnapshot` to call `threadStore.setCachedThread(snapshot)`. But `setCachedThread` only marks dirty when `{ scheduleUpload: true }` is passed. Streaming updates should trigger persistence.

**Files:**
- Modify: `packages/flitter/src/container.ts` (the `updateThreadSnapshot` default from Plan 1)
- Test: `packages/flitter/src/__tests__/thread-persistence-wiring.test.ts` (append)

- [ ] **Step 1: Write the failing test**

Append to the test file:

```typescript
describe("thread persistence: dirty on update", () => {
  it("updateThreadSnapshot marks thread as dirty for auto-save", async () => {
    const container = await createContainer(makeContainerOpts());
    try {
      const threadId = "dirty-test-1";
      container.threadStore.setCachedThread({
        id: threadId, v: 1, messages: [], relationships: [],
      } as any);

      const worker = container.createThreadWorker(threadId);
      // Simulate assistant content update (what ThreadWorker.updateAssistantContent does)
      (worker as any).opts.updateThreadSnapshot({
        id: threadId, v: 1,
        messages: [{ role: "assistant", content: [{ type: "text", text: "response" }] }],
        relationships: [],
      });

      // Thread should be marked dirty
      const dirtyIds = container.threadStore.getDirtyThreadIds();
      expect(dirtyIds).toContain(threadId);
    } finally {
      await container.asyncDispose();
      fs.rmSync(TEST_DATA_DIR, { recursive: true, force: true });
    }
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd /Users/bytedance/workspace/flitter && bun test packages/flitter/src/__tests__/thread-persistence-wiring.test.ts`
Expected: FAIL — `setCachedThread` without `scheduleUpload: true` does not mark dirty.

- [ ] **Step 3: Update `updateThreadSnapshot` to pass `scheduleUpload: true`**

In `packages/flitter/src/container.ts`, update the `updateThreadSnapshot` default (from Plan 1 Task 3):

```typescript
// From Plan 1 Task 3:
updateThreadSnapshot:
  workerOpts?.updateThreadSnapshot ??
  ((snapshot: ThreadSnapshot) => {
    threadStore.setCachedThread(snapshot, { scheduleUpload: true });
  }),
```

The only change is adding `{ scheduleUpload: true }` to the `setCachedThread` call.

- [ ] **Step 4: Run test to verify it passes**

Run: `cd /Users/bytedance/workspace/flitter && bun test packages/flitter/src/__tests__/thread-persistence-wiring.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add packages/flitter/src/container.ts packages/flitter/src/__tests__/thread-persistence-wiring.test.ts
git commit -m "fix(container): mark threads dirty on updateThreadSnapshot for auto-save

Pass { scheduleUpload: true } to setCachedThread so streaming assistant
content updates trigger the auto-save timer to persist the thread."
```

---

### Task 4: Add `listRecentThreadIds` to ThreadStore

**Why:** The `--continue` flag needs to find the most recently interacted thread. `ThreadStore.observeThreadEntries()` has this data (sorted by `userLastInteractedAt` desc) but `interactive.ts` currently casts to a non-existent `listThreads` method.

**Files:**
- Modify: `packages/data/src/thread/thread-store.ts`
- Test: `packages/data/src/thread/__tests__/thread-store.test.ts` (create if doesn't exist)

- [ ] **Step 1: Write the failing test**

```typescript
// packages/data/src/thread/__tests__/thread-store.test.ts
import { describe, expect, it } from "bun:test";
import { ThreadStore } from "../thread-store";

describe("ThreadStore.listRecentThreadIds", () => {
  it("returns thread IDs sorted by most recently interacted", () => {
    const store = new ThreadStore();

    store.setCachedThread({
      id: "old", v: 1, messages: [
        { role: "user", content: [{ type: "text", text: "old" }], createdAt: "2026-01-01T00:00:00Z" },
      ], relationships: [],
    } as any);

    store.setCachedThread({
      id: "new", v: 1, messages: [
        { role: "user", content: [{ type: "text", text: "new" }], createdAt: "2026-04-18T00:00:00Z" },
      ], relationships: [],
    } as any);

    const ids = store.listRecentThreadIds(10);
    expect(ids.length).toBe(2);
    // Most recent first
    expect(ids[0]).toBe("new");
    expect(ids[1]).toBe("old");
  });

  it("returns empty array when no threads", () => {
    const store = new ThreadStore();
    expect(store.listRecentThreadIds(10)).toEqual([]);
  });

  it("respects limit parameter", () => {
    const store = new ThreadStore();
    for (let i = 0; i < 5; i++) {
      store.setCachedThread({
        id: `thread-${i}`, v: 1, messages: [], relationships: [],
      } as any);
    }
    expect(store.listRecentThreadIds(2)).toHaveLength(2);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd /Users/bytedance/workspace/flitter && bun test packages/data/src/thread/__tests__/thread-store.test.ts`
Expected: FAIL — `listRecentThreadIds` does not exist.

- [ ] **Step 3: Add `listRecentThreadIds` to ThreadStore**

In `packages/data/src/thread/thread-store.ts`, add a new public method:

```typescript
/**
 * Return thread IDs sorted by most recently interacted, limited to `maxCount`.
 * Used by --continue to find the latest thread.
 */
listRecentThreadIds(maxCount: number): string[] {
  const entries = this.threadEntriesSubject.getValue();
  if (!entries) return [];
  // threadEntriesSubject is already sorted by userLastInteractedAt desc
  return entries.slice(0, maxCount).map((e) => e.id);
}
```

- [ ] **Step 4: Export from `@flitter/data` index**

Verify `listRecentThreadIds` is accessible via the `ThreadStore` class export (it should be automatically since `ThreadStore` is already exported as a class).

- [ ] **Step 5: Run test to verify it passes**

Run: `cd /Users/bytedance/workspace/flitter && bun test packages/data/src/thread/__tests__/thread-store.test.ts`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add packages/data/src/thread/thread-store.ts packages/data/src/thread/__tests__/thread-store.test.ts
git commit -m "feat(data): add ThreadStore.listRecentThreadIds for --continue support

Returns thread IDs sorted by most recently interacted, respecting a
limit parameter. Leverages the existing threadEntriesSubject which
maintains sorted order."
```

---

### Task 5: Fix `resolveThread` in interactive mode for `--continue`

**Why:** The current `resolveThread` casts `threadStore` to a non-existent `listThreads` method. It should use the new `listRecentThreadIds` and actually load the thread from persistence if needed.

**Files:**
- Modify: `packages/cli/src/modes/interactive.ts:87-120`
- Test: (tested manually via tmux E2E or unit test of resolveThread)

- [ ] **Step 1: Write the failing test**

```typescript
// packages/cli/src/modes/__tests__/interactive-resolve.test.ts
import { describe, expect, it } from "bun:test";
import { ThreadStore } from "@flitter/data";

describe("resolveThread: --continue", () => {
  it("resolves the most recent thread from ThreadStore", () => {
    const store = new ThreadStore();
    store.setCachedThread({ id: "aaa", v: 1, messages: [
      { role: "user", content: [{ type: "text", text: "old" }], createdAt: "2026-01-01T00:00:00Z" },
    ], relationships: [] } as any);
    store.setCachedThread({ id: "bbb", v: 1, messages: [
      { role: "user", content: [{ type: "text", text: "new" }], createdAt: "2026-04-18T00:00:00Z" },
    ], relationships: [] } as any);

    const ids = store.listRecentThreadIds(1);
    expect(ids).toHaveLength(1);
    expect(ids[0]).toBe("bbb");
  });
});
```

- [ ] **Step 2: Run test to verify it passes** (depends on Task 4)

Run: `cd /Users/bytedance/workspace/flitter && bun test packages/cli/src/modes/__tests__/interactive-resolve.test.ts`
Expected: PASS

- [ ] **Step 3: Fix `resolveThread` in interactive.ts**

Replace lines 97-108 in `packages/cli/src/modes/interactive.ts`:

```typescript
// OLD (lines 97-108):
if (context.continueThread) {
  const listFn = (
    container.threadStore as unknown as { listThreads?: () => Array<{ id: string }> }
  ).listThreads;
  const threads = listFn?.() ?? [];
  if (threads.length > 0) {
    const latest = threads[0]; // 最近的排在前面
    log.info("Continuing most recent thread", { threadId: latest.id });
    return latest.id;
  }
}

// NEW:
if (context.continueThread) {
  const recentIds = container.threadStore.listRecentThreadIds(1);
  if (recentIds.length > 0) {
    log.info("Continuing most recent thread", { threadId: recentIds[0] });
    return recentIds[0];
  }
}
```

- [ ] **Step 4: Run type check**

Run: `cd /Users/bytedance/workspace/flitter && bunx tsc --noEmit -p packages/cli/tsconfig.json`
Expected: No type errors (the `as unknown as { listThreads }` cast is removed)

- [ ] **Step 5: Commit**

```bash
git add packages/cli/src/modes/interactive.ts
git commit -m "fix(cli): fix --continue to use ThreadStore.listRecentThreadIds

Replace broken cast to non-existent listThreads() with the new
listRecentThreadIds(1) method. Since threads are loaded from disk
on container startup, --continue now finds persisted threads."
```

---

### Task 6: Fix threads CLI commands to persist changes

**Why:** `handleThreadsArchive` and `handleThreadsDelete` modify ThreadStore but don't mark dirty or call persistence. Archived threads reappear on restart.

**Files:**
- Modify: `packages/cli/src/commands/threads.ts:162-182` (archive), `191-211` (delete)

- [ ] **Step 1: Fix `handleThreadsArchive` to mark dirty**

In `packages/cli/src/commands/threads.ts`, in `handleThreadsArchive` (around line 175):

```typescript
// OLD:
container.threadStore.setCachedThread({ ...snapshot, archived: true } as unknown as ThreadSnapshot);

// NEW:
container.threadStore.setCachedThread(
  { ...snapshot, archived: true } as unknown as ThreadSnapshot,
  { scheduleUpload: true },
);
```

- [ ] **Step 2: Fix `handleThreadsDelete` to also delete from persistence**

In `packages/cli/src/commands/threads.ts`, in `handleThreadsDelete` (around line 202), after `threadStore.deleteThread(threadId)`:

```typescript
// Add after deleteThread:
if (container.threadPersistence) {
  await container.threadPersistence.delete(threadId);
}
```

- [ ] **Step 3: Run type check**

Run: `cd /Users/bytedance/workspace/flitter && bunx tsc --noEmit -p packages/cli/tsconfig.json`
Expected: No type errors

- [ ] **Step 4: Commit**

```bash
git add packages/cli/src/commands/threads.ts
git commit -m "fix(cli): persist thread archive/delete operations to disk

handleThreadsArchive now passes { scheduleUpload: true } so the
archived flag is persisted. handleThreadsDelete now calls
threadPersistence.delete() to remove the file from disk."
```

---

### Task 7: Mark new threads dirty on user message submit

**Why:** In interactive mode, `onSubmit` calls `setCachedThread` to append user messages. These should be persisted.

**Files:**
- Modify: `packages/cli/src/modes/interactive.ts:170-183`

- [ ] **Step 1: Update `onSubmit` to mark dirty**

In `packages/cli/src/modes/interactive.ts`, replace lines 174-180:

```typescript
// OLD:
container.threadStore.setCachedThread({
  ...snapshot,
  messages: [
    ...snapshot.messages,
    { role: "user", content: [{ type: "text", text }] },
  ],
} as ThreadSnapshot);

// NEW:
container.threadStore.setCachedThread(
  {
    ...snapshot,
    messages: [
      ...snapshot.messages,
      { role: "user", content: [{ type: "text", text }] },
    ],
  } as ThreadSnapshot,
  { scheduleUpload: true },
);
```

- [ ] **Step 2: Run type check**

Run: `cd /Users/bytedance/workspace/flitter && bunx tsc --noEmit -p packages/cli/tsconfig.json`
Expected: No type errors

- [ ] **Step 3: Commit**

```bash
git add packages/cli/src/modes/interactive.ts
git commit -m "fix(cli): mark thread dirty on user message submit for persistence

Pass { scheduleUpload: true } when appending user messages so the
auto-save timer persists the updated conversation to disk."
```

---

### Task 8: Run full test suite

- [ ] **Step 1: Run all tests**

Run: `cd /Users/bytedance/workspace/flitter && bun test`
Expected: All tests pass

- [ ] **Step 2: Run type checks across all packages**

Run: `cd /Users/bytedance/workspace/flitter && bunx tsc --noEmit -p packages/flitter/tsconfig.json && bunx tsc --noEmit -p packages/data/tsconfig.json && bunx tsc --noEmit -p packages/cli/tsconfig.json`
Expected: No type errors
