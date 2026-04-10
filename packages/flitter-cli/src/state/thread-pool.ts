// thread-pool.ts -- Multi-thread state management matching AMP's RhR class.
//
// Manages threadHandleMap, activeThreadContextID, browser-style back/forward
// navigation stacks, and recent thread ID tracking (max 50).
// Source: 20_thread_management.js SECTION 2b (class RhR).

import type { ThreadHandle, ThreadVisibility, ThreadInferenceState, QueuedMessage, CompactionStatus, HandoffRequest, ThreadRelationship, ThreadRelationshipType, ConversationItem } from './types';
import type { StateListener } from './session';
import { createThreadHandle, type CreateThreadHandleOptions } from './thread-handle';
import { ThreadWorker } from './thread-worker';
import { log } from '../utils/logger';

/** Maximum number of recent thread IDs to retain. AMP caps at 50. */
const MAX_RECENT_THREADS = 50;

/** Maximum length for auto-generated thread titles. Matches AMP title truncation. */
const MAX_TITLE_LENGTH = 80;

/**
 * Per-thread operational abort controllers.
 * Matches AMP's ThreadWorker.ops pattern for cancellable async operations.
 */
interface ThreadOps {
  /** AbortController for in-flight title generation. Aborted on re-trigger or thread dispose. */
  titleGeneration: AbortController | null;
}

/**
 * Extended options for createThread.
 * Matches AMP's createThread(R, T) parameter T from
 * 20_thread_queue_handoff.js:
 *   T = { seededMessages?, parent?, draftContent?, queuedMessages?,
 *         newThreadID?, agentMode?, initialUserMessage? }
 *
 * Simplified for flitter-cli to the subset we need now.
 */
