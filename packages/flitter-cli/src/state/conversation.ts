// ConversationState — turn-level grouped view over SessionState.items.
//
// Provides the data layer that downstream rendering phases consume.
// Raw SessionState.items is a flat array of ConversationItem entries;
// ConversationState groups them into alternating UserTurn/AssistantTurn
// sequences, with cached recomputation keyed on SessionState.version.
//
// No rendering dependencies — pure data model.

import type { ConversationItem } from './types';
import type {
  Turn,
  UserTurn,
  AssistantTurn,
  TurnStatus,
} from './turn-types';
import type { SessionState } from './session';

// ---------------------------------------------------------------------------
// Turn Grouping Algorithm
// ---------------------------------------------------------------------------

/**
 * Groups a flat array of ConversationItem entries into an alternating
 * sequence of UserTurn and AssistantTurn objects.
 *
 * Grouping rules:
 * - A user_message starts a new UserTurn; all following non-user items
 *   until the next user_message (or end of array) form the AssistantTurn.
 * - Leading non-user items before the first user_message form an opening
 *   AssistantTurn with no preceding UserTurn.
 * - Two adjacent user messages produce an empty AssistantTurn between them.
 * - Items are routed into AssistantTurn buckets by their `type` discriminant.
 *
 * @param items - The flat conversation items array from SessionState.items.
 * @returns An array of Turn objects in conversation order.
 */
export function groupItemsIntoTurns(items: ReadonlyArray<ConversationItem>): ReadonlyArray<Turn> {
  if (items.length === 0) return [];

  const turns: Turn[] = [];

  // Accumulator for the current assistant turn being built.
  // null means we haven't started accumulating yet.
  let pendingAssistant: AssistantTurnBuilder | null = null;

  // Track the most recent UserMessage (for interrupted detection).
  let lastUserMessage: ConversationItem | null = null;

  for (let i = 0; i < items.length; i++) {
    const item = items[i];

    if (item.type === 'user_message') {
      // Finalize any pending assistant turn
      if (pendingAssistant !== null) {
        turns.push(finalizeAssistantTurn(pendingAssistant, lastUserMessage));
      }

      // Create user turn
      const userTurn: UserTurn = {
        kind: 'user',
        message: item,
        itemIndex: i,
      };
      turns.push(userTurn);

      // Track this user message for interrupted detection
      lastUserMessage = item;

      // Start a new assistant turn accumulator after this user message
      pendingAssistant = createAssistantBuilder(i + 1);
    } else {
      // Non-user item: route to the current assistant turn
      if (pendingAssistant === null) {
        // Leading items before the first user message
        pendingAssistant = createAssistantBuilder(i);
      }
      routeItem(pendingAssistant, item);
    }
  }

  // Finalize any trailing assistant turn
  if (pendingAssistant !== null) {
    turns.push(finalizeAssistantTurn(pendingAssistant, lastUserMessage));
  }

  return turns;
}

// ---------------------------------------------------------------------------
// Internal Builder Types and Helpers
// ---------------------------------------------------------------------------

/** Mutable accumulator used during turn construction. */
interface AssistantTurnBuilder {
  thinkingItems: AssistantTurn['thinkingItems'][number][];
  message: AssistantTurn['message'];
  toolCalls: AssistantTurn['toolCalls'][number][];
  planItems: AssistantTurn['planItems'][number][];
  systemMessages: AssistantTurn['systemMessages'][number][];
  startIndex: number;
}

/** Create a fresh assistant turn builder starting at the given items index. */
function createAssistantBuilder(startIndex: number): AssistantTurnBuilder {
  return {
    thinkingItems: [],
    message: null,
    toolCalls: [],
    planItems: [],
    systemMessages: [],
    startIndex,
  };
}

/** Route a non-user ConversationItem into the appropriate builder bucket. */
function routeItem(builder: AssistantTurnBuilder, item: ConversationItem): void {
  switch (item.type) {
    case 'thinking':
      builder.thinkingItems.push(item);
      break;
    case 'assistant_message':
      // Last one wins if multiple (normally exactly one per turn)
      builder.message = item;
      break;
    case 'tool_call':
      builder.toolCalls.push(item);
      break;
    case 'plan':
      builder.planItems.push(item);
      break;
    case 'system_message':
      builder.systemMessages.push(item);
      break;
  }
}

/**
 * Finalize the builder into an immutable AssistantTurn with computed properties.
 *
 * @param builder - The mutable accumulator.
 * @param precedingUserItem - The UserMessage that preceded this assistant turn (for interrupted detection).
 */
