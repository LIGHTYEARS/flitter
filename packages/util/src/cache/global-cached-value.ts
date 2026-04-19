/**
 * @flitter/util — GlobalCachedValue<T>
 *
 * Generic cached value with soft/hard TTL and background recomputation.
 * 逆向: amp-cli-reversed/modules/1271_GlobalCachedValue_d5T.js
 *
 * - get() returns cached value if within softTTL
 * - Triggers background recomputation between soft and hard TTL
 * - Blocks on recomputation past hardTTL or on error
 * - onChange/events emits diffs when value changes
 */
import { Subject } from "../reactive/subject";

export interface GlobalCachedValueOptions<T> {
  /** Async function that computes the value */
  compute: () => Promise<T>;
  /** Milliseconds before background refresh is triggered */
  softTTL: number;
  /** Milliseconds before get() blocks on recomputation */
  hardTTL: number;
  /**
   * Compare old and new value. Return a diff/event to emit, or undefined to skip.
   * 逆向: d5T.options.changes(oldVal, newVal)
   */
  changes?: (oldValue: T | undefined, newValue: T | undefined) => unknown | undefined;
}

/**
 * GlobalCachedValue — cached async value with soft/hard TTL
 * 逆向: amp-cli-reversed/modules/1271_GlobalCachedValue_d5T.js
 */
export class GlobalCachedValue<T> {
  private readonly options: GlobalCachedValueOptions<T>;
  private value: T | undefined;
  private lastError: Error | undefined;
  private lastUpdated = 0;
  private pendingPromise: Promise<T> | undefined;
  private readonly eventsSubject = new Subject<unknown>();
  private disposed = false;

  /** Observable stream of change events (emitted by options.changes) */
  readonly events = this.eventsSubject;

  constructor(options: GlobalCachedValueOptions<T>) {
    this.options = options;
  }

  /**
   * Get the cached value, recomputing if necessary.
   * 逆向: d5T.get() — lines 12-17
   *
   * - If there was a previous error, always recompute (blocking)
   * - If no value or past hardTTL, recompute (blocking)
   * - If past softTTL, trigger background recompute but return stale value
   * - Otherwise return cached value
   */
  async get(): Promise<T> {
    if (this.lastError) return this.recompute();

    const elapsed = Date.now() - this.lastUpdated;

    if (this.value === undefined || elapsed >= this.options.hardTTL) {
      return this.recompute();
    }

    if (elapsed >= this.options.softTTL && !this.pendingPromise) {
      // 逆向: d5T background refresh — fire and forget
      this.recompute().catch(() => {});
    }

    return this.value;
  }

  /**
   * Return currently cached value without triggering recomputation.
   * 逆向: d5T.getCached()
   */
  getCached(): T | undefined {
    return this.value;
  }

  /**
   * Force a refresh, blocking until complete.
   * 逆向: d5T.refresh()
   */
  async refresh(): Promise<T> {
    return this.recompute();
  }

  /**
   * Invalidate the cached value so next get() triggers recomputation.
   */
  invalidate(): void {
    this.lastUpdated = 0;
    this.value = undefined;
  }

  /**
   * Subscribe to value change events.
   */
  onChange(callback: (event: unknown) => void): { unsubscribe: () => void } {
    return this.eventsSubject.subscribe(callback);
  }

  /**
   * Cancel pending recomputations and mark disposed.
   */
  dispose(): void {
    this.disposed = true;
    this.pendingPromise = undefined;
    this.eventsSubject.complete();
  }

  /**
   * 逆向: d5T.recompute() — dedup concurrent calls via pendingPromise
   */
  private recompute(): Promise<T> {
    if (this.pendingPromise) return this.pendingPromise;

    const p = this.performRecomputation();
    // Store the promise for dedup, but ensure cleanup happens
    // Use a separate chain for the finally to avoid unhandled rejection
    this.pendingPromise = p;
    p.then(
      () => {
        this.pendingPromise = undefined;
      },
      () => {
        this.pendingPromise = undefined;
      },
    );

    return this.pendingPromise;
  }

  /**
   * 逆向: d5T.performRecomputation() — lines 32-56
   */
  private async performRecomputation(): Promise<T> {
    if (this.disposed) {
      throw new Error("GlobalCachedValue is disposed");
    }

    try {
      const newValue = await this.options.compute();
      const oldValue = this.value;

      this.lastError = undefined;
      this.value = newValue;
      this.lastUpdated = Date.now();

      // Emit change event if options.changes is provided
      if (this.options.changes) {
        const changeEvent = this.options.changes(oldValue, newValue);
        if (changeEvent !== undefined) {
          try {
            this.eventsSubject.next(changeEvent);
          } catch {
            // 逆向: d5T silently catches subscriber errors
          }
        }
      }

      return newValue;
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      this.lastError = error;

      const oldValue = this.value;
      this.value = undefined;

      // Emit change event for error transition
      if (this.options.changes) {
        const changeEvent = this.options.changes(oldValue, undefined);
        if (changeEvent !== undefined) {
          try {
            this.eventsSubject.next(changeEvent);
          } catch {
            // 逆向: d5T silently catches subscriber errors
          }
        }
      }

      throw error;
    }
  }
}
