// Conversation state — immutable snapshot model with streaming buffer
//
// Gap #49: O(1) tool call lookup via _toolCallIndex Map
// Gap #50: Immutable ConversationSnapshot with structural sharing
//
// Every mutation method produces a new snapshot via spread + Object.freeze.
// Streaming text accumulates in a buffer and is flushed into the snapshot
// on a coalesced schedule (via flushStreamingText) or on finalization.
// The _toolCallIndex provides O(1) amortized lookup for updateToolCall
// and appendToolOutput by storing references to snapshot array indices.

import type {
  ConversationItem,
  AssistantMessage,
  ThinkingItem,
  ToolCallItem,
  PlanEntry,
  UsageInfo,
  SystemMessage,
} from '../acp/types';

import type {
  ImmutableConversationItem,
  ImmutableAssistantMsg,
  ImmutableThinkingItem,
  ImmutableToolCallItem,
  ConversationSnapshot,
} from './immutable-types';

// --- Helpers ---

function nextVersion(prev: number): number {
  return prev + 1;
}

/** Replace item at index, returning a new array. O(n) with structural sharing
 *  of every element except the replaced one. */
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

const EMPTY_SNAPSHOT: ConversationSnapshot = Object.freeze({
  items: Object.freeze([]),
  plan: Object.freeze([]),
  usage: null,
  isProcessing: false,
  toolCallsExpanded: false,
  version: 0,
});

/**
 * ConversationState is the single source of truth for the ordered list of
 * conversation items, streaming state, and usage tracking within a session.
 *
 * This class is owned by AppState and should not be duplicated. Session-level
 * metadata (session ID, working directory, agent mode) belongs on AppState,
 * not here. This class is concerned only with the message/tool-call/plan
 * item list and the mechanics of streaming assembly.
 *
 * All state mutations produce new immutable snapshots via structural sharing.
 * Consumers read only the snapshot property. The version counter on each
 * snapshot enables O(1) dirty-checks for widget rebuild optimization.
 *
 * The _toolCallIndex Map provides O(1) amortized lookup for tool call
 * operations (updateToolCall, appendToolOutput, setToolTerminalId).
 */
export class ConversationState {
  private _snapshot: ConversationSnapshot = EMPTY_SNAPSHOT;

  // Streaming accumulator -- NOT part of the snapshot.
  // Text chunks accumulate here and are flushed into the snapshot
  // on a coalesced schedule or on finalization.
  private _streamingTextBuffer: string = '';
  private _streamingThinkingBuffer: string = '';
  private _streamingMsgIndex: number = -1;
  private _streamingThinkingIndex: number = -1;

  // Gap #49: O(1) tool call index — maps toolCallId to its array index.
  // Stores indices rather than object references because the immutable
  // model creates new objects on mutation; indices remain stable as long
  // as items are append-only (which they are — only clear() removes).
  private _toolCallIndex: Map<string, number> = new Map();

  /** The current immutable snapshot. Consumers read ONLY this. */
  get snapshot(): ConversationSnapshot {
    return this._snapshot;
  }

  // ---- Convenience accessors (backward compat during migration) ----

  get items(): ReadonlyArray<ImmutableConversationItem> {
    // Auto-flush streaming buffers so callers always see current text.
    // In the render pipeline, flushStreamingText() is called explicitly
    // by _flushUpdate(), but direct consumers (tests, tmux-harness) need
    // the items getter to reflect buffered text immediately.
    this.flushStreamingText();
    return this._snapshot.items;
  }

  get plan(): ReadonlyArray<Readonly<PlanEntry>> {
    return this._snapshot.plan;
  }

  get usage(): Readonly<UsageInfo> | null {
    return this._snapshot.usage;
  }

  get isProcessing(): boolean {
    return this._snapshot.isProcessing;
  }

  set isProcessing(val: boolean) {
    this._snapshot = {
      ...this._snapshot,
      isProcessing: val,
      version: nextVersion(this._snapshot.version),
    };
  }

  get toolCallsExpanded(): boolean {
    return this._snapshot.toolCallsExpanded;
  }

  // ---- Immutable update methods ----

  addUserMessage(text: string): void {
    const item: ImmutableConversationItem = Object.freeze({
      type: 'user_message' as const,
      text,
      timestamp: Date.now(),
    });
    this._snapshot = {
      ...this._snapshot,
      items: append(this._snapshot.items, item),
      version: nextVersion(this._snapshot.version),
    };
  }

  /** Add a system message (e.g., reconnection separator). */
  addSystemMessage(text: string): void {
    const item: ImmutableConversationItem = Object.freeze({
      type: 'system_message' as const,
      text,
      timestamp: Date.now(),
    });
    this._snapshot = {
      ...this._snapshot,
      items: append(this._snapshot.items, item),
      version: nextVersion(this._snapshot.version),
    };
  }

