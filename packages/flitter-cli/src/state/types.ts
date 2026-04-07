// Native conversation and session type system for flitter-cli.
//
// Self-contained domain types with zero external dependencies.
// Ported from flitter-amp/src/acp/types.ts, removing all ACP SDK
// re-exports and coco/ACP coupling.

// ---------------------------------------------------------------------------
// Deep Reasoning Effort (MODE-01)
// ---------------------------------------------------------------------------

/** Tri-state deep reasoning effort level matching AMP's agent.deepReasoningEffort. */
export type DeepReasoningEffort = 'medium' | 'high' | 'xhigh';

// ---------------------------------------------------------------------------
// Agent Mode Definitions (MODE-02)
// ---------------------------------------------------------------------------

/** UI rendering hints per agent mode, from AMP's nb uiHints. */
export interface AgentModeUiHints {
  labelAnimation?: 'glow' | 'jitter';
  fasterAnimation?: boolean;
  primaryColor: { r: number; g: number; b: number };
  secondaryColor: { r: number; g: number; b: number };
}

/** Full agent mode definition matching AMP's nb object structure. */
export interface AgentModeDefinition {
  key: string;
  displayName: string;
  description: string;
  primaryModel: string;
  visible: boolean;
  reasoningEffort?: DeepReasoningEffort;
  uiHints: AgentModeUiHints;
}

// ---------------------------------------------------------------------------
// Session Mode
// ---------------------------------------------------------------------------

/** Describes an available agent mode with optional AMP-aligned fields. */
export interface SessionMode {
  id: string;
  name: string;
  displayName?: string;
  description?: string;
  primaryModel?: string;
  visible?: boolean;
  reasoningEffort?: DeepReasoningEffort;
  uiHints?: AgentModeUiHints;
}

// ---------------------------------------------------------------------------
// AGENT_MODES constant — all 7 AMP agent modes with exact definitions
// ---------------------------------------------------------------------------

/** All 7 AMP agent modes with exact definitions from AMP nb object. */
export const AGENT_MODES: Record<string, AgentModeDefinition> = {
  smart: {
    key: 'smart',
    displayName: 'Smart',
    description: 'The most capable model and set of tools',
    primaryModel: 'claude-opus-4-6',
    visible: true,
    uiHints: {
      labelAnimation: 'glow',
      primaryColor: { r: 0, g: 55, b: 20 },
      secondaryColor: { r: 0, g: 255, b: 136 },
    },
  },
  free: {
    key: 'free',
    displayName: 'Free',
    description: 'Amp Free',
    primaryModel: 'claude-haiku-4-5-20251001',
    visible: true,
    uiHints: {
      primaryColor: { r: 0, g: 26, b: 51 },
      secondaryColor: { r: 0, g: 184, b: 255 },
    },
  },
  rush: {
    key: 'rush',
    displayName: 'Rush',
    description: 'Faster and cheaper for small, well-defined tasks',
    primaryModel: 'claude-haiku-4-5-20251001',
    visible: true,
    uiHints: {
      fasterAnimation: true,
      labelAnimation: 'jitter',
      primaryColor: { r: 128, g: 51, b: 0 },
      secondaryColor: { r: 255, g: 215, b: 0 },
    },
  },
  'agg-man': {
    key: 'agg-man',
    displayName: 'Agg',
    description: 'Navigate work across Amp projects, threads, and context',
    primaryModel: 'claude-opus-4-6',
    visible: false,
    uiHints: {
      primaryColor: { r: 26, g: 0, b: 77 },
      secondaryColor: { r: 102, g: 153, b: 255 },
    },
  },
  large: {
    key: 'large',
    displayName: 'Large',
    description: 'The biggest context window possible (Opus 4.6 1M tokens), for large tasks',
    primaryModel: 'claude-opus-4-6',
    visible: true,
    uiHints: {
      labelAnimation: 'glow',
      primaryColor: { r: 42, g: 26, b: 77 },
      secondaryColor: { r: 153, g: 102, b: 255 },
    },
  },
  deep: {
    key: 'deep',
    displayName: 'Deep',
    description: 'Deep reasoning with GPT-5.4',
    primaryModel: 'gpt-5.4',
    visible: true,
    reasoningEffort: 'high',
    uiHints: {
      labelAnimation: 'glow',
      primaryColor: { r: 0, g: 77, b: 64 },
      secondaryColor: { r: 29, g: 233, b: 182 },
    },
  },
  internal: {
    key: 'internal',
    displayName: 'Internal',
    description: 'Internal-only mode for Amp development and debugging',
    primaryModel: 'gpt-5.4',
    visible: true,
    reasoningEffort: 'xhigh',
    uiHints: {
      labelAnimation: 'glow',
      primaryColor: { r: 77, g: 18, b: 0 },
      secondaryColor: { r: 255, g: 119, b: 42 },
    },
  },
};

