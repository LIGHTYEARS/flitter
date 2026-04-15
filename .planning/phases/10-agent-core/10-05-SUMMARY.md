---
phase: 10
plan: 05
status: complete
---

# Code Search Built-in Tools (Grep/Glob/FuzzyFind) — Summary

## One-Liner
Implemented three code search tools: GrepTool (regex content search via ripgrep with Node.js fallback), GlobTool (file pattern matching via FileScanner with mtime sorting), and FuzzyFindTool (fuzzy file name search via FuzzyMatcher with ranked scoring).

## What Was Built
- `GrepTool` — delegates to `rg` via `@flitter/util` spawn when available, falls back to a recursive Node.js directory walker with RegExp matching; supports three output modes (content, files_with_matches, count), context lines (-A/-B/-C), case-insensitive (-i), multiline (-U), type filtering, glob filtering, head_limit/offset pagination; includes a cached `isRgAvailable()` check
- `GlobTool` — uses `@flitter/util` FileScanner for directory traversal, applies a custom `globPatternToRegex` converter supporting `*`, `**`, `?`, `{a,b}` alternation groups; results sorted by mtime descending (most recent first) via async stat calls
- `FuzzyFindTool` — uses `@flitter/util` FileScanner + FuzzyMatcher for multi-tier scoring (exact > prefix > suffix > substring > fuzzy); configurable limit (default 20); output format: `path (score: N)`
- All three tools: isReadOnly=true, source="builtin", with exported `*ExecutionProfile` helper functions returning read-mode resource keys
- Node.js grep fallback includes: TYPE_EXTENSIONS map for 16 file types, SKIP_DIRS set, binary detection, context line support, `matchesGlobFilter` and `matchesTypeFilter` helpers

## Key Decisions
- GrepTool tries rg first for performance; Node.js fallback ensures the tool works everywhere
- GlobTool implements its own glob-to-regex converter (handles `{a,b}` groups, `**/` directory matching) rather than using an external library
- FuzzyFindTool filters out directories from scan results before matching
- Pagination (head_limit/offset) is applied as a post-processing step after rg or fallback execution
- rg exit code 1 (no match) is treated as empty result, not an error

## Test Coverage
22 tests across 3 test files: grep.test.ts (8 tests — shape, basic regex match, output modes, no match, path restriction, executionProfile), glob.test.ts (7 tests — shape, `**/*.ts` matching, path-scoped matching, no match, mtime sort, executionProfile), fuzzy-find.test.ts (7 tests — shape, exact query, fuzzy query, limit parameter, no match, executionProfile).

## Artifacts
- `packages/agent-core/src/tools/builtin/grep.ts`
- `packages/agent-core/src/tools/builtin/glob.ts`
- `packages/agent-core/src/tools/builtin/fuzzy-find.ts`
- `packages/agent-core/src/tools/builtin/grep.test.ts`
- `packages/agent-core/src/tools/builtin/glob.test.ts`
- `packages/agent-core/src/tools/builtin/fuzzy-find.test.ts`
