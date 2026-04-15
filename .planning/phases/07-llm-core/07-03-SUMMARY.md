---
phase: 7
plan: 03
status: complete
---

# Anthropic Claude Provider — Summary

## One-Liner
Implemented the Anthropic Claude provider with full Messages API support via the @anthropic-ai/sdk, including Thinking Blocks, Cache Control, and SSE event transformation.

## What Was Built
- `packages/llm/src/providers/anthropic/transformer.ts` -- Anthropic native types (AnthropicMessage, AnthropicContentBlock, AnthropicSSEEvent, AnthropicDelta, etc.), `AnthropicToolTransformer` (ToolDefinition to AnthropicTool with deduplication), `AnthropicTransformer` extending BaseMessageTransformer with full bidirectional conversion
- `packages/llm/src/providers/anthropic/provider.ts` -- `AnthropicProvider` implementing `LLMProvider`, constructor-injectable SDK client, stream() method building request body with thinking/speed/temperature/effort config, SDK error to ProviderError conversion
- `packages/llm/src/providers/anthropic/provider.test.ts` -- 28 tests covering transformer, delta handling, full stream simulation, and provider configuration

## Key Decisions
- Uses `@anthropic-ai/sdk` (official SDK) rather than raw fetch+SSE -- the original plan called for self-封装 but the SDK provides better reliability, automatic retry, and type safety
- Constructor injection pattern: `new AnthropicProvider(client?)` accepts optional SDK client for testing with mock async iterables
- OAuth token support: detects `sk-ant-oat-` prefix to use `authToken` instead of `apiKey` in SDK client configuration
- Custom `baseURL` support via `settings["anthropic.baseURL"]` for Volcengine ARK and other Anthropic-compatible endpoints
- Thinking configuration: EAP models get `{ type: "adaptive" }` + output_config.effort mapping; standard models get `{ type: "enabled", budget_tokens: maxOutputTokens }`
- Interleaved thinking beta header (`interleaved-thinking-2025-05-14`) conditionally added based on settings
- Fast mode beta header (`fast-mode-2026-02-01`) conditionally added for speed optimization
- `toProviderMessages()` returns only messages array; `toSystemBlocks()` is a separate method for system prompt conversion (Anthropic requires them separately)
- Trailing thinking/redacted_thinking blocks stripped from assistant messages (Anthropic API requirement)
- Adjacent same-role messages merged (Anthropic requires alternating user/assistant)
- tool_use JSON accumulated via `_partialJSON` string concatenation, parsed to `input` on `content_block_stop`

## Test Coverage
28 tests across 8 describe blocks:
- toProviderMessages: 8 tests (text, image, tool_use, thinking, non-anthropic thinking filter, tool_result, cache_control, merge adjacent, incomplete tool_use filter)
- fromProviderDelta: 7 tests (message_start, content_block_start, text_delta, input_json_delta, thinking_delta, content_block_stop, message_delta)
- Full stream simulation: 4 tests (simple text, tool_use with JSON accumulation, thinking+text interleaved, multi-block interleaved)
- AnthropicToolTransformer: 3 tests (convert, empty, deduplicate)
- Ping handling: 1 test
- Cache usage: 1 test (cache_creation + cache_read tokens in usage)
- Provider baseURL: 2 tests (custom baseURL from settings, default)

## Artifacts
- `packages/llm/src/providers/anthropic/transformer.ts`
- `packages/llm/src/providers/anthropic/provider.ts`
- `packages/llm/src/providers/anthropic/provider.test.ts`