function finalizeAssistantTurn(
  builder: AssistantTurnBuilder,
  precedingUserItem: ConversationItem | null,
): AssistantTurn {
  const { thinkingItems, message, toolCalls, planItems, systemMessages, startIndex } = builder;

  // Compute endIndex: startIndex + total items routed
  const itemCount = thinkingItems.length + (message ? 1 : 0) + toolCalls.length + planItems.length + systemMessages.length;
  const endIndex = startIndex + itemCount;

  // --- Compute derived properties ---

  const anyThinkingStreaming = thinkingItems.some(t => t.isStreaming);
  const messageStreaming = message?.isStreaming === true;
  const anyToolStreaming = toolCalls.some(t => t.isStreaming === true);

  const isStreaming = anyThinkingStreaming || messageStreaming || anyToolStreaming;

  // isComplete: not streaming AND has at least one content item
  const hasContent = message !== null || toolCalls.length > 0 || thinkingItems.length > 0;
  const isComplete = !isStreaming && hasContent;

  // isInterrupted: the preceding user message has interrupted=true
  const isInterrupted =
    precedingUserItem !== null &&
    precedingUserItem.type === 'user_message' &&
    precedingUserItem.interrupted === true;

  const hasToolCalls = toolCalls.length > 0;
  const hasThinking = thinkingItems.length > 0;

  // Derive status
  const status = computeStatus(isStreaming, isInterrupted, toolCalls);

  return {
    kind: 'assistant',
    thinkingItems,
    message,
    toolCalls,
    planItems,
    systemMessages,
    isStreaming,
    isComplete,
    isInterrupted,
    hasToolCalls,
    hasThinking,
    status,
    startIndex,
    endIndex,
  };
}

/**
 * Compute the TurnStatus from children states.
 *
 * Priority: streaming > interrupted > error (all tools failed) > complete.
 */
function computeStatus(
  isStreaming: boolean,
  isInterrupted: boolean,
  toolCalls: ReadonlyArray<{ status: string }>,
): TurnStatus {
  if (isStreaming) return 'streaming';
  if (isInterrupted) return 'interrupted';

  // Error: all tool calls failed (and there is at least one)
  if (toolCalls.length > 0 && toolCalls.every(tc => tc.status === 'failed')) {
    return 'error';
  }

  return 'complete';
}

// ---------------------------------------------------------------------------
// ConversationState — Cached Turn View over SessionState
// ---------------------------------------------------------------------------

/**
 * ConversationState provides a cached, turn-level grouped view over
 * SessionState.items.
 *
 * It wraps a SessionState reference (composition, not inheritance) and
 * lazily recomputes the turns array when SessionState.version changes.
 * The caching ensures that repeated accesses within the same render frame
 * return the same array reference.
 */
export class ConversationState {
  private readonly _session: SessionState;
  private _cachedTurns: ReadonlyArray<Turn> = [];
  private _cachedVersion: number = -1;

  constructor(session: SessionState) {
    this._session = session;
  }

  /**
   * The grouped turns array. Lazily recomputed when SessionState.version changes.
   * Returns a cached reference if the version hasn't changed since the last access.
   */
  get turns(): ReadonlyArray<Turn> {
    const currentVersion = this._session.version;
    if (currentVersion !== this._cachedVersion) {
      this._cachedTurns = groupItemsIntoTurns(this._session.items);
      this._cachedVersion = currentVersion;
    }
    return this._cachedTurns;
  }

  /** The last turn in the conversation (or null if empty). */
  get currentTurn(): Turn | null {
    const t = this.turns;
    return t.length > 0 ? t[t.length - 1] : null;
  }

  /** The number of turns in the conversation. */
  get turnCount(): number {
    return this.turns.length;
  }

  /** True when the conversation has no items. */
  get isEmpty(): boolean {
    return this._session.items.length === 0;
  }

  /** The last UserTurn in the conversation (or null if none). */
  get lastUserTurn(): UserTurn | null {
    const t = this.turns;
    for (let i = t.length - 1; i >= 0; i--) {
      if (t[i].kind === 'user') return t[i] as UserTurn;
    }
    return null;
  }

  /** The last AssistantTurn in the conversation (or null if none). */
  get lastAssistantTurn(): AssistantTurn | null {
    const t = this.turns;
    for (let i = t.length - 1; i >= 0; i--) {
      if (t[i].kind === 'assistant') return t[i] as AssistantTurn;
    }
    return null;
  }
}
