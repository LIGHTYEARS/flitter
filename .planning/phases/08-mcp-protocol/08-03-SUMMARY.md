---
phase: 8
plan: 03
status: complete
---

# MCP StreamableHTTP Transport & SSE Parser -- Summary

## One-Liner
Implemented the StreamableHTTP transport (HTTP POST with JSON or SSE response streams) and a W3C-compliant SSE event parser as a TransformStream, forming the modern HTTP-based MCP communication layer.

## What Was Built
- `transport/sse-parser.ts` -- SSEEvent interface, SSEEventParserOptions, `splitLines()` helper handling \n/\r\n/bare \r, `createSSEParser()` state machine (feed/reset) processing data/event/id/retry fields per W3C SSE spec with BOM stripping and comment support, and SSEEventParser TransformStream class wrapping the parser for stream pipeline use
- `transport/streamable-http.ts` -- StreamableHTTPTransport implementing MCPTransport: POST JSON-RPC to URL with `Accept: application/json, text/event-stream`, handles JSON direct responses and SSE streamed responses via TextDecoderStream + SSEEventParser pipeline, captures/propagates `mcp-session-id` header, supports Bearer auth via MCPAuthProvider interface, `setProtocolVersion()` for mcp-protocol-version header, `Last-Event-ID` resumption token tracking, `terminateSession()` via HTTP DELETE, 202 Accepted handling for notifications, and custom error types (StreamableHTTPError, UnauthorizedError)
- `transport/streamable-http.test.ts` -- 43 test cases using node:http createServer as mock MCP server

## Key Decisions
- SSE parser is separated into a pure function (`createSSEParser`) and a TransformStream wrapper, improving testability
- `splitLines` handles all three line ending styles (\n, \r\n, bare \r) and treats a trailing bare \r as incomplete to handle cross-chunk splits
- SSE id field persists across events per the W3C spec; event type resets after each dispatch
- StreamableHTTPTransport distinguishes request vs notification messages to decide whether to consume the response body
- Auth provider interface is minimal (`tokens()` returning `{ access_token }`) -- the full OAuth flow is in Plan 08-05
- 401 with auth provider throws UnauthorizedError; 401 without auth provider throws StreamableHTTPError (different types for different handling)
- Session termination tolerates 405 (Method Not Allowed) gracefully for servers that don't support DELETE

## Test Coverage
43 tests: SSEEventParser (18 tests -- single/multiple events, event type, id, multi-line data, comments, BOM, retry valid/invalid, no-space colon, id persistence, chunked input, combined fields, JSON data, \r\n), createSSEParser (2 tests -- feed, reset), StreamableHTTPTransport (23 tests -- double-start, JSON response, SSE stream response, multiple SSE messages, session-id capture/propagation, 202 handling, 401 with/without auth, 500 error, unexpected content-type, auth header, custom headers, protocol version header, terminate session, no-session DELETE skip, 405 tolerance, onerror callback, onclose callback, resumption token, notification body cancellation, URL object constructor, undefined auth tokens, Content-Type/Accept headers).

## Artifacts
- `packages/llm/src/mcp/transport/sse-parser.ts`
- `packages/llm/src/mcp/transport/streamable-http.ts`
- `packages/llm/src/mcp/transport/streamable-http.test.ts`
