---
phase: 8
plan: 04
status: complete
---

# MCP SSE Transport (Legacy) -- Summary

## One-Liner
Implemented the legacy SSE transport that establishes a long-lived Server-Sent Events connection, discovers a POST endpoint, validates origin security, and enables bidirectional JSON-RPC communication as a fallback for StreamableHTTP.

## What Was Built
- `transport/sse.ts` -- SSELineParser (inline SSE parser with feed/reset, handling \r\n line endings, comments, named events, multi-line data, and id persistence), SSETransport implementing MCPTransport: GET with `Accept: text/event-stream` to establish SSE connection, endpoint discovery via `event: endpoint`, origin validation (POST endpoint must match connection origin), message sending via POST to discovered endpoint, Bearer auth via SSEAuthProvider, `setProtocolVersion()` for mcp-protocol-version header, AbortController lifecycle, close/restart capability, and custom fetch support
- `transport/sse.test.ts` -- 31 test cases using node:http createServer as mock SSE server

## Key Decisions
- SSE uses an inline SSELineParser rather than reusing SSEEventParser from Plan 08-03; this keeps the SSE transport self-contained with no cross-transport dependency
- SSELineParser defaults event type to "message" when no `event:` field is specified, matching the SSE spec
- SSE connection uses `fetch()` + ReadableStream manual reading rather than browser EventSource API, enabling custom headers and auth
- Origin validation rejects cross-origin POST endpoints immediately during start(), failing the connection promise
- Endpoint URL resolution uses `new URL(data, connectionUrl)` to support both absolute and relative endpoint paths
- After `close()`, the transport resets `_started` to false, allowing `start()` to be called again for reconnection
- Auth provider interface is minimal (`tokens()` returning `{ access_token } | null`) with null indicating no auth

## Test Coverage
31 tests: SSELineParser (10 tests -- simple message, named events, multi-line data, chunked data, comments, space stripping, \r\n, field-no-value, reset, multiple events) and SSETransport (21 tests -- endpoint discovery, double-start rejection, message receiving single/multiple, POST sending with body/headers, send-before-connect error, cross-origin rejection, auth headers on GET+POST, custom headers on GET+POST, protocol version header on GET+POST, close/onclose, restart after close, HTTP 500 on GET, HTTP 500 on POST, HTTP 401 on POST, invalid JSON onerror, server stream close, custom fetch, relative endpoint URL, Accept header, auth provider returning null).

## Artifacts
- `packages/llm/src/mcp/transport/sse.ts`
- `packages/llm/src/mcp/transport/sse.test.ts`
