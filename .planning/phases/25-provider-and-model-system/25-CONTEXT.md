# Phase 25: Provider and Model System - Context

**Gathered:** 2026-04-07
**Revised:** 2026-04-07 (pi-ai integration)
**Status:** Ready for re-planning

<domain>
## Phase Boundary

Replace the hand-rolled `AnthropicProvider` / `OpenAIProvider` LLM communication layer
with `@mariozechner/pi-ai` (v0.65.2) — a unified LLM API that provides automatic model
discovery, provider configuration, streaming, token & cost tracking out of the box.

pi-ai already covers all AMP providers (anthropic, openai, xai, groq, cerebras,
openrouter, google-vertex, kimi-coding/moonshot) plus 10+ additional providers. Its
`MODELS` auto-generated catalog contains hundreds of models with contextWindow,
maxTokens, cost, reasoning, and input modality metadata.

This phase now focuses on:
1. **Dependency swap**: `@mariozechner/pi-ai` replaces `@anthropic-ai/sdk` + `openai` SDK
2. **Adapter layer**: bridge pi-ai's `stream()`/`AssistantMessageEventStream` to
   flitter-cli's `StreamEvent` / `Provider` interface (minimal translation)
3. **Provider resolution**: replace `createProvider()` switch/case + `autoDetectProvider()`
   with pi-ai's `getModel()` + `getEnvApiKey()`
4. **ConfigService**: Zod-validated settings (unchanged from original plan)

</domain>

<decisions>
## Implementation Decisions

### Core Architectural Decision
- **D-00 (NEW):** Adopt `@mariozechner/pi-ai` as the unified LLM backend. This replaces
  `AnthropicProvider` class, `OpenAIProvider` class, and the entire `createProvider()`
  switch/case routing. pi-ai handles: provider protocol differences, streaming, retry,
  token usage, cost calculation, model metadata. User constraint: minimize format
  conversion layers — use pi-ai types directly where feasible; the adapter exists for
  decoupling, not for introducing cognitive overhead.

