// Turn model domain types for flitter-cli.
//
// Pure data types defining the conversation turn model. A "turn" groups
// raw ConversationItem entries from SessionState.items into logical units:
// a UserTurn wrapping a single user message, and an AssistantTurn aggregating
// all items from a single assistant response (thinking, text, tool calls,
// plan items, system messages).
//
// These types have zero runtime dependencies — the grouping algorithm that
// populates them lives in ConversationState (conversation.ts).

import type {
  UserMessage,
  AssistantMessage,
  ToolCallItem,
  ThinkingItem,
  PlanItem,
  SystemMessage,
} from './types';

// ---------------------------------------------------------------------------
// Turn Status
// ---------------------------------------------------------------------------

/**
 * The lifecycle status of an assistant turn.
 *
 * - 'streaming': at least one child item is actively streaming content
 * - 'complete': all children are finalized, no streaming active
 * - 'interrupted': the user cancelled mid-response
 * - 'error': all tool calls in the turn failed
 */
export type TurnStatus = 'streaming' | 'complete' | 'interrupted' | 'error';

// ---------------------------------------------------------------------------
// UserTurn
// ---------------------------------------------------------------------------

/**
 * A user turn wrapping the original UserMessage for uniform iteration.
 *
 * In the turn model, every user message is represented as a UserTurn so that
 * consumers can iterate through a Turn[] array with a single discriminant
 * (`kind`) instead of mixing ConversationItem types with grouping types.
 */
export interface UserTurn {
  kind: 'user';
  /** The original UserMessage from SessionState.items. */
  message: UserMessage;
  /** Items-array index of this user message in SessionState.items. */
  itemIndex: number;
}

// ---------------------------------------------------------------------------
// AssistantTurn
// ---------------------------------------------------------------------------

/**
 * An assistant turn groups all items from a single assistant response.
 *
 * Contains zero or more thinking blocks, zero or one assistant text message,
 * zero or more tool calls, and zero or more plan items. The grouping boundary
 * is the next UserMessage or end of items array.
 *
 * The computed properties (isStreaming, isComplete, etc.) are derived from
 * children states during grouping and are immutable once the turn is created.
 */
export interface AssistantTurn {
  kind: 'assistant';
  /** Thinking blocks in this turn (may be empty). */
  thinkingItems: ReadonlyArray<ThinkingItem>;
  /** The assistant text message (null if response is tool-only). */
  message: AssistantMessage | null;
  /** Tool calls in this turn (may be empty). */
  toolCalls: ReadonlyArray<ToolCallItem>;
  /** Plan items in this turn (may be empty). */
  planItems: ReadonlyArray<PlanItem>;
  /** System messages in this turn (may be empty). */
  systemMessages: ReadonlyArray<SystemMessage>;

  // --- Computed turn-level properties ---

  /** True if any child item is currently streaming (thinking, text, or tool). */
  isStreaming: boolean;
  /** True if all children are finalized and no streaming is active. */
  isComplete: boolean;
  /** True if this turn was interrupted (user cancelled mid-response). */
  isInterrupted: boolean;
  /** True if this turn contains at least one tool call. */
  hasToolCalls: boolean;
  /** True if this turn contains at least one thinking block. */
  hasThinking: boolean;
  /** Turn status derived from children states. */
  status: TurnStatus;

  /** Start index in SessionState.items for the first item in this turn. */
  startIndex: number;
  /** End index (exclusive) in SessionState.items for items in this turn. */
  endIndex: number;
}

// ---------------------------------------------------------------------------
// Turn Union
// ---------------------------------------------------------------------------

/**
 * A single turn in the conversation — either user or assistant.
 *
 * Consumers discriminate on `kind` ('user' | 'assistant') to determine
 * the turn type and access type-specific properties.
 */
export type Turn = UserTurn | AssistantTurn;
