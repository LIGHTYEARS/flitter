// thread-worker.ts — Event-driven state machine for per-thread worker lifecycle.
//
// Faithful port of AMP's ThreadWorker class from 29_thread_worker_statemachine.js.
// Each ThreadWorker encapsulates the complete state for a single thread's
// execution lifecycle: inference state, tool operations, error handling,
// retry countdown, file change tracking, and turn timing.
//
// Instead of AMP's RxJS BehaviorSubject/Subject, we use a synchronous
// Set<() => void> listener pattern consistent with flitter-cli's StateListener.

import type {
  ThreadWorkerState,
  ThreadInferenceState,
  FileChangeEntry,
  QueuedMessage,
} from './types';
import { log } from '../utils/logger';

// ---------------------------------------------------------------------------
// Delta Types — events dispatched into ThreadWorker.handle()
// ---------------------------------------------------------------------------

/**
 * Delta: assistant inference message stream started.
 * Transitions state to 'thinking', inferenceState to 'running'.
 */
export interface DeltaAssistantMessageStart {
  type: 'assistant:message:start';
}

/**
 * Delta: incremental text chunk from assistant.
 * State remains 'thinking' while streaming.
 */
export interface DeltaAssistantMessageDelta {
  type: 'assistant:message:delta';
  text?: string;
}

/**
 * Delta: assistant message completed (full message received).
 * Carries the message state and optional stop reason.
 * AMP source: case "assistant:message" in handleThreadDelta.
 */
export interface DeltaAssistantMessage {
  type: 'assistant:message';
  message: {
    state: {
      type: 'complete' | 'cancelled' | 'error' | 'streaming';
      stopReason?: string;
    };
  };
}

/**
 * Delta: assistant message updated (no-op in state machine, retained for protocol fidelity).
 */
export interface DeltaAssistantMessageUpdate {
  type: 'assistant:message-update';
}

/**
 * Delta: tool execution data received.
 * Updates tool state; when all tools complete, may trigger next inference.
 */
export interface DeltaToolData {
  type: 'tool:data';
  toolUse: string;
  data: {
    status: 'running' | 'done' | 'error' | 'cancelled';
    result?: unknown;
    reason?: string;
    progress?: unknown;
  };
}

/**
 * Delta: tool start event — a new tool execution begins.
 * Adds the tool to active operations and transitions to 'tool-running'.
 */
export interface DeltaToolStart {
  type: 'tool:start';
  toolUse: string;
  name?: string;
}

/**
 * Delta: tool stop event — a tool execution has ended.
 * Removes the tool from active operations.
 */
export interface DeltaToolStop {
  type: 'tool:stop';
  toolUse: string;
  status?: 'done' | 'error' | 'cancelled';
}

/**
 * Delta: user message queued while assistant is processing.
 * AMP source: case "user:message-queue:enqueue" — may auto-dequeue.
 */
export interface DeltaUserMessageQueueEnqueue {
  type: 'user:message-queue:enqueue';
}

/**
 * Delta: dequeue a user message from the queue for processing.
 * AMP source: case "user:message-queue:dequeue".
 */
export interface DeltaUserMessageQueueDequeue {
  type: 'user:message-queue:dequeue';
}

/**
 * Delta: user provided input to a waiting tool.
 * AMP source: case "user:tool-input".
 */
export interface DeltaUserToolInput {
  type: 'user:tool-input';
  toolUse: string;
  value: unknown;
}

/**
 * Delta: inference run completed.
 * Carries model, usage, and stop reason info.
 * AMP source: case "inference:completed".
 */
export interface DeltaInferenceCompleted {
  type: 'inference:completed';
  model?: string;
  usage?: {
    totalInputTokens?: number;
    maxInputTokens?: number;
    inputTokens?: number;
    outputTokens?: number;
    cacheReadInputTokens?: number;
    cacheCreationInputTokens?: number;
  };
}

/**
 * Delta: turn was cancelled (e.g., user pressed Escape).
 * AMP source: case "cancelled".
 */
export interface DeltaCancelled {
  type: 'cancelled';
}

/**
 * Delta: thread was truncated (edit/restore).
 * AMP source: case "thread:truncate".
 */
