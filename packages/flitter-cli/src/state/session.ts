// Pure session state machine with observer pattern for flitter-cli.
//
// Embeds a conversation items array (immutable snapshots with version counter),
// a deterministic lifecycle state machine, session metadata, and listener
// management. Ported from flitter-amp's ConversationState + AppState patterns,
// decoupled from ACP/coco.

import type {
  SessionLifecycle,
  SessionMetadata,
  SessionError,
  ConversationItem,
  AssistantMessage,
  ThinkingItem,
  ToolCallItem,
  PlanEntry,
  UsageInfo,
} from './types';

import { log } from '../utils/logger';

// --- Helpers ---

/** Replace item at index, returning a new array with structural sharing. */
function replaceAt<T>(
  arr: ReadonlyArray<T>,
  index: number,
  newItem: T,
): ReadonlyArray<T> {
  const copy = arr.slice();
  copy[index] = newItem;
  return copy;
}

/** Append item, returning a new array. */
function append<T>(arr: ReadonlyArray<T>, item: T): ReadonlyArray<T> {
  return [...arr, item];
}

/** State listener callback type — called on every state transition. */
export type StateListener = () => void;

/** Options for constructing a new SessionState. */
export interface SessionStateOptions {
  sessionId: string;
  cwd: string;
  model: string;
  title?: string | null;
  gitBranch?: string | null;
}

/**
 * SessionState is a pure state machine managing session lifecycle,
 * conversation items, streaming buffers, and observer notifications.
 *
 * All state transitions are guarded: invalid transitions are no-ops
 * that log a warning. Every valid transition notifies listeners.
 *
 * The conversation items array uses immutable snapshot semantics
 * with a monotonic version counter for cheap dirty-checks.
 */
export class SessionState {
  // --- Lifecycle ---
  private _lifecycle: SessionLifecycle = 'idle';
  private _error: SessionError | null = null;
  private _lastStopReason: string | null = null;

  // --- Metadata ---
  private _metadata: SessionMetadata;

  // --- Conversation items (immutable array + version counter) ---
  private _items: ReadonlyArray<ConversationItem> = [];
  private _version: number = 0;

  // --- Plan and usage ---
  private _plan: ReadonlyArray<PlanEntry> = [];
  private _usage: UsageInfo | null = null;

  // --- Streaming accumulators (not part of the snapshot) ---
  private _streamingTextBuffer: string = '';
  private _streamingThinkingBuffer: string = '';
  private _streamingMsgIndex: number = -1;
  private _streamingThinkingIndex: number = -1;

  // --- O(1) tool call lookup ---
  private _toolCallIndex: Map<string, number> = new Map();

  // --- Listeners ---
  private _listeners: Set<StateListener> = new Set();

  constructor(options: SessionStateOptions) {
    this._metadata = {
      sessionId: options.sessionId,
      startTime: Date.now(),
      cwd: options.cwd,
      model: options.model,
      tokenUsage: { input: 0, output: 0 },
      turnCount: 0,
      title: options.title ?? null,
      gitBranch: options.gitBranch ?? null,
    };
  }

  // ---------------------------------------------------------------------------
  // Public Accessors
  // ---------------------------------------------------------------------------

  /** Current lifecycle state. */
  get lifecycle(): SessionLifecycle {
    return this._lifecycle;
  }

  /** Current error (non-null only when lifecycle is 'error'). */
  get error(): SessionError | null {
    return this._error;
  }

  /** Stop reason from the last completeStream call. */
  get lastStopReason(): string | null {
    return this._lastStopReason;
  }

  /** Session metadata (session identity, turn count, timing). */
  get metadata(): SessionMetadata {
    return this._metadata;
  }

  /** Conversation items array. Auto-flushes streaming buffers. */
  get items(): ReadonlyArray<ConversationItem> {
    this.flushStreamingText();
    return this._items;
  }

  /** Current plan entries. */
  get plan(): ReadonlyArray<PlanEntry> {
    return this._plan;
  }

  /** Current usage info. */
  get usage(): UsageInfo | null {
    return this._usage;
  }

