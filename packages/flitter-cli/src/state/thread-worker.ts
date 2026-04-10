// thread-worker.ts -- Event-driven per-thread state machine.
//
// Replaces the thin ThreadWorkerEntry record with a full class that handles
// delta events, manages AbortControllers per operation, tracks ephemeral
// errors with retry countdown, and exposes convenience getters for the
// ThreadPool to query.
//
// Delta event types mirror AMP's ThreadWorker.handleDelta() from
// 29_thread_worker_statemachine.js.

import type { ThreadID } from './types';

// ---------------------------------------------------------------------------
// Public Types
// ---------------------------------------------------------------------------

/**
 * Top-level worker lifecycle state.
 * - idle:         ready for new work
 * - running:      inference in progress (streaming / thinking)
 * - tool_running: a tool call is executing
 * - cancelled:    user interrupted the current turn
 * - error:        ephemeral error with retry countdown
 */
export type WorkerState = 'idle' | 'running' | 'tool_running' | 'cancelled' | 'error';

/**
 * Fine-grained inference phase within a running turn.
 * - none:      not inferring
 * - streaming: tokens arriving from the model
 * - thinking:  deep-reasoning phase (extended thinking)
 * - tool_call: model emitted a tool_use block; tool is being dispatched
 */
export type InferenceState = 'none' | 'streaming' | 'thinking' | 'tool_call';

/**
 * All delta event types the worker can process.
 * Matches AMP's ThreadWorker.handleDelta() switch cases.
 */
export type WorkerDeltaType =
  | 'user:message-queue:enqueue'
  | 'user:message-queue:dequeue'
  | 'assistant:message'
  | 'tool:data'
  | 'error'
  | 'inference:completed'
  | 'cancelled'
  | 'thread:truncate'
  | 'title:generation';

/**
 * A typed delta event dispatched to ThreadWorker.handle().
 */
export interface WorkerDelta {
  type: WorkerDeltaType;
  payload?: unknown;
}

// ---------------------------------------------------------------------------
// Per-operation abort controllers
// ---------------------------------------------------------------------------

/** Abort controllers for concurrent operations within a single worker. */
interface WorkerOps {
  /** Controller for the current inference stream. */
  inference: AbortController | null;
  /** Controllers for in-flight tool executions, keyed by toolCallId. */
  tools: Record<string, AbortController>;
  /** Controller for background title generation. */
  titleGeneration: AbortController | null;
}

// ---------------------------------------------------------------------------
// ThreadWorker Class
// ---------------------------------------------------------------------------

/**
 * Event-driven per-thread state machine.
 *
 * Each ThreadWorker instance manages the lifecycle of a single thread's
 * execution: inference streaming, tool calls, error/retry, and cancellation.
 * The ThreadPool owns a Map<string, ThreadWorker> and delegates state
 * transitions via the `handle(delta)` method.
 */
export class ThreadWorker {
  /** The thread this worker belongs to. */
  readonly threadID: ThreadID;

  /** Top-level worker state. */
  state: WorkerState = 'idle';

  /** Fine-grained inference phase. */
  inferenceState: InferenceState = 'none';

  /** Per-operation abort controllers. */
  ops: WorkerOps = { inference: null, tools: {}, titleGeneration: null };

  /** Current ephemeral error message, cleared on retry or next turn. */
  ephemeralError: string | null = null;

  /** Seconds remaining before auto-retry after an ephemeral error. */
  retryCountdownSeconds: number = 0;

  /** Handle for the retry countdown interval so we can clear it. */
  retryTimer: ReturnType<typeof setInterval> | null = null;

  /** Accumulated file change paths during the current turn. */
  fileChanges: string[] = [];

  /** Tool call update payloads received during the current turn. */
  toolCallUpdates: unknown[] = [];

  /** Files being tracked for the current turn (snapshot OIDs etc.). */
  trackedFiles: string[] = [];

  /** Epoch ms when the current turn started, or null if idle. */
  turnStartTime: number | null = null;

  constructor(threadID: ThreadID) {
    this.threadID = threadID;
  }

  // -----------------------------------------------------------------------
  // Delta Dispatch
  // -----------------------------------------------------------------------

