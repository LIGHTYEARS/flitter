/**
 * @flitter/schemas — MCP 协议 Zod Schema
 *
 * JSON-RPC 2.0、MCP 连接状态、工具定义、传输类型、Skill 系统
 * 从 amp-cli-reversed/app/mcp-transport.js 和 mcp-tools-integration.js 提取
 */
import { z } from "zod";

// ─── JSON-RPC 2.0 ──────────────────────────────────────

export const JSONRPCRequestSchema = z.object({
  jsonrpc: z.literal("2.0"),
  id: z.union([z.string(), z.number()]),
  method: z.string(),
  params: z.unknown().optional(),
});
export type JSONRPCRequest = z.infer<typeof JSONRPCRequestSchema>;

export const JSONRPCSuccessResponseSchema = z.object({
  jsonrpc: z.literal("2.0"),
  id: z.union([z.string(), z.number()]),
  result: z.unknown(),
});
export type JSONRPCSuccessResponse = z.infer<typeof JSONRPCSuccessResponseSchema>;

export const JSONRPCErrorResponseSchema = z.object({
  jsonrpc: z.literal("2.0"),
  id: z.union([z.string(), z.number()]),
  error: z.object({
    code: z.number(),
    message: z.string(),
    data: z.unknown().optional(),
  }),
});
export type JSONRPCErrorResponse = z.infer<typeof JSONRPCErrorResponseSchema>;

export const JSONRPCResponseSchema = z.union([
  JSONRPCSuccessResponseSchema,
  JSONRPCErrorResponseSchema,
]);
export type JSONRPCResponse = z.infer<typeof JSONRPCResponseSchema>;

export const JSONRPCNotificationSchema = z.object({
  jsonrpc: z.literal("2.0"),
  method: z.string(),
  params: z.unknown().optional(),
});
export type JSONRPCNotification = z.infer<typeof JSONRPCNotificationSchema>;

// ─── JSON-RPC 错误码 ───────────────────────────────────

export const JSONRPCErrorCodeSchema = z.enum([
  "RequestTimeout",
  "ConnectionClosed",
  "InvalidRequest",
  "InvalidParams",
  "ParseError",
  "MethodNotFound",
  "InternalError",
]);
export type JSONRPCErrorCode = z.infer<typeof JSONRPCErrorCodeSchema>;

// ─── MCP Connection Error ──────────────────────────────

export const MCPConnectionErrorCodeSchema = z.enum([
  "timeout",
  "network",
  "server-error",
  "auth-failed",
  "spawn-failed",
  "permission-denied",
]);

export const MCPConnectionErrorSchema = z.object({
  code: MCPConnectionErrorCodeSchema,
  message: z.string(),
  stderr: z.string().optional(),
});
export type MCPConnectionError = z.infer<typeof MCPConnectionErrorSchema>;

// ─── MCP Connection Status (type 判别，8 种) ───────────

export const MCPConnectingSchema = z.object({ type: z.literal("connecting") });
export const MCPAuthenticatingSchema = z.object({ type: z.literal("authenticating") });
export const MCPReconnectingSchema = z.object({
  type: z.literal("reconnecting"),
  attempt: z.number(),
  nextRetryMs: z.number(),
});
export const MCPConnectedSchema = z.object({
  type: z.literal("connected"),
  capabilities: z.record(z.string(), z.unknown()),
  serverInfo: z.record(z.string(), z.unknown()),
});
export const MCPDeniedSchema = z.object({ type: z.literal("denied") });
export const MCPAwaitingApprovalSchema = z.object({ type: z.literal("awaiting-approval") });
export const MCPFailedSchema = z.object({
  type: z.literal("failed"),
  error: MCPConnectionErrorSchema,
});
export const MCPBlockedByRegistrySchema = z.object({
  type: z.literal("blocked-by-registry"),
  registryUrl: z.string(),
});

