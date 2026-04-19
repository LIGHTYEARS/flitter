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

import { createLogger } from "@flitter/util";
import type { ThreadWorker } from "./thread-worker";

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

  constructor(factory: ThreadWorkerFactory) {
    this.factory = factory;
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
}
