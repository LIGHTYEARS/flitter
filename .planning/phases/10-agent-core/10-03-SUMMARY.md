---
phase: 10
plan: 03
status: complete
---

# File Operation Built-in Tools (Read/Write/Edit) — Summary

## One-Liner
Implemented the three core file operation tools (Read, Write, Edit) as ToolSpec implementations with cat-n line formatting, recursive directory creation, and exact string replacement with uniqueness enforcement.

## What Was Built
- `ReadTool` — reads files with cat -n style line numbers (6-char right-aligned + tab), supports offset/limit (default 2000 lines), truncates lines over 2000 chars with `[truncated]`, detects binary files via null-byte scan of first 8192 bytes, isReadOnly=true
- `WriteTool` — writes content to files, auto-creates intermediate directories via `mkdirSync(recursive: true)`, returns confirmation with line count and outputFiles array, isReadOnly=false
- `EditTool` — exact string replacement with `countOccurrences` helper, rejects old_string===new_string, requires unique match unless replace_all=true, returns occurrence count for multi-match, isReadOnly=false
- `readExecutionProfile`, `writeExecutionProfile`, `editExecutionProfile` helper functions for dynamic resource key generation

## Key Decisions
- Used synchronous fs operations (readFileSync, writeFileSync, existsSync) for simplicity since tool execution is already async-wrapped
- Binary detection uses a simple null-byte scan of first 8192 bytes rather than a heuristic library
- ReadTool offset is 1-based to match cat -n convention
- EditTool uses indexOf-based counting (non-overlapping occurrences) and split/join for replace_all
- executionProfile is set to `undefined` on the ToolSpec; dynamic profiles are provided via separate exported helper functions

## Test Coverage
25 tests across 3 test files: read.test.ts (9 tests — shape, isReadOnly, cat-n format, offset/limit, default limit, long line truncation, file not found, binary detection, executionProfile), write.test.ts (7 tests — shape, isReadOnly, new file write, overwrite, directory creation, empty content, executionProfile), edit.test.ts (9 tests — shape, isReadOnly, unique match, not found, multiple match error, replace_all, old===new rejection, file not found, executionProfile).

## Artifacts
- `packages/agent-core/src/tools/builtin/read.ts`
- `packages/agent-core/src/tools/builtin/write.ts`
- `packages/agent-core/src/tools/builtin/edit.ts`
- `packages/agent-core/src/tools/builtin/read.test.ts`
- `packages/agent-core/src/tools/builtin/write.test.ts`
- `packages/agent-core/src/tools/builtin/edit.test.ts`