export interface DeltaThreadTruncate {
  type: 'thread:truncate';
  fromIndex: number;
}

/**
 * Delta: manual bash invocation.
 * AMP source: case "info:manual-bash-invocation".
 */
export interface DeltaInfoManualBash {
  type: 'info:manual-bash-invocation';
}

/**
 * Delta: error occurred during processing.
 * Sets ephemeralError and transitions state.
 */
export interface DeltaError {
  type: 'error';
  error: string | Error;
}

/**
 * Delta: compaction started on the thread's context window.
 */
export interface DeltaCompactionStarted {
  type: 'compaction_started';
}

/**
 * Delta: compaction completed on the thread's context window.
 */
export interface DeltaCompactionComplete {
  type: 'compaction_complete';
}

/**
 * Delta: a file was changed during tool execution.
 */
export interface DeltaFileChange {
  type: 'file_change';
  path: string;
  status: 'created' | 'modified' | 'deleted';
}

/**
 * Delta: agent mode change.
 * AMP source: case "agent-mode" in handleThreadDelta.
 */
export interface DeltaAgentMode {
  type: 'agent-mode';
  mode: string;
}

/** Union of all delta types that ThreadWorker.handle() accepts. */
export type ThreadWorkerDelta =
  | DeltaAssistantMessageStart
  | DeltaAssistantMessageDelta
  | DeltaAssistantMessage
  | DeltaAssistantMessageUpdate
  | DeltaToolData
  | DeltaToolStart
  | DeltaToolStop
  | DeltaUserMessageQueueEnqueue
  | DeltaUserMessageQueueDequeue
  | DeltaUserToolInput
  | DeltaInferenceCompleted
  | DeltaCancelled
  | DeltaThreadTruncate
  | DeltaInfoManualBash
  | DeltaError
  | DeltaCompactionStarted
  | DeltaCompactionComplete
  | DeltaFileChange
  | DeltaAgentMode;

// ---------------------------------------------------------------------------
// ThreadWorker Class
// ---------------------------------------------------------------------------

/**
 * Per-thread worker state machine.
 *
 * Faithful port of AMP's ThreadWorker class from 29_thread_worker_statemachine.js.
 * Manages the complete execution lifecycle for a single thread:
 *   - Worker lifecycle state: initial -> active -> disposed
 *   - Inference state: idle -> running -> cancelled -> idle
 *   - Active tool operations with per-tool AbortControllers
 *   - Ephemeral error handling with retry countdown
 *   - File change tracking
 *   - Turn start time and elapsed timing
 *
 * AMP field mapping:
 *   _state             -> _state
 *   _inferenceState    -> _inferenceState
 *   _turnStartTime     -> _turnStartTime
 *   _turnElapsedMs     -> _turnElapsedMs
 *   ops                -> ops
 *   ephemeralError     -> ephemeralError
 *   retryCountdownSeconds -> retryCountdownSeconds
 *   retryTimer         -> _retryTimer
 *   retrySession       -> _retrySession
 *   fileChanges        -> fileChanges
 *   toolCallUpdates    -> (notified via _notify)
 */
export class ThreadWorker {
  /** The thread ID this worker belongs to. */
  readonly threadID: string;

  // -------------------------------------------------------------------------
  // Worker lifecycle state
  // Matches AMP: _state = new j0("initial")
  // Values: 'initial' | 'active' | 'disposed'
  // -------------------------------------------------------------------------
  private _state: ThreadWorkerState = 'initial';

  // -------------------------------------------------------------------------
  // Inference state
  // Matches AMP: _inferenceState = new j0("idle")
  // Values: 'idle' | 'running' | 'cancelled'
  // -------------------------------------------------------------------------
  private _inferenceState: ThreadInferenceState = 'idle';

  // -------------------------------------------------------------------------
  // Turn timing
  // Matches AMP: _turnStartTime = new j0(void 0), _turnElapsedMs = new j0(void 0)
  // -------------------------------------------------------------------------
  private _turnStartTime: number | null = null;
  private _turnElapsedMs: number | null = null;

