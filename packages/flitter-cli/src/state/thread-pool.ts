// thread-pool.ts -- Multi-thread state management matching AMP's RhR class.
//
// Manages threadHandleMap, activeThreadContextID, browser-style back/forward
// navigation stacks, and recent thread ID tracking (max 50).
// Source: 20_thread_management.js SECTION 2b (class RhR).

import type { ThreadHandle } from './types';
import type { StateListener } from './session';
import { log } from '../utils/logger';

/** Maximum number of recent thread IDs to retain. AMP caps at 50. */
const MAX_RECENT_THREADS = 50;

/**
 * ThreadPool manages multiple concurrent ThreadHandle instances with
 * browser-style back/forward navigation.
 *
 * Architecture mapping (AMP -> flitter-cli):
 *   RhR                     -> ThreadPool
 *   threadHandleMap          -> threadHandleMap
 *   activeThreadContextID   -> activeThreadContextID
 *   threadBackStack         -> threadBackStack
 *   threadForwardStack      -> threadForwardStack
 *   recentThreadIDsSubject  -> recentThreadIDs
 *   addToRecentThreads()    -> addToRecentThreads()
 *   navigateBack()          -> navigateBack()
 *   navigateForward()       -> navigateForward()
 *   recordNavigation()      -> recordNavigation()
 */
export class ThreadPool {
  /** Map of all active thread handles keyed by ThreadID. */
  readonly threadHandleMap: Map<string, ThreadHandle> = new Map();

  /** The currently active thread ID, or null if no thread is active. */
  activeThreadContextID: string | null = null;

  /**
   * Browser-style navigation back stack.
   * Contains thread IDs that were navigated away from.
   * navigateBack() pops from here, pushes current to forwardStack.
   */
  readonly threadBackStack: string[] = [];

  /**
   * Browser-style navigation forward stack.
   * Contains thread IDs that were navigated back from.
   * navigateForward() pops from here, pushes current to backStack.
   */
  readonly threadForwardStack: string[] = [];

  /**
   * Ordered list of recently visited thread IDs (most recent first).
   * Capped at MAX_RECENT_THREADS (50). Matches AMP's recentThreadIDsSubject.
   */
  readonly recentThreadIDs: string[] = [];

  /**
   * Map of thread titles keyed by ThreadID.
   * Matches AMP's threadTitlesSubject.
   */
  readonly threadTitles: Record<string, string | null> = {};

  // --- Listeners ---
  private _listeners: Set<StateListener> = new Set();

  // ---------------------------------------------------------------------------
  // Listener Management
  // ---------------------------------------------------------------------------

  /** Register a listener notified on any thread pool state change. */
  addListener(fn: StateListener): void {
    this._listeners.add(fn);
  }

  /** Unregister a previously registered listener. */
  removeListener(fn: StateListener): void {
    this._listeners.delete(fn);
  }

  /** Notify all registered listeners. */
  private _notifyListeners(): void {
    this._listeners.forEach(fn => fn());
  }

  // ---------------------------------------------------------------------------
  // Active Thread Access
  // ---------------------------------------------------------------------------

  /**
   * Get the currently active ThreadHandle.
   * Throws if no active thread context exists.
   * Matches AMP's get activeThreadHandle() on RhR.
   */
  get activeThreadHandle(): ThreadHandle {
    if (!this.activeThreadContextID) {
      throw new Error('ThreadPool: No active thread context');
    }
    const handle = this.threadHandleMap.get(this.activeThreadContextID);
    if (!handle) {
      throw new Error(`ThreadPool: No thread handle for ${this.activeThreadContextID}`);
    }
    return handle;
  }

  /**
   * Get the active ThreadHandle or null if none is active.
   * Safe variant that never throws.
   */
  get activeThreadHandleOrNull(): ThreadHandle | null {
    if (!this.activeThreadContextID) return null;
    return this.threadHandleMap.get(this.activeThreadContextID) ?? null;
  }

  /** The number of threads in the pool. */
  get threadCount(): number {
    return this.threadHandleMap.size;
  }

  // ---------------------------------------------------------------------------
  // Thread Activation (internal)
  // ---------------------------------------------------------------------------

  /**
   * Activate a thread by setting activeThreadContextID and updating
   * recent threads. Reuses existing handle if already in the map.
   * Matches AMP's activateThread() in RhR class (SECTION 2c).
   *
   * @param handle - The ThreadHandle to activate
   */
  activateThread(handle: ThreadHandle): void {
    const threadID = handle.threadID;

    // Add to map if not already present
    if (!this.threadHandleMap.has(threadID)) {
      this.threadHandleMap.set(threadID, handle);
    }

    this.activeThreadContextID = threadID;
    this.addToRecentThreads(threadID);
    this.syncThreadTitle(handle);

    log.info(`[thread-pool] activateThread: ${threadID}, handleCount=${this.threadHandleMap.size}`);
    this._notifyListeners();
  }

  /**
   * Activate a thread with navigation recording.
   * If recordNavigation is true and the thread changes, pushes the previous
   * thread ID onto the back stack and clears the forward stack.
   * Matches AMP's activateThreadWithNavigation() (SECTION 2c).
   *
   * @param handle - The ThreadHandle to activate
   * @param recordNavigation - Whether to record this as a navigation event
   */
  activateThreadWithNavigation(handle: ThreadHandle, recordNavigation: boolean): void {
    const previousThreadID = this.activeThreadContextID;
    this.activateThread(handle);
    const newThreadID = this.activeThreadContextID;

    if (recordNavigation && previousThreadID !== null && newThreadID !== null && previousThreadID !== newThreadID) {
      this.recordNavigation(previousThreadID);
    }
  }

  // ---------------------------------------------------------------------------
  // Navigation (THRD-05)
  // ---------------------------------------------------------------------------