### Provider Registry (superseded by pi-ai)
- **D-01 (REVISED):** pi-ai's `KnownProvider` type replaces AMP's `v9` enum. pi-ai
  already includes all 10 AMP providers: `anthropic`, `openai`, `xai`, `groq`,
  `cerebras`, `openrouter`, `google-vertex` (= AMP's vertexai), `kimi-coding`
  (= AMP's moonshotai). `ProviderId` type becomes `import { KnownProvider } from
  '@mariozechner/pi-ai'` + flitter-cli extensions.
- **D-02 (SUPERSEDED):** No longer need to route 8 providers through `OpenAIProvider`.
  pi-ai handles all provider protocol differences internally.
- **D-03 (KEPT):** Keep `chatgpt-codex`, `copilot`, `antigravity` as flitter-cli
  extensions that use pi-ai's `openai-codex`, `github-copilot`, `google-antigravity`
  providers respectively.
- **D-04 (SUPERSEDED):** Provider registry entries no longer needed — pi-ai's
  `getProviders()` and `getModels(provider)` provide this data dynamically.

### Model Catalog (superseded by pi-ai)
- **D-05 (SUPERSEDED):** pi-ai's `models.generated.ts` (359KB) already contains the
  full model catalog with typed `Model<Api>` objects. No hand-transcription needed.
- **D-06 (SUPERSEDED):** pi-ai's `Model<Api>` interface provides: `id`, `name`, `api`,
  `provider`, `baseUrl`, `reasoning: boolean`, `input: ("text"|"image")[]`,
  `cost: { input, output, cacheRead, cacheWrite }` ($/M tokens), `contextWindow`,
  `maxTokens`. This is a superset of AMP's `ModelDefinition`.
- **D-07 (REVISED):** `lookupModel` becomes a thin wrapper around pi-ai's
  `getModel(provider, modelId)`. For Phase 26 `ba()` compatibility, we create a
  `resolveModel(key: string): Model<Api>` that maps AMP-style keys like
  `"CLAUDE_OPUS_4_6"` to pi-ai's `getModel("anthropic", "claude-opus-4-6-20250514")`.
- **D-08 (SUPERSEDED):** No need to manually list 39 models — pi-ai has them all plus
  hundreds more.

### Provider Config Service with Zod (unchanged)
- **D-09 (KEPT):** Introduce `zod` dependency for settings schema validation.
- **D-10 (KEPT):** Create `ConfigService` class with dot-notation keys.
- **D-11 (KEPT):** Same 9 settings keys for Phase 25 scope.
  ```
  anthropic.speed: z.enum(["standard", "fast"]).optional()
  anthropic.provider: z.enum(["anthropic", "vertex"]).optional()
  anthropic.temperature: z.number().optional()
  anthropic.thinking.enabled: z.boolean().optional()
  anthropic.interleavedThinking.enabled: z.boolean().optional()
  anthropic.effort: z.enum(["low", "medium", "high", "max"]).optional()
  openai.speed: z.enum(["standard", "fast"]).optional()
  internal.model: z.union([z.string(), z.record(z.string(), z.string())]).optional()
  gemini.thinkingLevel: z.enum(["minimal", "low", "medium", "high"]).optional()
  ```
- **D-12 (KEPT):** Config resolution priority unchanged.
- **D-13 (KEPT):** Typed get/set with Zod validation.

### Integration with pi-ai
- **D-14 (REVISED):** `DEFAULT_MODELS` replaced by pi-ai's `getModels(provider)[0]` or
  a curated default model map. pi-ai's model catalog is the source of truth.
- **D-15 (REVISED):** `ProviderCapabilities` maps to pi-ai's `Model` properties:
  `model.reasoning` -> capabilities.reasoning, `model.input.includes("image")` ->
  capabilities.vision, tool calling is always true (pi-ai only includes tool-capable
  models). No need for a separate capabilities interface.
- **D-16 (REVISED):** `autoDetectProvider()` replaced by iterating
  `getProviders().filter(p => getEnvApiKey(p))`. pi-ai's `getEnvApiKey()` already knows
  every provider's env var name (ANTHROPIC_API_KEY, OPENAI_API_KEY, XAI_API_KEY,
  GROQ_API_KEY, CEREBRAS_API_KEY, OPENROUTER_API_KEY, KIMI_API_KEY, etc.).
- **D-17 (KEPT):** `UserConfig.settings` field for Zod-validated settings namespace.
- **D-18 (NEW):** The `Provider` interface in `provider.ts` remains as flitter-cli's
  internal contract. It gains a `piModel: Model<Api>` field so consumers can access
  pi-ai metadata (cost, contextWindow, etc.) without extra lookups. `sendPrompt()`
  implementation delegates to `stream(piModel, context, options)` from pi-ai.
- **D-19 (NEW):** `StreamEvent` translation: pi-ai emits `AssistantMessageEvent` with
  types: `text_delta`, `thinking_delta`, `toolcall_start/delta/end`, `done`, `error`.
  These map 1:1 to flitter-cli's existing `StreamEvent` variants. The adapter is a
  simple `async function*` that yields flitter-cli events from pi-ai events.
- **D-20 (NEW):** For OAuth providers (chatgpt-codex, copilot, antigravity), flitter-cli
  continues to manage token storage via `token-store.ts`. The resolved OAuth token is
  passed to pi-ai via `stream(model, context, { apiKey: token.accessToken })`.
- **D-21 (NEW):** `@anthropic-ai/sdk` and `openai` direct dependencies are removed from
  `package.json` since pi-ai bundles them internally.

### Claude's Discretion
- Exact mapping from AMP model keys to pi-ai provider+modelId pairs
- Whether to keep `Provider` interface as-is or simplify given pi-ai does the heavy lifting
- File organization of the adapter layer
- Whether `retry.ts` is still needed (pi-ai may handle retries internally)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### pi-ai library (new primary dependency)
- `@mariozechner/pi-ai` npm package (v0.65.2) — https://github.com/badlogic/pi-mono/tree/main/packages/ai
- Key exports: `getModel`, `getModels`, `getProviders`, `getEnvApiKey`, `stream`, `complete`, `streamSimple`, `calculateCost`
- Key types: `Model<Api>`, `KnownProvider`, `Api`, `Context`, `AssistantMessageEvent`, `AssistantMessage`, `Usage`, `StreamOptions`, `SimpleStreamOptions`, `ThinkingLevel`
- `models.generated.ts` — auto-generated 359KB model catalog with all providers/models
- `env-api-keys.ts` — provider-to-env-var mapping (ANTHROPIC_API_KEY, OPENAI_API_KEY, XAI_API_KEY, GROQ_API_KEY, CEREBRAS_API_KEY, OPENROUTER_API_KEY, etc.)

### AMP reverse-engineered source (for settings schema only)
- `tmux-capture/amp-source/22_providers_reasoning_modes.js` -- AMP's `sKR` settings schema (still needed for ConfigService)
- `tmux-capture/amp-source/33_settings_schema.js` -- Additional settings schema context

### Current implementation (to be modified/replaced)
- `packages/flitter-cli/src/provider/provider.ts` -- `Provider` interface (keep), `ProviderConfig` (simplify), `ProviderCapabilities` (derive from pi-ai)
- `packages/flitter-cli/src/provider/factory.ts` -- `createProvider()` (rewrite to use pi-ai), `autoDetectProvider()` (rewrite), `DEFAULT_MODELS` (remove)
- `packages/flitter-cli/src/provider/anthropic.ts` -- **DELETE** (pi-ai replaces)
- `packages/flitter-cli/src/provider/openai.ts` -- **DELETE** (pi-ai replaces)
- `packages/flitter-cli/src/state/config.ts` -- `parseArgs()`, `AppConfig`, `UserConfig`
- `packages/flitter-cli/src/state/types.ts` -- `StreamEvent` (keep, adapt from pi-ai events)
- `packages/flitter-cli/src/state/app-state.ts` -- `AppState` (update provider field)
- `packages/flitter-cli/src/auth/token-store.ts` -- Keep for OAuth token persistence

### Test utilities
- `packages/flitter-cli/src/test-utils/mock-provider.ts` -- Update to match new interface

</canonical_refs>

<code_context>
## Existing Code Insights

### Assets to Remove
- `AnthropicProvider` class in `anthropic.ts` — replaced by pi-ai's anthropic-messages provider
- `OpenAIProvider` class in `openai.ts` — replaced by pi-ai's openai-completions provider
- `@anthropic-ai/sdk` and `openai` direct dependencies — bundled inside pi-ai
- `retry.ts` — evaluate if pi-ai handles retries (it has `maxRetryDelayMs` option)

### Assets to Keep
- `Provider` interface contract — internal decoupling layer
- `token-store.ts` — OAuth token management
- `buildSystemPrompt()` in `system-prompt.ts` — provider-agnostic
- OAuth flows: `chatgpt-oauth.ts`, `copilot-oauth.ts`, `antigravity-oauth.ts`

### pi-ai API Surface (key functions)
```typescript
// Model lookup — fully typed
const model = getModel('anthropic', 'claude-sonnet-4-20250514');

// All providers
const providers: KnownProvider[] = getProviders();

// Models for a provider
const models: Model<Api>[] = getModels('anthropic');

// Auto-detect API key from env
const key: string | undefined = getEnvApiKey('anthropic');

// Streaming with events
const s = stream(model, context, { apiKey, signal });
for await (const event of s) {
  // event.type: 'text_delta' | 'thinking_delta' | 'toolcall_end' | 'done' | 'error' | ...
}
const result: AssistantMessage = await s.result();

// Model metadata
model.contextWindow  // number
model.maxTokens      // number
model.cost           // { input, output, cacheRead, cacheWrite } $/M tokens
model.reasoning      // boolean
model.input          // ("text" | "image")[]
model.provider       // KnownProvider
```

### StreamEvent Mapping (pi-ai → flitter-cli)
```
pi-ai AssistantMessageEvent    →  flitter-cli StreamEvent
─────────────────────────────────────────────────────────
text_delta { delta }           →  { type: 'text_delta', text: delta }
thinking_start                 →  (no direct mapping — thinking_delta handles it)
thinking_delta { delta }       →  { type: 'thinking_delta', text: delta }
thinking_end                   →  (no event needed)
toolcall_start { toolCall }    →  { type: 'tool_call_start', toolCallId, name, title, kind }
toolcall_delta { ... }         →  { type: 'tool_call_input_delta', toolCallId, partialJson }
toolcall_end { toolCall }      →  { type: 'tool_call_ready', toolCallId, name, input }
done { reason, message }       →  { type: 'usage_update', usage } THEN { type: 'message_complete', stopReason }
error { reason, error }        →  { type: 'error', error: { message, code, retryable } }
start { partial }              →  (skip — no flitter-cli equivalent)
```

</code_context>

<specifics>
## Specific Ideas

- **Minimal adapter**: The `PiAiProvider` implements `Provider` interface by delegating to pi-ai's `stream()`. The adapter is a single `async function*` that converts pi-ai events to flitter-cli StreamEvents. No deep wrapping.
- **Direct pi-ai types in AppConfig**: `AppConfig.model` becomes `Model<Api>` from pi-ai — consumers get contextWindow, cost, reasoning info without extra lookups.
- **`resolveModel()` for Phase 26**: A thin function that maps AMP-style keys (e.g., `"CLAUDE_OPUS_4_6"`) to pi-ai `getModel()` calls. This preserves `ba()` compatibility for agent modes.
- **OAuth passthrough**: For chatgpt-codex/copilot/antigravity, load token from `token-store.ts`, then pass as `{ apiKey: token.accessToken }` to pi-ai's stream options. pi-ai already supports these providers (openai-codex, github-copilot, google-antigravity).

</specifics>

<deferred>
## Deferred Ideas

- Agent mode definitions (`nb` — SMART/FREE/RUSH/AGG/LARGE/DEEP/INTERNAL) — Phase 26
- `agent.deepReasoningEffort` tri-state enum setting — Phase 26
- `internal.compactionThresholdPercent` setting — Phase 28
- Feature flags system (`jh` enum in AMP) — not in v0.4.0 roadmap
- pi-ai's OAuth flow integration (pi-ai has built-in OAuth for some providers) — evaluate in Phase 26+

</deferred>

---

*Phase: 25-provider-and-model-system*
*Context gathered: 2026-04-07*
*Revised: 2026-04-07 (pi-ai integration)*
