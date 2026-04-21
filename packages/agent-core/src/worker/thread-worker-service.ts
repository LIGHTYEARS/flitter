/**
 * ThreadWorkerService — manages a map of ThreadWorker instances.
 *
 * 逆向: amp-cli-reversed/modules/1246_ThreadWorkerService_QWT.js
 *   ```
 *   class QWT {
 *     threadWorkers = new tET();
 *     async getOrCreateForThread(T, R) {
 *       let a = this.threadWorkers.get(R);
 *       if (!a) {
 *         a = new ov(T, R);
 *         this.threadWorkers.set(R, a);
 *         if (this.threadWorkers.size > 25)
 *           J.info("Many active thread workers detected", { ... });
 *       }
 *       return a;
 *     }
 *     async createThreadWorker(T, R) {
 *       let a = await this.getOrCreateForThread(T, R);
 *       return await a.resume(), a;
 *     }
 *     get(T) { return this.threadWorkers.get(T); }
 *     async dispose(T) { ... this.threadWorkers.delete(T); }
 *     async disposeAll() { ... this.threadWorkers.clear(); }
 *   }
 *   ```
 */

import type { ThreadMeta } from "@flitter/data";
import type {
  ThreadMessage,
  ThreadRelationship,
  ThreadSnapshot,
  UserContentBlock,
} from "@flitter/schemas";
import { createLogger } from "@flitter/util";
import type { ThreadWorker } from "./thread-worker";

/**
 * Interface for the ThreadStore subset that ThreadWorkerService needs.
 * Avoids importing the full ThreadStore class to prevent circular deps.
 *
 * 逆向: amp QWT accesses threadStore via deps (T argument to methods).
 */
export interface ThreadStoreForService {
  getThreadSnapshot(id: string): ThreadSnapshot | undefined;
  setCachedThread(
    thread: ThreadSnapshot,
    opts?: { scheduleUpload?: boolean },
  ): { getValue(): ThreadSnapshot };
  exclusiveSyncReadWriter(
    threadId: string,
    opts?: { scheduleUpload?: boolean },
  ): {
    read(): ThreadSnapshot;
    write(thread: ThreadSnapshot): void;
    update(fn: (draft: ThreadSnapshot) => Partial<ThreadSnapshot> | void): ThreadSnapshot;
    asyncDispose(): Promise<void>;
  };
  /**
   * Get thread metadata (visibility, sharedGroupIDs).
   * Used by inheritVisibilityIfNeeded to read origin thread metadata.
   * 逆向: O4R calls `(await T.get(R))?.meta`
   */
  getThreadMeta(threadId: string): Record<string, unknown> | undefined;
  /**
   * Update thread metadata on the remote server.
   * 逆向: O4R calls `T.updateThreadMeta(a, h)`
   */
  updateThreadMeta(threadId: string, meta: ThreadMeta): Promise<void>;
  /**
   * Set thread visibility locally.
   * Fallback when updateThreadMeta is not available (no remote).
   * 逆向: amp e0R:529-588
   */
  setVisibility(threadId: string, level: string): void;
}

const log = createLogger("thread-worker-service");

/** Memory pressure threshold — log warning when exceeded */
const MAX_WORKERS_WARN = 25;

/**
 * Factory function type for creating ThreadWorker instances.
 * The container provides this when wiring the service.
 */
export type ThreadWorkerFactory = (threadId: string) => ThreadWorker;

/**
 * ThreadWorkerService: manages a pool of ThreadWorker instances keyed by thread ID.
 *
 * 逆向: amp-cli-reversed/modules/1246_ThreadWorkerService_QWT.js
 */
export class ThreadWorkerService {
  /** Active workers keyed by thread ID */
  private readonly workers = new Map<string, ThreadWorker>();

  /** Factory for creating new workers */
  private readonly factory: ThreadWorkerFactory;

  /**
   * Optional thread store — needed for seedThreadMessages / applyParentRelationship.
   * Wired via setThreadStore() after construction to avoid circular dependencies.
   * 逆向: amp QWT receives threadStore via deps passed to each method.
   */
  private threadStore: ThreadStoreForService | null = null;

