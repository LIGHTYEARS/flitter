// Native conversation and session type system for flitter-cli.
//
// Self-contained domain types with zero external dependencies.
// Ported from flitter-amp/src/acp/types.ts, removing all ACP SDK
// re-exports and coco/ACP coupling.

// ---------------------------------------------------------------------------
// Conversation Item Types
// ---------------------------------------------------------------------------

/** A message submitted by the user. */
export interface UserMessage {
  type: 'user_message';
  text: string;
  timestamp: number;
  /** Whether the user interrupted the assistant while it was responding. */
  interrupted?: boolean;
  /** Optional image attachments. */
  images?: Array<{ filename: string }>;
}

/** A message produced by the assistant (may be streaming). */
export interface AssistantMessage {
  type: 'assistant_message';
  text: string;
  timestamp: number;
  /** True while the assistant is still emitting text chunks. */
  isStreaming: boolean;
}

/** The result payload of a completed or failed tool call. */
export interface ToolCallResult {
  status: 'completed' | 'failed' | 'streaming';
  content?: Array<{ type: string; content?: { type: string; text: string } }>;
  rawOutput?: Record<string, unknown> | string;
}

/** A tool invocation tracked in the conversation. */
export interface ToolCallItem {
  type: 'tool_call';
  toolCallId: string;
  title: string;
  kind: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  locations?: Array<{ path: string }>;
  rawInput?: Record<string, unknown>;
  result?: ToolCallResult;
  collapsed: boolean;
  /** If set, this tool call is a child of a Task (subagent) tool call. */
  parentToolCallId?: string;
  /** Accumulated streaming output received while tool is in_progress. */
  streamingOutput?: string;
  /** Whether streaming output is actively being received. */
  isStreaming?: boolean;
  /** Associated terminal ID for client-side polling (Bash tools). */
  terminalId?: string;
}

/** An extended-thinking block produced by the model. */
export interface ThinkingItem {
  type: 'thinking';
  text: string;
  timestamp: number;
  /** True while thinking text is still streaming. */
  isStreaming: boolean;
  /** Whether the thinking block is visually collapsed. */
  collapsed: boolean;
}

/** A single entry in the assistant's plan. */
export interface PlanEntry {
  content: string;
  priority: 'high' | 'medium' | 'low';
  status: 'pending' | 'in_progress' | 'completed';
}

/** A plan item containing an ordered list of plan entries. */
export interface PlanItem {
  type: 'plan';
  entries: Array<PlanEntry>;
}

/** Context-window and cost usage information. */
export interface UsageInfo {
  size: number;
  used: number;
  cost?: { amount: number; currency: string } | null;
}

/** A system-generated informational message. */
export interface SystemMessage {
  type: 'system_message';
  text: string;
  timestamp: number;
}

/** Discriminated union of all conversation item types. */
export type ConversationItem =
  | UserMessage
  | AssistantMessage
  | ToolCallItem
  | PlanItem
  | ThinkingItem
  | SystemMessage;

// ---------------------------------------------------------------------------
// Session Lifecycle Types
// ---------------------------------------------------------------------------

/**
 * Deterministic session lifecycle states.
 *
 * Transitions:
 *   idle -> processing -> streaming -> complete
 *                                   -> error
 *                                   -> cancelled
 *   processing -> error
 *              -> cancelled
 *   complete/error/cancelled -> idle (via reset)
 */
export type SessionLifecycle =
  | 'idle'
  | 'processing'
  | 'streaming'
  | 'complete'
  | 'error'
  | 'cancelled';

/**
 * Metadata about the current session, tracked across turns.
 * Updated by the session state machine on lifecycle transitions.
 */
export interface SessionMetadata {
  sessionId: string;
  startTime: number;
  cwd: string;
  model: string;
  tokenUsage: { input: number; output: number };
  turnCount: number;
  title: string | null;
  gitBranch: string | null;
}

/**
 * Error information captured when the session enters the 'error' state.
 * Provides enough context for the UI to show actionable recovery options.
 */
export interface SessionError {
  message: string;
  code: string | null;
  retryable: boolean;
}

// ---------------------------------------------------------------------------
// Stream Event Types (Provider Interface)
// ---------------------------------------------------------------------------

/**
 * Discriminated union of events emitted by a Provider's sendPrompt stream.
 * Consumers switch on the `type` field to process each variant.
 */
export type StreamEvent =
  | StreamTextDelta
  | StreamThinkingDelta
  | StreamToolCallStart
  | StreamToolCallEnd
  | StreamUsageUpdate
  | StreamMessageComplete
  | StreamError;

/** A chunk of assistant text content. */
export interface StreamTextDelta {
  type: 'text_delta';
  text: string;
}

/** A chunk of extended-thinking content. */
export interface StreamThinkingDelta {
  type: 'thinking_delta';
  text: string;
}

/** Signals the start of a tool call invocation. */
export interface StreamToolCallStart {
  type: 'tool_call_start';
  toolCallId: string;
  title: string;
  kind: string;
}

/** Signals the completion of a tool call. */
export interface StreamToolCallEnd {
  type: 'tool_call_end';
  toolCallId: string;
  status: 'completed' | 'failed';
  rawOutput?: string;
}

/** Updated usage/token information from the backend. */
export interface StreamUsageUpdate {
  type: 'usage_update';
  usage: UsageInfo;
}

/** The message stream has completed normally. */
export interface StreamMessageComplete {
  type: 'message_complete';
  stopReason: string;
}

/** An error occurred during streaming. */
export interface StreamError {
  type: 'error';
  error: SessionError;
}
