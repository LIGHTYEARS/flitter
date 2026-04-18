/**
 * @flitter/flitter — Thread Persistence wiring tests (Plan 2, Tasks 1-3)
 *
 * Verifies that createContainer() wires thread persistence correctly:
 * 1. startAutoSave — dirty threads are persisted to disk automatically
 * 2. loadAll — persisted threads are hydrated into ThreadStore on startup
 * 3. updateThreadSnapshot — sets scheduleUpload: true so dirty marking triggers auto-save
 *
 * 逆向: amp 1244_ThreadWorker_ov.js:248-254 (threadReadWriter auto-persist)
 */

import { describe, expect, test } from "bun:test";
import * as fs from "node:fs";
import * as fsp from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import type { FileSettingsStorage } from "@flitter/data";
import type { ThreadSnapshot } from "@flitter/schemas";
import { type ContainerOptions, createContainer, type SecretStorage } from "../container";

// ── Helpers ────────────────────────────────────────────

function createMockSecretStorage(): SecretStorage {
  const store = new Map<string, string>();
  return {
    async get(key: string) {
      return store.get(key);
    },
    async set(key: string, value: string) {
      store.set(key, value);
    },
    async delete(key: string) {
      store.delete(key);
    },
  };
}

function createMockSettingsStorage(): FileSettingsStorage {
  return {
    get: () => Promise.resolve(undefined),
    set: () => Promise.resolve(),
    append: () => Promise.resolve(),
    prepend: () => Promise.resolve(),
    delete: () => Promise.resolve(),
    getWatchPaths: () => [],
    getAll: () => ({}),
    getAllForScope: () => ({}),
  } as unknown as FileSettingsStorage;
}

function createDefaultOptions(dataDir?: string): ContainerOptions {
  return {
    settings: createMockSettingsStorage(),
    secrets: createMockSecretStorage(),
    workspaceRoot: "/tmp/test-workspace",
    homeDir: "/tmp/test-home",
    configDir: "/tmp/test-config",
    dataDir,
  };
}

function makeMinimalSnapshot(
  threadId: string,
  overrides: Partial<ThreadSnapshot> = {},
): ThreadSnapshot {
  return {
    id: threadId,
    v: 1,
    title: undefined,
    messages: [],
    agentMode: "normal",
    relationships: [],
    ...overrides,
  } as unknown as ThreadSnapshot;
}

/**
 * Make a schema-valid snapshot for writing to disk.
 * The ThreadSnapshotSchema rejects null title and string env.
 */
function makeValidSnapshot(
  threadId: string,
  overrides: Partial<ThreadSnapshot> = {},
): ThreadSnapshot {
  return {
    id: threadId,
    v: 1,
    messages: [],
    ...overrides,
  } as unknown as ThreadSnapshot;
}

// ── Task 1: startAutoSave ──────────────────────────────

describe("thread persistence wiring: Task 1 — startAutoSave", () => {
  test("dirty threads are persisted to disk after auto-save fires", async () => {
    const dataDir = await fsp.mkdtemp(path.join(os.tmpdir(), "flitter-test-autosave-"));

    const opts = createDefaultOptions(dataDir);
    const container = await createContainer(opts);

    try {
      const threadId = "thread-autosave-test";
      const snapshot = makeMinimalSnapshot(threadId, { title: "auto-save test" });

      // Mark thread dirty via scheduleUpload so auto-save picks it up
      container.threadStore.setCachedThread(snapshot, { scheduleUpload: true });

      // Wait for auto-save to fire (throttleMs defaults to 1000ms, wait 1500ms)
      await new Promise((resolve) => setTimeout(resolve, 1500));

      // Verify the file was written to disk
      const filePath = path.join(dataDir, `${threadId}.json`);
      const fileExists = fs.existsSync(filePath);
      expect(fileExists).toBe(true);

      // Verify content is correct
      const raw = await fsp.readFile(filePath, "utf-8");
      const parsed = JSON.parse(raw);
      expect(parsed.id).toBe(threadId);
      expect(parsed.title).toBe("auto-save test");
    } finally {
      await container.asyncDispose();
      fs.rmSync(dataDir, { recursive: true, force: true });
    }
  });

  test("without dataDir, threadPersistence is null and no auto-save errors", async () => {
    const opts = createDefaultOptions(); // no dataDir
    const container = await createContainer(opts);

    try {
      expect(container.threadPersistence).toBeNull();

      // Setting a thread dirty without persistence should be a no-op (no error)
      const snapshot = makeMinimalSnapshot("thread-no-persistence");
      container.threadStore.setCachedThread(snapshot, { scheduleUpload: true });

      // getDirtyThreadIds should still track it, but no file is written
      const dirtyIds = container.threadStore.getDirtyThreadIds();
      expect(dirtyIds).toContain("thread-no-persistence");
    } finally {
      await container.asyncDispose();
    }
  });

  test("auto-save dispose clears the timer (no further saves after dispose)", async () => {
    const dataDir = await fsp.mkdtemp(path.join(os.tmpdir(), "flitter-test-dispose-"));

    const opts = createDefaultOptions(dataDir);
    const container = await createContainer(opts);

    try {
      // Dispose container (which disposes auto-save handle)
      await container.asyncDispose();

      // After dispose, setting a dirty thread should not write to disk
      const threadId = "thread-post-dispose";
      const snapshot = makeMinimalSnapshot(threadId);
      container.threadStore.setCachedThread(snapshot, { scheduleUpload: true });

      // Wait longer than throttleMs to confirm no save happened
      await new Promise((resolve) => setTimeout(resolve, 1500));

      const filePath = path.join(dataDir, `${threadId}.json`);
      expect(fs.existsSync(filePath)).toBe(false);
    } finally {
      // Container already disposed in try block, but calling again is safe (idempotent)
      fs.rmSync(dataDir, { recursive: true, force: true });
    }
  });
});

