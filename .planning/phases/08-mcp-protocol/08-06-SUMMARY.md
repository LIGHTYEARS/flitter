---
phase: 8
plan: 06
status: complete
---

# MCP Connection, Server Manager & Tool Utilities -- Summary

## One-Liner
Implemented the top-level MCP client stack: MCPClient for transport-level protocol handshake, MCPConnection for single-server lifecycle management with auto-reconnection, MCPServerManager for multi-server aggregation with namespaced tool routing, tool naming utilities, and a barrel index exporting the complete MCP public API.

## What Was Built
- `connection.ts` -- MCPClient class (wraps transport + RequestManager, performs initialize handshake sending protocolVersion/capabilities/clientInfo, sends notifications/initialized, provides listTools/callTool/listResources/readResource/listPrompts/getPrompt high-level API with timeout support, notification handler registration, onclose wiring); MCPConnection class (manages single server lifecycle with BehaviorSubject observables for status$/tools$/resources$/prompts$/toolsLoaded$, auto-reconnection with exponential backoff via RECONNECT_CONFIG, tool/resource/prompt discovery on connect, list_changed notification handlers for live updates, permanent error detection to skip reconnection, createTransport/createClient injection points for testing); MCPConnectionStatus union type; MCPServerSpec types (command-based and URL-based)
- `server-manager.ts` -- MCPServerManager class (aggregates multiple MCPConnections, creates/destroys/rebuilds connections on config changes using JSON.stringify spec comparison, subscribes to each connection's BehaviorSubjects for aggregated state, exposes servers$ and allTools$ BehaviorSubjects, routes callTool by parsing namespaced names, provides getConnection/getServerNames/refresh/dispose); MCPServerInfo and NamespacedMCPTool interfaces
- `tools.ts` -- sanitizeName (spaces/hyphens to underscores, strip non-alphanumeric, collapse runs, trim edges, fallback), namespacedToolName (mcp__server__tool pattern, truncate to 64 chars), parseNamespacedToolName (reverse parse with double-underscore splitting), truncateToolResult (byte-length check with truncation notice), formatToolError (extract text entries with fallback message)
- `index.ts` -- Barrel export aggregating all public types, classes, functions, and constants from the entire MCP module
- Test files: connection.test.ts (29 tests), server-manager.test.ts (16 tests), tools.test.ts (31 tests)

## Key Decisions
- MCPClient and MCPConnection are separate classes: Client handles protocol-level concerns (handshake, request/response), Connection handles lifecycle concerns (reconnection, discovery, observables)
- Reconnection uses configurable exponential backoff (default: max 3 retries, 1s initial, 1.5x factor, 30s max) with permanent error detection for auth-failed and permission-denied codes
- MCPConnection accepts createTransport and createClient factory functions in options, enabling full testability without real transports
- The default _createTransport throws an error, requiring explicit transport factory injection -- production code must provide this
- MCPServerManager compares specs via JSON.stringify for change detection, only recreating connections whose specs actually changed
- Tool namespacing uses mcp__server__tool pattern (double underscores as separators) with 64-char max; names exceeding the limit fall back to just the tool name
- parseNamespacedToolName uses lastIndexOf("__") to handle server names containing underscores
- BehaviorSubject (from @flitter/util) is used throughout for reactive state management
- Connection timeout is 60s; tool call timeout is ~999999s (effectively unlimited) to avoid premature timeouts on long-running tools

## Test Coverage
76 tests total across three test files. connection.test.ts (29 tests): MCPClient connect handshake, initialized notification, server capabilities storage, transport start failure, listTools/callTool/listResources/readResource/listPrompts/getPrompt, notification handler set/remove, close with transport cleanup, pending request rejection on close, idempotent close, onclose callback; MCPConnection connected status, tool population, BehaviorSubject exposure, failed status on error, permanent error non-reconnection, callTool success/failure, list_changed refresh, dispose cleanup/idempotent, reconnect scheduling, reconnect timer cancellation. server-manager.test.ts (16 tests): connection creation from config, servers$ BehaviorSubject, namespaced tool aggregation single/multi-server, callTool routing, invalid/unknown name errors, tools$ change propagation, refresh add/remove servers, no-recreate on unchanged spec, recreate on changed spec, getConnection/getServerNames, dispose all, idempotent dispose. tools.test.ts (31 tests): sanitizeName alphanumeric/spaces/hyphens/mixed/special/collapse/trim/fallback/complex, namespacedToolName pattern/sanitize/truncate/short/empty/special, parseNamespacedToolName valid/invalid/partial/server-underscores/tool-underscores/empty/malformed, truncateToolResult short/long/image/mixed, formatToolError text/multi/empty/whitespace.

## Artifacts
- `packages/llm/src/mcp/connection.ts`
- `packages/llm/src/mcp/connection.test.ts`
- `packages/llm/src/mcp/server-manager.ts`
- `packages/llm/src/mcp/server-manager.test.ts`
- `packages/llm/src/mcp/tools.ts`
- `packages/llm/src/mcp/tools.test.ts`
- `packages/llm/src/mcp/index.ts`