  /** Monotonic version counter for change detection. */
  get version(): number {
    return this._version;
  }

  // ---------------------------------------------------------------------------
  // Listener Management
  // ---------------------------------------------------------------------------

  /** Register a listener to be notified on state changes. */
  addListener(fn: StateListener): void {
    this._listeners.add(fn);
  }

  /** Unregister a previously registered listener. */
  removeListener(fn: StateListener): void {
    this._listeners.delete(fn);
  }

  /** Notify all registered listeners. Called after every valid state transition. */
  private notifyListeners(): void {
    for (const fn of this._listeners) {
      fn();
    }
  }

  /** Bump the version counter. Called on every snapshot mutation. */
  private bumpVersion(): void {
    this._version++;
  }

  // ---------------------------------------------------------------------------
  // Lifecycle Transitions
  // ---------------------------------------------------------------------------

  /**
   * Begin processing a user prompt.
   * Transition: idle -> processing.
   * Adds the user message, increments turnCount, and notifies listeners.
   */
  startProcessing(userText: string): void {
    if (this._lifecycle !== 'idle') {
      log.warn(`SessionState: invalid transition startProcessing from '${this._lifecycle}'`);
      return;
    }
    this._lifecycle = 'processing';
    this._lastStopReason = null;
    this._error = null;

    // Add user message
    const userMsg: ConversationItem = {
      type: 'user_message',
      text: userText,
      timestamp: Date.now(),
    };
    this._items = append(this._items, userMsg);

    // Update metadata
    this._metadata = {
      ...this._metadata,
      turnCount: this._metadata.turnCount + 1,
    };

    this.bumpVersion();
    this.notifyListeners();
  }

  /**
   * The backend has started streaming a response.
   * Transition: processing -> streaming.
   */
  beginStreaming(): void {
    if (this._lifecycle !== 'processing') {
      log.warn(`SessionState: invalid transition beginStreaming from '${this._lifecycle}'`);
      return;
    }
    this._lifecycle = 'streaming';
    this.bumpVersion();
    this.notifyListeners();
  }

  /**
   * The stream has completed normally.
   * Transition: streaming -> complete.
   * Finalizes any in-flight messages and records the stop reason.
   */
  completeStream(stopReason: string): void {
    if (this._lifecycle !== 'streaming') {
      log.warn(`SessionState: invalid transition completeStream from '${this._lifecycle}'`);
      return;
    }
    this.finalizeAssistantMessage();
    this.finalizeThinking();

    this._lifecycle = 'complete';
    this._lastStopReason = stopReason;

    this.bumpVersion();
    this.notifyListeners();
  }

  /**
   * Cancel the current request.
   * Transition: processing|streaming -> cancelled.
   * Finalizes any in-flight messages.
   */
  cancelStream(): void {
    if (this._lifecycle !== 'processing' && this._lifecycle !== 'streaming') {
      log.warn(`SessionState: invalid transition cancelStream from '${this._lifecycle}'`);
      return;
    }
    this.finalizeAssistantMessage();
    this.finalizeThinking();

    this._lifecycle = 'cancelled';
    this.bumpVersion();
    this.notifyListeners();
  }

  /**
   * Handle a fatal error during processing/streaming.
   * Transition: processing|streaming -> error.
   * Preserves the error info for UI display and recovery.
   */
  handleError(error: SessionError): void {
    if (this._lifecycle !== 'processing' && this._lifecycle !== 'streaming') {
      log.warn(`SessionState: invalid transition handleError from '${this._lifecycle}'`);
      return;
    }
    this.finalizeAssistantMessage();
    this.finalizeThinking();

    this._lifecycle = 'error';
    this._error = error;

    this.bumpVersion();
    this.notifyListeners();
  }

  /**
   * Reset from a terminal state back to idle.
   * Transition: complete|error|cancelled -> idle.
   * Clears error state but preserves conversation history.
   */
  reset(): void {
    if (
      this._lifecycle !== 'complete' &&
      this._lifecycle !== 'error' &&
      this._lifecycle !== 'cancelled'
    ) {
      log.warn(`SessionState: invalid transition reset from '${this._lifecycle}'`);
      return;
    }
    this._lifecycle = 'idle';
    this._error = null;

    this.bumpVersion();
    this.notifyListeners();
  }

