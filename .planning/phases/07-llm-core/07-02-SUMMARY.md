---
phase: 7
plan: 02
status: complete
---

# SSE Stream Infrastructure — Summary

## One-Liner
Implemented SSE parsing infrastructure as part of the MCP transport layer, providing both a TransformStream-based parser and a minimal line parser for SSE event processing.

## What Was Built
- `packages/llm/src/mcp/transport/sse-parser.ts` -- Full W3C-compliant SSE parser: `SSEEvent` interface, `createSSEParser()` state machine (feed/reset), `SSEEventParser` TransformStream class, `splitLines()` helper handling \n/\r\n/\r line endings
- `packages/llm/src/mcp/transport/sse.ts` -- MCP SSE Transport with inline `SSELineParser` class: minimal SSE parsing for the legacy MCP SSE transport, plus `SSETransport` implementing `MCPTransport` for GET+POST JSON-RPC over SSE
- `packages/llm/src/mcp/transport/sse.test.ts` -- 31 tests covering SSELineParser and SSETransport with real HTTP servers

## Key Decisions
- Plan originally specified `packages/llm/src/stream/` directory for SSE parser, retry policy, and fetchSSE -- implementation landed in `packages/llm/src/mcp/transport/` instead, with SSE parsing integrated into the MCP transport layer
- Two SSE parser implementations exist: `sse-parser.ts` (full spec, TransformStream-based with BOM stripping, retry/comment callbacks) and `sse.ts` inline `SSELineParser` (minimal, synchronous feed-based for MCP transport self-containment)
- Provider streaming uses SDK clients (@anthropic-ai/sdk, openai, @google/genai) rather than raw fetch+SSE, so the fetchSSE/RetryPolicy from the original plan was not needed as a separate layer -- SDKs handle retry and HTTP internally
- `SSEEventParser` implements the TransformStream API for pipeline composition: `response.body.pipeThrough(new TextDecoderStream()).pipeThrough(new SSEEventParser())`
- `SSELineParser` handles field parsing per spec: event/data/id/retry fields, comment skipping, multi-line data joining, `\r\n` and `\r` line endings
- SSETransport validates endpoint origin matches connection origin for security (cross-origin rejection)

## Test Coverage
31 tests across 2 describe blocks:
- SSELineParser: 10 tests (simple message, named events, multi-line data, cross-chunk splits, comments, \r\n handling, field with no value, reset, multiple events)
- SSETransport: 21 tests with real node:http servers (connect + endpoint discovery, double-start rejection, message receiving, message sending, origin validation, auth headers, custom headers, protocol version, close behavior, reconnect, error handling for 500/401/invalid JSON, server-close detection, custom fetch, relative URL resolution, Accept header, null auth provider)

## Artifacts
- `packages/llm/src/mcp/transport/sse-parser.ts`
- `packages/llm/src/mcp/transport/sse.ts`
- `packages/llm/src/mcp/transport/sse.test.ts`
