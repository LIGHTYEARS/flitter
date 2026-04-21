/**
 * GlobalCachedValue — soft/hard TTL cache with background recomputation
 *
 * 逆向: amp-cli-reversed/modules/1271_GlobalCachedValue_d5T.js
 *
 * Behavior from amp reference (d5T class):
 * - If lastError is set, always recompute (line 13)
 * - If value is undefined OR hard TTL exceeded, recompute and BLOCK (line 15)
 * - If soft TTL exceeded AND no pending recompute, start background recompute (line 16)
 * - recompute() deduplicates: only one in-flight computation at a time (line 27)
 * - On error: value becomes undefined, lastError is set, error event emitted (line 43-55)
 * - events Subject emits change events via options.changes(oldValue, newValue) (line 37-40)
 */

import { createLogger } from "../logger";
import { Subject } from "../reactive/subject";

const log = createLogger("global-cached-value");

export interface GlobalCachedValueOptions<T, E = unknown> {
  /** Soft TTL in ms — after this, background recompute starts but stale value returned */
  softTTL: number;
  /** Hard TTL in ms — after this, get() blocks until fresh value is computed */
  hardTTL: number;
  /** The async computation function */
  compute: () => Promise<T>;
  /**
   * Compute a change event from old → new value.
   * Return undefined to suppress emission.
   */
  changes: (oldValue: T | undefined, newValue: T | undefined) => E | undefined;
}

/**
 * 逆向: d5T class from 1271_GlobalCachedValue_d5T.js
 */
export class GlobalCachedValue<T, E = unknown> {
  private readonly options: GlobalCachedValueOptions<T, E>;
  private value: T | undefined;
  private lastError: Error | undefined;
  private lastUpdated = 0;
  private pendingPromise: Promise<T> | undefined;

  /** Change events emitted after each successful or failed recomputation */
  readonly eventsSubject = new Subject<E>();
  readonly events = this.eventsSubject;

  constructor(options: GlobalCachedValueOptions<T, E>) {
    this.options = options;
  }

  /**
   * 逆向: d5T.get() — lines 12-17
   * - lastError → recompute (block)
   * - value undefined OR elapsed >= hardTTL → recompute (block)
   * - elapsed >= softTTL AND no pending → background recompute, return stale
   * - otherwise → return cached value
   */
  async get(): Promise<T> {
    // 逆向: if (this.lastError) return this.recompute();
    if (this.lastError) return this.recompute();

    const elapsed = Date.now() - this.lastUpdated;

    // 逆向: if (this.value === void 0 || T >= this.options.hardTTL) return this.recompute();
    if (this.value === undefined || elapsed >= this.options.hardTTL) {
      return this.recompute();
    }

    // 逆向: if (T >= this.options.softTTL && !this.pendingPromise) this.recompute().catch(() => {});
    if (elapsed >= this.options.softTTL && !this.pendingPromise) {
      this.recompute().catch(() => {});
    }

    return this.value;
  }

  /** 逆向: d5T.getCached() — line 19-21 */
  getCached(): T | undefined {
    return this.value;
  }

  /** 逆向: d5T.refresh() — line 22-24 */
  async refresh(): Promise<T> {
    return this.recompute();
  }

  /**
   * 逆向: d5T.recompute() — lines 26-29
   * Deduplicates: if a computation is in-flight, return its promise.
   */
  recompute(): Promise<T> {
    if (this.pendingPromise) return this.pendingPromise;

    this.pendingPromise = this.performRecomputation();
    // 逆向: amp chains .finally() but does NOT replace this.pendingPromise with the finally result.
    // We must suppress the unhandled rejection on the .finally() branch.
    this.pendingPromise
      .finally(() => {
        this.pendingPromise = undefined;
      })
      .catch(() => {
        // Suppress unhandled rejection from the .finally() chain.
        // The caller of recompute() will handle the rejection on the original promise.
      });
    return this.pendingPromise;
  }

  /**
   * 逆向: d5T.performRecomputation() — lines 30-56
   */
  private async performRecomputation(): Promise<T> {
    try {
      const newValue = await this.options.compute();
      const oldValue = this.value;

      this.lastError = undefined;
      this.value = newValue;
      this.lastUpdated = Date.now();

      // 逆向: let a = this.options.changes(R, T); if (a !== void 0) ... eventsSubject.next(a)
      const changeEvent = this.options.changes(oldValue, newValue);
      if (changeEvent !== undefined) {
        try {
          this.eventsSubject.next(changeEvent);
        } catch (err) {
          log.error("Uncaught error for GlobalCachedValue.events subscriber", err);
        }
      }

      return newValue;
    } catch (err) {
      // 逆向: lines 43-55 — set lastError, clear value, emit change event, throw
      const error = err instanceof Error ? err : new Error(String(err));
      this.lastError = error;
      const oldValue = this.value;
      this.value = undefined;

      const changeEvent = this.options.changes(oldValue, undefined);
      if (changeEvent !== undefined) {
        try {
          this.eventsSubject.next(changeEvent);
        } catch (emitErr) {
          log.error("Uncaught error for GlobalCachedValue.events subscriber", emitErr);
        }
      }

      throw error;
    }
  }
}
