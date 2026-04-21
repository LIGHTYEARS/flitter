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

import type { ThreadMessage, ThreadRelationship, ThreadSnapshot } from "@flitter/schemas";
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

  // ─── Thread seeding & relationships ──────────────────────
  // 逆向: amp-cli-reversed/modules/1246_ThreadWorkerService_QWT.js
  //   seedThreadMessages (QWT.js:42-85)
  //   applyParentRelationship (QWT.js:87-145)

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
}
