---
phase: 11-cli-integration
verified: 2026-04-14T06:15:00Z
status: gaps_found
score: 2/5 must-haves verified
overrides_applied: 0
gaps:
  - truth: "Interactive TUI mode completes end-to-end conversation (M6)"
    status: failed
    reason: "main.ts does not import or call launchInteractiveMode, runExecuteMode, or runHeadlessMode. No mode routing exists. createContainer is never called. resolveCliContext is never called."
    artifacts:
      - path: "packages/cli/src/main.ts"
        issue: "Missing imports: createContainer, resolveCliContext, launchInteractiveMode, runExecuteMode, runHeadlessMode, handleLogin, handleLogout, handleUpdate. The function only creates Commander program and calls parseAsync with no action handler registration."
    missing:
      - "Import and call createContainer to create ServiceContainer"
      - "Import and call resolveCliContext to determine mode"
      - "Register action handlers on login/logout/threads/config/update subcommands"
      - "Route default action to launchInteractiveMode / runExecuteMode / runHeadlessMode based on CliContext"
      - "Wire handleLogin, handleLogout, handleUpdate into their respective command actions"
  - truth: "echo 'hello' | flitter --headless outputs JSON stream LLM response"
    status: failed
    reason: "Same root cause as above — runHeadlessMode is never called from main.ts"
    artifacts:
      - path: "packages/cli/src/main.ts"
        issue: "No headless mode routing. runHeadlessMode exists in modes/headless.ts but is orphaned from main entry."
    missing:
      - "Wire headless mode routing in main.ts default action handler"
  - truth: "Auth flow completes API Key -> Keyring storage -> auto-carry in subsequent requests"
    status: failed
    reason: "handleLogin/handleLogout are implemented in commands/auth.ts but never registered as Commander action handlers in main.ts. Additionally, @flitter/util missing from package.json dependencies causes module resolution failure."
    artifacts:
      - path: "packages/cli/src/main.ts"
        issue: "No login/logout command action registration"
      - path: "packages/cli/package.json"
        issue: "Missing @flitter/util dependency — causes 13 test failures in main.test.ts, headless.test.ts, execute.test.ts"
    missing:
      - "Register handleLogin/handleLogout as Commander action handlers in main.ts"
      - "Add @flitter/util to packages/cli/package.json dependencies"
human_verification:
  - test: "Run flitter --help and verify complete command tree output"
    expected: "All subcommands (login, logout, threads, config, update) with descriptions displayed"
    why_human: "Commander exitOverride and help output formatting requires interactive terminal verification"
  - test: "Run full interactive TUI mode with real API key"
    expected: "Full-screen TUI launches, user can type message, LLM responds with tool use"
    why_human: "End-to-end integration requires running server, API key, and visual TUI rendering"
---

# Phase 11: CLI Entry & End-to-End Integration Verification Report

**Phase Goal:** CLI 入口与端到端集成 — Commander.js 命令树, TUI/Headless/Execute 三种运行模式, 认证流程, 自动更新, DI 组装, main() 入口
**Verified:** 2026-04-14T06:15:00Z
**Status:** gaps_found
**Re-verification:** No -- initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | `flitter --help` outputs complete command tree | VERIFIED | program.ts registers all subcommands (login/logout/threads/config/update) with Commander.js v14. 26 program tests pass. |
| 2 | Interactive TUI mode completes end-to-end conversation (M6) | FAILED | main.ts does not import or call launchInteractiveMode. No createContainer call. No resolveCliContext call. No mode routing exists. Modules exist in isolation but are not wired through main entry. |
| 3 | `echo "hello" \| flitter --headless` outputs JSON stream | FAILED | runHeadlessMode exists in modes/headless.ts (substantive, 101 lines, tested) but main.ts never imports or routes to it. Same root cause: missing main.ts wiring. |
| 4 | Auth flow: API Key -> Keyring storage -> auto-carry | FAILED | handleLogin in commands/auth.ts implements 3-tier priority (env > interactive > OAuth). BUT main.ts never registers login/logout as Commander action handlers. Auth modules are orphaned from the entry point. |
| 5 | Update SHA-256 verification rejects on mismatch | VERIFIED | installBinaryUpdate in installer.ts throws UpdateVerificationError on SHA-256 mismatch. 6 installer tests pass including SHA-256 verification failure test. computeSHA256 uses crypto.createHash('sha256'). |

