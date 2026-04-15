---
phase: 9
plan: 03
status: complete
---

# ConfigService Three-Tier Merge — Summary

## One-Liner
Implemented JSONC stripping, FileSettingsStorage for global/workspace settings I/O, and ConfigService with three-tier configuration merging (default, global, workspace).

## What Was Built
- `packages/data/src/config/jsonc.ts` — `stripJsonComments()` state-machine implementation that removes `//` line and `/* */` block comments while preserving string literals and line numbers
- `packages/data/src/config/jsonc.test.ts` — 12 tests
- `packages/data/src/config/settings-storage.ts` — FileSettingsStorage class:
  - `resolveSettingsPath(dir)` — .json first, .jsonc fallback
  - `read(scope)` / `write(scope, settings)` — JSONC-aware read, atomic pure-JSON write
  - `get/set/delete` single-key operations
  - `append/prepend` array operations
  - `keys(scope)` — enumerate all keys
  - `changes` Subject for key-change notifications
  - Scope validation: rejects admin scope writes; rejects GLOBAL_ONLY_KEYS in workspace scope
- `packages/data/src/config/config-service.ts` — ConfigService class implementing `@flitter/schemas` IConfigService:
  - `mergeSettings()` — shallow merge with GLOBAL_ONLY_KEYS exclusion and MERGED_ARRAY_KEYS concat+dedup
  - `get()` / `getLatest()` / `observe()` — synchronous, async-reload, and reactive access
  - `updateSettings` / `appendSettings` / `prependSettings` / `deleteSettings` — delegated to storage + reload
  - `reload()` — reads both scopes, merges, diff-checks before pushing BehaviorSubject
- `packages/data/src/config/config-service.test.ts` — 21 tests (shared with 09-04 hot-reload tests)

## Key Decisions
- JSONC stripper is a self-contained state machine (KD-27) — no external dependency like `strip-json-comments`
- Block comment replacement preserves newlines to maintain line-number alignment
- FileSettingsStorage always writes pure JSON (no comments), even when reading JSONC input
- Three-tier merge uses a simple `{...global, ...workspace}` with two special cases: GLOBAL_ONLY_KEYS skipped from workspace, MERGED_ARRAY_KEYS use concat+dedup (JSON-based for object elements)
- Diff filter in `reload()` compares `JSON.stringify` of settings before emitting — avoids unnecessary reactive notifications

## Test Coverage
12 JSONC tests + 21 ConfigService/Storage tests (total 33 across plans 09-03 and 09-04). JSONC tests: line comments, block comments, multi-line blocks, strings with //, escaped quotes, trailing comments, pure JSON passthrough, empty input, consecutive comments, comment-only input, full roundtrip, /* inside strings. Storage tests: global read/write, workspace read/write, JSONC reading, JSONC fallback, single-key get/set/delete, array append/prepend, admin scope rejection, global-only key rejection, atomic write (no tmp residue, pure JSON output).

## Artifacts
- `packages/data/src/config/jsonc.ts`
- `packages/data/src/config/jsonc.test.ts`
- `packages/data/src/config/settings-storage.ts`
- `packages/data/src/config/config-service.ts`
- `packages/data/src/config/config-service.test.ts`
