// ACP type re-exports and custom extensions for flitter-amp

// Re-export ACP SDK types used by flitter-amp's connection and client layers.
export type {
  InitializeRequest,
  InitializeResponse,
  NewSessionRequest,
  NewSessionResponse,
  PromptRequest,
  PromptResponse,
  CancelNotification,
  AuthenticateRequest,
  AuthenticateResponse,
  SessionNotification,
  RequestPermissionRequest,
  RequestPermissionResponse,
  ReadTextFileRequest,
  ReadTextFileResponse,
  WriteTextFileRequest,
  WriteTextFileResponse,
  CreateTerminalRequest,
  CreateTerminalResponse,
} from '@agentclientprotocol/sdk';

// Conversation item types for the TUI
export type MessageRole = 'user' | 'assistant';

export interface UserMessage {
  type: 'user_message';
  text: string;
  timestamp: number;
  /** When true, indicates the response following this message was interrupted. */
  interrupted?: boolean;
  /** When true, indicates the response following this message was interrupted. */
  interrupted?: boolean;
}

export interface AssistantMessage {
  type: 'assistant_message';
  text: string;
  timestamp: number;
  isStreaming: boolean;
}

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
  /** If set, this tool call is a child of a Task (subagent) tool call */
  parentToolCallId?: string;

  // Streaming output fields
  /** Accumulated streaming output received while tool is in_progress */
  streamingOutput?: string;
  /** Whether streaming output is actively being received */
  isStreaming?: boolean;
  /** Associated terminal ID for client-side polling (Bash tools) */
  terminalId?: string;
}

export interface ToolCallResult {
  status: 'completed' | 'failed' | 'streaming';
  content?: Array<{ type: string; content?: { type: string; text: string } }>;
  rawOutput?: Record<string, unknown>;
}

export interface ThinkingItem {
  type: 'thinking';
  text: string;
  timestamp: number;
  isStreaming: boolean;
  collapsed: boolean;
}

export interface PlanItem {
  type: 'plan';
  entries: Array<PlanEntry>;
}

export interface PlanEntry {
  content: string;
  priority: 'high' | 'medium' | 'low';
  status: 'pending' | 'in_progress' | 'completed';
}

export interface UsageInfo {
  size: number;
  used: number;
  cost?: { amount: number; currency: string } | null;
}

export interface SystemMessage {
  type: 'system_message';
  text: string;
  timestamp: number;
}

export type ConversationItem = UserMessage | AssistantMessage | ToolCallItem | PlanItem | ThinkingItem | SystemMessage;

// --- Session info update types (Gap #48) ---

export interface SessionTools {
  name: string;
  description?: string;
}

export interface SessionMode {
  id: string;
  name: string;
  description?: string;
}

export interface SessionInfoPayload {
  sessionUpdate: 'session_info_update';
  agentName?: string;
  agentVersion?: string;
  cwd?: string;
  gitBranch?: string | null;
  tools?: Array<{ name: string; description?: string }>;
  modes?: Array<{ id: string; name: string; description?: string }>;
  hintText?: string | null;
  autocompleteTriggers?: Array<{ trigger: string; description?: string }>;
}