/** Ordered list of all visible mode keys for cycling (AGG excluded because visible: false). */
export const VISIBLE_MODE_KEYS: string[] = Object.values(AGENT_MODES)
  .filter(m => m.visible)
  .map(m => m.key);

// ---------------------------------------------------------------------------
// Session Error & Metadata
// ---------------------------------------------------------------------------

/** An error captured during session processing. */
export interface SessionError {
  message: string;
  code: string | null;
  retryable: boolean;
}

/** Metadata associated with a session instance. */
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

// ---------------------------------------------------------------------------
// Provider Message Content Blocks (API-level representation)
// ---------------------------------------------------------------------------

/** A text content block in a provider message. */
export interface TextBlock {
  type: 'text';
  text: string;
}

/** A tool_use content block — the model is requesting a tool call. */
export interface ToolUseBlock {
  type: 'tool_use';
  id: string;
  name: string;
  input: Record<string, unknown>;
}

/** A tool_result content block — the result of executing a tool. */
export interface ToolResultBlock {
  type: 'tool_result';
  tool_use_id: string;
  content: string;
  is_error?: boolean;
}

/** Union of all content block types in a provider message. */
export type ContentBlock = TextBlock | ToolUseBlock | ToolResultBlock;

/** Message content: either a plain string or structured content blocks. */
export type MessageContent = string | ContentBlock[];

/** A message in the provider message array (multi-turn conversation). */
export interface ProviderMessage {
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: MessageContent;
}

// ---------------------------------------------------------------------------
// Tool Definition Types
// ---------------------------------------------------------------------------

/** JSON Schema for tool input parameters. */
export interface ToolInputSchema {
  type: 'object';
  properties: Record<string, unknown>;
  required?: string[];
  additionalProperties?: boolean;
}

/** A tool definition sent to the provider to enable tool use. */
export interface ToolDefinition {
  name: string;
  description: string;
  input_schema: ToolInputSchema;
}

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
  /** Tool results attached to this user message (for agentic loop re-submission). */
  toolResults?: ToolResultBlock[];
}

/** A message produced by the assistant (may be streaming). */
export interface AssistantMessage {
  type: 'assistant_message';
  text: string;
  timestamp: number;
  /** True while the assistant is still emitting text chunks. */
  isStreaming: boolean;
  /** Content blocks from the API response (text + tool_use interleaved). */
  contentBlocks?: ReadonlyArray<ContentBlock>;
}

/** The result payload of a completed or failed tool call. */
export interface ToolCallResult {
  readonly status: 'completed' | 'failed' | 'streaming';
  readonly content?: ReadonlyArray<Readonly<{ type: string; content?: Readonly<{ type: string; text: string }> }>>;
  readonly rawOutput?: Readonly<Record<string, unknown>> | string;
}

/** A tool invocation tracked in the conversation. */
export interface ToolCallItem {
  readonly type: 'tool_call';
  readonly toolCallId: string;
  readonly title: string;
  readonly kind: string;
  readonly status: 'pending' | 'in_progress' | 'completed' | 'failed';
  readonly locations?: ReadonlyArray<Readonly<{ path: string }>>;
  readonly rawInput?: Readonly<Record<string, unknown>>;
  readonly result?: ToolCallResult;
  readonly collapsed: boolean;
  /** If set, this tool call is a child of a Task (subagent) tool call. */
  readonly parentToolCallId?: string;
  /** Accumulated streaming output received while tool is in_progress. */
  readonly streamingOutput?: string;
  /** Whether streaming output is actively being received. */
  readonly isStreaming?: boolean;
  /** Associated terminal ID for client-side polling (Bash tools). */
  readonly terminalId?: string;
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
  readonly content: string;
  readonly priority: 'high' | 'medium' | 'low';
  readonly status: 'pending' | 'in_progress' | 'completed';
}

/** A plan item containing an ordered list of plan entries. */
export interface PlanItem {
  readonly type: 'plan';
  readonly entries: ReadonlyArray<Readonly<PlanEntry>>;
}