  constructor(factory: ThreadWorkerFactory) {
    this.factory = factory;
  }

  /**
   * Wire the thread store reference.
   * Called by container after both ThreadStore and ThreadWorkerService are created.
   */
  setThreadStore(store: ThreadStoreForService): void {
    this.threadStore = store;
  }

  /**
   * Get an existing worker or create a new one for the given thread ID.
   *
   * 逆向: QWT.getOrCreateForThread (QWT.js:3-11)
   *   If not found, creates a new ov(deps, threadID), adds to map,
   *   logs warning if map size > 25.
   */
  getOrCreate(threadId: string): ThreadWorker {
    let worker = this.workers.get(threadId);
    if (!worker) {
      worker = this.factory(threadId);
      this.workers.set(threadId, worker);

      // 逆向: QWT.js:6-9 — memory pressure warning
      if (this.workers.size > MAX_WORKERS_WARN) {
        log.warn("Many active thread workers detected (memory pressure)", {
          threadId,
          totalWorkerCount: this.workers.size,
        });
      }
    }
    return worker;
  }

  /**
   * Get an existing worker (or undefined if not found).
   *
   * 逆向: QWT.get (QWT.js:191-193)
   */
  get(threadId: string): ThreadWorker | undefined {
    return this.workers.get(threadId);
  }

  /**
   * Check if a worker exists for the given thread ID.
   */
  has(threadId: string): boolean {
    return this.workers.has(threadId);
  }

  /**
   * Dispose a single worker and remove it from the map.
   *
   * 逆向: QWT.dispose (QWT.js:206-208)
   *   ```
   *   async dispose(T) {
   *     let R = this.threadWorkers.get(T);
   *     if (R) await R.cancel(), await R.asyncDispose(),
   *       this.threadWorkers.delete(T);
   *   }
   *   ```
   */
  dispose(threadId: string): void {
    const worker = this.workers.get(threadId);
    if (worker) {
      worker.dispose();
      this.workers.delete(threadId);
    }
  }

  /**
   * Dispose all workers.
   *
   * 逆向: QWT.disposeAll (QWT.js:237-239)
   *   ```
   *   async disposeAll() {
   *     await Promise.all(Array.from(this.threadWorkers.values())
   *       .map(async T => await T.asyncDispose()));
   *     this.threadWorkers.clear();
   *   }
   *   ```
   */
  disposeAll(): void {
    for (const worker of this.workers.values()) {
      worker.dispose();
    }
    this.workers.clear();
  }

  /** Number of active workers */
  get size(): number {
    return this.workers.size;
  }

  /** List all active thread IDs */
  get threadIds(): string[] {
    return Array.from(this.workers.keys());
  }

  // ─── Thread creation & seeding ───────────────────────────
  // 逆向: amp-cli-reversed/modules/1246_ThreadWorkerService_QWT.js
  //   seedThreadMessages (QWT.js:42-85)
  //   applyParentRelationship (QWT.js:87-145)
  //   createThreadWorker (QWT.js:18-21)
  //   createThread (QWT.js:111-143)

  /**
   * Create (or retrieve) a ThreadWorker and call resume() on it.
   *
   * 逆向: QWT.createThreadWorker(T, R) (QWT.js:18-21)
   *   ```
   *   async createThreadWorker(T, R) {
   *     let a = await this.getOrCreateForThread(T, R);
   *     return await a.resume(), a;
   *   }
   *   ```
   */
  async createThreadWorker(threadId: string): Promise<ThreadWorker> {
    const worker = this.getOrCreate(threadId);
    await worker.resume();
    return worker;
  }