**Score:** 2/5 truths verified

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `packages/cli/src/program.ts` | Commander.js command tree | VERIFIED | 132 lines, all subcommands registered, 26 tests pass |
| `packages/cli/src/context.ts` | CLI context resolution | VERIFIED | 74 lines, CliContext interface + resolveCliContext, 10 tests pass |
| `packages/cli/src/main.ts` | CLI main entry with full wiring | STUB | 147 lines. Creates Commander + parseAsync only. No mode routing, no createContainer, no resolveCliContext, no command handler registration. |
| `apps/flitter-cli/bin/flitter.ts` | Global shebang entry | VERIFIED | 27 lines, #!/usr/bin/env bun, imports main from @flitter/cli, fatal catch |
| `apps/flitter-cli/package.json` | bin field + dependencies | VERIFIED | bin.flitter = ./bin/flitter.ts, deps: @flitter/cli + @flitter/flitter |
| `packages/cli/src/modes/interactive.ts` | Interactive TUI mode | VERIFIED | 313 lines, launchInteractiveMode, 4-level widget tree, asyncDispose in finally, 15 tests pass |
| `packages/cli/src/modes/headless.ts` | Headless JSON stream mode | VERIFIED | 101 lines, runHeadlessMode, JSON Lines protocol, 8 tests pass (when @flitter/util resolves) |
| `packages/cli/src/modes/execute.ts` | Non-interactive execute mode | VERIFIED | 148 lines, runExecuteMode, stdin pipe, stream-json, 7 tests pass (when @flitter/util resolves) |
| `packages/cli/src/auth/api-key.ts` | API Key validation/storage | VERIFIED | 103 lines, validateApiKey, storeApiKey, hasApiKey, promptApiKey. 9 tests pass |
| `packages/cli/src/auth/oauth.ts` | OAuth PKCE flow | VERIFIED | 391 lines, performOAuth, startOAuthCallbackServer, waitForCallback, state validation, DI hooks. 8 tests pass |
| `packages/cli/src/commands/auth.ts` | Login/logout command handlers | VERIFIED | 114 lines, handleLogin (3-tier priority), handleLogout (delete credentials). Substantive. |
| `packages/cli/src/update/checker.ts` | Version detection | VERIFIED | 167 lines, compareVersions, computeSHA256, detectInstallMethod, checkForUpdate. 14 tests pass |
| `packages/cli/src/update/installer.ts` | Binary install + SHA-256 | VERIFIED | 173 lines, installBinaryUpdate, installWithPackageManager, UpdateVerificationError. 6 tests pass |
| `packages/cli/src/commands/update.ts` | Update command handler | VERIFIED | 112 lines, handleUpdate with detect method + check + install flow |
| `packages/flitter/src/container.ts` | ServiceContainer DI | VERIFIED | 312 lines, createContainer, ServiceContainer interface, SecretStorage, asyncDispose. 21 tests all pass |
| `packages/flitter/src/factory.ts` | Service factory functions | VERIFIED | 175 lines, 10 factory functions for all services |
| `packages/flitter/src/index.ts` | Barrel exports | VERIFIED | 41 lines, exports createContainer, types, all factory functions |
| `packages/cli/src/index.ts` | CLI barrel exports | VERIFIED | 91 lines, exports all public API including main, modes, auth, update |
| `packages/cli/src/commands/threads.ts` | Thread command handlers | STUB | 134 lines but all 5 handler functions are empty (void params + TODO comments) |
| `packages/cli/src/commands/config.ts` | Config command handlers | STUB | 84 lines but all 3 handler functions are empty (void params + TODO comments) |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| main.ts | createContainer (@flitter/flitter) | import | NOT_WIRED | main.ts does not import createContainer |
| main.ts | resolveCliContext (context.ts) | import | NOT_WIRED | main.ts does not import resolveCliContext |
| main.ts | launchInteractiveMode (modes/interactive.ts) | import + call | NOT_WIRED | main.ts does not import launchInteractiveMode |
| main.ts | runExecuteMode (modes/execute.ts) | import + call | NOT_WIRED | main.ts does not import runExecuteMode |
| main.ts | runHeadlessMode (modes/headless.ts) | import + call | NOT_WIRED | main.ts does not import runHeadlessMode |
| main.ts | handleLogin/handleLogout (commands/auth.ts) | import + action registration | NOT_WIRED | main.ts does not import or register auth handlers |
| main.ts | handleUpdate (commands/update.ts) | import + action registration | NOT_WIRED | main.ts does not import or register update handler |
| flitter.ts | main (@flitter/cli) | import + call | WIRED | `import { main } from "@flitter/cli"; main().catch(...)` |
| commander | packages/cli/package.json | dependency | WIRED | `"commander": "^14.0.3"` in dependencies |
| ServiceContainer | @flitter/data | import types + factory calls | WIRED | container.ts and factory.ts import from @flitter/data |
| ServiceContainer | @flitter/agent-core | import types + factory calls | WIRED | container.ts and factory.ts import from @flitter/agent-core |
| ServiceContainer | @flitter/llm | import MCPServerManager | WIRED | factory.ts imports MCPServerManager from @flitter/llm |
| @flitter/util | packages/cli/package.json | dependency | NOT_WIRED | @flitter/util used in main.ts/headless.ts/execute.ts but NOT in package.json dependencies |

### Data-Flow Trace (Level 4)