  /**
   * Whether backward navigation is possible.
   * Matches AMP's canNavigateBack() on RhR.
   */
  canNavigateBack(): boolean {
    return this.threadBackStack.length > 0;
  }

  /**
   * Whether forward navigation is possible.
   * Matches AMP's canNavigateForward() on RhR.
   */
  canNavigateForward(): boolean {
    return this.threadForwardStack.length > 0;
  }

  /**
   * Navigate to the previous thread in the back stack.
   * Pops from threadBackStack, pushes current to threadForwardStack.
   * Matches AMP's navigateBack() exactly (SECTION 2b line 290-302).
   *
   * AMP error handling: on activation failure, rolls back stack changes.
   */
  navigateBack(): void {
    if (!this.canNavigateBack()) return;

    const currentID = this.activeThreadContextID;
    if (!currentID) return;

    const previousID = this.threadBackStack.pop();
    if (!previousID) return;

    const previousHandle = this.threadHandleMap.get(previousID);
    if (!previousHandle) {
      // Restore stack if target thread no longer exists
      this.threadBackStack.push(previousID);
      log.warn(`[thread-pool] navigateBack: thread ${previousID} not found in map`);
      return;
    }

    this.threadForwardStack.push(currentID);
    this.activateThread(previousHandle);

    log.info(`[thread-pool] navigateBack: ${currentID} -> ${previousID}`);
  }

  /**
   * Navigate to the next thread in the forward stack.
   * Pops from threadForwardStack, pushes current to threadBackStack.
   * Matches AMP's navigateForward() exactly (SECTION 2b line 303-315).
   *
   * AMP error handling: on activation failure, rolls back stack changes.
   */
  navigateForward(): void {
    if (!this.canNavigateForward()) return;

    const currentID = this.activeThreadContextID;
    if (!currentID) return;

    const nextID = this.threadForwardStack.pop();
    if (!nextID) return;

    const nextHandle = this.threadHandleMap.get(nextID);
    if (!nextHandle) {
      // Restore stack if target thread no longer exists
      this.threadForwardStack.push(nextID);
      log.warn(`[thread-pool] navigateForward: thread ${nextID} not found in map`);
      return;
    }

    this.threadBackStack.push(currentID);
    this.activateThread(nextHandle);

    log.info(`[thread-pool] navigateForward: ${currentID} -> ${nextID}`);
  }

  /**
   * Record a navigation event: push the given thread ID to the back stack
   * and clear the forward stack.
   * Matches AMP's recordNavigation() exactly (line 392-393).
   */
  private recordNavigation(threadID: string): void {
    this.threadBackStack.push(threadID);
    this.threadForwardStack.length = 0;
  }

  // ---------------------------------------------------------------------------
  // Recent Threads
  // ---------------------------------------------------------------------------

  /**
   * Add a thread ID to the front of the recent threads list.
   * If already present, moves it to the front. Caps at 50 entries.
   * Matches AMP's addToRecentThreads() exactly (line 387-391).
   */
  addToRecentThreads(threadID: string): void {
    const idx = this.recentThreadIDs.indexOf(threadID);
    if (idx !== -1) {
      this.recentThreadIDs.splice(idx, 1);
    }
    this.recentThreadIDs.unshift(threadID);
    if (this.recentThreadIDs.length > MAX_RECENT_THREADS) {
      this.recentThreadIDs.pop();
    }
  }

  // ---------------------------------------------------------------------------
  // Thread Title Sync
  // ---------------------------------------------------------------------------

  /**
   * Sync a thread's title into the threadTitles map.
   * Matches AMP's applyProviderState() title sync (line 376-378).
   */
  syncThreadTitle(handle: ThreadHandle): void {
    const current = this.threadTitles[handle.threadID];
    if (current !== handle.title) {
      this.threadTitles[handle.threadID] = handle.title;
    }
  }

  /**
   * Update a thread's title by thread ID.
   */
  setThreadTitle(threadID: string, title: string): void {
    const handle = this.threadHandleMap.get(threadID);
    if (handle) {
      handle.title = title;
      this.threadTitles[threadID] = title;
      this._notifyListeners();
    }
  }

  // ---------------------------------------------------------------------------
  // Thread Removal
  // ---------------------------------------------------------------------------

  /**
   * Remove a thread handle from the pool.
   * Cleans up: threadHandleMap, recentThreadIDs, threadTitles,
   * and removes from back/forward stacks.
   */
  removeThread(threadID: string): void {
    this.threadHandleMap.delete(threadID);
    delete this.threadTitles[threadID];

    // Remove from recent threads
    const recentIdx = this.recentThreadIDs.indexOf(threadID);
    if (recentIdx !== -1) {
      this.recentThreadIDs.splice(recentIdx, 1);
    }

    // Remove from navigation stacks
    this._removeFromStack(this.threadBackStack, threadID);
    this._removeFromStack(this.threadForwardStack, threadID);

    this._notifyListeners();
  }

  /**
   * Remove all occurrences of a value from an array in-place.
   */
  private _removeFromStack(stack: string[], value: string): void {
    for (let i = stack.length - 1; i >= 0; i--) {
      if (stack[i] === value) {
        stack.splice(i, 1);
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Dispose
  // ---------------------------------------------------------------------------

  /**
   * Dispose all thread handles and clear state.
   * Matches AMP's RhR.dispose() (line 1251-1253).
   */
  dispose(): void {
    this.threadHandleMap.clear();
    this.threadBackStack.length = 0;
    this.threadForwardStack.length = 0;
    this.recentThreadIDs.length = 0;
    this.activeThreadContextID = null;
    Object.keys(this.threadTitles).forEach(k => delete this.threadTitles[k]);
    this._listeners.clear();
  }
}
