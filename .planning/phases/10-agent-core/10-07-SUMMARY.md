---
phase: 10
plan: 07
status: complete
---

# Permission Engine & Guarded Files — Summary

## One-Liner
Implemented the four-level permission decision engine (guarded files, user rules, default rules, fallback ask), guarded file path extraction from tool args, and a comprehensive set of default permission rules with workspace-root placeholder resolution.

## What Was Built
- `getToolFilePaths(toolName, args)` — extracts file paths from tool arguments: Read/Write/Edit use `file_path`, Grep/Glob/FuzzyFind use `path`, Bash extracts absolute paths from command string via regex; validates paths are absolute
- `checkGuardedFile(filePath, allowlist)` — returns true (guarded) when file does not match any allowlist glob pattern; empty allowlist means all files are guarded
- `DEFAULT_PERMISSION_RULES` — 10 built-in rules: Read/Grep/Glob/FuzzyFind/TodoWrite allow, Write/Edit allow within `${workspaceRoot}/**`, Bash ask, `mcp__*` ask, Task allow
- `PermissionEngine` class with four-level `checkPermission(toolName, args, context?)`:
  - Level 1: Guarded files check (allowlist from settings)
  - Level 2: User rules from `config.permissions` (first match wins)
  - Level 3: Default rules with `${workspaceRoot}` placeholder resolved
  - Level 4: Fallback returns `{ permitted: false, action: "ask" }`
- `requestApproval(request)` — pushes to `pendingApprovals$` Subject
- `ruleToResult` handles allow/reject/ask/delegate action types
- `resolveWorkspaceRoot` replaces `${workspaceRoot}` placeholders in default rule matches
- Context filtering: rules with a `context` field only apply when the evaluation context matches

## Key Decisions
- Four-level priority: guarded files override user rules, which override defaults, which override fallback
- User rules are evaluated in order (first match wins), matching the reverse-engineered behavior
- Bash command path extraction uses a simple regex (`/(?:^|\s)(\/[^\s'"`;|&><]+)/g`) for basic absolute path detection; intentionally does not do full shell parsing
- `PermissionEngine` uses dependency injection via `PermissionEngineOpts` (getConfig callback, Subject for approvals, workspaceRoot string)
- Permitted results still carry `action: "ask"` in the schema-required field since the value is semantically irrelevant when permitted=true

## Test Coverage
37 tests in `engine.test.ts` covering: getToolFilePaths (Read/Write/Edit file_path, Bash command parsing, Bash no paths, Grep path, unknown tool), checkGuardedFile (not in allowlist, matching allowlist, empty allowlist), Level 1 guarded files (ask trigger, allowlist bypass), Level 2 user rules (allow, reject, ask, order priority, overrides defaults), Level 3 default rules (Read/Grep/Glob/FuzzyFind/TodoWrite allow, Write workspace allow, Bash ask, mcp ask, Task allow), Level 4 fallback (unknown tool ask), context filtering (subagent rule in thread/subagent contexts), requestApproval (Subject push).

## Artifacts
- `packages/agent-core/src/permissions/engine.ts`
- `packages/agent-core/src/permissions/guarded-files.ts`
- `packages/agent-core/src/permissions/engine.test.ts`