export const MCPConnectionStatusSchema = z.discriminatedUnion("type", [
  MCPConnectingSchema,
  MCPAuthenticatingSchema,
  MCPReconnectingSchema,
  MCPConnectedSchema,
  MCPDeniedSchema,
  MCPAwaitingApprovalSchema,
  MCPFailedSchema,
  MCPBlockedByRegistrySchema,
]);
export type MCPConnectionStatus = z.infer<typeof MCPConnectionStatusSchema>;

// ─── MCP Server Spec ───────────────────────────────────

export const MCPCommandServerSpecSchema = z.object({
  command: z.string(),
  args: z.array(z.string()).optional(),
  env: z.record(z.string(), z.string()).optional(),
  _target: z.string().optional(),
});
export type MCPCommandServerSpec = z.infer<typeof MCPCommandServerSpecSchema>;

export const MCPURLServerSpecSchema = z.object({
  url: z.string(),
  headers: z.record(z.string(), z.string()).optional(),
  transport: z.string().optional(),
  _target: z.string().optional(),
});
export type MCPURLServerSpec = z.infer<typeof MCPURLServerSpecSchema>;

export const MCPServerSpecSchema = z.union([MCPCommandServerSpecSchema, MCPURLServerSpecSchema]);
export type MCPServerSpec = z.infer<typeof MCPServerSpecSchema>;

// ─── MCP Transport Type ────────────────────────────────

export const MCPTransportTypeSchema = z.enum([
  "StdioClientTransport",
  "SSEClientTransport",
  "StreamableHTTPClientTransport",
]);
export type MCPTransportType = z.infer<typeof MCPTransportTypeSchema>;

// ─── MCP Tool Spec ─────────────────────────────────────

export const MCPToolSpecSchema = z.object({
  name: z.string(),
  description: z.string(),
  inputSchema: z.record(z.string(), z.unknown()),
  source: z.object({
    mcp: z.string(),
    target: z.string().optional(),
  }),
  meta: z.record(z.string(), z.unknown()).optional(),
});
export type MCPToolSpec = z.infer<typeof MCPToolSpecSchema>;

// ─── MCP Tool Content ──────────────────────────────────

export const MCPToolTextContentSchema = z.object({
  type: z.literal("text"),
  text: z.string(),
});

export const MCPToolImageContentSchema = z.object({
  type: z.literal("image"),
  data: z.string(),
  mimeType: z.string(),
});

export const MCPToolContentSchema = z.discriminatedUnion("type", [
  MCPToolTextContentSchema,
  MCPToolImageContentSchema,
]);
export type MCPToolContent = z.infer<typeof MCPToolContentSchema>;

// ─── Guidance File ─────────────────────────────────────

export const GuidanceFileTypeSchema = z.enum(["project", "user", "parent", "subtree", "mentioned"]);
export type GuidanceFileType = z.infer<typeof GuidanceFileTypeSchema>;

export const GuidanceFileSchema = z.object({
  uri: z.string(),
  content: z.string(),
  type: GuidanceFileTypeSchema,
  priority: z.number(),
  globs: z.array(z.string()).optional(),
});
export type GuidanceFile = z.infer<typeof GuidanceFileSchema>;

// ─── Skill System ──────────────────────────────────────

export const SkillFrontmatterSchema = z.object({
  name: z.string(),
  description: z.string(),
  compatibility: z.string().optional(),
  isolatedContext: z.boolean().optional(),
  "disable-model-invocation": z.boolean().optional(),
  "argument-hint": z.string().optional(),
  "builtin-tools": z.array(z.string()).optional(),
});
export type SkillFrontmatter = z.infer<typeof SkillFrontmatterSchema>;

export const SkillSchema = z.object({
  name: z.string(),
  description: z.string(),
  frontmatter: SkillFrontmatterSchema,
  content: z.string(),
  baseDir: z.string(),
  mcpServers: z.record(z.string(), MCPServerSpecSchema).optional(),
  builtinTools: z.array(z.string()).optional(),
  files: z.array(z.string()).optional(),
});
export type Skill = z.infer<typeof SkillSchema>;
