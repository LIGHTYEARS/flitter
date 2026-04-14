---
status: partial
phase: 11-cli-integration
source: [11-VERIFICATION.md]
started: 2026-04-14T13:45:00Z
updated: 2026-04-14T13:45:00Z
---

## Current Test

[awaiting human testing]

## Tests

### 1. Complete Command Tree Output
expected: Run `bun run apps/flitter-cli/bin/flitter.ts --help` — all subcommands (login, logout, threads, config, update) with descriptions displayed
result: [pending]

### 2. Full Interactive TUI Session
expected: Run `bun run apps/flitter-cli/bin/flitter.ts` with valid API key — full-screen TUI launches, user can type message, LLM responds with streaming text and tool use
result: [pending]

### 3. Headless JSON Stream Pipeline
expected: Run `echo '{"role":"user","content":"hello"}' | bun run apps/flitter-cli/bin/flitter.ts --headless` — JSON Lines output with inference events
result: [pending]

### 4. Interactive Login Flow
expected: Run `bun run apps/flitter-cli/bin/flitter.ts login` in TTY terminal — provider selection menu displayed, API Key entry works, OAuth opens browser
result: [pending]

## Summary

total: 4
passed: 0
issues: 0
pending: 4
skipped: 0
blocked: 0

## Gaps