  /**
   * Seed a thread with a pre-built message array before launching it.
   *
   * Uses exclusiveSyncReadWriter to atomically write a snapshot with
   * the seeded messages, recomputing nextMessageId. Optionally stamps
   * agentMode on every user message.
   *
   * 逆向: amp QWT.seedThreadMessages(deps, threadID, messages, agentMode?)
   *   1. exclusiveSyncReadWriter(threadID)
   *   2. Writes { ...snapshot, messages, nextMessageId: max(messageId)+1, agentMode?, v: v+1 }
   *
   * @param threadId - Target thread ID (must already exist in ThreadStore)
   * @param messages - Messages to seed the thread with
   * @param agentMode - Optional agent mode to stamp on user messages
   */
  async seedThreadMessages(
    threadId: string,
    messages: ThreadMessage[],
    agentMode?: string,
  ): Promise<void> {
    if (!this.threadStore) {
      throw new Error("ThreadWorkerService: threadStore not wired (call setThreadStore first)");
    }

    const rw = this.threadStore.exclusiveSyncReadWriter(threadId, { scheduleUpload: true });
    try {
      const current = rw.read();

      // 逆向: amp recomputes nextMessageId as max(messageId)+1
      let maxId = 0;
      for (const msg of messages) {
        if (msg.messageId > maxId) maxId = msg.messageId;
      }

      // 逆向: amp stamps agentMode on every user message if provided
      const stampedMessages = agentMode
        ? messages.map((m) => (m.role === "user" ? { ...m, agentMode } : m))
        : messages;

      rw.write({
        ...current,
        messages: stampedMessages,
        nextMessageId: maxId + 1,
        v: current.v + 1,
      });

      log.info("Seeded thread with messages", {
        threadId,
        messageCount: messages.length,
        agentMode,
      });
    } finally {
      await rw.asyncDispose();
    }
  }

  /**
   * Apply a bidirectional parent-child relationship between two threads.
   *
   * Sends a "child" relationship to the child thread and a "parent"
   * relationship to the parent thread. Deduplicates on (threadID, type, role).
   *
   * 逆向: amp QWT.applyParentRelationship(deps, childWorker, childThreadID, parentSpec)
   *   1. Send { type: "relationship", relationship: { role: "child", ... } } to child worker
   *   2. If parent worker is running, send { role: "parent" } via worker.handle()
   *   3. Otherwise, write directly via exclusiveSyncReadWriter
   *
   * @param childThreadId - The child thread ID
   * @param parentThreadId - The parent thread ID
   * @param type - Relationship type (default: "handoff")
   */
  async applyParentRelationship(
    childThreadId: string,
    parentThreadId: string,
    type: "handoff" = "handoff",
  ): Promise<void> {
    if (!this.threadStore) {
      throw new Error("ThreadWorkerService: threadStore not wired (call setThreadStore first)");
    }

    const now = Date.now();

    // Child side: add "child" relationship pointing to parent
    const childRelationship: ThreadRelationship = {
      threadID: parentThreadId,
      type,
      role: "child",
      createdAt: now,
    };
    await this.addRelationshipToThread(childThreadId, childRelationship);

    // Parent side: add "parent" relationship pointing to child
    const parentRelationship: ThreadRelationship = {
      threadID: childThreadId,
      type,
      role: "parent",
      createdAt: now,
    };
    await this.addRelationshipToThread(parentThreadId, parentRelationship);

    log.info("Applied parent relationship", { childThreadId, parentThreadId, type });
  }

  /**
   * Add a relationship to a thread, deduplicating on (threadID, type, role).
   *
   * 逆向: amp deduplicates by checking existing relationships before adding.
   * Uses exclusiveSyncReadWriter if worker is not running, otherwise
   * dispatches via worker.handle().
   */
  private async addRelationshipToThread(
    threadId: string,
    relationship: ThreadRelationship,
  ): Promise<void> {
    // 逆向: amp checks if worker is running; if so, dispatches delta
    // For now, always use direct store write (worker delta handling can be added later)
    const rw = this.threadStore!.exclusiveSyncReadWriter(threadId, {
      scheduleUpload: true,
    });
    try {
      const snapshot = rw.read();
      const existing = snapshot.relationships ?? [];

      // 逆向: dedup on (threadID, type, role)
      const isDuplicate = existing.some(
        (r) =>
          r.threadID === relationship.threadID &&
          r.type === relationship.type &&
          r.role === relationship.role,
      );

      if (!isDuplicate) {
        rw.write({
          ...snapshot,
          relationships: [...existing, relationship],
          v: snapshot.v + 1,
        });
      }
    } finally {
      await rw.asyncDispose();
    }
  }

