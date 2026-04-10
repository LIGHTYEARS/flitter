// thread-pool.ts -- Multi-thread state management matching AMP's RhR class.
//
// Manages threadHandleMap, activeThreadContextID, browser-style back/forward
// navigation stacks, and recent thread ID tracking (max 50).
// Source: 20_thread_management.js SECTION 2b (class RhR).

import type { ThreadHandle, ThreadVisibility, ThreadInferenceState, QueuedMessage, CompactionStatus, HandoffRequest } from './types';
import type { StateListener } from './session';
import { createThreadHandle, type CreateThreadHandleOptions } from './thread-handle';
import { ThreadWorker } from './thread-worker';
import { log } from '../utils/logger';

/** Maximum number of recent thread IDs to retain. AMP caps at 50. */
const MAX_RECENT_THREADS = 50;

/** Maximum length for auto-generated thread titles. Matches AMP title truncation. */
const MAX_TITLE_LENGTH = 80;

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
  // Thread Lifecycle: Create / Switch / Delete
  // ---------------------------------------------------------------------------

  /**
   * Create a new thread and activate it with navigation recording.
   * The existing active thread is preserved in threadHandleMap (not lost).
   * Matches AMP's RhR.createThread(R) which calls
   * activateThreadWithNavigation(R, {recordNavigation: true}).
   *
   * @param options - Thread creation options (cwd, model, agentMode, etc.)
   * @returns The newly created ThreadHandle
   */
  createThread(options: Omit<CreateThreadHandleOptions, 'threadID'>): ThreadHandle {
    const handle = createThreadHandle(options);
    this.activateThreadWithNavigation(handle, true);
    log.info(`[thread-pool] createThread: ${handle.threadID}`);
    return handle;
  }

  /**
   * Switch to an existing thread by ID.
   * Matches AMP's RhR.switchThread(R) which calls
   * activateThreadWithNavigation(R, {recordNavigation: true}).
   *
   * @param threadID - The ID of the thread to switch to
   * @throws If threadID is not found in threadHandleMap
   */
  switchThread(threadID: string): void {
    const handle = this.threadHandleMap.get(threadID);
    if (!handle) {
      throw new Error(`ThreadPool.switchThread: thread ${threadID} not found`);
    }
    this.activateThreadWithNavigation(handle, true);
    log.info(`[thread-pool] switchThread: -> ${threadID}`);
  }

  /**
   * Delete a thread from the pool.
   * If deleting the active thread, switches to the most recent alternative.
   * Removes from all internal data structures via removeThread().
   *
   * @param threadID - The ID of the thread to delete
   * @returns true if the thread was found and deleted, false otherwise
   */
  deleteThread(threadID: string): boolean {
    if (!this.threadHandleMap.has(threadID)) return false;

    const wasActive = this.activeThreadContextID === threadID;
    this.removeThread(threadID);

    if (wasActive) {
      // Switch to the most recent remaining thread, or set null
      const remaining = this.recentThreadIDs[0];
      if (remaining) {
        const handle = this.threadHandleMap.get(remaining);
        if (handle) {
          this.activateThread(handle);
        } else {
          this.activeThreadContextID = null;
        }
      } else {
        this.activeThreadContextID = null;
      }
    }

    log.info(`[thread-pool] deleteThread: ${threadID}, wasActive=${wasActive}`);
    this._notifyListeners();
    return true;
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

  /**
   * Generate a thread title from the first user message in the conversation.
   * Matches AMP's triggerTitleGeneration() from SECTION 3:
   * - Skip if thread already has a title
   * - Find the first user message
   * - Truncate content to MAX_TITLE_LENGTH characters
   * - Set as the thread title
   *
   * @param threadID - The thread to generate a title for
   */
  generateTitle(threadID: string): void {
    const handle = this.threadHandleMap.get(threadID);
    if (!handle) return;

    // Skip if already titled (matches AMP: this.thread.title check)
    if (handle.title) return;

    const items = handle.session.items;
    // Find first user message (matches AMP: messages.find(h => h.role !== "user"))
    const firstUserMsg = items.find(item => item.type === 'user_message');
    if (!firstUserMsg || firstUserMsg.type !== 'user_message') return;

    const text = firstUserMsg.text?.trim();
    if (!text) return;

    // Truncate to MAX_TITLE_LENGTH, add ellipsis if truncated
    const title = text.length > MAX_TITLE_LENGTH
      ? text.slice(0, MAX_TITLE_LENGTH - 1) + '\u2026'
      : text;

    this.setThreadTitle(threadID, title);
    log.info(`[thread-pool] generateTitle: ${threadID} -> "${title}"`);
  }

  // ---------------------------------------------------------------------------
  // Thread Visibility (THRD-07)
  // ---------------------------------------------------------------------------

  /**
   * Set the visibility mode of a thread.
   * Matches AMP's switchThreadVisibility / fC() pattern from
   * 27_misc_features.js and 20_thread_management.js SECTION 4b.
   *
   * @param threadID - The thread to modify
   * @param visibility - New visibility mode
   */
  setThreadVisibility(threadID: string, visibility: ThreadVisibility): void {
    const handle = this.threadHandleMap.get(threadID);
    if (!handle) return;

    handle.visibility = visibility;
    log.info(`[thread-pool] setThreadVisibility: ${threadID} -> ${visibility}`);
    this._notifyListeners();
  }

  /**
   * Get all visible threads (excluding hidden and archived).
   * Returns handles sorted by most recent first using recentThreadIDs order.
   */
  getVisibleThreads(): ThreadHandle[] {
    const handles: ThreadHandle[] = [];
    for (const threadID of this.recentThreadIDs) {
      const handle = this.threadHandleMap.get(threadID);
      if (handle && handle.visibility === 'visible') {
        handles.push(handle);
      }
    }
    return handles;
  }

  // ---------------------------------------------------------------------------
  // Thread Worker Map (THRD-10)
  // ---------------------------------------------------------------------------

  /**
   * Per-thread worker state machines.
   * Matches AMP's threadWorkerService (tr) with getOrCreateForThread.
   * Each thread gets an independent worker tracking inference state.
   */
  readonly threadWorkerMap: Map<string, ThreadWorker> = new Map();

  /**
   * Get or create a worker entry for a thread.
   * Matches AMP's tr.getOrCreateForThread() from SECTION 4d.
   */
  getOrCreateWorker(threadID: string): ThreadWorker {
    let worker = this.threadWorkerMap.get(threadID);
    if (!worker) {
      worker = new ThreadWorker(threadID as import('./types').ThreadID);
      this.threadWorkerMap.set(threadID, worker);
    }
    return worker;
  }

  /**
   * Update a thread worker's inference state.
   */
  setWorkerInferenceState(threadID: string, state: ThreadInferenceState): void {
    const worker = this.getOrCreateWorker(threadID);
    // Map legacy inference states to delta events
    if (state === 'running') {
      worker.handle({ type: 'user:message-queue:dequeue' });
    } else if (state === 'cancelled') {
      worker.handle({ type: 'cancelled' });
    } else {
      // 'idle' maps to inference completed
      worker.handle({ type: 'inference:completed' });
    }
    this._notifyListeners();
  }

  /**
   * Get the count of active workers (state !== 'disposed').
   * Matches AMP's thread_worker_count gauge.
   */
  get activeWorkerCount(): number {
    let count = 0;
    for (const worker of this.threadWorkerMap.values()) {
      if (worker.isRunning) count++;
    }
    return count;
  }

  // ---------------------------------------------------------------------------
  // Message Queue (QUEUE-01)
  // ---------------------------------------------------------------------------

  /**
   * Enqueue a message on the active thread's queue.
   * Matches AMP's gZR.queueMessage() which delegates to the active handle.
   * The enqueued message is stored on the thread's queuedMessages array.
   *
   * @param text - The user message text to enqueue
   * @param images - Optional image attachments
   */
  queueMessage(text: string, images?: Array<{ filename: string }>): void {
    const handle = this.activeThreadHandleOrNull;
    if (!handle) {
      log.warn('[thread-pool] queueMessage: no active thread');
      return;
    }

    const msg: QueuedMessage = {
      id: `qm-${crypto.randomUUID()}`,
      text,
      queuedAt: Date.now(),
      images: images?.length ? images : undefined,
    };

    handle.queuedMessages.push(msg);
    log.info(`[thread-pool] queueMessage: queued "${text.slice(0, 40)}..." on ${handle.threadID}, queueLen=${handle.queuedMessages.length}`);
    this._notifyListeners();
  }

  /**
   * Discard all queued messages on the active thread.
   * Matches AMP's gZR.discardQueuedMessages() which clears the queue.
   * Used when user exits queue mode or switches threads.
   */
  discardQueuedMessages(): void {
    const handle = this.activeThreadHandleOrNull;
    if (!handle) return;

    const count = handle.queuedMessages.length;
    handle.queuedMessages.length = 0;
    if (count > 0) {
      log.info(`[thread-pool] discardQueuedMessages: cleared ${count} messages on ${handle.threadID}`);
    }
    this._notifyListeners();
  }

  // ---------------------------------------------------------------------------
  // Compaction Status (COMP-01)
  // ---------------------------------------------------------------------------

  /** Callback to get compaction status from PromptController. */
  private _getCompactionStatus: (() => CompactionStatus) | null = null;

  /**
   * Register a compaction status provider callback.
   * Called during bootstrap to wire PromptController's getCompactionStatus.
   */
  setCompactionStatusProvider(provider: () => CompactionStatus): void {
    this._getCompactionStatus = provider;
  }

  /**
   * Get the current compaction status.
   * Matches AMP's RhR.getCompactionStatus() which delegates to
   * this.activeProvider.getCompactionState().
   * Returns undefined if no provider is registered.
   */
  getCompactionStatus(): CompactionStatus | undefined {
    return this._getCompactionStatus?.();
  }

  // ---------------------------------------------------------------------------
  // Handoff Mode (HAND-03: Cross-Thread Handoff)
  // ---------------------------------------------------------------------------

  /**
   * Currently in-flight handoff request, or null.
   * Tracks sourceThreadID/targetThreadID while the handoff is being created.
   * Matches AMP's threadWorkerService.handoff() tracking pattern.
   */
  pendingHandoff: HandoffRequest | null = null;

  /**
   * Log of completed handoff requests for history/debugging.
   * Each entry records the source->target thread relationship and goal.
   */
  readonly completedHandoffs: HandoffRequest[] = [];

  /**
   * Map from target threadID to its handoff source threadID.
   * Used by getHandoffSourceThreadID() to resolve parent thread for
   * handoff-created threads. Matches AMP's getEmptyHandoffParentThreadID().
   */
  private readonly _handoffSourceMap: Map<string, string> = new Map();

  /**
   * Create a handoff: new thread with cross-thread tracking.
   *
   * Matches AMP's threadPool.createHandoff(R, T) which:
   * 1. Captures sourceThreadID from activeThreadContextID
   * 2. Creates a new thread via createThread()
   * 3. Records the source->target handoff relationship
   * 4. Returns the new ThreadHandle
   *
   * @param goal - The user's goal text for the new thread
   * @param options - Optional configuration (agentMode for target thread)
   * @returns The newly created ThreadHandle for the handoff target
   */
  createHandoff(goal: string, options?: { agentMode?: string | null }): ThreadHandle {
    const sourceThreadID = this.activeThreadContextID;
    if (!sourceThreadID) {
      throw new Error('ThreadPool.createHandoff: no active thread context');
    }

    // Create a new thread (this records navigation)
    const handle = this.createThread({
      cwd: this.activeThreadHandle.session.metadata.cwd,
      model: this.activeThreadHandle.session.metadata.model,
      agentMode: options?.agentMode ?? null,
    });

    const targetThreadID = handle.threadID;

    // Record the handoff request
    const request: HandoffRequest = {
      sourceThreadID,
      targetThreadID,
      goal,
      agentMode: options?.agentMode ?? null,
      createdAt: Date.now(),
    };

    this.pendingHandoff = request;
    this._handoffSourceMap.set(targetThreadID, sourceThreadID);

    log.info(`[thread-pool] createHandoff: ${sourceThreadID} -> ${targetThreadID}, goal="${goal.slice(0, 60)}"`);
    this._notifyListeners();

    return handle;
  }

  /**
   * Mark the pending handoff as complete and move to completed list.
   * Called after the handoff thread has been activated and is running.
   */
  completeHandoff(): void {
    if (this.pendingHandoff) {
      this.completedHandoffs.push(this.pendingHandoff);
      log.info(`[thread-pool] completeHandoff: ${this.pendingHandoff.sourceThreadID} -> ${this.pendingHandoff.targetThreadID}`);
      this.pendingHandoff = null;
      this._notifyListeners();
    }
  }

  /**
   * Get the source thread ID for a handoff-created thread.
   * Returns the thread that initiated the handoff, or null if the
   * thread was not created via handoff.
   *
   * Matches AMP's getEmptyHandoffParentThreadID() on active thread handle.
   *
   * @param threadID - The thread to check (defaults to active thread)
   * @returns Source thread ID, or null if not a handoff thread
   */
  getHandoffSourceThreadID(threadID?: string): string | null {
    const id = threadID ?? this.activeThreadContextID;
    if (!id) return null;
    return this._handoffSourceMap.get(id) ?? null;
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
    this.threadWorkerMap.delete(threadID);
    this._handoffSourceMap.delete(threadID);

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
    this.threadWorkerMap.clear();
    this._listeners.clear();
  }
}