  // -------------------------------------------------------------------------
  // Operation tracking (AbortControllers)
  // Matches AMP: ops = { tools: {}, toolMessages: {}, inference: null, titleGeneration: null }
  // -------------------------------------------------------------------------
  readonly ops: {
    /** Active tool AbortControllers keyed by toolUse ID. */
    tools: Map<string, AbortController>;
    /** Inference AbortController, or null if no inference is running. */
    inference: AbortController | null;
    /** Title generation AbortController, or null. */
    titleGeneration: AbortController | null;
  } = {
    tools: new Map(),
    inference: null,
    titleGeneration: null,
  };

  // -------------------------------------------------------------------------
  // Ephemeral error state
  // Matches AMP: ephemeralError = new j0(void 0), ephemeralErrorRetryAttempt = 0
  // -------------------------------------------------------------------------
  ephemeralError: string | null = null;
  private _ephemeralErrorRetryAttempt = 0;

  // -------------------------------------------------------------------------
  // Retry countdown
  // Matches AMP: retryCountdownSeconds = new j0(void 0), retryTimer = null, retrySession = 0
  // -------------------------------------------------------------------------
  retryCountdownSeconds: number | null = null;
  private _retryTimer: ReturnType<typeof setInterval> | null = null;
  private _retrySession: number = 0;

  // -------------------------------------------------------------------------
  // File changes
  // Matches AMP: fileChanges = new j0({files: []})
  // -------------------------------------------------------------------------
  readonly fileChanges: Map<string, FileChangeEntry> = new Map();

  // -------------------------------------------------------------------------
  // Tool call updates notification
  // Matches AMP: toolCallUpdates = new H0 (Subject)
  // -------------------------------------------------------------------------
  readonly toolCallUpdates: Map<string, unknown> = new Map();

  // -------------------------------------------------------------------------
  // Compaction tracking
  // -------------------------------------------------------------------------
  private _compacting: boolean = false;

  // -------------------------------------------------------------------------
  // Dequeue callback
  // Matches AMP's auto-dequeue pattern: when the worker transitions to idle
  // and queued messages exist, this callback is invoked so the ThreadPool
  // can shift the next message and start inference.
  // -------------------------------------------------------------------------

  /**
   * Callback invoked when the worker determines a queued message should be
   * dequeued and submitted for inference. Set by ThreadPool in
   * getOrCreateWorker(). The callback receives the dequeued QueuedMessage.
   */
  onDequeue: ((message: QueuedMessage) => void) | null = null;

  /**
   * Callback invoked when the retry countdown reaches zero.
   * Set by ThreadPool or AppState to trigger automatic retry of the
   * last failed inference. Matches AMP's retryTimer -> auto-retry pattern.
   */
  onRetry: (() => void) | null = null;

  // -------------------------------------------------------------------------
  // Listeners
  // -------------------------------------------------------------------------
  private _listeners: Set<() => void> = new Set();

  // -------------------------------------------------------------------------
  // Constructor
  // -------------------------------------------------------------------------

  /**
   * Create a new ThreadWorker for the given thread.
   * Matches AMP's ThreadWorker constructor(deps, threadID).
   *
   * @param threadID - The thread ID this worker manages
   */
  constructor(threadID: string) {
    this.threadID = threadID;
    log.debug(`[thread-worker] created for thread ${threadID}`);
  }

  // -------------------------------------------------------------------------
  // Getters — read-only accessors matching AMP's observable value access
  // -------------------------------------------------------------------------

  /** Worker lifecycle state. Matches AMP: this._state.getValue(). */
  get state(): ThreadWorkerState {
    return this._state;
  }

  /** Current inference state. Matches AMP: this._inferenceState.getValue(). */
  get inferenceState(): ThreadInferenceState {
    return this._inferenceState;
  }

  /** Epoch ms when the current turn started, or null if idle. */
  get turnStartTime(): number | null {
    return this._turnStartTime;
  }

  /**
   * Elapsed milliseconds since the current turn started.
   * Returns 0 if no turn is active.
   * Matches AMP: this._turnElapsedMs.getValue() ?? 0.
   */
  get turnElapsedMs(): number {
    if (this._turnElapsedMs !== null) return this._turnElapsedMs;
    if (this._turnStartTime !== null) return Date.now() - this._turnStartTime;
    return 0;
  }

