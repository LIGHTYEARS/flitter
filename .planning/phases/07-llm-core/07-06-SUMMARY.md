---
phase: 7
plan: 06
status: complete
---

# OpenAI-Compatible Provider (xAI / Groq / DeepSeek / OpenRouter) — Summary

## One-Liner
Implemented a generic OpenAI-compatible ChatCompletion provider supporting xAI, Groq, DeepSeek, OpenRouter, Cerebras, and arbitrary endpoints via a configurable compatibility layer.

## What Was Built
- `packages/llm/src/providers/openai-compat/transformer.ts` -- ChatCompletion native types (CompatChatMessage, CompatStreamChunk, CompatToolCall, etc.), `CompatToolTransformer` (ToolDefinition to ChatCompletion function format with nested `function: {}` wrapper, deduplication), `CompatTransformer` extending BaseMessageTransformer with support for 3 reasoning field variants (reasoning_content, reasoning, reasoning_text)
- `packages/llm/src/providers/openai-compat/provider.ts` -- `OpenAICompatProvider` implementing `LLMProvider`, constructor accepts `{ name, client, config }`, stream() via `client.chat.completions.create()`, configurable request body based on `OpenAICompatConfig` flags
- `packages/llm/src/providers/openai-compat/compat.ts` -- `KNOWN_COMPAT_CONFIGS` presets for 5 providers (xai, groq, deepseek, openrouter, cerebras), `mergeWithDefaults()`, `detectCompatFromURL()` auto-detection, `getKnownConfig()`
- `packages/llm/src/providers/openai-compat/provider.test.ts` -- 42 tests covering compat config, transformer, delta handling, full stream simulation, tool transformer, and provider identity

## Key Decisions
- The original plan specified a dedicated `XAIProvider` using ChatCompletion -- implementation generalized this into `OpenAICompatProvider` supporting any OpenAI-compatible endpoint, with xAI as one of several presets
- `OpenAICompatConfig` controls behavioral differences: `supportsStore`, `supportsDeveloperRole`, `supportsReasoningEffort`, `supportsUsageInStreaming`, `maxTokensField` ("max_completion_tokens" vs "max_tokens"), `supportsStrictMode`, `thinkingFormat`
- Three reasoning field names supported in delta parsing: `reasoning_content` (DeepSeek), `reasoning` (generic), `reasoning_text` (alternative) -- first non-null wins
- System prompt uses `developer` role when `supportsDeveloperRole=true` (standard OpenAI), `system` role otherwise (most compat providers)
- `stripToolPrefix()` removes `toolu_` prefix from tool call IDs (Anthropic format compatibility)
- Images skipped for compat providers (most don't support image input)
- Thinking blocks use `provider: "openai-compat"` to distinguish from native OpenAI reasoning
- Tool calls use ChatCompletion format with `function: { name, description, parameters }` wrapper (different from OpenAI Responses API's flat format)
- Adjacent same-role user messages merged by text concatenation with newline separator
- Provider name is fully dynamic: `new OpenAICompatProvider({ name: "xai" })` sets `provider.name = "xai"`
- Unknown provider names fall through to `OpenAICompatProvider` in the registry factory

## Test Coverage
42 tests across 7 describe blocks:
- Compat Config: 9 tests (known configs existence, merge defaults, override, detectCompatFromURL for xai/groq/openrouter/unknown, getKnownConfig)
- toProviderMessages: 10 tests (system/developer role, text, tool_result with toolu_ prefix strip, skip ImageBlock, assistant text, tool_calls, skip ThinkingBlock, info summary, merge adjacent)
- fromProviderDelta: 10 tests (text, reasoning_content/reasoning/reasoning_text to thinking, tool_calls new/append, finish_reason stop/tool_calls/length, usage with/without cached tokens)
- Full stream simulation: 5 tests (simple text, reasoning+text, tool call with JSON accumulation, multiple tool calls, multi-tool in one response)
- CompatToolTransformer: 3 tests (convert, empty, deduplicate)
- Provider identity: 5 tests (default name, xai/groq/deepseek custom names, config override)

## Artifacts
- `packages/llm/src/providers/openai-compat/transformer.ts`
- `packages/llm/src/providers/openai-compat/provider.ts`
- `packages/llm/src/providers/openai-compat/compat.ts`
- `packages/llm/src/providers/openai-compat/provider.test.ts`