  appendAssistantChunk(text: string): void {
    if (this._streamingMsgIndex === -1) {
      // Create the streaming message placeholder in the snapshot
      const msg: ImmutableAssistantMsg = Object.freeze({
        type: 'assistant_message' as const,
        text: '',
        timestamp: Date.now(),
        isStreaming: true,
      });
      const newItems = append(this._snapshot.items, msg);
      this._streamingMsgIndex = newItems.length - 1;
      this._streamingTextBuffer = '';
      this._snapshot = {
        ...this._snapshot,
        items: newItems,
        version: nextVersion(this._snapshot.version),
      };
    }
    // Accumulate in the buffer -- no snapshot update yet.
    this._streamingTextBuffer += text;
  }

  /** Flush accumulated streaming text into the snapshot.
   *  Called by the throttled render cycle or by finalize methods.
   *  Returns true if the snapshot was updated. */
  flushStreamingText(): boolean {
    let changed = false;

    if (this._streamingMsgIndex >= 0 && this._streamingTextBuffer.length > 0) {
      const prev = this._snapshot.items[this._streamingMsgIndex] as ImmutableAssistantMsg;
      const updated: ImmutableAssistantMsg = Object.freeze({
        ...prev,
        text: prev.text + this._streamingTextBuffer,
      });
      this._streamingTextBuffer = '';
      this._snapshot = {
        ...this._snapshot,
        items: replaceAt(this._snapshot.items, this._streamingMsgIndex, updated),
        version: nextVersion(this._snapshot.version),
      };
      changed = true;
    }

    if (this._streamingThinkingIndex >= 0 && this._streamingThinkingBuffer.length > 0) {
      const prev = this._snapshot.items[this._streamingThinkingIndex] as ImmutableThinkingItem;
      const updated: ImmutableThinkingItem = Object.freeze({
        ...prev,
        text: prev.text + this._streamingThinkingBuffer,
      });
      this._streamingThinkingBuffer = '';
      this._snapshot = {
        ...this._snapshot,
        items: replaceAt(this._snapshot.items, this._streamingThinkingIndex, updated),
        version: nextVersion(this._snapshot.version),
      };
      changed = true;
    }

    return changed;
  }

  finalizeAssistantMessage(): void {
    this.flushStreamingText();
    if (this._streamingMsgIndex >= 0) {
      const prev = this._snapshot.items[this._streamingMsgIndex] as ImmutableAssistantMsg;
      const updated: ImmutableAssistantMsg = Object.freeze({
        ...prev,
        isStreaming: false,
      });
      this._snapshot = {
        ...this._snapshot,
        items: replaceAt(this._snapshot.items, this._streamingMsgIndex, updated),
        version: nextVersion(this._snapshot.version),
      };
      this._streamingMsgIndex = -1;
      this._streamingTextBuffer = '';
    }
  }

  appendThinkingChunk(text: string): void {
    if (this._streamingThinkingIndex === -1) {
      const item: ImmutableThinkingItem = Object.freeze({
        type: 'thinking' as const,
        text: '',
        timestamp: Date.now(),
        isStreaming: true,
        collapsed: true,
      });
      const newItems = append(this._snapshot.items, item);
      this._streamingThinkingIndex = newItems.length - 1;
      this._streamingThinkingBuffer = '';
      this._snapshot = {
        ...this._snapshot,
        items: newItems,
        version: nextVersion(this._snapshot.version),
      };
    }
    this._streamingThinkingBuffer += text;
  }

  finalizeThinking(): void {
    this.flushStreamingText();
    if (this._streamingThinkingIndex >= 0) {
      const prev = this._snapshot.items[this._streamingThinkingIndex] as ImmutableThinkingItem;
      const updated: ImmutableThinkingItem = Object.freeze({
        ...prev,
        isStreaming: false,
      });
      this._snapshot = {
        ...this._snapshot,
        items: replaceAt(this._snapshot.items, this._streamingThinkingIndex, updated),
        version: nextVersion(this._snapshot.version),
      };
      this._streamingThinkingIndex = -1;
      this._streamingThinkingBuffer = '';
    }
  }

