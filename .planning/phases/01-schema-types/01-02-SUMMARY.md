---
phase: 1
plan: 02
status: complete
---

# MCP 协议 — Summary

## One-Liner
Defined the complete MCP protocol type system as Zod schemas, covering JSON-RPC 2.0 message formats, 8 MCP connection states, server specifications, tool definitions, transport types, skill system, and guidance files.

## What Was Built
- `JSONRPCRequestSchema`, `JSONRPCSuccessResponseSchema`, `JSONRPCErrorResponseSchema` for JSON-RPC 2.0 messages
- `JSONRPCResponseSchema` (union of success/error), `JSONRPCNotificationSchema` (no id field)
- `JSONRPCErrorCodeSchema` enum with 7 error codes
- `MCPConnectionErrorSchema` with 6 error code variants and optional stderr
- `MCPConnectionStatusSchema` discriminated union with all 8 states: `connecting`, `authenticating`, `reconnecting`, `connected`, `denied`, `awaiting-approval`, `failed`, `blocked-by-registry`
- `MCPServerSpecSchema` union of `MCPCommandServerSpecSchema` (command-based) and `MCPURLServerSpecSchema` (URL-based)
- `MCPTransportTypeSchema` enum: `StdioClientTransport`, `SSEClientTransport`, `StreamableHTTPClientTransport`
- `MCPToolSpecSchema` with name, description, inputSchema, source, and optional meta
- `MCPToolContentSchema` discriminated union: text and image content types
- `GuidanceFileTypeSchema` enum (5 types) and `GuidanceFileSchema`
- `SkillFrontmatterSchema` and `SkillSchema` with mcpServers, builtinTools, and files support
- All schemas export corresponding inferred TypeScript types

## Key Decisions
- JSON-RPC `id` field uses `z.union([z.string(), z.number()])` to match the spec allowing both types
- `MCPServerSpecSchema` uses `z.union` (not discriminatedUnion) since command vs URL specs lack a shared discriminant field
- `MCPToolContentSchema` uses discriminatedUnion on `type` for text vs image tool content
- `inputSchema` in MCPToolSpec modeled as `z.record(z.string(), z.unknown())` to accept arbitrary JSON Schema objects
- Skill's `mcpServers` field reuses `MCPServerSpecSchema` to maintain type consistency with config

## Test Coverage
59 test cases across 19 describe blocks covering:
- JSON-RPC 2.0 request/response/notification parsing with string and numeric ids
- All 7 JSON-RPC error codes and all 6 MCP connection error codes
- All 8 MCPConnectionStatus variants with required fields (attempt, nextRetryMs, capabilities, etc.)
- Command and URL server spec variants (minimal and full)
- MCPToolSpec with full and minimal fields
- MCPToolContent text and image types plus rejection of unknown types
- All 5 GuidanceFile types with and without globs
- SkillFrontmatter minimal and full; Skill with command-based and URL-based mcpServers
- 6 negative tests rejecting wrong jsonrpc version, missing method, invalid status type, etc.
- 5 JSON Schema conversion tests for key schemas

## Artifacts
- `packages/schemas/src/mcp.ts`
- `packages/schemas/src/mcp.test.ts`
- `packages/schemas/src/index.ts` (re-exports `./mcp`)