Not applicable -- main.ts is the integration point and its mode routing is completely missing, making data-flow tracing moot. The individual modules (interactive.ts, headless.ts, execute.ts) have correct data flow patterns internally but are never invoked.

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| Commander program has all subcommands | `bun test packages/cli/src/program.test.ts` | 26/26 pass | PASS |
| Context resolution mode detection | `bun test packages/cli/src/context.test.ts` | 10/10 pass | PASS |
| Interactive mode lifecycle | `bun test packages/cli/src/modes/interactive.test.ts` | 15/15 pass | PASS |
| Auth API key validation | `bun test packages/cli/src/auth/` | 17/17 pass | PASS |
| Update checker + installer | `bun test packages/cli/src/update/` | 20/20 pass | PASS |
| Container DI assembly | `bun test packages/flitter/src/container.test.ts` | 21/21 pass (49 assertions) | PASS |
| Main entry wiring | `bun test packages/cli/src/main.test.ts` | 0/11 pass (Cannot find module @flitter/util) | FAIL |
| Headless mode | `bun test packages/cli/src/modes/headless.test.ts` | 0/8 pass (Cannot find module @flitter/util) | FAIL |
| Execute mode | `bun test packages/cli/src/modes/execute.test.ts` | 0/7 pass (Cannot find module @flitter/util) | FAIL |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|----------|
| CLI-01 | 11-01, 11-07 | Commander 命令树 | PARTIAL | Command tree registered (plan 11-01 verified), but main() entry (plan 11-07) does not wire action handlers |
| CLI-02 | 11-02, 11-06 | 交互式 TUI 模式入口 | PARTIAL | launchInteractiveMode exists and tested; ServiceContainer DI working; but main.ts does not route to interactive mode |
| CLI-03 | 11-03 | Headless JSON 流模式 | PARTIAL | runHeadlessMode exists and tested; but main.ts does not route to headless mode; @flitter/util missing from deps |
| CLI-04 | 11-04 | 认证流程 | PARTIAL | handleLogin/handleLogout implemented with 3-tier auth; but not registered as Commander actions in main.ts |
| CLI-05 | 11-05 | 自动更新 | PARTIAL | checkForUpdate, installBinaryUpdate, handleUpdate all implemented and tested; but not registered as Commander action in main.ts |

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| packages/cli/src/commands/threads.ts | 58,76,94,112,130 | TODO: all 5 handler functions are empty stubs (void all params) | Warning | threads subcommands are non-functional |
| packages/cli/src/commands/config.ts | 44,64,81 | TODO: all 3 handler functions are empty stubs (void all params) | Warning | config subcommands are non-functional |
| packages/cli/src/main.ts | entire file | Missing wiring: no imports of modes, auth, update, container, context resolution | BLOCKER | main() creates Commander but never wires any actual functionality |
| packages/cli/package.json | dependencies | @flitter/util not listed but imported by main.ts, headless.ts, execute.ts | BLOCKER | Module resolution fails, 13 tests fail |

### Human Verification Required

### 1. Full Interactive TUI Session

**Test:** Launch `flitter` in a terminal with a valid API key configured, type a message, observe TUI rendering and LLM response.
**Expected:** Full-screen TUI renders, user can type, LLM responds with streaming text, tool use works.
**Why human:** Requires running TUI frame scheduler, real LLM API connection, and visual rendering verification.

### 2. Headless JSON Stream Pipeline

**Test:** Run `echo '{"role":"user","content":"hello"}' | flitter --headless` and inspect stdout.
**Expected:** JSON Lines output with inference:start, inference:delta, inference:complete events.
**Why human:** Requires real LLM API connection to produce meaningful output.

### Gaps Summary

**Root cause:** main.ts (Plan 11-07) was implemented as a minimal shell that creates a Commander program and calls parseAsync, but NEVER wires the critical integration layer. Specifically:

1. **No container creation** -- createContainer from @flitter/flitter is never called, so no ServiceContainer exists at runtime
2. **No mode routing** -- resolveCliContext is never called, and the default action handler is a no-op instead of routing to interactive/execute/headless modes
3. **No command handler registration** -- login, logout, threads, config, and update subcommands have no .action() callbacks registered in main.ts
4. **Missing dependency** -- @flitter/util is imported but not declared in package.json

All the individual pieces (interactive mode, headless mode, execute mode, auth, update, DI container) exist, are substantive, and pass their isolated tests. But the final assembly in main.ts -- which is the entire point of Plan 11-07 and the culmination of the phase -- is missing. This is a classic "orphaned modules" pattern where L1/L2 pass but L3 (wiring) fails at the integration point.

**Impact:** The `flitter` CLI binary, when executed, would parse command-line arguments but never actually do anything -- no TUI, no headless output, no auth, no updates.

---

_Verified: 2026-04-14T06:15:00Z_
_Verifier: Claude (gsd-verifier)_
