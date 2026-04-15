---
phase: 7
plan: 04
status: complete
---

# OpenAI Responses API Provider — Summary

## One-Liner
Implemented the OpenAI provider using the Responses API via the openai SDK, with full support for Reasoning, Function Calls, and prompt caching.

## What Was Built
- `packages/llm/src/providers/openai/transformer.ts` -- OpenAI native types (OpenAIInputItem, OpenAISSEEvent, OpenAIResponse, OpenAIOutputItem, etc.), `OpenAIToolTransformer` (ToolDefinition to OpenAI function tool with strict:false, deduplication), `OpenAITransformer` extending BaseMessageTransformer with Responses API bidirectional conversion
- `packages/llm/src/providers/openai/provider.ts` -- `OpenAIProvider` implementing `LLMProvider`, constructor-injectable SDK client, stream() via `client.responses.create()`, request body with reasoning/service_tier/cache_key/temperature config, SDK error conversion
- `packages/llm/src/providers/openai/provider.test.ts` -- 29 tests covering transformer, delta handling, full stream simulation, tool/usage/config

## Key Decisions
- Uses `openai` SDK and the Responses API (`client.responses.create()`) rather than ChatCompletion API -- the plan specified Responses API for native reasoning and function_call support
- Constructor injection: `new OpenAIProvider(client?)` for testability
- Block index mapping: `_blockIndexMap` maps `item_${output_index}` keys to sequential block indices since OpenAI uses per-item output_index vs sequential block numbering
- Reasoning mapped to ThinkingBlock with `provider: "openai"` and `encrypted_content` stored as `signature` for round-trip fidelity
- Function calls: `call_id` (not `id`) used as the Flitter tool_use block ID, matching OpenAI's Responses API semantics
- Usage calculation: `cacheReadInputTokens = input_tokens_details.cached_tokens`, `cacheCreationInputTokens = input_tokens - cached_tokens`, `inputTokens = 0` (OpenAI reports total only)
- Stop reason inferred from output items: presence of `function_call` items means `tool_use`, otherwise `end_turn`
- System prompt joined into single `{ role: "system", content: string }` (Responses API takes flat string)
- User text content simplified to plain string when single text-only block, array of content parts otherwise
- `stream_options: { include_obfuscation: false }`, `parallel_tool_calls: true`, `store: false` as defaults
- Reasoning effort mapped: none/minimal/low to "low", medium to "medium", high to "high", xhigh to "xhigh", default "medium"
- `include: ["reasoning.encrypted_content"]` added when reasoning is enabled to preserve thinking state

## Test Coverage
29 tests across 7 describe blocks:
- toProviderMessages: 8 tests (system prompt, text, image base64/url, tool_result, assistant text, info summary, mixed content)
- fromProviderDelta: 11 tests (response.created, output_item.added for message/reasoning/function_call, text.delta, reasoning.delta, function_call_arguments.delta, output_item.done, response.completed with usage, response.failed, keepalive)
- Full stream simulation: 3 tests (simple text, tool_use with JSON accumulation, reasoning+text interleaved)
- OpenAIToolTransformer: 3 tests (convert, empty, deduplicate)
- Usage calculation: 2 tests (with/without cached tokens)
- Stop reason: 2 tests (tool_use vs end_turn)

## Artifacts
- `packages/llm/src/providers/openai/transformer.ts`
- `packages/llm/src/providers/openai/provider.ts`
- `packages/llm/src/providers/openai/provider.test.ts`
