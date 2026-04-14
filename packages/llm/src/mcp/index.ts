/**
 * @flitter/llm — MCP Module
 *
 * Complete MCP client stack: types, protocol, transports, auth,
 * connection lifecycle, server management, and tool utilities.
 */

// ─── Auth ─────────────────────────────────────────────────
export type {
  AuthorizationServerMetadata,
  AuthResult,
  MCPAuthProvider,
  OAuthClientInfo,
  OAuthClientMetadata,
  OAuthTokens,
  ProtectedResourceMetadata,
} from "./auth/types";
export type {
  MCPCommandServerSpec,
  MCPConnectionError,
  MCPConnectionOptions,
  MCPConnectionStatus,
  MCPServerSpec,
  MCPURLServerSpec,
} from "./connection";
// ─── Connection ───────────────────────────────────────────
export {
  MCPClient,
  MCPConnection,
  RECONNECT_CONFIG,
} from "./connection";
// ─── Protocol ─────────────────────────────────────────────
export {
  createErrorResponse,
  createNotification,
  createRequest,
  createSuccessResponse,
  McpError,
  parseMessage,
  RequestManager,
  serializeMessage,
} from "./protocol";
export type {
  MCPServerInfo,
  MCPServerManagerOptions,
  NamespacedMCPTool,
} from "./server-manager";
// ─── Server Manager ───────────────────────────────────────
export { MCPServerManager } from "./server-manager";
// ─── Tools ────────────────────────────────────────────────
export {
  formatToolError,
  namespacedToolName,
  parseNamespacedToolName,
  sanitizeName,
  truncateToolResult,
} from "./tools";
// ─── Transport ────────────────────────────────────────────
export { ReadBuffer } from "./transport/read-buffer";
export { SSETransport } from "./transport/sse";
export { SSEEventParser } from "./transport/sse-parser";
export type { StdioTransportOptions } from "./transport/stdio";
export { StdioTransport } from "./transport/stdio";
export { StreamableHTTPTransport } from "./transport/streamable-http";
// ─── Types ────────────────────────────────────────────────
export type {
  ClientCapabilities,
  ImplementationInfo,
  InitializeResult,
  JSONRPCErrorResponse,
  JSONRPCMessage,
  JSONRPCNotification,
  JSONRPCRequest,
  JSONRPCResponse,
  JSONRPCSuccessResponse,
  MCPPrompt,
  MCPPromptArgument,
  MCPResource,
  MCPResourceContents,
  MCPTool,
  MCPToolContent,
  MCPToolImageContent,
  MCPToolResult,
  MCPToolTextContent,
  MCPTransport,
  ProtocolVersion,
  ServerCapabilities,
} from "./types";
export { ErrorCode, LATEST_PROTOCOL_VERSION, Method, PROTOCOL_VERSIONS } from "./types";
