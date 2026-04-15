---
phase: 7
plan: 01
status: complete
---

# Core Types & Provider Interfaces — Summary

## One-Liner
Defined the LLM Provider abstraction layer: unified types, provider/transformer interfaces, model registry, and transformer base classes.

## What Was Built
- `packages/llm/src/types.ts` -- Core type definitions: `StreamParams`, `StreamDelta`, `ToolDefinition`, `ModelInfo`, `ProviderError`, `TransformState`, `SystemPromptBlock`, `OpenAICompatConfig`, `MODEL_REGISTRY`, `registerModel()`
- `packages/llm/src/provider.ts` -- `LLMProvider` interface with `stream()` returning `AsyncGenerator<StreamDelta>`, `MessageTransformer<TNativeMessage, TNativeDelta>` generic interface, `ToolTransformer<TNativeTool>` generic interface
- `packages/llm/src/transformers/message-transformer.ts` -- `BaseMessageTransformer` abstract class with helpers: `createEmptyDelta()`, `createCompleteDelta()`, `createErrorDelta()`, `filterToolResults()`, `extractTextContent()`, `buildCacheControl()`, `createState()`
- `packages/llm/src/transformers/tool-transformer.ts` -- `BaseToolTransformer` abstract class with `validateToolDefinition()` and `normalizeInputSchema()`
- `packages/llm/src/types.test.ts` -- 29 tests covering all core types and base classes

## Key Decisions
- `ProviderName` uses `KnownProvider | (string & {})` union to allow dynamic registration while keeping autocomplete for known providers ("anthropic", "openai", "gemini", "openai-compat")
- `TransformState` uses a `Map<number, BlockState>` indexed by block position, with `_syncContent()` rebuilding the full `AssistantContentBlock[]` snapshot on every mutation -- cumulative mode
- `SystemPromptBlock` defined independently (not reusing zod-inferred type) to avoid runtime zod dependency
- `MODEL_REGISTRY` is a mutable `Record<string, ModelInfo>` with `registerModel()` for runtime additions (e.g. Volcengine ARK custom endpoints)
- xAI models registered under `provider: "openai-compat"` with `baseUrl: "https://api.x.ai/v1"`, not a separate "xai" provider
- `ProviderError` uses `Object.setPrototypeOf` for correct `instanceof` checks after `super()` call
- Model registry includes cost metadata (`cost: { input, output }` per million tokens) for all known models

## Test Coverage
29 tests across 6 describe blocks:
- MODEL_REGISTRY: 5 tests (Anthropic/OpenAI/Gemini/xAI models, unknown model)
- ProviderError: 3 tests (fields, instanceof, non-retryable)
- TransformState: 6 tests (add/update/complete blocks, multi-type, noop on unknown index)
- BaseToolTransformer: 5 tests (validate valid/invalid, normalize schema)
- BaseMessageTransformer: 8 tests (empty/complete/error deltas, filter tool results, cache control, createState)
- registerModel: 2 tests (add custom, overwrite existing)

## Artifacts
- `packages/llm/src/types.ts`
- `packages/llm/src/provider.ts`
- `packages/llm/src/transformers/message-transformer.ts`
- `packages/llm/src/transformers/tool-transformer.ts`
- `packages/llm/src/types.test.ts`
