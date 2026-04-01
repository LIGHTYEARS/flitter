// LiveHandle — indirect reference wrapper for hot-swappable connections
//
// Provides a stable reference that consumers can hold while the underlying
// connection is replaced during reconnection. This avoids the need to
// propagate a new ConnectionHandle through every call site after a reconnect.

import { log } from '../utils/logger';

/**
 * Wraps a mutable reference to an active connection handle, allowing
 * hot-swap during reconnection without invalidating existing references.
 *
 * Consumers read `liveHandle.current` instead of holding a direct reference
 * to the ConnectionHandle. When reconnection succeeds, `replace()` atomically
 * swaps the underlying handle so all future reads see the new connection.
 */
export class LiveHandle<T> {
  private _current: T;
  private _disposed = false;

  /** Create a LiveHandle wrapping the initial connection handle. */
  constructor(initial: T) {
    this._current = initial;
  }

  /** Return the active connection handle. */
  get current(): T {
    return this._current;
  }

  /**
   * Atomically replace the underlying handle with a new one.
   * Typically called after a successful reconnection.
   */
  replace(newHandle: T): void {
    if (this._disposed) {
      log.warn('LiveHandle.replace() called after dispose — ignoring');
      return;
    }
    this._current = newHandle;
  }

  /**
   * Mark this LiveHandle as disposed. After disposal, `replace()` becomes
   * a no-op to prevent accidental writes from stale reconnection callbacks.
   */
  dispose(): void {
    this._disposed = true;
  }

  /** Whether this handle has been disposed. */
  get disposed(): boolean {
    return this._disposed;
  }
}