  /** Whether compaction is currently in progress. */
  get isCompacting(): boolean {
    return this._compacting;
  }

  /** Whether this worker has been disposed. */
  get isDisposed(): boolean {
    return this._state === 'disposed';
  }

  /**
   * Current retry attempt count for ephemeral errors.
   * Matches AMP: ephemeralErrorRetryAttempt field.
   */
  get ephemeralErrorRetryAttempt(): number {
    return this._ephemeralErrorRetryAttempt;
  }

  /**
   * Number of currently active tool operations.
   * Matches AMP: Object.keys(this.ops.tools).length.
   */
  get activeToolCount(): number {
    return this.ops.tools.size;
  }

  /**
   * Compute the effective "activity state" for UI rendering.
   * This is a derived state combining _state, _inferenceState, and active tools.
   *
   * Matches AMP's wNR(thread, inferenceState) function which returns:
   *   - 'tool-running' if any tools are in-progress
   *   - 'thinking' if inference is running
   *   - 'idle' otherwise
   *
   * Additionally maps to the task-defined states:
   *   'idle' | 'thinking' | 'tool-running' | 'cancelled' | 'error'
   */
  get activityState(): 'idle' | 'thinking' | 'tool-running' | 'cancelled' | 'error' {
    if (this._state === 'disposed') return 'idle';
    if (this.ephemeralError !== null) return 'error';
    if (this._inferenceState === 'cancelled') return 'cancelled';
    if (this.ops.tools.size > 0) return 'tool-running';
    if (this._inferenceState === 'running') return 'thinking';
    return 'idle';
  }

  // -------------------------------------------------------------------------
  // Auto-dequeue support
  // Matches AMP's inference:completed -> check queuedMessages -> dequeue pattern
  // -------------------------------------------------------------------------

  /**
   * Attempt to dequeue the next queued message for this thread.
   *
   * Called by ThreadPool when conditions may allow dequeue:
   *   1. After inference:completed when the worker becomes idle
   *   2. After queueMessage() when the worker is already idle
   *
   * If the worker is idle and the queuedMessages array is non-empty,
   * shifts the first message, dispatches 'user:message-queue:dequeue' to
   * update internal state, and invokes the onDequeue callback so the
   * ThreadPool can trigger inference.
   *
   * Matches AMP's pattern:
   *   if (this.thread.queuedMessages && this.thread.queuedMessages.length > 0)
   *     this.handle({ type: "user:message-queue:dequeue" });
   *
   * @param queuedMessages - The thread's queued message array (mutable; will be shifted)
   * @returns true if a message was dequeued, false otherwise
   */
  tryDequeue(queuedMessages: QueuedMessage[]): boolean {
    const startMs = performance.now();

    // Guard: only dequeue when idle and not disposed
    if (this.activityState !== 'idle' || this._state === 'disposed') {
      return false;
    }

    if (queuedMessages.length === 0) {
      return false;
    }

    const message = queuedMessages.shift()!;

    // Transition internal state via the dequeue delta
    this.handle({ type: 'user:message-queue:dequeue' });

    // Invoke the callback so ThreadPool can trigger inference
    if (this.onDequeue) {
      this.onDequeue(message);
    }

    const elapsedUs = ((performance.now() - startMs) * 1000) | 0;
    log.debug('[thread-worker] tryDequeue: dequeued message', {
      threadID: this.threadID,
      messageId: message.id,
      messageText: message.text.slice(0, 40),
      remainingQueue: queuedMessages.length,
      elapsedUs,
    });

    return true;
  }

  // -------------------------------------------------------------------------
  // Core event handler — matches AMP's handleThreadDelta switch statement
  // -------------------------------------------------------------------------