  /**
   * Start a new thread: clear conversation items, plan, and usage,
   * but preserve session identity and metadata. Resets to idle.
   */
  newThread(): void {
    this._items = [];
    this._plan = [];
    this._usage = null;
    this._streamingMsgIndex = -1;
    this._streamingThinkingIndex = -1;
    this._streamingTextBuffer = '';
    this._streamingThinkingBuffer = '';
    this._toolCallIndex.clear();
    this._lifecycle = 'idle';
    this._error = null;
    this._lastStopReason = null;

    this.bumpVersion();
    this.notifyListeners();
  }

  // ---------------------------------------------------------------------------
  // Streaming Text Buffer
  // ---------------------------------------------------------------------------

  /** Append a chunk of assistant text to the streaming buffer. */
  appendAssistantChunk(text: string): void {
    if (this._streamingMsgIndex === -1) {
      const msg: AssistantMessage = {
        type: 'assistant_message',
        text: '',
        timestamp: Date.now(),
        isStreaming: true,
      };
      this._items = append(this._items, msg);
      this._streamingMsgIndex = this._items.length - 1;
      this._streamingTextBuffer = '';
      this.bumpVersion();
    }
    this._streamingTextBuffer += text;
  }

  /** Append a chunk of thinking text to the streaming buffer. */
  appendThinkingChunk(text: string): void {
    if (this._streamingThinkingIndex === -1) {
      const item: ThinkingItem = {
        type: 'thinking',
        text: '',
        timestamp: Date.now(),
        isStreaming: true,
        collapsed: true,
      };
      this._items = append(this._items, item);
      this._streamingThinkingIndex = this._items.length - 1;
      this._streamingThinkingBuffer = '';
      this.bumpVersion();
    }
    this._streamingThinkingBuffer += text;
  }

  /**
   * Flush accumulated streaming text into the items array.
   * Called by the throttled render cycle or by finalize methods.
   * Returns true if the snapshot was updated.
   */
  flushStreamingText(): boolean {
    let changed = false;

    if (this._streamingMsgIndex >= 0 && this._streamingTextBuffer.length > 0) {
      const prev = this._items[this._streamingMsgIndex] as AssistantMessage;
      const updated: AssistantMessage = {
        ...prev,
        text: prev.text + this._streamingTextBuffer,
      };
      this._streamingTextBuffer = '';
      this._items = replaceAt(this._items, this._streamingMsgIndex, updated);
      this.bumpVersion();
      changed = true;
    }

    if (this._streamingThinkingIndex >= 0 && this._streamingThinkingBuffer.length > 0) {
      const prev = this._items[this._streamingThinkingIndex] as ThinkingItem;
      const updated: ThinkingItem = {
        ...prev,
        text: prev.text + this._streamingThinkingBuffer,
      };
      this._streamingThinkingBuffer = '';
      this._items = replaceAt(this._items, this._streamingThinkingIndex, updated);
      this.bumpVersion();
      changed = true;
    }

    return changed;
  }

  /** Finalize the current streaming assistant message (mark isStreaming=false). */
  finalizeAssistantMessage(): void {
    this.flushStreamingText();
    if (this._streamingMsgIndex >= 0) {
      const prev = this._items[this._streamingMsgIndex] as AssistantMessage;
      const updated: AssistantMessage = {
        ...prev,
        isStreaming: false,
      };
      this._items = replaceAt(this._items, this._streamingMsgIndex, updated);
      this._streamingMsgIndex = -1;
      this._streamingTextBuffer = '';
      this.bumpVersion();
    }
  }

  /** Finalize the current streaming thinking block (mark isStreaming=false). */
  finalizeThinking(): void {
    this.flushStreamingText();
    if (this._streamingThinkingIndex >= 0) {
      const prev = this._items[this._streamingThinkingIndex] as ThinkingItem;
      const updated: ThinkingItem = {
        ...prev,
        isStreaming: false,
      };
      this._items = replaceAt(this._items, this._streamingThinkingIndex, updated);
      this._streamingThinkingIndex = -1;
      this._streamingThinkingBuffer = '';
      this.bumpVersion();
    }
  }

