---
phase: 10
plan: 04
status: complete
---

# Bash Shell Command Tool — Summary

## One-Liner
Implemented the BashTool for executing shell commands in child processes with configurable timeout (default 2min, max 10min), graceful SIGTERM/SIGKILL termination, AbortSignal cancellation, and output truncation at 30000 characters.

## What Was Built
- `BashTool` ToolSpec with name="Bash", source="builtin", isReadOnly=false, executionProfile `{ serial: true }`
- `executeShell` function using `child_process.spawn` with `shell: true`, piped stdout/stderr, timeout handling, and AbortSignal integration
- `truncateOutput` function that preserves head/tail halves with `[output truncated -- N chars omitted]` marker in the middle
- `killGracefully` helper: sends SIGTERM first, then SIGKILL after 5-second grace period (with unref'd timer)
- Input schema: command (required string), timeout (optional number), description (optional string)
- ToolResult includes `data: { stdout, stderr, exitCode }` structured output; non-zero exit codes return status="done" (not "error"), since the command execution itself succeeded

## Key Decisions
- `executionProfile: { serial: true }` ensures shell commands never run in parallel (prevents concurrent side effects)
- Timeout is clamped to [0, 600000] range via `Math.min(Math.max(...))`
- AbortSignal cancellation throws `DOMException("AbortError")` which is caught and returned as `status: "error", error: "Command was cancelled"`
- Timeout appends `\nCommand timed out after Nms` to content rather than changing status to error
- stdout and stderr are merged for the content field but preserved separately in data

## Test Coverage
17 tests in `bash.test.ts` covering: ToolSpec shape (name, source, inputSchema, executionProfile), basic commands (echo stdout, stderr capture, exit code 0 and non-zero, data structure), timeout (short timeout kills process, content contains timeout message), AbortSignal (abort terminates process), output truncation (small output preserved, large output truncated with marker), working directory (pwd verification), shell features (pipe support).

## Artifacts
- `packages/agent-core/src/tools/builtin/bash.ts`
- `packages/agent-core/src/tools/builtin/bash.test.ts`
