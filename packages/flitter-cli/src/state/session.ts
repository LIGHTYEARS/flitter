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
  SystemMessage,
  ConversationSnapshot,
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
  /** Whether tool calls are expanded by default (N10). Defaults to true. */
  defaultToolExpanded?: boolean;
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

  // --- Parent-child task hierarchy (I1) ---
  private _openTaskStack: string[] = [];

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

    // Wire defaultToolExpanded from config (N10). Defaults to true for backwards compatibility.
    this._toolCallsExpanded = options.defaultToolExpanded ?? true;
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

  /**
   * Return a frozen snapshot of the current conversation state.
   * The snapshot and its items array are shallow-frozen to prevent
   * accidental mutation by consumers (N1).
   */
  get snapshot(): ConversationSnapshot {
    this.flushStreamingText();
    const frozenItems = Object.freeze([...this._items]);
    return Object.freeze({
      items: frozenItems,
      version: this._version,
      lifecycle: this._lifecycle,
    });
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
    this._listeners.forEach(fn => fn());
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
   * Transition to tool_execution state (agentic loop).
   * Transition: streaming -> tool_execution.
   * The model requested tool calls; the agentic loop will execute them
   * and re-submit with tool results.
   */
  beginToolExecution(stopReason: string): void {
    if (this._lifecycle !== 'streaming') {
      log.warn(`SessionState: invalid transition beginToolExecution from '${this._lifecycle}'`);
      return;
    }
    this.finalizeAssistantMessage();
    this.finalizeThinking();

    this._lifecycle = 'tool_execution';
    this._lastStopReason = stopReason;

    this.bumpVersion();
    this.notifyListeners();
  }

  /**
   * Re-enter processing state after tool execution completes.
   * Transition: tool_execution -> processing.
   * Adds a synthetic user message carrying tool results for the next API call.
   */
  resumeAfterToolExecution(toolResults: import('./types').ToolResultBlock[]): void {
    if (this._lifecycle !== 'tool_execution') {
      log.warn(`SessionState: invalid transition resumeAfterToolExecution from '${this._lifecycle}'`);
      return;
    }

    // Add a user message carrying tool results (for conversation history)
    const userMsg: ConversationItem = {
      type: 'user_message',
      text: '',
      timestamp: Date.now(),
      toolResults,
    };
    this._items = append(this._items, userMsg);

    this._lifecycle = 'processing';
    this._metadata = {
      ...this._metadata,
      turnCount: this._metadata.turnCount + 1,
    };

    this.bumpVersion();
    this.notifyListeners();
  }

  /**
   * Cancel the current request.
   * Transition: processing|streaming|tool_execution -> cancelled.
   * Finalizes any in-flight messages.
   */
  cancelStream(): void {
    if (
      this._lifecycle !== 'processing' &&
      this._lifecycle !== 'streaming' &&
      this._lifecycle !== 'tool_execution'
    ) {
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
   * Handle a fatal error during processing/streaming/tool_execution.
   * Transition: processing|streaming|tool_execution -> error.
   * Preserves the error info for UI display and recovery.
   */
  handleError(error: SessionError): void {
    if (
      this._lifecycle !== 'processing' &&
      this._lifecycle !== 'streaming' &&
      this._lifecycle !== 'tool_execution'
    ) {
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
    this._openTaskStack = [];
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

    // Determine parent from task stack (I1)
    const parentToolCallId = this._openTaskStack.length > 0
      ? this._openTaskStack[this._openTaskStack.length - 1]
      : undefined;

    const item: ToolCallItem = {
      type: 'tool_call',
      toolCallId,
      title,
      kind,
      status,
      locations,
      rawInput,
      collapsed: !this._toolCallsExpanded,
      parentToolCallId,
    };
    this._items = append(this._items, item);
    this._toolCallIndex.set(toolCallId, this._items.length - 1);

    // If this is a Task tool, push onto stack (I1)
    if (title === 'Task' || kind === 'task') {
      this._openTaskStack.push(toolCallId);
    }

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

    // Pop from task stack if this was a task (I1)
    if (status === 'completed' || status === 'failed') {
      const stackIdx = this._openTaskStack.indexOf(toolCallId);
      if (stackIdx !== -1) {
        this._openTaskStack.splice(stackIdx, 1);
      }
    }

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

    // Detect first chunk for auto-expand (I4)
    const isFirstChunk = !prev.streamingOutput;

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
      collapsed: isFirstChunk ? false : prev.collapsed,  // Auto-expand on first chunk (I4)
      result: { status: 'streaming', rawOutput: { stdout: newStreamingOutput } },  // Streaming result (I4)
    };
    this._items = replaceAt(this._items, index, updated);
    this.bumpVersion();
    this.notifyListeners();
  }

  /**
   * Get all child tool calls of a given parent tool call (I1).
   */
  getChildToolCalls(parentToolCallId: string): ToolCallItem[] {
    return this._items.filter(
      (item): item is ToolCallItem =>
        item.type === 'tool_call' && item.parentToolCallId === parentToolCallId,
    );
  }

  // ---------------------------------------------------------------------------
  // Tool Call Expand/Collapse (I2)
  // ---------------------------------------------------------------------------

  /** Whether tool calls are globally expanded. */
  private _toolCallsExpanded: boolean;

  get toolCallsExpanded(): boolean {
    return this._toolCallsExpanded;
  }

  /** Toggle all tool calls between expanded and collapsed. */
  toggleToolCalls(): void {
    this._toolCallsExpanded = !this._toolCallsExpanded;
    const newCollapsed = !this._toolCallsExpanded;

    const newItems = this._items.map(item => {
      if (item.type === 'tool_call') {
        return { ...item, collapsed: newCollapsed };
      }
      return item;
    });
    this._items = newItems;

    this.bumpVersion();
    this.notifyListeners();
  }

  /** Toggle a single tool call's collapsed state. */
  toggleSingleToolCall(toolCallId: string): void {
    const index = this._toolCallIndex.get(toolCallId);
    if (index === undefined) return;

    const prev = this._items[index] as ToolCallItem;
    if (!prev || prev.type !== 'tool_call') return;

    const updated: ToolCallItem = { ...prev, collapsed: !prev.collapsed };
    this._items = replaceAt(this._items, index, updated);

    this.bumpVersion();
    this.notifyListeners();
  }

  // ---------------------------------------------------------------------------
  // Thinking Block Toggle (I3)
  // ---------------------------------------------------------------------------

  /** Toggle all thinking blocks between expanded and collapsed. */
  toggleThinking(): void {
    const newItems = this._items.map(item => {
      if (item.type === 'thinking') {
        return { ...item, collapsed: !item.collapsed };
      }
      return item;
    });
    this._items = newItems;

    this.bumpVersion();
    this.notifyListeners();
  }

  /** Set collapsed state for a specific item by index. Works for thinking and tool_call. */
  setItemCollapsed(index: number, collapsed: boolean): void {
    const item = this._items[index];
    if (!item) return;
    if (item.type !== 'thinking' && item.type !== 'tool_call') return;
    if (item.collapsed === collapsed) return;

    const updated = { ...item, collapsed };
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

  // ---------------------------------------------------------------------------
  // System Messages (I5)
  // ---------------------------------------------------------------------------

  /**
   * Add a system message to the conversation (e.g., "Session reconnected",
   * "New thread started", error recovery markers).
   */
  addSystemMessage(text: string): void {
    const item: ConversationItem = {
      type: 'system_message',
      text,
      timestamp: Date.now(),
    };
    this._items = append(this._items, item);
    this.bumpVersion();
    this.notifyListeners();
  }

  /**
   * Add a stub thinking block for interrupted streams.
   * Only allowed when lifecycle is 'processing'.
   */
  addInterruptedThinking(): void {
    if (this._lifecycle !== 'processing') return;
    this._items = append(this._items, {
      type: 'thinking',
      content: '',
      isStreaming: false,
    } as unknown as ConversationItem);
    this.bumpVersion();
    this.notifyListeners();
  }

  /**
   * Add a user message to the conversation WITHOUT changing lifecycle state.
   * Useful for injecting user messages outside the normal processing flow.
   */
  addUserMessage(text: string): void {
    this._items = append(this._items, {
      type: 'user_message',
      content: text,
      images: [],
    } as unknown as ConversationItem);
    this.bumpVersion();
    this.notifyListeners();
  }

  // ---------------------------------------------------------------------------
  // Message Edit / Truncate (I6)
  // ---------------------------------------------------------------------------

  /**
   * Get the text of a user message at the given items-array index.
   * Returns null if the index is out of bounds or not a user message.
   */
  getMessageAt(index: number): string | null {
    const item = this._items[index];
    if (!item || item.type !== 'user_message') return null;
    return item.text;
  }

  /**
   * Truncate the conversation after the given items-array index.
   * Removes all items after `index` (exclusive), rebuilds the tool call index,
   * and resets streaming state. Used for message editing/replay workflows.
   *
   * No-op if the index is out of bounds. Only allowed when lifecycle is idle.
   */
  truncateAfter(index: number): void {
    if (this._lifecycle !== 'idle') {
      log.warn(`SessionState: truncateAfter ignored — lifecycle is '${this._lifecycle}'`);
      return;
    }
    if (index < 0 || index >= this._items.length) return;

    this._items = this._items.slice(0, index + 1);

    // Reset streaming state
    this._streamingMsgIndex = -1;
    this._streamingThinkingIndex = -1;
    this._streamingTextBuffer = '';
    this._streamingThinkingBuffer = '';

    // Rebuild tool call index
    this._toolCallIndex.clear();
    for (let i = 0; i < this._items.length; i++) {
      const item = this._items[i];
      if (item.type === 'tool_call') {
        this._toolCallIndex.set(item.toolCallId, i);
      }
    }

    // Reset task stack to avoid stale parent-child relationships (I6)
    this._openTaskStack = [];

    this.bumpVersion();
    this.notifyListeners();
  }

  // ---------------------------------------------------------------------------
  // Session Restoration
  // ---------------------------------------------------------------------------

  /**
   * Restore items, plan, and usage from a persisted session snapshot.
   *
   * Clears existing state, sanitizes isStreaming flags to false,
   * resets lifecycle to 'idle', and notifies listeners.
   * Rebuilds the tool call index from restored items.
   */
  restoreItems(
    items: ConversationItem[],
    plan: PlanEntry[],
    usage: UsageInfo | null,
  ): void {
    this._items = items.map(item => {
      switch (item.type) {
        case 'assistant_message':
          return { ...item, isStreaming: false };
        case 'thinking':
          return { ...item, isStreaming: false };
        case 'tool_call':
          return item.isStreaming ? { ...item, isStreaming: false } : item;
        default:
          return item;
      }
    });

    this._plan = [...plan];
    this._usage = usage ? { ...usage } : null;

    this._streamingMsgIndex = -1;
    this._streamingThinkingIndex = -1;
    this._streamingTextBuffer = '';
    this._streamingThinkingBuffer = '';

    this._toolCallIndex.clear();
    for (let i = 0; i < this._items.length; i++) {
      const item = this._items[i];
      if (item.type === 'tool_call') {
        this._toolCallIndex.set(item.toolCallId, i);
      }
    }

    this._openTaskStack = [];
    this._lifecycle = 'idle';
    this._error = null;
    this._lastStopReason = null;

    this.bumpVersion();
    this.notifyListeners();
  }
}
