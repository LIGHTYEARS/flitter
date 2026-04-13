/**
 * @flitter/llm — MCP Module
 *
 * Complete MCP client stack: types, protocol, transports, auth,
 * connection lifecycle, server management, and tool utilities.
 */

// ─── Types ────────────────────────────────────────────────
export type {
  JSONRPCRequest,
  JSONRPCNotification,
  JSONRPCSuccessResponse,
  JSONRPCErrorResponse,
  JSONRPCResponse,
  JSONRPCMessage,
  ClientCapabilities,
  ServerCapabilities,
  ImplementationInfo,
  InitializeResult,
  MCPTransport,
  MCPTool,
  MCPToolResult,
  MCPToolContent,
  MCPToolTextContent,
  MCPToolImageContent,
  MCPResource,
  MCPResourceContents,
  MCPPrompt,
  MCPPromptArgument,
  ProtocolVersion,
} from "./types";
export { ErrorCode, Method, PROTOCOL_VERSIONS, LATEST_PROTOCOL_VERSION } from "./types";

// ─── Protocol ─────────────────────────────────────────────
export {
  createRequest,
  createNotification,
  createSuccessResponse,
  createErrorResponse,
  parseMessage,
  serializeMessage,
  McpError,
  RequestManager,
} from "./protocol";

// ─── Transport ────────────────────────────────────────────
export { ReadBuffer } from "./transport/read-buffer";
export { StdioTransport } from "./transport/stdio";
export type { StdioTransportOptions } from "./transport/stdio";
export { StreamableHTTPTransport } from "./transport/streamable-http";
export { SSETransport } from "./transport/sse";
export { SSEEventParser } from "./transport/sse-parser";

// ─── Auth ─────────────────────────────────────────────────
export type {
  MCPAuthProvider,
  OAuthTokens,
  OAuthClientInfo,
  OAuthClientMetadata,
  ProtectedResourceMetadata,
  AuthorizationServerMetadata,
  AuthResult,
} from "./auth/types";

// ─── Tools ────────────────────────────────────────────────
export {
  sanitizeName,
  namespacedToolName,
  parseNamespacedToolName,
  truncateToolResult,
  formatToolError,
} from "./tools";

// ─── Connection ───────────────────────────────────────────
export {
  MCPClient,
  MCPConnection,
  RECONNECT_CONFIG,
} from "./connection";
export type {
  MCPConnectionStatus,
  MCPConnectionError,
  MCPCommandServerSpec,
  MCPURLServerSpec,
  MCPServerSpec,
  MCPConnectionOptions,
} from "./connection";

// ─── Server Manager ───────────────────────────────────────
export { MCPServerManager } from "./server-manager";
export type {
  MCPServerInfo,
  NamespacedMCPTool,
  MCPServerManagerOptions,
} from "./server-manager";