  // ---------------------------------------------------------------------------
  // Tool Call Management (O(1) lookup via Map)
  // ---------------------------------------------------------------------------

  /**
   * Add a new tool call to the conversation.
   * Finalizes any in-flight assistant message first.
   */
  addToolCall(
    toolCallId: string,
    title: string,
    kind: string,
    status: ToolCallItem['status'],
    locations?: Array<{ path: string }>,
    rawInput?: Record<string, unknown>,
  ): void {
    this.finalizeAssistantMessage();
    const item: ToolCallItem = {
      type: 'tool_call',
      toolCallId,
      title,
      kind,
      status,
      locations,
      rawInput,
      collapsed: false,
    };
    this._items = append(this._items, item);
    this._toolCallIndex.set(toolCallId, this._items.length - 1);
    this.bumpVersion();
    this.notifyListeners();
  }

  /**
   * Update the status and result of an existing tool call.
   * No-op if the toolCallId is not found.
   */
  updateToolCall(
    toolCallId: string,
    status: 'completed' | 'failed',
    content?: Array<{ type: string; content?: { type: string; text: string } }>,
    rawOutput?: Record<string, unknown>,
  ): void {
    const index = this._toolCallIndex.get(toolCallId);
    if (index === undefined) return;

    const prev = this._items[index] as ToolCallItem;
    if (!prev || prev.type !== 'tool_call') return;

    const updated: ToolCallItem = {
      ...prev,
      status,
      result: { status, content, rawOutput },
      isStreaming: false,
    };
    this._items = replaceAt(this._items, index, updated);
    this.bumpVersion();
    this.notifyListeners();
  }

  /**
   * Append streaming output to an in-progress tool call.
   * No-op if the toolCallId is not found or the tool call is already terminal.
   */
  appendToolOutput(
    toolCallId: string,
    chunk: string,
    maxBuffer: number = 50_000,
  ): void {
    const index = this._toolCallIndex.get(toolCallId);
    if (index === undefined) return;

    const prev = this._items[index] as ToolCallItem;
    if (!prev || prev.type !== 'tool_call') return;
    if (prev.status === 'completed' || prev.status === 'failed') return;

    let newStreamingOutput = (prev.streamingOutput ?? '') + chunk;

    // Buffer limit enforcement
    if (newStreamingOutput.length > maxBuffer) {
      const trimPoint = newStreamingOutput.length - maxBuffer;
      const newlineAfterTrim = newStreamingOutput.indexOf('\n', trimPoint);
      const cutAt = newlineAfterTrim !== -1 ? newlineAfterTrim + 1 : trimPoint;
      newStreamingOutput = '...(truncated)\n' + newStreamingOutput.slice(cutAt);
    }

    const updated: ToolCallItem = {
      ...prev,
      streamingOutput: newStreamingOutput,
      isStreaming: true,
    };
    this._items = replaceAt(this._items, index, updated);
    this.bumpVersion();
    this.notifyListeners();
  }

  // ---------------------------------------------------------------------------
  // Plan and Usage
  // ---------------------------------------------------------------------------

  /** Set or replace the plan entries. */
  setPlan(entries: PlanEntry[]): void {
    this._plan = [...entries];

    // Also update/insert a PlanItem in the conversation items
    const existingIndex = this._items.findIndex(i => i.type === 'plan');
    const planItem: ConversationItem = {
      type: 'plan',
      entries: [...entries],
    };

    if (existingIndex >= 0) {
      this._items = replaceAt(this._items, existingIndex, planItem);
    } else {
      this._items = append(this._items, planItem);
    }

    this.bumpVersion();
    this.notifyListeners();
  }

  /** Set the current usage information. */
  setUsage(usage: UsageInfo): void {
    this._usage = { ...usage };
    this.bumpVersion();
    this.notifyListeners();
  }
}
