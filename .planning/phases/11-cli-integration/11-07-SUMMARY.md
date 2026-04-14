---
phase: 11-cli-integration
plan: "07"
subsystem: cli-entry
tags: [cli, entry-point, signal-handling, shebang, tdd]
dependency_graph:
  requires: [11-01, 11-02, 11-03, 11-04, 11-05, 11-06]
  provides: [main-entry, global-install]
  affects: [apps/flitter-cli, packages/cli]
tech_stack:
  added: []
  patterns: [async-main, signal-handling, exitOverride, shebang-entry]
key_files:
  created:
    - packages/cli/src/main.ts
    - packages/cli/src/main.test.ts
  modified:
    - apps/flitter-cli/bin/flitter.ts
    - apps/flitter-cli/package.json
    - packages/cli/src/index.ts
decisions:
  - "Used process.exitCode instead of process.exit() to allow async cleanup (PIT-B5)"
  - "Commander exitOverride() to prevent process.exit on --help/--version"
  - "getVersion() uses require('../package.json') with try/catch fallback to 0.0.0-dev"
  - "MainOptions interface with _testThrow for error path testing without mocking"
metrics:
  duration: "10m 23s"
  completed: "2026-04-14T05:52:45Z"
  tests_added: 11
  tests_total: 114
  files_created: 2
  files_modified: 3
---

# Phase 11 Plan 07: CLI Entry Point & Global Install Summary

main() async entry function with unhandledRejection/SIGINT/SIGTERM signal handlers, Commander.js exitOverride integration, shebang entry for global install

## Changes Made

### Task 1: Failing Tests (TDD RED)
- Created `packages/cli/src/main.test.ts` with 11 tests covering:
  - Signal handler registration (unhandledRejection, SIGINT, SIGTERM)
  - createProgram + parseAsync integration
  - Error handling (exitCode=1 + stderr output)
  - Normal execution (exitCode=0)
  - getVersion() with semver format and fallback safety
  - --verbose flag acceptance
  - Exit code semantics (0=success, 1=user error)
- Commit: f35f7ed

### Task 2: Implementation (TDD GREEN)
- Created `packages/cli/src/main.ts`:
  - `main(opts?)` async function: full CLI lifecycle
  - Registers `unhandledRejection` handler (exitCode=2)
  - Registers `SIGINT`/`SIGTERM` handlers with reentry guard (exitCode=130)
  - Creates Commander program via `createProgram(version)` with `exitOverride()`
  - Catches Commander help/version exits (exitCode=0) gracefully
  - Error path: writes to stderr + sets exitCode=1
  - `getVersion()` reads `../package.json` with fallback
  - `MainOptions` interface supports argv injection and `_testThrow` for testing
- Updated test file to handle bun's `process.exitCode` behavior (no delete/undefined support)
- Commit: 8a54eb4

### Task 3: Shebang Entry + Wiring
- Rewrote `apps/flitter-cli/bin/flitter.ts`:
  - `#!/usr/bin/env bun` shebang for global install
  - Imports `main` from `@flitter/cli`
  - Fatal error catch with `process.exit(2)`
- Updated `apps/flitter-cli/package.json`: added `@flitter/cli` dependency
- Updated `packages/cli/src/index.ts`: exports `main`, `getVersion`, `MainOptions`
- Commit: 270a303

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] process.exitCode reset in bun test environment**
- **Found during:** Task 2 (GREEN phase)
- **Issue:** bun runtime ignores `process.exitCode = undefined` and `delete process.exitCode` throws TypeError
- **Fix:** Use `process.exitCode = 0` in beforeEach/afterEach, assertions check for `0` instead of `undefined || 0`
- **Files modified:** packages/cli/src/main.test.ts
- **Commit:** 8a54eb4

## Verification

- 11 new tests all passing
- 114 total CLI package tests passing (no regressions)
- Shebang line verified: `#!/usr/bin/env bun`
- File permissions verified: executable (-rwxr-xr-x)
- Package.json bin field points to `./bin/flitter.ts`
- Index.ts exports main, getVersion, MainOptions

## Self-Check: PASSED

All 6 files found, all 3 commits verified.
