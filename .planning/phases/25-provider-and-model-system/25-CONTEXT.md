# Phase 25: Provider and Model System - Context

**Gathered:** 2026-04-07
**Status:** Ready for planning

<domain>
## Phase Boundary

Expand the provider system to match AMP's 10-provider registry (`v9` enum), build a
complete model catalog (`n8`) with per-model metadata (contextWindow, maxOutputTokens,
pricing, capabilities), and introduce a Zod-validated hierarchical config service for
provider-specific settings. This phase delivers the data layer that Phase 26 (Agent
Modes) depends on — agent modes reference models by catalog key via `ba()` lookup.

</domain>

<decisions>
## Implementation Decisions

### Provider Registry Architecture
- **D-01:** Replace current `switch/case` hardcoded routing in `factory.ts` with AMP's `v9` provider enum. AMP's provider identifiers are: `anthropic`, `baseten`, `openai`, `xai`, `cerebras`, `fireworks`, `groq`, `moonshotai`, `openrouter`, `vertexai`. The `ProviderId` type must be updated to include all 10.
- **D-02:** AMP's 8 new providers (xai, cerebras, fireworks, groq, moonshot, openrouter, vertex, baseten) are all OpenAI-compatible API endpoints. They route through `OpenAIProvider` with provider-specific `baseUrl`, `providerId`, and `providerName` — the same pattern already used for `gemini`/`copilot`/`chatgpt-codex`. No new provider implementation classes needed.
- **D-03:** Keep `chatgpt-codex`, `copilot`, `gemini`, `antigravity`, and `openai-compatible` as valid provider IDs in flitter-cli even though they are not in AMP's `v9` enum. These are flitter-cli extensions for direct user API key usage. The provider ID union is AMP's 10 + flitter-cli's existing extras.
- **D-04:** Each provider entry defines: `id` (enum value), `displayName`, `defaultBaseUrl`, `defaultModel` (catalog key reference), `authType` ('apiKey' | 'oauth' | 'none'), `envVarKeys` (environment variable names for API key auto-detection). This maps directly to how `autoDetectProvider()` and `createProvider()` currently resolve configuration.

### Model Catalog Data Structure
- **D-05:** Model catalog is a static `Record<ModelKey, ModelDefinition>` matching AMP's `n8` object exactly. `ModelKey` is a string enum (e.g., `CLAUDE_SONNET_4`, `GPT_5_4`, `GROK_CODE_FAST_1`). Every model entry from AMP's `n8` is transcribed verbatim — no additions, no omissions.
- **D-06:** `ModelDefinition` interface matches AMP's schema exactly:
  ```
  {
    provider: ProviderId
    name: string              // API model name (e.g., "claude-sonnet-4-20250514")
    displayName: string       // Human-readable (e.g., "Claude Sonnet 4")
    contextWindow: number     // Token count
    maxOutputTokens: number   // Token count
    pricing?: {               // Optional — some models have no pricing
      input: number           // Per 1M input tokens ($)
      output: number          // Per 1M output tokens ($)
      cached?: number         // Per 1M cached input tokens ($)
      cacheWrite?: number     // Per 1M cache write tokens ($)
      cacheTTL?: number       // Cache TTL in seconds
    }
    capabilities: {
      reasoning?: boolean
      vision?: boolean
      tools?: boolean
      imageGeneration?: boolean
    }
  }
  ```