  /**
   * Dispatch a delta event into the state machine.
   *
   * This is the primary entry point for all state transitions.
   * Matches AMP's ThreadWorker.handleThreadDelta() switch/case structure
   * from 29_thread_worker_statemachine.js.
   *
   * @param delta - The event delta to process
   */
  handle(delta: ThreadWorkerDelta): void {
    const startMs = performance.now();

    switch (delta.type) {
      // -------------------------------------------------------------------
      // assistant:message:start — inference stream begins
      // -------------------------------------------------------------------
      case 'assistant:message:start': {
        this._state = 'active';
        this._inferenceState = 'running';
        this._turnStartTime = Date.now();
        this._turnElapsedMs = null;
        log.debug('[thread-worker] assistant:message:start', {
          threadID: this.threadID,
        });
        this._notify();
        break;
      }

      // -------------------------------------------------------------------
      // assistant:message:delta — streaming text chunk
      // State stays as-is (thinking/running), no notification needed
      // unless external consumers need chunk-level notifications
      // -------------------------------------------------------------------
      case 'assistant:message:delta': {
        // Intentionally no state change — streaming continues.
        // AMP does not change state on deltas either.
        break;
      }

      // -------------------------------------------------------------------
      // assistant:message — full message received
      // Matches AMP: case "assistant:message" in handleThreadDelta
      // On complete+tool_use: wait for tool orchestrator
      // On complete+end_turn: handled by inference:completed
      // -------------------------------------------------------------------
      case 'assistant:message': {
        const msg = delta.message;
        if (msg.state.type === 'complete' && msg.state.stopReason === 'tool_use') {
          // Tools will be started — state transitions to tool-running
          // via subsequent tool:start deltas. No state change here.
          log.debug('[thread-worker] assistant:message complete+tool_use', {
            threadID: this.threadID,
          });
        }
        // "assistant:message-update" is a no-op in AMP — handled below
        break;
      }

      // -------------------------------------------------------------------
      // assistant:message-update — no-op
      // Matches AMP: case "assistant:message-update": break
      // -------------------------------------------------------------------
      case 'assistant:message-update': {
        break;
      }

      // -------------------------------------------------------------------
      // tool:start — new tool execution begins
      // -------------------------------------------------------------------
      case 'tool:start': {
        const controller = new AbortController();
        this.ops.tools.set(delta.toolUse, controller);
        // State transitions to reflect tool-running
        this._state = 'active';
        log.debug('[thread-worker] tool:start', {
          threadID: this.threadID,
          toolUse: delta.toolUse,
          name: delta.name,
          activeTools: this.ops.tools.size,
        });
        this._notify();
        break;
      }

      // -------------------------------------------------------------------
      // tool:data — tool execution data update
      // Matches AMP: case "tool:data" in handleThreadDelta
      // Terminal statuses ('done', 'error', 'cancelled') resolve the tool
      // -------------------------------------------------------------------
      case 'tool:data': {
        const isTerminal = delta.data.status === 'done' ||
                           delta.data.status === 'error' ||
                           delta.data.status === 'cancelled';

        if (isTerminal) {
          this.ops.tools.delete(delta.toolUse);
          log.debug('[thread-worker] tool:data terminal', {
            threadID: this.threadID,
            toolUse: delta.toolUse,
            status: delta.data.status,
            remainingTools: this.ops.tools.size,
          });
        }

        // Update tool call updates map for subscribers
        this.toolCallUpdates.set(delta.toolUse, delta.data);
        this._notify();
        break;
      }

      // -------------------------------------------------------------------
      // tool:stop — tool execution ended
      // Removes from active tools, notifies
      // -------------------------------------------------------------------
      case 'tool:stop': {
        this.ops.tools.delete(delta.toolUse);
        log.debug('[thread-worker] tool:stop', {
          threadID: this.threadID,
          toolUse: delta.toolUse,
          remainingTools: this.ops.tools.size,
        });
        this._notify();
        break;
      }

      // -------------------------------------------------------------------
      // user:message-queue:enqueue — message queued
      // Matches AMP: case "user:message-queue:enqueue"
      // In AMP, this handler auto-dispatches dequeue if not tool-running
      // and idle/cancelled. In flitter-cli, the actual dequeue (shifting
      // the message and starting inference) is handled by ThreadPool via
      // tryDequeue(). This handler only logs and notifies — the ThreadPool
      // wires a worker listener that calls tryDequeue on idle transitions.
      // -------------------------------------------------------------------
      case 'user:message-queue:enqueue': {
        log.debug('[thread-worker] user:message-queue:enqueue', {
          threadID: this.threadID,
          inferenceState: this._inferenceState,
          activeTools: this.ops.tools.size,
          activityState: this.activityState,
        });
        // Notify listeners so ThreadPool's worker listener can check for dequeue
        this._notify();
        break;
      }

      // -------------------------------------------------------------------
      // user:message-queue:dequeue — process queued message
      // Matches AMP: case "user:message-queue:dequeue"
      // Sets turn start time, begins new inference turn
      // -------------------------------------------------------------------
      case 'user:message-queue:dequeue': {
        this._turnStartTime = Date.now();
        this._turnElapsedMs = null;
        this._inferenceState = 'running';
        this._state = 'active';
        log.debug('[thread-worker] user:message-queue:dequeue', {
          threadID: this.threadID,
        });
        this._notify();
        break;
      }

      // -------------------------------------------------------------------
      // user:tool-input — user provided input for a tool
      // Matches AMP: case "user:tool-input"
      // -------------------------------------------------------------------
      case 'user:tool-input': {
        log.debug('[thread-worker] user:tool-input', {
          threadID: this.threadID,
          toolUse: delta.toolUse,
        });
        break;
      }

      // -------------------------------------------------------------------
      // inference:completed — inference run finished
      // Matches AMP: case "inference:completed"
      // Resets retry attempts, computes turn elapsed, transitions state
      // -------------------------------------------------------------------
      case 'inference:completed': {
        this._resetRetryAttempts();

        // Compute turn elapsed time (matches AMP: let i = this._turnStartTime.getValue())
        if (this._turnStartTime !== null) {
          this._turnElapsedMs = Date.now() - this._turnStartTime;
        }
        this._turnStartTime = null;

        // If no tools are running, inference state goes to idle
        if (this.ops.tools.size === 0) {
          this._inferenceState = 'idle';
        }

        log.debug('[thread-worker] inference:completed', {
          threadID: this.threadID,
          model: delta.model,
          turnElapsedMs: this._turnElapsedMs,
          activeTools: this.ops.tools.size,
        });
        this._notify();
        break;
      }

      // -------------------------------------------------------------------
      // cancelled — turn was cancelled
      // Matches AMP: case "cancelled"
      // Resets retry attempts, sets inference to cancelled
      // -------------------------------------------------------------------
      case 'cancelled': {
        this._resetRetryAttempts();
        this._inferenceState = 'cancelled';

        log.debug('[thread-worker] cancelled', {
          threadID: this.threadID,
        });
        this._notify();
        break;
      }

      // -------------------------------------------------------------------
      // thread:truncate — thread was truncated (edit/restore)
      // Matches AMP: case "thread:truncate"
      // Cancels all tool operations
      // -------------------------------------------------------------------
      case 'thread:truncate': {
        this.cancelAllOps();
        log.debug('[thread-worker] thread:truncate', {
          threadID: this.threadID,
          fromIndex: delta.fromIndex,
        });
        this._notify();
        break;
      }

      // -------------------------------------------------------------------
      // info:manual-bash-invocation — manual bash command
      // Matches AMP: case "info:manual-bash-invocation"
      // In AMP, this auto-dequeues any queued messages. In flitter-cli,
      // we notify listeners so the ThreadPool's worker listener can check
      // for queued messages and call tryDequeue if appropriate.
      // -------------------------------------------------------------------
      case 'info:manual-bash-invocation': {
        log.debug('[thread-worker] info:manual-bash-invocation', {
          threadID: this.threadID,
        });
        this._notify();
        break;
      }

      // -------------------------------------------------------------------
      // error — error occurred
      // Sets ephemeral error state
      // -------------------------------------------------------------------
      case 'error': {
        const errMsg = delta.error instanceof Error
          ? delta.error.message
          : String(delta.error);
        this.ephemeralError = errMsg;
        log.warn('[thread-worker] error', {
          threadID: this.threadID,
          error: errMsg,
        });
        this._notify();
        break;
      }

      // -------------------------------------------------------------------
      // compaction_started
      // -------------------------------------------------------------------
      case 'compaction_started': {
        this._compacting = true;
        log.debug('[thread-worker] compaction_started', {
          threadID: this.threadID,
        });
        this._notify();
        break;
      }

      // -------------------------------------------------------------------
      // compaction_complete
      // -------------------------------------------------------------------
      case 'compaction_complete': {
        this._compacting = false;
        log.debug('[thread-worker] compaction_complete', {
          threadID: this.threadID,
        });
        this._notify();
        break;
      }

      // -------------------------------------------------------------------
      // file_change — file was changed during execution
      // Updates fileChanges map
      // -------------------------------------------------------------------
      case 'file_change': {
        this.fileChanges.set(delta.path, {
          path: delta.path,
          status: delta.status,
        });
        log.debug('[thread-worker] file_change', {
          threadID: this.threadID,
          path: delta.path,
          status: delta.status,
        });
        this._notify();
        break;
      }

      // -------------------------------------------------------------------
      // agent-mode — agent mode change (no-op in state machine)
      // -------------------------------------------------------------------
      case 'agent-mode': {
        log.debug('[thread-worker] agent-mode', {
          threadID: this.threadID,
          mode: delta.mode,
        });
        break;
      }

      default: {
        // Exhaustiveness check — all delta types should be handled
        const _exhaustive: never = delta;
        log.warn('[thread-worker] unhandled delta type', {
          threadID: this.threadID,
          type: (_exhaustive as ThreadWorkerDelta).type,
        });
      }
    }

    const elapsedUs = ((performance.now() - startMs) * 1000) | 0;
    if (elapsedUs > 1000) {
      log.debug('[thread-worker] handle() slow delta', {
        threadID: this.threadID,
        type: delta.type,
        elapsedUs,
      });
    }
  }

