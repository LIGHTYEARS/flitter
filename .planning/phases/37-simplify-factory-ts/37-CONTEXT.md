# Phase 37: Simplify Factory.ts - Context

**Gathered:** 2026-04-08
**Status:** Ready for planning
**Source:** Conversation analysis — pi-ai API audit + factory.ts audit

<domain>
## Phase Boundary

Eliminate the redundant adapter-of-adapter layer in `factory.ts`. The file currently re-implements functionality that `@mariozechner/pi-ai` already provides natively (provider mapping, model resolution, env key detection). The goal is to reduce `factory.ts` to only the logic pi-ai cannot do:

1. **Event stream adaptation** — `PiAiProvider` converts `AssistantMessageEvent` → `StreamEvent` (keep)
2. **OAuth token-store** — chatgpt-codex / copilot / antigravity load tokens from disk (keep)
3. **Custom baseUrl override** — for OpenAI-compatible proxies like Volcano Engine Ark (keep)

Everything else (PROVIDER_MAP, REVERSE_PROVIDER_MAP, DEFAULT_MODELS, PROVIDER_NAMES, resolveModel prefix-match) is pi-ai's job and should be deleted.

</domain>

<decisions>
## Implementation Decisions

### What to delete
- `PROVIDER_MAP` (17 entries) — pi-ai's `getModel(provider, modelId)` already knows provider→API routing
- `REVERSE_PROVIDER_MAP` (17 entries) — only used by `autoDetectProvider()`, replace with `getProviders()` returning pi-ai provider names directly
- `PROVIDER_NAMES` (14 entries) — derive from pi-ai's Model metadata or from ProviderId directly with simple capitalization
- `DEFAULT_MODELS` (14 entries) — use `getModels(provider)[0].id` as default
- `resolveModel()` function (30 lines) — the prefix-match fallback is unnecessary; use `getModel()` direct, fall back to `getModels()[0]` only

### What to keep
- OAuth token-store switch/case (chatgpt-codex, copilot, antigravity) — pi-ai has no token persistence layer
- `config.baseUrl` override — spread `{ ...model, id: modelId, baseUrl: config.baseUrl }` when custom URL provided
- Antigravity User-Agent header injection — pi-ai doesn't inject custom headers per-provider
- `autoDetectProvider()` — but simplified to iterate `getProviders()` + `getEnvApiKey()` directly without REVERSE_PROVIDER_MAP
- `PiAiProvider` adapter class — the `AssistantMessageEvent` → `StreamEvent` conversion is domain-specific

### Provider ID simplification
- Use pi-ai's `KnownProvider` type directly as the canonical provider identifier
- Keep `ProviderId` in `provider.ts` as `KnownProvider | (string & {})` for forward compatibility
- Remove the flitter-cli ↔ pi-ai ID indirection — use pi-ai's names everywhere (e.g. `'google'` not `'gemini'`, `'kimi-coding'` not `'moonshot'`)
- Update `config.ts` and `UserConfig.provider` to accept pi-ai provider names
- Update `AGENT_MODES` in `types.ts` if any mode references a flitter-cli-specific provider ID

### Display name derivation
- For well-known providers, keep a small `DISPLAY_NAMES: Record<string, string>` (only for names that need special casing like `xAI`, `OpenAI`)
- For everything else, capitalize the pi-ai provider key

### Claude's Discretion
- Whether to inline the Model construction into `createProvider()` or keep a small helper function
- Error message wording for missing API keys
- Log level for baseUrl override (info vs debug)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Provider system
- `packages/flitter-cli/src/provider/factory.ts` — current factory, primary target for simplification
- `packages/flitter-cli/src/provider/pi-ai-provider.ts` — PiAiProvider adapter (keep as-is)
- `packages/flitter-cli/src/provider/provider.ts` — Provider interface + ProviderConfig + ProviderId type

### pi-ai API surface
- `node_modules/@mariozechner/pi-ai/dist/models.d.ts` — getModel(), getModels(), getProviders()
- `node_modules/@mariozechner/pi-ai/dist/stream.d.ts` — stream(), getEnvApiKey()
- `node_modules/@mariozechner/pi-ai/dist/types.d.ts` — Model<Api>, KnownProvider, Api types

### Consumers of factory
- `packages/flitter-cli/src/state/config.ts` — parseArgs() assembles ProviderConfig, calls createProvider()
- `packages/flitter-cli/src/index.ts` — main() calls createProvider()
- `packages/flitter-cli/src/state/types.ts` — AGENT_MODES references primaryModel names
- `packages/flitter-cli/src/commands/command-registry.ts` — mode commands reference provider IDs

### Tests
- `packages/flitter-cli/tests/` — existing test suite (140 tests, 327 expects)

</canonical_refs>

<specifics>
## Specific Ideas

- pi-ai's `getModel('anthropic', 'claude-sonnet-4-20250514')` returns a complete `Model<Api>` with `baseUrl`, `api`, `provider`, `reasoning`, `input`, `cost`, `contextWindow`, `maxTokens` — no need to maintain a parallel catalog
- pi-ai's `getProviders()` returns all `KnownProvider[]` — no need for REVERSE_PROVIDER_MAP
- pi-ai's `getEnvApiKey(provider)` checks env vars per provider — no need to re-implement
- For custom baseUrl (Volcano Engine Ark, LiteLLM, vLLM), the pattern is: `{ ...getModel('anthropic', 'claude-sonnet-4-20250514'), id: 'ep-xxx', baseUrl: 'https://custom.url' }`

</specifics>

<deferred>
## Deferred Ideas

- Removing PiAiProvider entirely and using pi-ai's event stream directly — would require changing StreamEvent consumers throughout the codebase (too invasive for this phase)
- Migrating OAuth token-store to pi-ai's auth system (if pi-ai adds one in the future)

</deferred>

---

*Phase: 37-simplify-factory-ts*
*Context gathered: 2026-04-08 via conversation analysis*
