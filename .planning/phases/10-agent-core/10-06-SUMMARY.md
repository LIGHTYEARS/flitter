---
phase: 10
plan: 06
status: complete
---

# Permission DSL Matcher — Summary

## One-Liner
Implemented the permission DSL matching primitives: self-contained glob-to-regex conversion, tool name pattern matching, three-step enable/disable evaluation, recursive PermissionMatcher resolution (string/boolean/number/null/undefined/array/record), and PermissionEntry dual-check (tool name + args matches).

## What Was Built
- `globToRegex(pattern)` — self-implemented glob-to-regex converter (no picomatch dependency) using a DOUBLESTAR placeholder strategy; supports `**` (any), `*` (non-slash), `?` (single non-slash); case-insensitive (`i` flag); escapes `.+^${}()|[]\`
- `matchToolPattern(pattern, toolName)` — wraps globToRegex for tool name matching
- `matchDisablePattern(patterns, toolName)` — OR-semantics batch matching over a pattern array
- `checkToolEnabled(toolName, config)` — three-step evaluation: (1) config `tools.disable` match disables, (2) config `tools.enable` match re-enables, (3) default enabled; returns `ToolEnableResult { enabled, disabledReason? }`
- `matchPermissionMatcher(matcher, value)` — recursive matcher supporting: string (regex `/pattern/flags` or glob), boolean/number/null/undefined (strict equality), array (OR semantics via `some`), record (AND semantics via `every` with recursive descent)
- `matchPermissionEntry(entry, toolName, args)` — dual check: tool name glob match AND entry.matches key-value recursive match

## Key Decisions
- Self-implemented glob-to-regex avoids external dependency; uses null-byte placeholder (`\0DOUBLESTAR\0`) to prevent `**` from being split into two `*` during processing
- All glob matching is case-insensitive (matching the reverse-engineered behavior)
- String matchers detect `/regex/flags` format via `^\/(.+)\/([gimsuy]*)$` regex; non-regex strings fall through to glob matching
- `checkToolEnabled` allows re-enable override: a tool disabled by `tools.disable` can be selectively re-enabled via `tools.enable`

## Test Coverage
38 tests in `matcher.test.ts` covering: matchToolPattern (exact, case-insensitive, wildcard `*`, prefix `mcp__*`, multi-segment `mcp__*__*`, non-match, `?` wildcard), matchDisablePattern (single match, no match, empty array, multi-pattern), checkToolEnabled (default enabled, disabled, re-enabled, disabledReason), matchPermissionMatcher (string glob, string regex, non-string value, boolean, number, null, undefined, array OR match/no-match, record AND, nested record), matchPermissionEntry (tool only, tool+matches, tool match but args mismatch, tool mismatch, multi-key matches).

## Artifacts
- `packages/agent-core/src/permissions/matcher.ts`
- `packages/agent-core/src/permissions/matcher.test.ts`
