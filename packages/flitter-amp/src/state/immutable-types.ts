// Immutable type wrappers and ConversationSnapshot interface (Gap #50)
//
// Deep-readonly versions of all conversation item types. These types
// ensure that the compiler enforces non-mutation at the type level.
// The ConversationSnapshot interface provides a version-counted
// immutable view of the entire conversation state.

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
} from '../acp/types';

/** Deep-readonly versions of all item types */
export type ImmutableUserMessage = Readonly<UserMessage>;

export type ImmutableAssistantMsg = Readonly<AssistantMessage>;

export type ImmutableThinkingItem = Readonly<ThinkingItem>;

export type ImmutableToolCallResult = Readonly<{
  status: ToolCallResult['status'];
  content?: ReadonlyArray<Readonly<{
    type: string;
    content?: Readonly<{ type: string; text: string }>;
  }>>;
  rawOutput?: Readonly<Record<string, unknown>>;
}>;

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
  streamingOutput?: string;
  isStreaming?: boolean;
  terminalId?: string;
}>;

export type ImmutablePlanItem = Readonly<{
  type: 'plan';
  entries: ReadonlyArray<Readonly<PlanEntry>>;
}>;

export type ImmutableSystemMessage = Readonly<SystemMessage>;

export type ImmutableConversationItem =
  | ImmutableUserMessage
  | ImmutableAssistantMsg
  | ImmutableThinkingItem
  | ImmutableToolCallItem
  | ImmutablePlanItem
  | ImmutableSystemMessage;

/** The immutable state snapshot exposed to consumers */
export interface ConversationSnapshot {
  readonly items: ReadonlyArray<ImmutableConversationItem>;
  readonly plan: ReadonlyArray<Readonly<PlanEntry>>;
  readonly usage: Readonly<UsageInfo> | null;
  readonly isProcessing: boolean;
  readonly toolCallsExpanded: boolean;
  readonly version: number; // monotonic counter for cheap dirty-check
}