  // -------------------------------------------------------------------------
  // Cancellation methods
  // -------------------------------------------------------------------------

  /**
   * Cancel the current inference operation.
   * Aborts the inference AbortController and sets state to cancelled.
   * Matches AMP's cancel-inference pattern.
   */
  cancelInference(): void {
    if (this.ops.inference) {
      this.ops.inference.abort();
      this.ops.inference = null;
    }
    this._inferenceState = 'cancelled';
    log.info('[thread-worker] cancelInference', { threadID: this.threadID });
    this._notify();
  }

  /**
   * Cancel a specific tool operation by its tool use ID.
   * Aborts the tool's AbortController and removes it from active tools.
   *
   * @param toolCallId - The tool use ID to cancel
   */
  cancelTool(toolCallId: string): void {
    const controller = this.ops.tools.get(toolCallId);
    if (controller) {
      controller.abort();
      this.ops.tools.delete(toolCallId);
      log.info('[thread-worker] cancelTool', {
        threadID: this.threadID,
        toolCallId,
        remainingTools: this.ops.tools.size,
      });
      this._notify();
    }
  }

  /**
   * Cancel all active operations: inference, all tools, and title generation.
   * Matches AMP's toolOrchestrator.cancelAll() + ops cleanup pattern.
   */
  cancelAllOps(): void {
    // Cancel inference
    if (this.ops.inference) {
      this.ops.inference.abort();
      this.ops.inference = null;
    }

    // Cancel all tools
    for (const [id, controller] of this.ops.tools) {
      controller.abort();
      log.debug('[thread-worker] cancelAllOps: tool cancelled', {
        threadID: this.threadID,
        toolCallId: id,
      });
    }
    this.ops.tools.clear();

    // Cancel title generation
    if (this.ops.titleGeneration) {
      this.ops.titleGeneration.abort();
      this.ops.titleGeneration = null;
    }

    this._inferenceState = 'cancelled';
    log.info('[thread-worker] cancelAllOps', { threadID: this.threadID });
    this._notify();
  }