// ── Task 2: loadAll hydration ──────────────────────────

describe("thread persistence wiring: Task 2 — loadAll", () => {
  test("pre-existing JSON files are loaded into ThreadStore on startup", async () => {
    const dataDir = await fsp.mkdtemp(path.join(os.tmpdir(), "flitter-test-loadall-"));

    try {
      // Pre-create a thread JSON file before container creation
      const threadId = "thread-preexisting";
      const snapshot = makeValidSnapshot(threadId, { title: "pre-existing thread" });
      await fsp.mkdir(dataDir, { recursive: true });
      await fsp.writeFile(
        path.join(dataDir, `${threadId}.json`),
        JSON.stringify(snapshot, null, 2),
        "utf-8",
      );

      // Create container — should hydrate from the pre-existing file
      const opts = createDefaultOptions(dataDir);
      const container = await createContainer(opts);

      try {
        const stored = container.threadStore.getThreadSnapshot(threadId);
        expect(stored).toBeDefined();
        expect(stored!.id).toBe(threadId);
        expect(stored!.title).toBe("pre-existing thread");
      } finally {
        await container.asyncDispose();
      }
    } finally {
      fs.rmSync(dataDir, { recursive: true, force: true });
    }
  });

  test("loaded threads are not marked dirty (no scheduleUpload)", async () => {
    const dataDir = await fsp.mkdtemp(path.join(os.tmpdir(), "flitter-test-nodirty-"));

    try {
      // Pre-create thread JSON
      const threadId = "thread-not-dirty";
      const snapshot = makeValidSnapshot(threadId);
      await fsp.mkdir(dataDir, { recursive: true });
      await fsp.writeFile(
        path.join(dataDir, `${threadId}.json`),
        JSON.stringify(snapshot, null, 2),
        "utf-8",
      );

      const opts = createDefaultOptions(dataDir);
      const container = await createContainer(opts);

      try {
        // The thread should be loaded but NOT dirty
        const dirtyIds = container.threadStore.getDirtyThreadIds();
        expect(dirtyIds).not.toContain(threadId);
      } finally {
        await container.asyncDispose();
      }
    } finally {
      fs.rmSync(dataDir, { recursive: true, force: true });
    }
  });

  test("multiple pre-existing threads are all hydrated", async () => {
    const dataDir = await fsp.mkdtemp(path.join(os.tmpdir(), "flitter-test-multi-"));

    try {
      await fsp.mkdir(dataDir, { recursive: true });
      const threadIds = ["thread-a", "thread-b", "thread-c"];
      for (const id of threadIds) {
        const snap = makeValidSnapshot(id, { title: `title-${id}` });
        await fsp.writeFile(
          path.join(dataDir, `${id}.json`),
          JSON.stringify(snap, null, 2),
          "utf-8",
        );
      }

      const opts = createDefaultOptions(dataDir);
      const container = await createContainer(opts);

      try {
        for (const id of threadIds) {
          const stored = container.threadStore.getThreadSnapshot(id);
          expect(stored).toBeDefined();
          expect(stored!.id).toBe(id);
          expect(stored!.title).toBe(`title-${id}`);
        }
      } finally {
        await container.asyncDispose();
      }
    } finally {
      fs.rmSync(dataDir, { recursive: true, force: true });
    }
  });

  test("empty dataDir (no files) loads zero threads without error", async () => {
    const dataDir = await fsp.mkdtemp(path.join(os.tmpdir(), "flitter-test-empty-"));

    try {
      const opts = createDefaultOptions(dataDir);
      const container = await createContainer(opts);

      try {
        // No threads pre-exist; container should initialize cleanly
        expect(container.threadStore).toBeDefined();
      } finally {
        await container.asyncDispose();
      }
    } finally {
      fs.rmSync(dataDir, { recursive: true, force: true });
    }
  });
});