  addToolCall(
    toolCallId: string,
    title: string,
    kind: string,
    status: ToolCallItem['status'],
    locations?: Array<{ path: string }>,
    rawInput?: Record<string, unknown>,
  ): void {
    this.finalizeAssistantMessage();
    const item: ImmutableToolCallItem = Object.freeze({
      type: 'tool_call' as const,
      toolCallId,
      title,
      kind,
      status,
      locations: locations
        ? Object.freeze(locations.map(l => Object.freeze({ ...l })))
        : undefined,
      rawInput: rawInput ? Object.freeze({ ...rawInput }) : undefined,
      collapsed: !this._snapshot.toolCallsExpanded,
    });
    const newItems = append(this._snapshot.items, item);
    // Gap #49: index the tool call position for O(1) lookup
    this._toolCallIndex.set(toolCallId, newItems.length - 1);
    this._snapshot = {
      ...this._snapshot,
      items: newItems,
      version: nextVersion(this._snapshot.version),
    };
  }

  updateToolCall(
    toolCallId: string,
    status: 'completed' | 'failed',
    content?: Array<{ type: string; content?: { type: string; text: string } }>,
    rawOutput?: Record<string, unknown>,
  ): void {
    // Gap #49: O(1) lookup via index
    const index = this._toolCallIndex.get(toolCallId);
    if (index === undefined) return;

    const prev = this._snapshot.items[index] as ImmutableToolCallItem;
    if (!prev || prev.type !== 'tool_call') return;

    const updated: ImmutableToolCallItem = Object.freeze({
      ...prev,
      status,
      result: Object.freeze({ status, content, rawOutput }),
      isStreaming: false,
    });
    this._snapshot = {
      ...this._snapshot,
      items: replaceAt(this._snapshot.items, index, updated),
      version: nextVersion(this._snapshot.version),
    };
  }

  /**
   * Appends streaming output to an in-progress tool call.
   * Creates or extends the streamingOutput buffer on the ToolCallItem.
   * On the first chunk, auto-expands the tool card so the user sees live output.
   */
  appendToolOutput(
    toolCallId: string,
    chunk: string,
    maxBuffer: number = 50_000,
  ): void {
    // Gap #49: O(1) lookup via index
    const index = this._toolCallIndex.get(toolCallId);
    if (index === undefined) return;

    const prev = this._snapshot.items[index] as ImmutableToolCallItem;
    if (!prev || prev.type !== 'tool_call') return;
    if (prev.status === 'completed' || prev.status === 'failed') return;

    // Build new streaming output
    let newStreamingOutput = (prev.streamingOutput ?? '') + chunk;
    const isFirstChunk = prev.streamingOutput === undefined;

    // Buffer limit enforcement
    if (newStreamingOutput.length > maxBuffer) {
      const trimPoint = newStreamingOutput.length - maxBuffer;
      const newlineAfterTrim = newStreamingOutput.indexOf('\n', trimPoint);
      const cutAt = newlineAfterTrim !== -1 ? newlineAfterTrim + 1 : trimPoint;
      newStreamingOutput = '...(truncated)\n' + newStreamingOutput.slice(cutAt);
    }

    const updated: ImmutableToolCallItem = Object.freeze({
      ...prev,
      streamingOutput: newStreamingOutput,
      isStreaming: true,
      collapsed: isFirstChunk ? false : prev.collapsed,
      result: Object.freeze({
        status: 'streaming' as const,
        rawOutput: Object.freeze({ stdout: newStreamingOutput }),
      }),
    });
    this._snapshot = {
      ...this._snapshot,
      items: replaceAt(this._snapshot.items, index, updated),
      version: nextVersion(this._snapshot.version),
    };
  }

  /**
   * Associates a terminal ID with a tool call for client-side output polling.
   */
  setToolTerminalId(toolCallId: string, terminalId: string): void {
    // Gap #49: O(1) lookup via index
    const index = this._toolCallIndex.get(toolCallId);
    if (index === undefined) return;

    const prev = this._snapshot.items[index] as ImmutableToolCallItem;
    if (!prev || prev.type !== 'tool_call') return;

    const updated: ImmutableToolCallItem = Object.freeze({
      ...prev,
      terminalId,
    });
    this._snapshot = {
      ...this._snapshot,
      items: replaceAt(this._snapshot.items, index, updated),
      version: nextVersion(this._snapshot.version),
    };
  }

  setPlan(entries: PlanEntry[]): void {
    const frozenEntries = Object.freeze(entries.map(e => Object.freeze({ ...e })));
    const existingIndex = this._snapshot.items.findIndex(i => i.type === 'plan');
    const planItem: ImmutableConversationItem = Object.freeze({
      type: 'plan' as const,
      entries: frozenEntries,
    });

    let newItems: ReadonlyArray<ImmutableConversationItem>;
    if (existingIndex >= 0) {
      newItems = replaceAt(this._snapshot.items, existingIndex, planItem);
    } else {
      newItems = append(this._snapshot.items, planItem);
    }

    this._snapshot = {
      ...this._snapshot,
      items: newItems,
      plan: frozenEntries,
      version: nextVersion(this._snapshot.version),
    };
  }

