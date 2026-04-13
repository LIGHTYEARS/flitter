/**
 * @flitter/llm — MCP Protocol Types
 *
 * JSON-RPC 2.0 message types, MCP error codes, method constants,
 * protocol versions, capabilities, and transport interface.
 * Zero external MCP SDK dependency (KD-24).
 */

// JSON-RPC 2.0 Message Types
export interface JSONRPCRequest {
  jsonrpc: "2.0";
  id: string | number;
  method: string;
  params?: unknown;
}

export interface JSONRPCNotification {
  jsonrpc: "2.0";
  method: string;
  params?: unknown;
}

export interface JSONRPCSuccessResponse {
  jsonrpc: "2.0";
  id: string | number;
  result: unknown;
}

export interface JSONRPCErrorResponse {
  jsonrpc: "2.0";
  id: string | number;
  error: {
    code: number;
    message: string;
    data?: unknown;
  };
}

export type JSONRPCResponse = JSONRPCSuccessResponse | JSONRPCErrorResponse;
export type JSONRPCMessage = JSONRPCRequest | JSONRPCNotification | JSONRPCResponse;

// Error Codes (from reversed c9 enum)
export const ErrorCode = {
  ConnectionClosed: -32000,
  RequestTimeout: -32001,
  ParseError: -32700,
  InvalidRequest: -32600,
  MethodNotFound: -32601,
  InvalidParams: -32602,
  InternalError: -32603,
  UrlElicitationRequired: -32042,
} as const;
export type ErrorCode = (typeof ErrorCode)[keyof typeof ErrorCode];

// MCP Method Constants
export const Method = {
  Initialize: "initialize",
  Initialized: "notifications/initialized",
  Ping: "ping",
  ToolsList: "tools/list",
  ToolsCall: "tools/call",
  ResourcesList: "resources/list",
  ResourcesRead: "resources/read",
  PromptsList: "prompts/list",
  PromptsGet: "prompts/get",
  ListChanged: "notifications/tools/list_changed",
  ResourcesListChanged: "notifications/resources/list_changed",
  PromptsListChanged: "notifications/prompts/list_changed",
  LoggingMessage: "notifications/message",
  CancelledNotification: "notifications/cancelled",
} as const;
export type Method = (typeof Method)[keyof typeof Method];

// Protocol versions (newest first, from reversed XLT)
export const PROTOCOL_VERSIONS = [
  "2025-03-26",  // stable target per KD-20
  "2024-11-05",
  "2024-10-07",
] as const;
export type ProtocolVersion = (typeof PROTOCOL_VERSIONS)[number];

export const LATEST_PROTOCOL_VERSION: ProtocolVersion = "2025-03-26";

// Client/Server capabilities
export interface ClientCapabilities {
  roots?: { listChanged?: boolean };
  sampling?: Record<string, unknown>;
  elicitation?: Record<string, unknown>;
  experimental?: Record<string, unknown>;
}

export interface ServerCapabilities {
  tools?: { listChanged?: boolean };
  resources?: { subscribe?: boolean; listChanged?: boolean };
  prompts?: { listChanged?: boolean };
  logging?: Record<string, unknown>;
  experimental?: Record<string, unknown>;
}

export interface ImplementationInfo {
  name: string;
  version: string;
}

export interface InitializeResult {
  protocolVersion: string;
  capabilities: ServerCapabilities;
  serverInfo: ImplementationInfo;
  instructions?: string;
}

// MCP Transport interface (from reversed TDT/T7/JD pattern)
export interface MCPTransport {
  start(): Promise<void>;
  send(message: JSONRPCMessage): Promise<void>;
  close(): Promise<void>;

  onmessage?: (message: JSONRPCMessage) => void;
  onclose?: () => void;
  onerror?: (error: Error) => void;

  /** Optional: set protocol version for version-aware transports */
  setProtocolVersion?(version: ProtocolVersion): void;
  /** Optional: session ID for session-aware transports */
  sessionId?: string;
}

// MCP Tool types
export interface MCPTool {
  name: string;
  description?: string;
  inputSchema: Record<string, unknown>;
  outputSchema?: Record<string, unknown>;
  annotations?: Record<string, unknown>;
}

export interface MCPToolResult {
  content: MCPToolContent[];
  isError?: boolean;
  _meta?: Record<string, unknown>;
}

export interface MCPToolTextContent {
  type: "text";
  text: string;
}

export interface MCPToolImageContent {
  type: "image";
  data: string;
  mimeType: string;
}

export type MCPToolContent = MCPToolTextContent | MCPToolImageContent;

// MCP Resource types
export interface MCPResource {
  uri: string;
  name: string;
  description?: string;
  mimeType?: string;
}

export interface MCPResourceContents {
  uri: string;
  mimeType?: string;
  text?: string;
  blob?: string;
}

// MCP Prompt types
export interface MCPPrompt {
  name: string;
  description?: string;
  arguments?: MCPPromptArgument[];
}

export interface MCPPromptArgument {
  name: string;
  description?: string;
  required?: boolean;
}
