# Phase 37: Simplify Factory.ts — Summary

**Completed:** 2026-04-08
**Commit:** db5a654

## What Changed

Eliminated the redundant adapter-of-adapter layer in `factory.ts`. The file was re-implementing functionality that `@mariozechner/pi-ai` already provides natively.

### Deleted (~120 lines)
- `PROVIDER_MAP` — 17 entries mapping flitter-cli IDs to pi-ai KnownProvider keys
- `REVERSE_PROVIDER_MAP` — 24 entries for auto-detection reverse lookup
- `DEFAULT_MODELS` — 17 entries for hardcoded default model IDs per provider
- `PROVIDER_NAMES` — 16 entries for display names
- `resolveModel()` — 32 lines of prefix-matching fallback logic

### Added (~30 lines)
- `PROVIDER_ALIASES` — 9 entries for backwards-compatible ID mapping (e.g. `gemini` → `google`)
- `DISPLAY_NAMES` — 17 entries covering both old and new provider names (dual-key for aliases)
- `toPiAiProvider()` — 1-line function to resolve aliases
- `getDefaultModel()` — delegates to pi-ai's `getModels()[0]`

### Fixed
- `PiAiProvider` now defensively checks `piModel.input` (was crashing for `openai-compatible` providers)
- `ProviderId` type simplified from 15 hardcoded literals to `KnownProvider | (string & {})`

## Stats

| Metric | Before | After |
|--------|--------|-------|
| factory.ts lines | 292 | 205 |
| Static mapping entries | 74 | 26 |
| pi-ai API calls | 0 | 4 (getModel, getModels, getProviders, getEnvApiKey) |
| Tests | 11 failing | 8 failing (-3 fixed) |
| Insertions/Deletions | — | +108/-196 (net -88) |

## Files Modified

- `packages/flitter-cli/src/provider/factory.ts` — primary target (rewritten)
- `packages/flitter-cli/src/provider/provider.ts` — ProviderId type simplified
- `packages/flitter-cli/src/provider/pi-ai-provider.ts` — defensive piModel.input check
- `packages/flitter-cli/src/state/config.ts` — DEFAULT_MODELS → getDefaultModel()
- `packages/flitter-cli/src/__tests__/auth.test.ts` — adapted 3 test assertions
