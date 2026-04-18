/**
 * @flitter/flitter — Container integration smoke test (Plan 1, Task 8)
 *
 * Verifies that createContainer() + createThreadWorker() produce a worker
 * with all 6+1 callbacks correctly wired end-to-end:
 *
 * 1. provider       — not null, is AnthropicProvider
 * 2. getMessages    — returns thread messages from ThreadStore
 * 3. getThreadSnapshot — returns the stored snapshot
 * 4. buildSystemPrompt — returns non-empty SystemPromptBlock[]
 * 5. updateThreadSnapshot — persists to ThreadStore
 * 6. events$        — Subject is active (subscribable)
 * 7. inferenceState$ — starts as "idle"
 *
 * 逆向 references:
 *   modules/1244_ThreadWorker_ov.js:187-209 (getToolRunEnvironment)
 *   modules/1178_unknown_r7R.js (provider resolution)
 *   modules/1244_ThreadWorker_ov.js:248-254 (thread snapshot read/write)
 *   chunk-004.js:26781 (getMessages returns getCurrentThread().messages)
 */
import { describe, expect, test } from "bun:test";
import type { FileSettingsStorage } from "@flitter/data";
import { AnthropicProvider } from "@flitter/llm";
import type { ThreadSnapshot } from "@flitter/schemas";
import { type ContainerOptions, createContainer, type SecretStorage } from "../container";

// ── Helpers (mirrored from container-wiring.test.ts) ───────────────

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

function createDefaultOptions(): ContainerOptions {
  return {
    settings: createMockSettingsStorage(),
    secrets: createMockSecretStorage(),
    workspaceRoot: "/tmp/test-workspace",
    homeDir: "/tmp/test-home",
    configDir: "/tmp/test-config",
  };
}

function makeMinimalSnapshot(
  threadId: string,
  overrides: Partial<ThreadSnapshot> = {},
): ThreadSnapshot {
  return {
    id: threadId,
    v: 1,
    title: null,
    messages: [],
    env: "local",
    agentMode: "normal",
    relationships: [],
    ...overrides,
  } as unknown as ThreadSnapshot;
}

// ── Integration smoke test ────────────────────────────────────────

describe("container integration: inference roundtrip", () => {
  test("createThreadWorker produces a worker with all callbacks wired", async () => {
    const opts = createDefaultOptions();
    const container = await createContainer(opts);

    try {
      const threadId = "integration-smoke-thread";

      // Pre-populate the ThreadStore so getThreadSnapshot and getMessages
      // return real data rather than the default empty snapshot.
      const fakeMessages = [
        {
          role: "user" as const,
          messageId: 1,
          content: [{ type: "text" as const, text: "hello from integration test" }],
        },
      ];
      const snapshot = makeMinimalSnapshot(threadId, {
        title: "integration test thread",
        messages: fakeMessages as unknown as ThreadSnapshot["messages"],
      });
      container.threadStore.setCachedThread(snapshot);

      // Create the worker — this exercises all wiring paths in createContainer.
      const worker = container.createThreadWorker(threadId);

      // Access the private opts via type assertion (test-only escape hatch).
      const workerOpts = (
        worker as unknown as { opts: import("@flitter/agent-core").ThreadWorkerOptions }
      ).opts;

      // ── 1. provider is wired (not null, is AnthropicProvider) ────────────
      expect(workerOpts.provider).toBeDefined();
      expect(workerOpts.provider).not.toBeNull();
      expect(workerOpts.provider).toBeInstanceOf(AnthropicProvider);

      // ── 2. getMessages returns thread messages ────────────────────────────
      const messages = workerOpts.getMessages();
      expect(messages).toBeDefined();
      expect(messages.length).toBe(1);
      expect((messages[0] as unknown as { role: string }).role).toBe("user");

      // ── 3. getThreadSnapshot returns the stored snapshot ──────────────────
      const retrievedSnapshot = workerOpts.getThreadSnapshot();
      expect(retrievedSnapshot).toBeDefined();
      expect(retrievedSnapshot.id).toBe(threadId);
      expect(retrievedSnapshot.title).toBe("integration test thread");

      // ── 4. buildSystemPrompt returns non-empty SystemPromptBlock[] ─────────
      const blocks = await workerOpts.buildSystemPrompt();
      expect(blocks).toBeDefined();
      expect(blocks.length).toBeGreaterThanOrEqual(1);
      // First block must be the base role prompt text block
      expect(blocks[0].type).toBe("text");
      expect(blocks[0].text).toContain("interactive CLI-based coding assistant");

      // ── 5. updateThreadSnapshot persists to ThreadStore ───────────────────
      const updatedSnapshot = makeMinimalSnapshot(threadId, { title: "updated by worker" });
      workerOpts.updateThreadSnapshot(updatedSnapshot);
      const persisted = container.threadStore.getThreadSnapshot(threadId);
      expect(persisted).toBeDefined();
      expect(persisted!.title).toBe("updated by worker");

      // ── 6. events$ Subject is active (subscribable) ───────────────────────
      const received: string[] = [];
      const sub = worker.events$.subscribe({ next: (ev) => received.push(ev.type) });
      expect(sub).toBeDefined();
      // Manually emit a test event to confirm the Subject forwards values
      worker.events$.next({ type: "turn:complete" });
      expect(received).toContain("turn:complete");
      sub.unsubscribe();

      // ── 7. inferenceState$ starts as "idle" ───────────────────────────────
      expect(worker.inferenceState$.getValue()).toBe("idle");
    } finally {
      await container.asyncDispose();
    }
  });
});