  // -------------------------------------------------------------------------
  // Retry countdown
  // Matches AMP: retryCountdownSeconds, retryTimer, retrySession
  // -------------------------------------------------------------------------

  /**
   * Start a countdown timer that decrements retryCountdownSeconds every second.
   * Used for error retry delays. When the countdown reaches 0, it is cleared.
   *
   * Matches AMP's retry countdown pattern with retrySession invalidation.
   *
   * @param seconds - Number of seconds to count down from
   */
  startRetryCountdown(seconds: number): void {
    this.clearRetryCountdown();
    this._retrySession++;
    const session = this._retrySession;

    this.retryCountdownSeconds = seconds;
    this._notify();

    this._retryTimer = setInterval(() => {
      // Guard: if session changed, timer is stale
      if (this._retrySession !== session) {
        this._clearRetryTimer();
        return;
      }

      if (this.retryCountdownSeconds !== null && this.retryCountdownSeconds > 0) {
        this.retryCountdownSeconds--;
        this._notify();
      }

      if (this.retryCountdownSeconds !== null && this.retryCountdownSeconds <= 0) {
        // Clear the countdown state and timer first
        this.clearRetryCountdown();
        // Invoke the retry callback to trigger automatic retry.
        // Matches AMP's retryTimer expiry -> re-submit inference pattern.
        if (this.onRetry) {
          log.info('[thread-worker] retry countdown expired, invoking onRetry', {
            threadID: this.threadID,
            session,
          });
          this.onRetry();
        }
      }
    }, 1000);

    log.debug('[thread-worker] startRetryCountdown', {
      threadID: this.threadID,
      seconds,
      session,
    });
  }