/** Context-window and cost usage information. */
export interface UsageInfo {
  readonly size: number;
  readonly used: number;
  readonly cost?: Readonly<{ amount: number; currency: string }> | null;
  readonly inputTokens?: number;
  readonly outputTokens?: number;
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
  /** Tool name as reported by the model. */
  name: string;
  /** Display title (may be the same as name). */
  title: string;
  kind: string;
}

/** Incremental JSON delta for tool input arguments (streaming assembly). */
export interface StreamToolCallInputDelta {
  type: 'tool_call_input_delta';
  toolCallId: string;
  partialJson: string;
}

/**
 * Signals that a tool call's input has been fully assembled and is ready
 * for execution. Emitted after all input_json_delta chunks are received.
 */
export interface StreamToolCallReady {
  type: 'tool_call_ready';
  toolCallId: string;
  name: string;
  input: Record<string, unknown>;
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

/**
 * The message stream has completed normally.
 * stopReason discriminates whether the model wants to call tools or end the turn:
 * - 'end_turn': conversation is complete, model is done speaking
 * - 'tool_use': model requested tool call(s), expects tool results to continue
 * - 'max_tokens': hit the token budget
 * - 'stop_sequence': hit a stop sequence
 */
export interface StreamMessageComplete {
  type: 'message_complete';
  stopReason: 'end_turn' | 'tool_use' | 'max_tokens' | 'stop_sequence' | string;
}

/** An error occurred during streaming. */
export interface StreamError {
  type: 'error';
  error: SessionError;
}

/** Discriminated union of all stream event types emitted by providers. */
export type StreamEvent =
  | StreamTextDelta
  | StreamThinkingDelta
  | StreamToolCallStart
  | StreamToolCallInputDelta
  | StreamToolCallReady
  | StreamToolCallEnd
  | StreamUsageUpdate
  | StreamMessageComplete
  | StreamError;

// ---------------------------------------------------------------------------
// Session Lifecycle Types
// ---------------------------------------------------------------------------

/**
 * Deterministic session lifecycle states.
 *
 * Transitions:
 *   idle -> processing -> streaming -> complete
 *                                   -> tool_execution (agentic loop)
 *                                   -> error
 *                                   -> cancelled
 *   processing -> error
 *              -> cancelled
 *   tool_execution -> processing (re-submit with tool results)
 *   complete/error/cancelled -> idle (via reset)
 */
export type SessionLifecycle =
  | 'idle'
  | 'processing'
  | 'streaming'
  | 'tool_execution'
  | 'complete'
  | 'error'
  | 'cancelled';

// ---------------------------------------------------------------------------
// Conversation Snapshot (N2)
// ---------------------------------------------------------------------------

/** Named type for the frozen snapshot returned by SessionState.snapshot. */
export type ConversationSnapshot = Readonly<{
  items: ReadonlyArray<Readonly<ConversationItem>>;
  version: number;
  lifecycle: SessionLifecycle;
  plan?: PlanItem | null;
  usage?: UsageInfo | null;
}>;

// ---------------------------------------------------------------------------
// Token Usage Tracking (N14)
// ---------------------------------------------------------------------------

/** Structured token usage counters for tracking API consumption. */
export interface TokenUsage {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
}

// ---------------------------------------------------------------------------
// Thread Management Types (THRD-01)
// ---------------------------------------------------------------------------

/** Thread ID format: "T-{uuid}" matching AMP's Gf schema. */
export type ThreadID = `T-${string}`;

/** Generates a new ThreadID in "T-{uuid}" format. */
export function generateThreadID(): ThreadID {
  return `T-${crypto.randomUUID()}` as ThreadID;
}

/** Visibility mode for a thread. Matches AMP's switchThreadVisibility. */
export type ThreadVisibility = 'visible' | 'hidden' | 'archived';

/**
 * ThreadHandle wraps a per-thread SessionState + ConversationState pair.
 * Mirrors AMP's yZR class from 20_thread_management.js SECTION 8.
 * Each thread gets its own independent state instances.
 */
export interface ThreadHandle {
  /** The thread ID in "T-{uuid}" format. */
  readonly threadID: ThreadID;
  /** Per-thread session state machine. */
  readonly session: import('./session').SessionState;
  /** Per-thread conversation grouped view. */
  readonly conversation: import('./conversation').ConversationState;
  /** Thread title (auto-generated or user-set). */
  title: string | null;
  /** When the thread was created (epoch ms). */
  readonly createdAt: number;
  /** Thread visibility mode. */
  visibility: ThreadVisibility;
  /** The agent mode active when this thread was created. */
  agentMode: string | null;
}
