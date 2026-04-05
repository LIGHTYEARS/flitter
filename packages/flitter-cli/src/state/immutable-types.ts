// Immutable type wrappers and ConversationSnapshot refinement.
//
// Deep-readonly versions of all conversation item types, matching the
// pattern established in flitter-amp/src/state/immutable-types.ts.
//
// These types ensure that the compiler enforces non-mutation at the type
// level for any consumer that receives a snapshot of conversation state.

import type {
  UserMessage,
  AssistantMessage,
  ThinkingItem,
  ToolCallItem,
  ToolCallResult,
  PlanItem,
  PlanEntry,
  UsageInfo,
  SystemMessage,
  SessionLifecycle,
} from './types';

// ---------------------------------------------------------------------------
// Deep-readonly item types
// ---------------------------------------------------------------------------

/** Deep-readonly user message. */
export type ImmutableUserMessage = Readonly<UserMessage>;

/** Deep-readonly assistant message. */
export type ImmutableAssistantMsg = Readonly<AssistantMessage>;

/** Deep-readonly thinking item. */
export type ImmutableThinkingItem = Readonly<ThinkingItem>;

/** Deep-readonly tool call result with frozen nested arrays. */
export type ImmutableToolCallResult = Readonly<{
  status: ToolCallResult['status'];
  content?: ReadonlyArray<Readonly<{
    type: string;
    content?: Readonly<{ type: string; text: string }>;
  }>>;
  rawOutput?: Readonly<Record<string, unknown>> | string;
}>;

/** Deep-readonly tool call item with frozen nested arrays and result. */
export type ImmutableToolCallItem = Readonly<{
  type: 'tool_call';
  toolCallId: string;
  title: string;
  kind: string;
  status: ToolCallItem['status'];
  locations?: ReadonlyArray<Readonly<{ path: string }>>;
  rawInput?: Readonly<Record<string, unknown>>;
  result?: ImmutableToolCallResult;
  collapsed: boolean;
  parentToolCallId?: string;
  streamingOutput?: string;
  isStreaming?: boolean;
  terminalId?: string;
}>;

/** Deep-readonly plan item with frozen entries array. */
export type ImmutablePlanItem = Readonly<{
  type: 'plan';
  entries: ReadonlyArray<Readonly<PlanEntry>>;
}>;

/** Deep-readonly system message. */
export type ImmutableSystemMessage = Readonly<SystemMessage>;

/** Discriminated union of all immutable conversation item types. */
export type ImmutableConversationItem =
  | ImmutableUserMessage
  | ImmutableAssistantMsg
  | ImmutableThinkingItem
  | ImmutableToolCallItem
  | ImmutablePlanItem
  | ImmutableSystemMessage;

// ---------------------------------------------------------------------------
// Immutable Conversation Snapshot
// ---------------------------------------------------------------------------

/**
 * A version-counted immutable snapshot of conversation state.
 *
 * Provides a frozen view suitable for cheap dirty-checking (via the
 * monotonic `version` counter) and safe sharing across render boundaries.
 */
export interface ImmutableConversationSnapshot {
  readonly items: ReadonlyArray<ImmutableConversationItem>;
  readonly plan: ReadonlyArray<Readonly<PlanEntry>>;
  readonly usage: Readonly<UsageInfo> | null;
  readonly isProcessing: boolean;
  readonly lifecycle: SessionLifecycle;
  readonly version: number;
}