  /**
   * Process a delta event, transitioning the worker's state machine.
   *
   * This is the single entry-point for all state mutations. Callers
   * (ThreadPool, PromptController) construct a WorkerDelta and dispatch it
   * here rather than mutating fields directly.
   */
  handle(delta: WorkerDelta): void {
    switch (delta.type) {
      // -- Queue management ------------------------------------------------
      case 'user:message-queue:enqueue': {
        // If idle or cancelled, the caller should dequeue immediately.
        // If running / tool_running, the message stays queued.
        // We intentionally do NOT auto-dequeue here; the caller decides.
        break;
      }

      case 'user:message-queue:dequeue': {
        this.state = 'running';
        this.inferenceState = 'streaming';
        this.turnStartTime = Date.now();
        this.ops.inference = new AbortController();
        break;
      }

      // -- Inference events ------------------------------------------------
      case 'assistant:message': {
        // Model is streaming tokens — ensure we reflect that.
        this.inferenceState = 'streaming';
        break;
      }

      case 'tool:data': {
        this.state = 'tool_running';
        this.inferenceState = 'tool_call';
        if (delta.payload !== undefined) {
          this.toolCallUpdates.push(delta.payload);
        }
        break;
      }

      case 'inference:completed': {
        this.state = 'idle';
        this.inferenceState = 'none';
        if (this.ops.inference) {
          this.ops.inference = null;
        }
        this.turnStartTime = null;
        break;
      }

      case 'cancelled': {
        this.state = 'cancelled';
        this.inferenceState = 'none';
        if (this.ops.inference) {
          this.ops.inference.abort();
          this.ops.inference = null;
        }
        this.turnStartTime = null;
        break;
      }

      // -- Error / retry ---------------------------------------------------
      case 'error': {
        this.state = 'error';
        this.ephemeralError = (delta.payload as string) ?? 'Unknown error';
        this.retryCountdownSeconds = 5;

        // Clear any pre-existing retry timer
        if (this.retryTimer) {
          clearInterval(this.retryTimer);
        }

        this.retryTimer = setInterval(() => {
          this.retryCountdownSeconds -= 1;
          if (this.retryCountdownSeconds <= 0) {
            if (this.retryTimer) {
              clearInterval(this.retryTimer);
              this.retryTimer = null;
            }
            this.ephemeralError = null;
            this.state = 'idle';
          }
        }, 1_000);
        break;
      }

      // -- Thread-level events ---------------------------------------------
      case 'thread:truncate': {
        this.fileChanges = [];
        this.toolCallUpdates = [];
        break;
      }

      case 'title:generation': {
        if (!this.ops.titleGeneration) {
          // Starting title generation
          this.ops.titleGeneration = new AbortController();
        } else {
          // Completing title generation
          this.ops.titleGeneration = null;
        }
        break;
      }
    }
  }

  // -----------------------------------------------------------------------
  // Abort helpers
  // -----------------------------------------------------------------------

  /** Abort the current inference stream and transition to cancelled. */
  abortInference(): void {
    if (this.ops.inference) {
      this.ops.inference.abort();
      this.ops.inference = null;
    }
    this.state = 'cancelled';
  }

  /** Abort background title generation. */
  abortTitleGeneration(): void {
    if (this.ops.titleGeneration) {
      this.ops.titleGeneration.abort();
      this.ops.titleGeneration = null;
    }
  }

  // -----------------------------------------------------------------------
  // Lifecycle
  // -----------------------------------------------------------------------

  /** Dispose of all operations and timers, resetting state to idle. */
  dispose(): void {
    // Abort all in-flight operations
    if (this.ops.inference) {
      this.ops.inference.abort();
      this.ops.inference = null;
    }
    for (const [, ctrl] of Object.entries(this.ops.tools)) {
      ctrl.abort();
    }
    this.ops.tools = {};
    if (this.ops.titleGeneration) {
      this.ops.titleGeneration.abort();
      this.ops.titleGeneration = null;
    }

    // Clear retry timer
    if (this.retryTimer) {
      clearInterval(this.retryTimer);
      this.retryTimer = null;
    }

    this.ephemeralError = null;
    this.retryCountdownSeconds = 0;
    this.state = 'idle';
    this.inferenceState = 'none';
    this.turnStartTime = null;
  }

  // -----------------------------------------------------------------------
  // Convenience getters
  // -----------------------------------------------------------------------

  /** True when the worker is ready to accept new work. */
  get isIdle(): boolean {
    return this.state === 'idle';
  }

  /** True when the worker is actively processing (inference or tool). */
  get isRunning(): boolean {
    return this.state === 'running' || this.state === 'tool_running';
  }

  /**
   * Legacy compatibility getter mapping WorkerState to the old
   * ThreadWorkerState ('initial' | 'active' | 'disposed').
   *
   * idle / cancelled / error  -> 'initial'
   * running / tool_running    -> 'active'
   *
   * Note: 'disposed' is never returned because dispose() resets to 'idle'.
   * Callers needing to check disposed status should track that externally.
   */
  get workerState(): 'initial' | 'active' | 'disposed' {
    if (this.state === 'running' || this.state === 'tool_running') {
      return 'active';
    }
    return 'initial';
  }
}