  // ─── createThread ───────────────────────────────────────

  /**
   * Inherit visibility from origin thread when forking via "handoff".
   *
   * 逆向: amp QWT.inheritVisibilityIfNeeded(T, R, a) (QWT.js:76-78)
   *   ```
   *   async inheritVisibilityIfNeeded(T, R, a) {
   *     if (R.type === "handoff") await O4R(T.threadService, R.threadID, a);
   *   }
   *   ```
   *
   * Delegates to the O4R pattern: reads origin thread meta, validates
   * visibility level, copies it to the forked thread.
   *
   * @param parent - Parent relationship spec (threadID + type)
   * @param forkedThreadID - The newly created fork thread
   */
  async inheritVisibilityIfNeeded(
    parent: { threadID: string; type: string },
    forkedThreadID: string,
  ): Promise<void> {
    // 逆向: amp only inherits for "handoff" type
    if (parent.type !== "handoff") return;
    if (!this.threadStore) return;

    try {
      const meta = this.threadStore.getThreadMeta(parent.threadID);
      if (!meta) {
        log.debug("Origin thread has no metadata to inherit", {
          name: "inheritThreadVisibility",
          originThreadID: parent.threadID,
          forkedThreadID,
        });
        return;
      }

      // 逆向: O4R checks `"visibility" in e ? e.visibility : void 0`
      const visibility = "visibility" in meta ? meta.visibility : undefined;

      // 逆向: O4R validates against the 4 known visibility levels
      if (
        visibility !== "private" &&
        visibility !== "thread_workspace_shared" &&
        visibility !== "public_unlisted" &&
        visibility !== "public_discoverable"
      ) {
        log.debug("Origin thread has no shareable visibility metadata", {
          name: "inheritThreadVisibility",
          originThreadID: parent.threadID,
          forkedThreadID,
          metadata: meta,
        });
        return;
      }

      // 逆向: O4R copies sharedGroupIDs only for "private" visibility
      const sharedGroupIDs =
        "sharedGroupIDs" in meta && Array.isArray(meta.sharedGroupIDs)
          ? (meta.sharedGroupIDs as unknown[]).filter((s): s is string => typeof s === "string")
          : [];

      const inheritedMeta: ThreadMeta =
        visibility === "private" ? { visibility, sharedGroupIDs } : { visibility };

      // 逆向: O4R calls `await T.updateThreadMeta(a, h)` — try remote first, fall back to local
      try {
        await this.threadStore.updateThreadMeta(forkedThreadID, inheritedMeta);
      } catch {
        // If updateThreadMeta fails (e.g. no remote transport), fall back
        // to local-only visibility setting.
        this.threadStore.setVisibility(forkedThreadID, visibility as string);
      }

      log.debug("Successfully inherited thread visibility", {
        name: "inheritThreadVisibility",
        originThreadID: parent.threadID,
        forkedThreadID,
        metadata: meta,
      });
    } catch (err) {
      log.debug("Failed to inherit thread visibility settings", {
        name: "inheritThreadVisibility",
        error: err,
        originThreadID: parent.threadID,
        forkedThreadID,
      });
    }
  }

