---
phase: 9
plan: 07
status: complete
---

# Context Manager & Token Counting — Summary

## One-Liner
Implemented approximate token counting for mixed ASCII/CJK text and a context compaction manager that triggers LLM-driven summarization when thread tokens exceed a configurable threshold.

## What Was Built
- `packages/data/src/context/token-counter.ts` — Approximate token counter (KD-29, no WASM/tiktoken):
  - `countTokensApprox(text)` — ASCII chars/4 + CJK chars/2, with CJK detection covering Unified Ideographs, Extension A, Compatibility, Hiragana, Katakana, Hangul, CJK Symbols
  - `countMessageTokens(message)` — sums tokens across all content blocks (text, tool_use, tool_result, summary) plus 4-token per-message overhead
  - `countThreadTokens(thread)` — sums across all messages in a thread
- `packages/data/src/context/context-manager.ts` — ContextManager class:
  - `compactionState` BehaviorSubject (`"idle" | "compacting"`)
  - `checkAndCompact(thread)` — main entry: counts tokens, checks threshold (`modelContextWindow * thresholdPercent/100`), splits messages into summarize vs keep, calls injected `compactFn`, builds summary content block `{ type: "summary", summary: { type: "message", summary } }`, trims incomplete trailing tool_use sequences, returns CompactionResult
  - `trimIncompleteToolUse(messages)` — recursively removes trailing assistant messages with tool_use content when no subsequent tool_result exists
  - CompactFunction type: `(messages: ThreadMessage[]) => Promise<string>` — injected by upper layer (agent-core)
  - CompactionResult: `{ compacted, thread, tokensBefore, tokensAfter, summary? }`
- `packages/data/src/context/context-manager.test.ts` — 22 tests

## Key Decisions
- No tiktoken/WASM dependency (KD-29) — approximate counting is sufficient for threshold detection with acceptable +/- 20-30% error
- CJK detection covers a broad Unicode range (CJK Unified, Extension A, Compatibility, Hiragana, Katakana, Hangul, Symbols)
- CompactFunction is dependency-injected rather than importing an LLM client — keeps the data layer independent from the agent layer
- `keepRecentMessages` (default 4) ensures the most recent conversation context survives compaction
- On compactFn failure, the manager gracefully returns the original thread unchanged and resets to idle state — no message loss
- Threshold check also guards against compacting when message count is at or below keepRecent, preventing degenerate cases

## Test Coverage
22 tests covering: countTokensApprox (4 — ASCII, CJK, mixed, empty), countMessageTokens (3 — single block, multiple blocks, no content), countThreadTokens (2 — multi-message, empty), ContextManager (13 — under threshold, over threshold with compaction, state transitions idle/compacting/idle, summary insertion, recent message preservation, correct messages passed to compactFn, compactFn failure recovery, empty thread, trailing tool_use trimming, custom modelContextWindow, custom compactionThresholdPercent, CompactionResult fields, keepRecent guard).

## Artifacts
- `packages/data/src/context/token-counter.ts`
- `packages/data/src/context/context-manager.ts`
- `packages/data/src/context/context-manager.test.ts`
