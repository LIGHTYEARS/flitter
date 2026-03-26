// ACP type re-exports and custom extensions for flitter-amp

// Re-export everything from the ACP SDK for convenience
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
  LoadSessionRequest,
  LoadSessionResponse,
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
}

export interface ToolCallResult {
  status: 'completed' | 'failed';
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
  inputTokens: number;
  outputTokens: number;
  cost?: number;
}

export type ConversationItem = UserMessage | AssistantMessage | ToolCallItem | PlanItem | ThinkingItem;