- **D-07:** A `lookupModel(key: ModelKey): ModelDefinition` function (equivalent to AMP's `ba()`) provides type-safe model lookup by catalog key. This is what agent modes use in Phase 26 to reference their `primaryModel`.
- **D-08:** Complete AMP model catalog (transcribed from `n8`):
  - **Anthropic (8):** CLAUDE_SONNET_4, CLAUDE_SONNET_4_5, CLAUDE_SONNET_4_6, CLAUDE_OPUS_4, CLAUDE_OPUS_4_1, CLAUDE_OPUS_4_5, CLAUDE_OPUS_4_6, CLAUDE_HAIKU_4_5
  - **OpenAI (12):** GPT_5, GPT_5_1, GPT_5_2, GPT_5_4, GPT_5_CODEX, GPT_5_1_CODEX, GPT_5_2_CODEX, GPT_5_3_CODEX, GPT_5_MINI, GPT_5_NANO, O3, O3_MINI, GPT_OSS_120B
  - **XAI (1):** GROK_CODE_FAST_1
  - **VertexAI (4):** GEMINI_3_PRO_PREVIEW, GEMINI_3_1_PRO_PREVIEW, GEMINI3_FLASH_PREVIEW, GEMINI_3_PRO_IMAGE
  - **Cerebras (1):** Z_AI_GLM_4_7
  - **Fireworks (6):** FIREWORKS_QWEN3_CODER_480B, FIREWORKS_KIMI_K2_INSTRUCT, FIREWORKS_QWEN3_235B, FIREWORKS_GLM_4P6, FIREWORKS_GLM_5, FIREWORKS_MINIMAX_M2P5
  - **Baseten (1):** BASETEN_KIMI_K2P5
  - **Moonshot (1):** KIMI_K2_INSTRUCT
  - **OpenRouter (4):** SONOMA_SKY_ALPHA, OPENROUTER_GLM_4_6, OPENROUTER_KIMI_K2_0905, OPENROUTER_QWEN3_CODER_480B
  - **Groq:** (no models explicitly listed in extracted `n8` — may have entries not captured in the truncated source)

### Provider Config Service with Zod
- **D-09:** Introduce `zod` as a new dependency in `packages/flitter-cli/package.json`. AMP uses Zod (`X` = `z` from zod) for settings schema validation. This is the first Zod usage in flitter-cli.
- **D-10:** Create a `ConfigService` class that wraps hierarchical config resolution. AMP's `configService.get("anthropic.effort")` pattern — dot-notation keys with provider namespace prefixes. The settings schema (`sKR` in AMP) uses `z.strictObject()` with all keys optional.
- **D-11:** AMP's settings keys relevant to Phase 25 (provider/model scope only — reasoning/agent mode keys belong to Phase 26):
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
  Phase 26 will add: `agent.deepReasoningEffort`, `internal.oracleReasoningEffort`, `internal.compactionThresholdPercent`.
- **D-12:** Config resolution priority (matches current but now Zod-validated):
  1. CLI arguments (`--provider`, `--model`, `--base-url`)
  2. `~/.flitter-cli/config.json` (user config — Zod-validated on load)
  3. Environment variables (`ANTHROPIC_API_KEY`, `OPENAI_API_KEY`, etc.)
  4. Provider-specific defaults from provider registry
  Validation failure = warn + fall back to defaults (never crash on bad config).
- **D-13:** The config service holds the merged settings as a Zod-validated object. `get(key)` returns the typed value. `set(key, value)` validates against the schema before accepting. This is the same `configService` pattern AMP exposes at `this.configService` in the main TUI context.

### Integration with Existing Code
- **D-14:** `DEFAULT_MODELS` in `factory.ts` is replaced by the model catalog. `getDefaultModel(providerId)` looks up the first model in the catalog for that provider (or a designated default).
- **D-15:** `ProviderCapabilities` interface updated to match AMP: `{ reasoning?: boolean, vision?: boolean, tools?: boolean, imageGeneration?: boolean }`. The old `{ vision, functionCalling, streaming, systemPrompt }` fields are migrated: `functionCalling` → `tools`, `streaming` and `systemPrompt` move to provider-level config (all providers support these).
- **D-16:** `autoDetectProvider()` extended with new env var keys for new providers: `XAI_API_KEY`, `CEREBRAS_API_KEY`, `FIREWORKS_API_KEY`, `GROQ_API_KEY`, `MOONSHOT_API_KEY`, `OPENROUTER_API_KEY`, `VERTEX_API_KEY` (or `GOOGLE_APPLICATION_CREDENTIALS`), `BASETEN_API_KEY`.
- **D-17:** The existing `UserConfig` interface in `config.ts` gains a `settings` field for provider-specific settings (the Zod-validated namespace). This is where `anthropic.speed`, `openai.speed`, etc. live in `config.json`.

### Claude's Discretion
- File organization: whether model catalog, provider registry, and config service live in separate files or are consolidated
- Base URLs for new providers (well-known public endpoints for xai, cerebras, fireworks, groq, moonshot, openrouter, vertex, baseten)
- Exact env var names for auto-detection of new providers (follow community conventions)
- Whether `GPT_OSS_120B` (no pricing in AMP) should be excluded or kept with empty pricing

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### AMP reverse-engineered source (primary spec)
- `tmux-capture/amp-source/34_providers_models_catalog.js` -- AMP's `v9` provider enum, `n8` model catalog with all model definitions, `nb` agent modes (Phase 26 scope but models referenced here), `ba()` model lookup function
- `tmux-capture/amp-source/22_providers_reasoning_modes.js` -- AMP's `sKR` settings schema (Zod `X.strictObject()`), settings key list (`xPR`), thinking/reasoning config keys, provider-specific speed settings
- `tmux-capture/amp-source/33_settings_schema.js` -- Additional settings schema context, feature flags (`jh`), config service patterns

### Fidelity audit
- `MISSING-FEATURES.md` sections 17 (Additional providers), 18 (Model catalog), 19 (Provider config service) -- gap descriptions, scoring, AMP evidence

### Current implementation (to be modified)
- `packages/flitter-cli/src/provider/provider.ts` -- `Provider` interface, `ProviderConfig`, `ProviderCapabilities`, `ProviderId` type, `PromptOptions`
- `packages/flitter-cli/src/provider/factory.ts` -- `createProvider()` switch/case, `autoDetectProvider()`, `DEFAULT_MODELS`
- `packages/flitter-cli/src/provider/anthropic.ts` -- `AnthropicProvider` implementation
- `packages/flitter-cli/src/provider/openai.ts` -- `OpenAIProvider` implementation (reused for 7 provider variants)
- `packages/flitter-cli/src/state/config.ts` -- `parseArgs()`, `AppConfig`, `UserConfig`, config.json loading
- `packages/flitter-cli/src/state/types.ts` -- `StreamEvent`, `ProviderMessage`, domain types
- `packages/flitter-cli/src/state/app-state.ts` -- `AppState` top-level state (consumes provider)
- `packages/flitter-cli/src/auth/token-store.ts` -- OAuth token persistence

### Test utilities
- `packages/flitter-cli/src/test-utils/mock-provider.ts` -- Mock provider for tests (must be updated to match new interfaces)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `OpenAIProvider` class: already handles 7 provider variants via `providerId`/`providerName`/`baseUrl` parameters — the same pattern extends to all 8 new providers
- `autoDetectProvider()`: priority-based env var detection — extend with new provider env vars
- `AnthropicProvider`: handles Anthropic-native protocol, thinking/streaming — keep as-is
- `RetryConfig` and `computeDelay`/`isRetryableError` in `retry.ts` — reusable across all providers
- `buildSystemPrompt()` in `system-prompt.ts` — provider-agnostic system prompt construction

### Established Patterns
- Provider instantiation: `createProvider(config: ProviderConfig) → Provider` factory pattern
- Config resolution: CLI args > config.json > env vars > hardcoded defaults (in `parseArgs()`)
- Provider capabilities: declared at instance creation, consumed by `PromptController`
- OAuth flow: `chatgpt-oauth.ts`, `copilot-oauth.ts`, `antigravity-oauth.ts` — file-based token persistence in `~/.flitter-cli/auth/`

### Integration Points
- `factory.ts` `createProvider()` — central factory, main modification target for new providers
- `config.ts` `parseArgs()` — config resolution, must integrate Zod validation and settings namespace
- `provider.ts` `ProviderId` type — must expand to include all 10 AMP providers
- `app-state.ts` — consumes provider, exposes model/provider info to UI (border builders read model name from here)
- `index.ts` L141 — `createProvider(config.providerConfig)` entry point

</code_context>

<specifics>
## Specific Ideas

- **Exact AMP alignment**: transcribe `v9` provider enum and `n8` model catalog verbatim from `34_providers_models_catalog.js`. No invented models, no modified pricing, no added capabilities.
- **`ba()` equivalent**: the `lookupModel(key)` function is critical infrastructure for Phase 26 where agent modes define `primaryModel: ba("CLAUDE_OPUS_4_6")`. Without this, agent modes cannot resolve their model references.
- **Settings namespace**: AMP uses dot-notation keys like `anthropic.speed`, `openai.speed`. The Zod schema validates the entire settings object at once via `z.strictObject()` — unknown keys are rejected.
- **`anthropic.provider` key**: AMP allows routing Anthropic requests through Vertex AI via `anthropic.provider: "vertex"` setting. This is an important cross-provider routing mechanism.

</specifics>

<deferred>
## Deferred Ideas

- Agent mode definitions (`nb` — SMART/FREE/RUSH/AGG/LARGE/DEEP/INTERNAL) with `primaryModel`, `includeTools`, `reasoningEffort`, `uiHints` — Phase 26 scope
- `agent.deepReasoningEffort` tri-state enum setting — Phase 26 scope
- `internal.compactionThresholdPercent` setting — Phase 28 scope
- Feature flags system (`jh` enum in AMP) — not in v0.4.0 roadmap

</deferred>

---

*Phase: 25-provider-and-model-system*
*Context gathered: 2026-04-07*