export interface CreateThreadExtendedOptions {
  /** Pre-seed conversation items into the new thread's session. */
  seededMessages?: ConversationItem[];
  /** Parent thread ID — if provided, applyParentRelationship('fork') is called. */
  parentThreadID?: string;
  /** Draft content to set on the new thread's input field. */
  draftContent?: string;
  /** Queued messages to transfer from another thread. */
  queuedMessages?: QueuedMessage[];
}

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

  /**
   * Per-thread operational abort controllers for cancellable async operations.
   * Matches AMP's ThreadWorker.ops pattern (ops.titleGeneration, etc.).
   */
  private readonly _threadOps: Map<string, ThreadOps> = new Map();

  /**
   * Configurable skip patterns for title generation.
   * If the first user message contains any of these strings, title generation is skipped.
   * Matches AMP's config: "agent.skipTitleGenerationIfMessageContains" (array of strings).
   * Set externally via setSkipTitleGenerationPatterns().
   */
  private _skipTitleGenerationPatterns: string[] = [];

  /**
   * Set the skip patterns for title generation.
   * Matches AMP's configService settings["agent.skipTitleGenerationIfMessageContains"].
   *
   * @param patterns - Array of strings; if first message contains any, skip title generation
   */
  setSkipTitleGenerationPatterns(patterns: string[]): void {
    this._skipTitleGenerationPatterns = patterns;
  }

  /**
   * Get or create the ThreadOps for a thread.
   * Lazily initializes ops with null abort controllers.
   */
  private _getOps(threadID: string): ThreadOps {
    let ops = this._threadOps.get(threadID);
    if (!ops) {
      ops = { titleGeneration: null };
      this._threadOps.set(threadID, ops);
    }
    return ops;
  }

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
   *
   * Matches AMP's createThread(R, T) from 20_thread_queue_handoff.js:
   *   async createThread(R, T) {
   *     let a = T?.newThreadID ?? jt(), e = T?.agentMode, r = false;
   *     if (T?.seededMessages) await this.seedThreadMessages(R, a, T.seededMessages, e), r = true;
   *     let h = await this.createThreadWorker(R, a);
   *     ...
   *     if (T?.parent) await this.applyParentRelationship(R, h, a, T.parent), ...;
   *     if (T?.draftContent) ...;
   *     if (T?.queuedMessages) await this.transferQueuedMessages(h, T.queuedMessages);
   *   }
   *
   * @param options - Thread creation options (cwd, model, agentMode, etc.)
   * @param extended - Extended options: seededMessages, parentThreadID, draftContent, queuedMessages
   * @returns The newly created ThreadHandle
   */
  createThread(
    options: Omit<CreateThreadHandleOptions, 'threadID'>,
    extended?: CreateThreadExtendedOptions,
  ): ThreadHandle {
    const startMs = Date.now();

    const handle = createThreadHandle(options);
    const threadID = handle.threadID;

    // --- AMP step 1: seed messages into the new thread's session ---
    // Matches: if (T?.seededMessages) await this.seedThreadMessages(R, a, T.seededMessages, e)
    if (extended?.seededMessages && extended.seededMessages.length > 0) {
      for (const item of extended.seededMessages) {
        if (item.type === 'user_message') {
          handle.session.addUserMessage(item.text ?? '');
        } else if (item.type === 'system_message') {
          handle.session.addSystemMessage(item.text ?? '');
        }
        // Other item types (assistant_message, tool_call, etc.) are not
        // seeded directly — they come from the inference response.
      }
      log.info(`[thread-pool] createThread: seeded ${extended.seededMessages.length} messages into ${threadID}`);
    }

    // Activate the thread (records navigation)
    this.activateThreadWithNavigation(handle, true);

    // --- AMP step 2: register parent relationship ---
    // Matches: if (T?.parent) await this.applyParentRelationship(R, h, a, T.parent)
    if (extended?.parentThreadID) {
      this.applyParentRelationship(extended.parentThreadID, threadID, 'fork');
    }

    // --- AMP step 3: set draft content ---
    // Matches: if (T?.draftContent) { ... set the draft ... }
    if (extended?.draftContent) {
      handle.draftContent = extended.draftContent;
      log.info(`[thread-pool] createThread: set draftContent on ${threadID}, len=${extended.draftContent.length}`);
    }

    // --- AMP step 4: transfer queued messages ---
    // Matches: if (T?.queuedMessages) await this.transferQueuedMessages(h, T.queuedMessages)
    if (extended?.queuedMessages && extended.queuedMessages.length > 0) {
      handle.queuedMessages = [...extended.queuedMessages];
      log.info(`[thread-pool] createThread: transferred ${extended.queuedMessages.length} queued messages to ${threadID}`);
    }

    const elapsedMs = Date.now() - startMs;
    log.info(`[thread-pool] createThread: ${threadID} (elapsed=${elapsedMs}ms, seeded=${extended?.seededMessages?.length ?? 0}, parent=${extended?.parentThreadID ?? 'none'}, draft=${!!extended?.draftContent}, queued=${extended?.queuedMessages?.length ?? 0})`);

    return handle;
  }

  /**
   * Switch to an existing thread by ID.
   * Matches AMP's RhR.switchThread(R) which calls
   * activateThreadWithNavigation(R, {recordNavigation: true}).
   *
   * S3-15: Also checks pendingHandoffThreads so callers can switch to
   * an optimistic handoff target before completeHandoff() promotes it.
   *
   * @param threadID - The ID of the thread to switch to
   * @throws If threadID is not found in threadHandleMap or pendingHandoffThreads
   */
  switchThread(threadID: string): void {
    let handle = this.threadHandleMap.get(threadID);

    // S3-15: Fall back to pendingHandoffThreads for optimistic handoff handles
    if (!handle) {
      handle = this.pendingHandoffThreads.get(threadID);
      if (handle) {
        // Promote into threadHandleMap so it persists after this switch
        this.threadHandleMap.set(threadID, handle);
        this.pendingHandoffThreads.delete(threadID);
        log.info(`[thread-pool] switchThread: promoted pending handoff handle ${threadID} to threadHandleMap`);
      }
    }

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
   * Generate a thread title from the first eligible user message in the conversation.
   * Enhanced to match AMP's triggerTitleGeneration() from SECTION 3:
   *
   * 1. Skip if thread already has a title
   * 2. Skip if thread is a sub-thread (has parentThreadID via handoff source map)
   * 3. Abort any in-flight title generation (via ops.titleGeneration AbortController)
   * 4. Check skipTitleGenerationIfMessageContains patterns
   * 5. Find the first eligible user message (not matching skip patterns)
   * 6. Truncate content to MAX_TITLE_LENGTH characters
   * 7. Set as the thread title
   *
   * @param threadID - The thread to generate a title for
   */
  async generateTitle(threadID: string): Promise<void> {
    const handle = this.threadHandleMap.get(threadID);
    if (!handle) return;

    // Skip if already titled (matches AMP: this.thread.title check)
    if (handle.title) return;

    // Skip if sub-thread (matches AMP: this.thread.mainThreadID !== undefined check)
    // Uses the handoff source map to determine parent-child relationships.
    const parentThreadID = this.getHandoffSourceThreadID(threadID);
    if (parentThreadID) {
      log.info(`[thread-pool] generateTitle: skipping sub-thread ${threadID} (parent: ${parentThreadID})`);
      return;
    }

    // Abort any previous in-flight title generation for this thread
    // Matches AMP: this.ops.titleGeneration?.abort(); this.ops.titleGeneration = new AbortController;
    const ops = this._getOps(threadID);
    ops.titleGeneration?.abort();
    ops.titleGeneration = new AbortController();
    const signal = ops.titleGeneration.signal;

    // Read skip patterns (matches AMP: settings["agent.skipTitleGenerationIfMessageContains"])
    const skipPatterns = this._skipTitleGenerationPatterns.filter(
      (p) => typeof p === 'string',
    );

    // Find first eligible user message
    // Matches AMP: this.thread.messages.find(h => h.role !== "user" ? false : ...)
    const items = handle.session.items;
    let firstEligibleText: string | undefined;

    for (const item of items) {
      if (item.type !== 'user_message') continue;
      const text = item.text?.trim();
      if (!text) continue;

      // If no skip patterns, first user message is eligible
      if (skipPatterns.length === 0) {
        firstEligibleText = text;
        break;
      }

      // Check that the message does NOT contain any skip patterns
      // Matches AMP: !e.some((i) => t.includes(i))
      const containsSkipPattern = skipPatterns.some((pattern) =>
        text.includes(pattern),
      );
      if (!containsSkipPattern) {
        firstEligibleText = text;
        break;
      }
    }

    if (!firstEligibleText) {
      log.debug(`[thread-pool] generateTitle: no eligible message for ${threadID}`, {
        skipPatterns,
        hasFirstEligibleMessage: false,
      });
      return;
    }

    // Check if aborted before setting title
    if (signal.aborted) return;

    // Truncate to MAX_TITLE_LENGTH, add ellipsis if truncated
    const title = firstEligibleText.length > MAX_TITLE_LENGTH
      ? firstEligibleText.slice(0, MAX_TITLE_LENGTH - 1) + '\u2026'
      : firstEligibleText;

    // Final abort check
    if (signal.aborted) return;

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
   * Each thread gets an independent ThreadWorker tracking inference state.
   *
   * Migrated from Map<string, ThreadWorkerEntry> to Map<string, ThreadWorker>.
   * ThreadWorker is the event-driven state machine class that replaces the
   * plain ThreadWorkerEntry data interface.
   */
  readonly threadWorkerMap: Map<string, ThreadWorker> = new Map();

  /**
   * Callback invoked when a queued message is dequeued and ready for inference.
   * Set by the application bootstrap (e.g., AppState) to connect the dequeue
   * event to PromptController.sendUserMessage() or equivalent.
   *
   * Signature: (threadID, message) => void
   * The caller is responsible for starting inference with the dequeued message.
   */
  onDequeueMessage: ((threadID: string, message: QueuedMessage) => void) | null = null;

  /**
   * Get or create a ThreadWorker for a thread.
   * Matches AMP's tr.getOrCreateForThread() from SECTION 4d.
   *
   * Returns a ThreadWorker instance. The worker starts in 'initial' state
   * and must be activated via worker.activate() before use.
   *
   * On creation, wires:
   *   1. worker.onDequeue — forwards dequeued messages to ThreadPool.onDequeueMessage
   *   2. worker listener — auto-triggers tryDequeue on idle transitions
   */
  getOrCreateWorker(threadID: string): ThreadWorker {
    let worker = this.threadWorkerMap.get(threadID);
    if (!worker) {
      worker = new ThreadWorker(threadID);
      this.threadWorkerMap.set(threadID, worker);

      // Wire onDequeue callback: when ThreadWorker determines a message
      // should be dequeued, forward to ThreadPool's onDequeueMessage callback.
      worker.onDequeue = (message: QueuedMessage) => {
        log.info(`[thread-pool] onDequeue: forwarding message "${message.text.slice(0, 40)}..." from ${threadID}`);
        if (this.onDequeueMessage) {
          this.onDequeueMessage(threadID, message);
        }
        this._notifyListeners();
      };

      // Wire worker listener: when the worker state changes, check for
      // auto-dequeue if it transitioned to idle.
      // Matches AMP's inference:completed -> queuedMessages check pattern.
      const workerRef = worker;
      worker.addListener(() => {
        if (workerRef.activityState === 'idle') {
          const handle = this.threadHandleMap.get(threadID);
          if (handle && handle.queuedMessages.length > 0) {
            log.debug(`[thread-pool] worker idle with queued messages, attempting tryDequeue for ${threadID}`);
            workerRef.tryDequeue(handle.queuedMessages);
          }
        }
      });

      log.debug(`[thread-pool] getOrCreateWorker: created new ThreadWorker for ${threadID}`);
    }
    return worker;
  }

  /**
   * Update a thread worker's inference state via delta dispatch.
   *
   * Translates the old setWorkerInferenceState(threadID, state) call into
   * ThreadWorker.handle() delta events, maintaining backward compatibility
   * while using the new event-driven state machine.
   *
   * @deprecated Callers should use getOrCreateWorker(threadID).handle() directly.
   */
  setWorkerInferenceState(threadID: string, state: ThreadInferenceState): void {
    const worker = this.getOrCreateWorker(threadID);
    switch (state) {
      case 'running':
        worker.handle({ type: 'assistant:message:start' });
        break;
      case 'cancelled':
        worker.handle({ type: 'cancelled' });
        break;
      case 'idle':
        worker.handle({ type: 'inference:completed' });
        break;
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
      if (worker.state !== 'disposed') count++;
    }
    return count;
  }

  // ---------------------------------------------------------------------------
  // Message Queue (QUEUE-01, QUEUE-02)
  // ---------------------------------------------------------------------------

  /**
   * Enqueue a message on the active thread's queue.
   * Matches AMP's gZR.queueMessage() which delegates to the active handle.
   * The enqueued message is stored on the thread's queuedMessages array.
   *
   * After enqueueing, if the thread's worker is idle, immediately triggers
   * a dequeue attempt. This matches AMP's 'user:message-queue:enqueue'
   * handler which auto-dequeues when not tool-running and idle/cancelled.
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

    // Dispatch enqueue delta to worker state machine.
    // The worker's _notify() will trigger the ThreadPool's worker listener,
    // which checks for idle state and calls tryDequeue if appropriate.
    // This matches AMP's 'user:message-queue:enqueue' -> auto-dequeue pattern.
    const worker = this.threadWorkerMap.get(handle.threadID);
    if (worker) {
      worker.handle({ type: 'user:message-queue:enqueue' });
    }

    this._notifyListeners();
  }

  /**
   * Dequeue the next queued message from a thread.
   * Returns the dequeued message, or null if the queue is empty or
   * the worker is not in a state that allows dequeue.
   *
   * Matches AMP's pattern where the ThreadWorker checks queuedMessages
   * on the thread and shifts the first message for processing.
   *
   * @param threadID - The thread to dequeue from
   * @returns The dequeued message, or null if nothing to dequeue
   */
  dequeueNextMessage(threadID: string): QueuedMessage | null {
    const handle = this.threadHandleMap.get(threadID);
    if (!handle || handle.queuedMessages.length === 0) {
      return null;
    }

    const worker = this.threadWorkerMap.get(threadID);
    if (!worker) {
      return null;
    }

    // Guard: only dequeue when worker is idle
    if (worker.activityState !== 'idle') {
      log.debug(`[thread-pool] dequeueNextMessage: worker not idle (${worker.activityState}) for ${threadID}`);
      return null;
    }

    const message = handle.queuedMessages.shift() ?? null;
    if (message) {
      // Transition worker state via dequeue delta
      worker.handle({ type: 'user:message-queue:dequeue' });
      log.info(`[thread-pool] dequeueNextMessage: dequeued "${message.text.slice(0, 40)}..." from ${threadID}, remaining=${handle.queuedMessages.length}`);
      this._notifyListeners();
    }
    return message;
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

  /**
   * Interrupt (remove) a single queued message by thread ID and message ID.
   *
   * Searches the specified thread's queuedMessages for an entry matching
   * the given messageID and removes it. Notifies the thread's worker via
   * 'user:message-queue:dequeue' delta if a message was removed, so the
   * worker state machine stays consistent.
   *
   * Matches AMP's per-message interrupt pattern for queue mode (QUEUE-03).
   *
   * @param threadID - The thread whose queue to search
   * @param messageID - The id of the QueuedMessage to remove
   * @returns true if the message was found and removed, false otherwise
   */
  interruptQueuedMessage(threadID: string, messageID: string): boolean {
    const handle = this.threadHandleMap.get(threadID);
    if (!handle) {
      log.warn(`[thread-pool] interruptQueuedMessage: thread ${threadID} not found`);
      return false;
    }

    const idx = handle.queuedMessages.findIndex(m => m.id === messageID);
    if (idx === -1) {
      log.debug(`[thread-pool] interruptQueuedMessage: message ${messageID} not found in ${threadID}`);
      return false;
    }

    // Remove the single message from the queue
    const [removed] = handle.queuedMessages.splice(idx, 1);
    log.info(`[thread-pool] interruptQueuedMessage: removed "${removed.text.slice(0, 40)}..." from ${threadID}, remaining=${handle.queuedMessages.length}`);

    // Notify worker so its internal bookkeeping stays consistent.
    // The dequeue delta signals that the queue changed; the worker will
    // not actually process this message since it was removed before dequeue.
    const worker = this.threadWorkerMap.get(threadID);
    if (worker) {
      worker.handle({ type: 'user:message-queue:dequeue' });
    }

    this._notifyListeners();
    return true;
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
   * Optimistic ThreadHandle instances for in-flight handoffs.
   * Keyed by target threadID. Allows switchThread() to navigate to a
   * handoff target before the handoff is fully complete.
   *
   * When completeHandoff() is called, entries are promoted from
   * pendingHandoffThreads into the formal threadHandleMap.
   *
   * S3-15: pendingHandoffThreads (optimistic handles).
   */
  readonly pendingHandoffThreads: Map<string, ThreadHandle> = new Map();

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

  // ---------------------------------------------------------------------------
  // Thread Relationships (THRD-REL)
  // ---------------------------------------------------------------------------

  /**
   * Array of all tracked thread relationships.
   * Matches AMP's threadRelationshipsSubject from 32_protocol_schemas.js:
   *   Jo0 = X.object({ type: "thread_relationships", seq, relationships: X.array(mi0) })
   * And 20_thread_management.js SECTION 9 relationship creation pattern.
   *
   * Stores source -> target relationships of type fork/handoff/mention
   * for cross-thread navigation and relationship display.
   */
  readonly threadRelationships: ThreadRelationship[] = [];

  /**
   * Register a parent-child relationship between two threads.
   * Matches AMP's threadWorkerService.applyParentRelationship() from
   * 20_thread_queue_handoff.js createThread flow:
   *   if (T?.parent) await this.applyParentRelationship(R, h, a, T.parent)
   *
   * Creates a ThreadRelationship record and appends it to the
   * threadRelationships array. Also registers in _handoffSourceMap
   * if the type is 'handoff' for backward compatibility with
   * getHandoffSourceThreadID().
   *
   * @param sourceThreadID - The parent/source thread ID
   * @param targetThreadID - The child/target thread ID
   * @param type - The relationship type (fork, handoff, or mention)
   */
  applyParentRelationship(sourceThreadID: string, targetThreadID: string, type: ThreadRelationshipType): void {
    const relationship: ThreadRelationship = {
      type,
      sourceID: sourceThreadID,
      targetID: targetThreadID,
      createdAt: Date.now(),
    };

    this.threadRelationships.push(relationship);

    // Keep _handoffSourceMap in sync for backward compatibility
    if (type === 'handoff') {
      this._handoffSourceMap.set(targetThreadID, sourceThreadID);
    }

    log.info(`[thread-pool] applyParentRelationship: ${sourceThreadID} -[${type}]-> ${targetThreadID}`);
    this._notifyListeners();
  }

  /**
   * Get all relationships that involve a specific thread (as source or target).
   * Returns relationships where the thread is either the sourceID or targetID.
   *
   * Matches AMP's pattern of querying thread_relationships by threadID,
   * used for displaying relationship indicators in the thread list/preview.
   *
   * @param threadID - The thread ID to query relationships for
   * @returns Array of ThreadRelationship records involving this thread
   */
  getRelationshipsForThread(threadID: string): ThreadRelationship[] {
    return this.threadRelationships.filter(
      r => r.sourceID === threadID || r.targetID === threadID
    );
  }

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

    // S3-15: Store optimistic handle in pendingHandoffThreads so callers
    // can switchThread() to the target before completeHandoff() promotes it.
    this.pendingHandoffThreads.set(targetThreadID, handle);

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

    log.info(`[thread-pool] createHandoff: ${sourceThreadID} -> ${targetThreadID}, goal="${goal.slice(0, 60)}", pendingHandoffThreads.size=${this.pendingHandoffThreads.size}`);
    this._notifyListeners();

    return handle;
  }

  /**
   * Mark the pending handoff as complete and move to completed list.
   * Called after the handoff thread has been activated and is running.
   *
   * S3-15: Also promotes the target thread from pendingHandoffThreads
   * into the formal threadHandleMap (if not already promoted by switchThread).
   */
  completeHandoff(): void {
    if (this.pendingHandoff) {
      const targetThreadID = this.pendingHandoff.targetThreadID;

      // S3-15: Promote from pendingHandoffThreads to threadHandleMap
      const pendingHandle = this.pendingHandoffThreads.get(targetThreadID);
      if (pendingHandle) {
        if (!this.threadHandleMap.has(targetThreadID)) {
          this.threadHandleMap.set(targetThreadID, pendingHandle);
        }
        this.pendingHandoffThreads.delete(targetThreadID);
        log.info(`[thread-pool] completeHandoff: promoted ${targetThreadID} from pendingHandoffThreads`);
      }

      this.completedHandoffs.push(this.pendingHandoff);
      log.info(`[thread-pool] completeHandoff: ${this.pendingHandoff.sourceThreadID} -> ${targetThreadID}`);
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
    // Abort any in-flight operations for this thread
    const ops = this._threadOps.get(threadID);
    if (ops) {
      ops.titleGeneration?.abort();
      this._threadOps.delete(threadID);
    }

    this.threadHandleMap.delete(threadID);
    delete this.threadTitles[threadID];
    this.threadWorkerMap.delete(threadID);
    this._handoffSourceMap.delete(threadID);

    // S3-15: Also clean up from pendingHandoffThreads
    this.pendingHandoffThreads.delete(threadID);

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
    // Abort all in-flight operations
    for (const ops of this._threadOps.values()) {
      ops.titleGeneration?.abort();
    }
    this._threadOps.clear();

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
