---
phase: 10
plan: 10
status: complete
---

# Sub-agent Framework & Hook System — Summary

## One-Liner
Implemented the hook system (PreToolUse/PostToolUse/Notification configuration parsing, glob-based tool matching, subprocess execution with env-var context passing and JSON directive parsing) and the SubAgentManager (spawn/cancel lifecycle, timeout enforcement, maxTurns limiting, activeAgents$ tracking via BehaviorSubject).

## What Was Built
- **Hook System** (`hooks.ts`):
  - `HookType`: `"PreToolUse" | "PostToolUse" | "Notification"`
  - `HookConfig` interface (type, matcher?, command, timeout?)
  - `HookResult` interface (abort?, modifiedArgs?, message?, exitCode, stdout, stderr)
  - `PreHookContext` / `PostHookContext` interfaces for structured context passing
  - `parseHooksConfig(hooks)` — parses Settings.hooks keyed by type, validates entries, skips invalid without throwing
  - `matchHookToTool(hook, toolName)` — no matcher matches all; with matcher uses `matchToolPattern` glob
  - `executePreHook(hookConfig, context)` — runs command via `sh -c`, passes TOOL_NAME and TOOL_INPUT as env vars, parses stdout JSON for abort/modifiedArgs/message directives
  - `executePostHook(hookConfig, context)` — same as pre but also passes TOOL_RESULT env var, only extracts message directive
  - Internal `runCommand` helper with timeout (SIGKILL on timeout, exit code 124) and `parseDirectives` for safe JSON extraction from stdout

- **SubAgentManager** (`subagent.ts`):
  - `SubAgentOptions` (parentThreadId, description, prompt, type, model?, maxTurns?, timeout?)
  - `SubAgentResult` (threadId, response, status: completed/timeout/cancelled/error, error?)
  - `SubAgentInfo` (threadId, parentThreadId, description, type, status, startTime)
  - `SubAgentManagerOptions` callback-based DI (createWorker, createChildThread, addMessage, getThreadSnapshot)
  - `SubAgentManager` class:
    - `activeAgents$` BehaviorSubject tracking running agents
    - `spawn()`: creates child thread, registers agent, creates ThreadWorker with `permissionContext: "subagent"`, adds initial user message, runs inference loop with maxTurns (default 20) and timeout (default 5min) via Promise.race, extracts response from last assistant message
    - `cancel(threadId)`: aborts + cancels inference + updates status
    - `cancelAll()`: cancels all running workers
    - `dispose()`: cancelAll + disposed flag
  - Depth limit enforced by design: createWorker callback does not inject SubAgentManager into child workers

## Key Decisions
- Hooks use `sh -c` for command execution (not child_process.spawn with shell:true) for consistency with hook semantics
- Hook timeout uses SIGKILL immediately (not graceful SIGTERM first) and returns exit code 124 (matching Unix timeout convention)
- JSON directive parsing is fail-safe: non-JSON stdout is silently ignored, returning empty directives
- SubAgentManager uses callback-based DI for ThreadWorker creation, thread management, and message storage — avoids coupling to concrete data layer
- Depth limit (no nested sub-agents) is architectural: the createWorker callback simply does not provide a SubAgentManager to child workers
- SubAgentManager tracks agents via a Map-based BehaviorSubject, creating new Map instances on each update for immutability

## Test Coverage
39 tests across 2 test files: hooks.test.ts (22 tests — parseHooksConfig with valid/invalid/empty/mixed entries, matchHookToTool with/without matcher, executePreHook env vars and JSON directive parsing and abort/modifiedArgs/message, executePostHook env vars including TOOL_RESULT, timeout handling), subagent.test.ts (17 tests — constructor initial state, spawn lifecycle including thread creation and worker creation and inference loop and response extraction, timeout cancellation, manual cancel, cancelAll, dispose, activeAgents$ status tracking, error handling, maxTurns enforcement).

## Artifacts
- `packages/agent-core/src/subagent/hooks.ts`
- `packages/agent-core/src/subagent/subagent.ts`
- `packages/agent-core/src/subagent/hooks.test.ts`
- `packages/agent-core/src/subagent/subagent.test.ts`