  setUsage(usage: UsageInfo): void {
    this._snapshot = {
      ...this._snapshot,
      usage: Object.freeze({ ...usage }),
      version: nextVersion(this._snapshot.version),
    };
  }

  toggleToolCalls(): void {
    const expanded = !this._snapshot.toolCallsExpanded;
    const newItems = this._snapshot.items.map(item => {
      if (item.type === 'tool_call') {
        return Object.freeze({ ...item, collapsed: !expanded });
      }
      return item; // structural sharing: unchanged items keep identity
    });
    this._snapshot = {
      ...this._snapshot,
      items: newItems,
      toolCallsExpanded: expanded,
      version: nextVersion(this._snapshot.version),
    };
  }

  /**
   * Toggles the collapsed state of a single tool call by its toolCallId.
   * Unlike toggleToolCalls() which flips all tool calls at once,
   * this allows per-card expand/collapse toggling.
   */
  toggleSingleToolCall(toolCallId: string): void {
    // Gap #49: O(1) lookup via index
    const index = this._toolCallIndex.get(toolCallId);
    if (index === undefined) return;

    const prev = this._snapshot.items[index] as ImmutableToolCallItem;
    if (!prev || prev.type !== 'tool_call') return;

    const updated: ImmutableToolCallItem = Object.freeze({
      ...prev,
      collapsed: !prev.collapsed,
    });
    this._snapshot = {
      ...this._snapshot,
      items: replaceAt(this._snapshot.items, index, updated),
      version: nextVersion(this._snapshot.version),
    };
  }

  /** Toggle collapsed state of all thinking items. Replaces the direct
   *  mutation loop previously in app.ts toggleThinking(). */
  toggleThinking(): void {
    const newItems = this._snapshot.items.map(item => {
      if (item.type === 'thinking') {
        return Object.freeze({ ...item, collapsed: !item.collapsed });
      }
      return item;
    });
    this._snapshot = {
      ...this._snapshot,
      items: newItems,
      version: nextVersion(this._snapshot.version),
    };
  }

  /** Set collapsed state for a specific item by index. Used for targeted
   *  expand/collapse of individual thinking blocks or tool calls. */
  setItemCollapsed(index: number, collapsed: boolean): void {
    const item = this._snapshot.items[index];
    if (!item) return;
    if (item.type !== 'thinking' && item.type !== 'tool_call') return;
    if (item.collapsed === collapsed) return; // no-op

    const updated = Object.freeze({ ...item, collapsed });
    this._snapshot = {
      ...this._snapshot,
      items: replaceAt(this._snapshot.items, index, updated),
      version: nextVersion(this._snapshot.version),
    };
  }

  /** Insert an interrupted thinking block (empty text, not streaming). */
  addInterruptedThinking(): void {
    const item: ImmutableThinkingItem = Object.freeze({
      type: 'thinking' as const,
      text: '',
      timestamp: Date.now(),
      isStreaming: false,
      collapsed: false,
    });
    this._snapshot = {
      ...this._snapshot,
      items: append(this._snapshot.items, item),
      version: nextVersion(this._snapshot.version),
    };
  }

  clear(): void {
    this._streamingMsgIndex = -1;
    this._streamingThinkingIndex = -1;
    this._streamingTextBuffer = '';
    this._streamingThinkingBuffer = '';
    this._toolCallIndex.clear();
    this._snapshot = {
      ...EMPTY_SNAPSHOT,
      version: nextVersion(this._snapshot.version),
    };
  }

  /**
   * Restore conversation state from a persisted session file.
   * Rebuilds the tool call index from the restored items.
   */
  restoreFromSession(
    items: ConversationItem[],
    plan: PlanEntry[],
    usage: UsageInfo | null,
    currentMode?: string | null,
  ): void {
    this._streamingMsgIndex = -1;
    this._streamingThinkingIndex = -1;
    this._streamingTextBuffer = '';
    this._streamingThinkingBuffer = '';
    this._toolCallIndex.clear();

    // Rebuild the tool call index from restored items
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.type === 'tool_call') {
        this._toolCallIndex.set(item.toolCallId, i);
      }
    }

    const frozenItems = items.map(item => Object.freeze({ ...item }));
    const frozenPlan = plan.map(e => Object.freeze({ ...e }));

    this._snapshot = {
      items: frozenItems,
      plan: frozenPlan,
      usage: usage ? Object.freeze({ ...usage }) : null,
      isProcessing: false,
      toolCallsExpanded: this._snapshot.toolCallsExpanded,
      version: nextVersion(this._snapshot.version),
    };
  }
}