  /**
   * Create a new thread with an optional pre-built message set, parent relationship,
   * and initial user message.
   *
   * 逆向: amp QWT.createThread(T, R) (QWT.js:111-143)
   *
   * Steps (matching amp):
   *   1. Generate or use explicit thread ID
   *   2. Seed messages if provided (via seedThreadMessages)
   *   3. Create worker (getOrCreate + resume)
   *   4. Early-return if thread already has messages and was NOT seeded (idempotency)
   *   5. Apply parent-child relationship (if parent provided)
   *   6. Send initial user message (via enqueueMessage) — mutually exclusive with seededMessages
   *
   * NOT YET IMPLEMENTED (requires worker.handle() delta dispatcher):
   *   - agentMode stamping on live worker (agentMode IS stamped on seeded messages)
   *   - draftContent
   *   - setPendingNavigation
   *   - transferQueuedMessages
   *
   * @param opts - Creation options
   * @returns Thread ID and worker instance
   */
  async createThread(
    opts?: CreateThreadOptions,
  ): Promise<{ threadID: string; worker: ThreadWorker }> {
    // Step 1: Generate or use explicit thread ID
    // 逆向: amp `let a = R?.newThreadID ?? Eh()` where Eh() = "T-" + uuidv7()
    const threadID = opts?.newThreadID ?? crypto.randomUUID();

    let wasSeeded = false;

    // Step 2: Seed messages if provided
    // 逆向: `if (R?.seededMessages) await this.seedThreadMessages(T, a, R.seededMessages, e), t = !0`
    if (opts?.seededMessages) {
      await this.seedThreadMessages(threadID, opts.seededMessages, opts?.agentMode);
      wasSeeded = true;
    }

    // Step 3: Create/resume worker
    // 逆向: `let r = await this.createThreadWorker(T, a)`
    const worker = await this.createThreadWorker(threadID);

    // Step 4: Early return for existing thread (idempotency guard)
    // 逆向: `if (r.thread.messages.length > 0 && !t) return ...`
    const snapshot = this.threadStore?.getThreadSnapshot(threadID);
    if (snapshot && snapshot.messages.length > 0 && !wasSeeded) {
      log.info("createThread called for existing thread, returning existing worker", {
        threadID,
        messageCount: snapshot.messages.length,
      });
      return { threadID, worker };
    }

    // Step 5: Apply parent relationship + inherit visibility
    // 逆向: `if (R?.parent) await this.applyParentRelationship(T, r, a, R.parent), await this.inheritVisibilityIfNeeded(T, R.parent, a)`
    if (opts?.parent) {
      await this.applyParentRelationship(threadID, opts.parent.threadID, opts.parent.type);
      await this.inheritVisibilityIfNeeded(opts.parent, threadID);
    }

    // Step 6: Send initial user message (mutually exclusive with seeded messages)
    // 逆向: `if (R?.initialUserMessage) { if (t) throw ...; await this.sendInitialUserMessage(r, R.initialUserMessage) }`
    if (opts?.initialUserMessage) {
      if (wasSeeded) {
        throw new Error("initialUserMessage cannot be set when seededMessages is provided");
      }
      // Normalize to Message format and enqueue
      const content: UserContentBlock[] =
        typeof opts.initialUserMessage === "string"
          ? [{ type: "text" as const, text: opts.initialUserMessage }]
          : opts.initialUserMessage;

      // Allocate messageId from thread snapshot
      const snap = this.threadStore?.getThreadSnapshot(threadID);
      const messageId = snap?.nextMessageId ?? 1;

      worker.enqueueMessage({
        role: "user",
        messageId,
        content,
      });
    }

    return { threadID, worker };
  }
}

// ─── Types ────────────────────────────────────────────────

/**
 * Options for createThread().
 *
 * 逆向: amp QWT.createThread second argument R
 *   (modules/1246_ThreadWorkerService_QWT.js:111-143)
 */
export interface CreateThreadOptions {
  /** Explicit thread ID — if omitted, a new UUID is generated. */
  newThreadID?: string;

  /**
   * Agent mode (e.g. "smart"). If seededMessages is provided,
   * agentMode is stamped on user messages. Otherwise it would be
   * dispatched via worker.handle() (not yet implemented).
   */
  agentMode?: string;

  /** Pre-built messages to seed the thread with. Mutually exclusive with initialUserMessage. */
  seededMessages?: ThreadMessage[];

  /** Parent relationship spec. */
  parent?: {
    /** Parent thread ID */
    threadID: string;
    /** Relationship type (default: "handoff") */
    type: "handoff";
  };

  /**
   * Initial user message to send — either a text string or typed content blocks.
   * Mutually exclusive with seededMessages.
   *
   * 逆向: amp normalizes string → [{type: "text", text: string}]
   */
  initialUserMessage?: string | UserContentBlock[];
}
