/**
 * @flitter/agent-core — FIFO async mutex
 *
 * Minimal async mutex for serializing concurrent operations on shared state.
 * Used by ToolOrchestrator to protect onResume, onAssistantMessageComplete,
 * cancelAll, and userProvideInput from interleaving.
 *
 * 逆向: amp's Cm class (modules/1184_unknown_Cm.js / chunk-002.js:18461)
 *   class Cm {
 *     #T = false;  // locked
 *     #R = [];     // queue
 *     async acquire() { return new Promise(r => { if (!this.#T) { this.#T = true; r(); } else { this.#R.push(r); } }) }
 *     release() { if (this.#R.length > 0) { this.#R.shift()?.(); } else { this.#T = false; } }
 *   }
 *
 * Pattern: FIFO queuing mutex. When acquire() is called while held, the
 * caller's Promise is queued. release() wakes the first waiter (FIFO).
 * No timeout, no rejection, no skip — every caller eventually acquires.
 */
export class Mutex {
  #locked = false;
  #queue: Array<() => void> = [];

  /**
   * Acquire the lock. Resolves immediately if unlocked, otherwise queues.
   */
  async acquire(): Promise<void> {
    return new Promise<void>((resolve) => {
      if (!this.#locked) {
        this.#locked = true;
        resolve();
      } else {
        this.#queue.push(resolve);
      }
    });
  }

  /**
   * Release the lock. Wakes the first queued waiter (FIFO), or unlocks.
   */
  release(): void {
    if (this.#queue.length > 0) {
      this.#queue.shift()?.();
    } else {
      this.#locked = false;
    }
  }

  /** Whether the mutex is currently held. */
  get isLocked(): boolean {
    return this.#locked;
  }

  /** Number of waiters in the queue. */
  get queueLength(): number {
    return this.#queue.length;
  }
}