  /**
   * Clear the retry countdown timer and reset countdown state.
   * Matches AMP's clearRetryCountdown pattern.
   */
  clearRetryCountdown(): void {
    this._clearRetryTimer();
    if (this.retryCountdownSeconds !== null) {
      this.retryCountdownSeconds = null;
      this._notify();
    }
  }

  /**
   * Dismiss the current ephemeral error.
   * Matches AMP's dismissEphemeralError() pattern.
   */
  dismissEphemeralError(): void {
    if (this.ephemeralError !== null) {
      this.ephemeralError = null;
      this._notify();
    }
  }

  // -------------------------------------------------------------------------
  // Lifecycle
  // -------------------------------------------------------------------------

  /**
   * Activate this worker. Transitions from 'initial' to 'active'.
   * Matches AMP: this._state.next("active").
   */
  activate(): void {
    if (this._state === 'initial') {
      this._state = 'active';
      log.debug('[thread-worker] activate', { threadID: this.threadID });
      this._notify();
    }
  }

  /**
   * Dispose this worker. Cancels all operations and marks as disposed.
   * After disposal, handle() calls are no-ops.
   * Matches AMP: dispose pattern on ThreadWorker.
   */
  dispose(): void {
    if (this._state === 'disposed') return;

    this.cancelAllOps();
    this.clearRetryCountdown();
    this._state = 'disposed';
    this._listeners.clear();

    log.debug('[thread-worker] dispose', { threadID: this.threadID });
  }

  // -------------------------------------------------------------------------
  // Listener management — Set<() => void> pattern
  // -------------------------------------------------------------------------

  /**
   * Register a listener that is called on any state change.
   * Matches AMP's BehaviorSubject.subscribe() pattern.
   *
   * @param fn - Callback invoked when state changes
   */
  addListener(fn: () => void): void {
    this._listeners.add(fn);
  }

  /**
   * Unregister a previously registered listener.
   *
   * @param fn - The callback to remove
   */
  removeListener(fn: () => void): void {
    this._listeners.delete(fn);
  }

  // -------------------------------------------------------------------------
  // Private helpers
  // -------------------------------------------------------------------------

  /** Notify all registered listeners of a state change. */
  private _notify(): void {
    for (const fn of this._listeners) {
      try {
        fn();
      } catch (err) {
        log.error('[thread-worker] listener threw', {
          threadID: this.threadID,
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }
  }

  /**
   * Reset retry attempts counter.
   * Matches AMP: this.resetRetryAttempts() called in 'cancelled' and 'inference:completed'.
   */
  private _resetRetryAttempts(): void {
    this._ephemeralErrorRetryAttempt = 0;
  }

  /** Clear the retry countdown interval timer. */
  private _clearRetryTimer(): void {
    if (this._retryTimer !== null) {
      clearInterval(this._retryTimer);
      this._retryTimer = null;
    }
  }
}