// ── Task 3: updateThreadSnapshot marks dirty ───────────

describe("thread persistence wiring: Task 3 — updateThreadSnapshot scheduleUpload", () => {
  test("updateThreadSnapshot marks thread dirty via scheduleUpload", async () => {
    const opts = createDefaultOptions();
    const container = await createContainer(opts);

    try {
      const threadId = "thread-dirty-test";
      const worker = container.createThreadWorker(threadId);

      // Access the updateThreadSnapshot callback via worker opts
      const updateFn = (
        worker as unknown as { opts: { updateThreadSnapshot: (s: ThreadSnapshot) => void } }
      ).opts.updateThreadSnapshot;
      expect(updateFn).toBeDefined();

      const snapshot = makeMinimalSnapshot(threadId, { title: "dirty check" });
      updateFn(snapshot);

      // After updateThreadSnapshot, the thread should be in dirty list
      const dirtyIds = container.threadStore.getDirtyThreadIds();
      expect(dirtyIds).toContain(threadId);
    } finally {
      await container.asyncDispose();
    }
  });

  test("updateThreadSnapshot stores snapshot in threadStore", async () => {
    const opts = createDefaultOptions();
    const container = await createContainer(opts);

    try {
      const threadId = "thread-store-check";
      const worker = container.createThreadWorker(threadId);

      const updateFn = (
        worker as unknown as { opts: { updateThreadSnapshot: (s: ThreadSnapshot) => void } }
      ).opts.updateThreadSnapshot;
      const snapshot = makeMinimalSnapshot(threadId, { title: "stored via update" });
      updateFn(snapshot);

      const stored = container.threadStore.getThreadSnapshot(threadId);
      expect(stored).toBeDefined();
      expect(stored!.title).toBe("stored via update");
    } finally {
      await container.asyncDispose();
    }
  });

  test("updateThreadSnapshot + auto-save writes to disk", async () => {
    const dataDir = await fsp.mkdtemp(path.join(os.tmpdir(), "flitter-test-update-save-"));

    try {
      const opts = createDefaultOptions(dataDir);
      const container = await createContainer(opts);

      try {
        const threadId = "thread-update-to-disk";
        const worker = container.createThreadWorker(threadId);

        const updateFn = (
          worker as unknown as { opts: { updateThreadSnapshot: (s: ThreadSnapshot) => void } }
        ).opts.updateThreadSnapshot;
        const snapshot = makeMinimalSnapshot(threadId, { title: "written to disk" });
        updateFn(snapshot);

        // Wait for auto-save timer to fire
        await new Promise((resolve) => setTimeout(resolve, 1500));

        const filePath = path.join(dataDir, `${threadId}.json`);
        expect(fs.existsSync(filePath)).toBe(true);

        const raw = await fsp.readFile(filePath, "utf-8");
        const parsed = JSON.parse(raw);
        expect(parsed.title).toBe("written to disk");
      } finally {
        await container.asyncDispose();
      }
    } finally {
      fs.rmSync(dataDir, { recursive: true, force: true });
    }
  });

  test("workerOpts.updateThreadSnapshot override skips dirty marking", async () => {
    const opts = createDefaultOptions();
    const container = await createContainer(opts);

    try {
      const threadId = "thread-override-update";
      let overrideCalled = false;

      // Custom override does NOT call setCachedThread
      const worker = container.createThreadWorker(threadId, {
        updateThreadSnapshot: (_snapshot: ThreadSnapshot) => {
          overrideCalled = true;
        },
      });

      const updateFn = (
        worker as unknown as { opts: { updateThreadSnapshot: (s: ThreadSnapshot) => void } }
      ).opts.updateThreadSnapshot;
      const snapshot = makeMinimalSnapshot(threadId);
      updateFn(snapshot);

      expect(overrideCalled).toBe(true);

      // With override, thread was NOT written to threadStore (override did not call setCachedThread)
      // So thread should not be dirty in the store
      const dirtyIds = container.threadStore.getDirtyThreadIds();
      expect(dirtyIds).not.toContain(threadId);
    } finally {
      await container.asyncDispose();
    }
  });
});
