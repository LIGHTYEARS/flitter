---
phase: 11-cli-integration
plan: 09
subsystem: cli
tags: [commander, di-container, mode-routing, signal-handler, entry-point]

# Dependency graph
requires:
  - phase: 11-06
    provides: "ServiceContainer DI assembly (createContainer, asyncDispose)"
  - phase: 11-01
    provides: "Commander.js command tree (createProgram) and CliContext (resolveCliContext)"
  - phase: 11-02
    provides: "launchInteractiveMode (interactive TUI mode)"
  - phase: 11-03
    provides: "runHeadlessMode + runExecuteMode (non-interactive modes)"
  - phase: 11-04
    provides: "handleLogin, handleLogout (auth command handlers)"
  - phase: 11-05
    provides: "handleUpdate (update command handler)"
  - phase: 11-07
    provides: "Thread/Config command handlers + barrel exports"
  - phase: 11-08
    provides: "Gap analysis identifying main.ts wiring gap"
provides:
  - "Fully wired CLI entry point (main.ts) connecting all modules"
  - "Commander action handlers registered for all subcommands"
  - "Mode routing: interactive/headless/execute based on CliContext"
  - "Lazy container creation via ensureContainer()"
  - "Signal handler leak guard (signalHandlersInstalled)"
  - "Container cleanup via asyncDispose in finally block"
  - "_testContainer/_testSecrets injection for testability"
affects: []

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Lazy DI container creation (ensureContainer) for CLI performance"
    - "Module-level guard for signal handler idempotency"
    - "_testContainer injection pattern for integration testing"

key-files:
  created: []
  modified:
    - "packages/cli/src/main.ts"
    - "packages/cli/src/main.test.ts"

key-decisions:
  - "Lazy container creation via ensureContainer() — container only created when a command needs it"
  - "Module-level signalHandlersInstalled guard prevents listener leak in test scenarios (WR-02)"
  - "FileSettingsStorage constructed with globalPath option object (not string path)"
  - "In-memory SecretStorage as default (no persistent keychain in v1)"
  - "Commander action override pattern — last .action() call wins, overrides program.ts empty handler"

patterns-established:
  - "_testContainer injection: integration tests inject mock ServiceContainer to skip real createContainer"
  - "ensureContainer lazy pattern: CLI subcommands that need DI call ensureContainer() which creates on first use"

requirements-completed: [CLI-01, CLI-02, CLI-03, CLI-04, CLI-05]

# Metrics
duration: 7min
completed: 2026-04-14
---

# Phase 11 Plan 09: main.ts Full Wiring Summary

**Fully wired CLI entry point connecting createContainer, resolveCliContext, all mode launchers (interactive/headless/execute), and all Commander action handlers (login/logout/update/threads/config)**

## Performance

- **Duration:** 7 min
- **Started:** 2026-04-14T07:58:19Z
- **Completed:** 2026-04-14T08:05:19Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments
- Rewrote main.ts from bare Commander parseAsync to fully wired entry point with DI container, mode routing, and 12 registered command handlers
- Signal handler leak guard (WR-02 from code review) prevents listener accumulation in test scenarios
- 27 comprehensive tests covering container lifecycle, command routing, mode routing, signal handling, and error paths
- All 130 CLI tests pass, all 21 flitter tests pass — zero regressions

## Task Commits

Each task was committed atomically:

1. **Task 1: Rewrite main.ts with full wiring** - `041d4e5` (feat)
2. **Task 2: Update main.test.ts for wired main()** - `ad5780f` (test)

## Files Created/Modified
- `packages/cli/src/main.ts` - Fully wired CLI entry point: imports createContainer, resolveCliContext, all mode launchers, all command handlers; lazy container creation; signal handler guard; container cleanup in finally
- `packages/cli/src/main.test.ts` - 27 tests: mock ServiceContainer, container lifecycle, command routing (login/logout/update/threads/config), mode routing (execute/headless), signal handler guard, error handling

## Decisions Made
- **Lazy container creation:** ensureContainer() defers createContainer() until a command actually needs it, avoiding startup cost for --help/--version
- **In-memory SecretStorage default:** createInMemorySecretStorage() as default when no _testSecrets injected; persistent keychain deferred to future work
- **FileSettingsStorage constructor:** Uses `{ globalPath: ... }` options object (discovered actual API differs from plan's simplified `new FileSettingsStorage(path)`)
- **Non-TTY test handling:** Tests use --help, --execute with message, or env var FLITTER_API_KEY to avoid blocking on stdin/OAuth in CI

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] FileSettingsStorage constructor signature**
- **Found during:** Task 1
- **Issue:** Plan specified `new FileSettingsStorage(path.join(configDir, "settings.json"))` but actual constructor takes `FileSettingsStorageOptions` object with `globalPath` field
- **Fix:** Used `new FileSettingsStorage({ globalPath: path.join(configDir, "settings.json") })`
- **Files modified:** packages/cli/src/main.ts
- **Verification:** TypeScript compilation succeeds, all tests pass
- **Committed in:** 041d4e5

**2. [Rule 1 - Bug] Test failures due to non-TTY execute mode routing**
- **Found during:** Task 2
- **Issue:** Default action tests expected exitCode=0 but non-TTY test environment routes to execute mode which requires input; login test timed out waiting for OAuth callback
- **Fix:** Tests use --execute with message args for mode routing, --help for container injection tests, FLITTER_API_KEY env var for login test
- **Files modified:** packages/cli/src/main.test.ts
- **Verification:** All 27 tests pass in under 1 second
- **Committed in:** ad5780f

---

**Total deviations:** 2 auto-fixed (2 bugs)
**Impact on plan:** Both fixes necessary for correctness. No scope creep.

## Issues Encountered
None beyond the auto-fixed deviations above.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Phase 11 gap closure complete: main.ts is now the fully wired CLI entry point
- All modules (container, context, modes, commands) are connected and tested
- Ready for end-to-end integration testing and final Phase 11 verification

---
*Phase: 11-cli-integration*
*Completed: 2026-04-14*
