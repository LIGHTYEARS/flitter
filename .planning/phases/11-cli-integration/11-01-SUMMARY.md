---
phase: 11-cli-integration
plan: 01
subsystem: cli
tags: [commander, cli, command-tree, context-resolution, tty-detection]

# Dependency graph
requires:
  - phase: 10-agent-core
    provides: Agent core engine (ThreadWorker, ToolOrchestrator, PermissionEngine)
provides:
  - Commander.js command tree with all subcommands (login/logout/threads/config/update)
  - CliContext interface and resolveCliContext() mode detection logic
  - Command handler stub signatures for auth/threads/config/update
  - Barrel exports for @flitter/cli package
affects: [11-02, 11-03, 11-04, 11-05, 11-07]

# Tech tracking
tech-stack:
  added: [commander ^14.0.3]
  patterns: [command-handler-deps-pattern, tty-mode-detection, variadic-args-message]

key-files:
  created:
    - packages/cli/src/program.ts
    - packages/cli/src/context.ts
    - packages/cli/src/commands/auth.ts
    - packages/cli/src/commands/threads.ts
    - packages/cli/src/commands/config.ts
    - packages/cli/src/commands/update.ts
    - packages/cli/src/program.test.ts
    - packages/cli/src/context.test.ts
  modified:
    - packages/cli/src/index.ts
    - packages/cli/package.json

key-decisions:
  - "Commander v14 requires .action() on root command when subcommands exist, otherwise auto-shows help and exits"
  - "Unknown subcommands handled via command:* event listener (silent), not allowUnknownOption"
  - "Command handlers use (deps, context, options?) signature pattern with minimal dep interfaces"
  - "parse() uses {from: 'user'} in tests to avoid node/script prefix requirement"

patterns-established:
  - "Command handler deps pattern: each handler defines its own minimal interface for required services"
  - "TTY mode detection: isTTY = stdout.isTTY && stderr.isTTY, executeMode = --execute || !isTTY || --headless"
  - "Commander test pattern: create fresh program per test, parse with {from: 'user'}, inspect opts/commands"

requirements-completed: [CLI-01]

# Metrics
duration: 17min
completed: 2026-04-14
---

# Phase 11 Plan 01: Commander.js Command Tree & CLI Context Summary

**Commander.js v14 command tree with 5 subcommand groups, 5 global options, TTY-based mode detection, and 36 tests**

## Performance

- **Duration:** 17 min
- **Started:** 2026-04-14T04:32:40Z
- **Completed:** 2026-04-14T04:49:40Z
- **Tasks:** 6
- **Files modified:** 10

## Accomplishments
- Commander.js command tree: createProgram() with login/logout/threads/config/update subcommands
- CLI context resolution: resolveCliContext() with TTY detection, mode detection (interactive/execute/headless)
- Command handler stubs: auth, threads, config, update with typed dep interfaces
- Barrel exports: all public API exported from @flitter/cli index.ts

## Task Commits

Each task was committed atomically:

1. **Task 1: RED - program.ts tests** - `98abc63` (test)
2. **Task 2: GREEN - program.ts implementation** - `2d498a9` (feat)
3. **Task 3: RED - context.ts tests** - `1f5901e` (test)
4. **Task 4: GREEN - context.ts implementation** - `8bbf41f` (feat)
5. **Task 5: Command handler stubs** - `8d02d7a` (feat)
6. **Task 6: Barrel exports** - `d52c3f9` (feat)

## Files Created/Modified
- `packages/cli/src/program.ts` - Commander.js command tree: createProgram(version) with all subcommands and global options
- `packages/cli/src/context.ts` - CLI context resolution: CliContext interface + resolveCliContext() mode detection
- `packages/cli/src/commands/auth.ts` - handleLogin/handleLogout stub handlers
- `packages/cli/src/commands/threads.ts` - handleThreadsList/New/Continue/Archive/Delete stubs
- `packages/cli/src/commands/config.ts` - handleConfigGet/Set/List stubs
- `packages/cli/src/commands/update.ts` - handleUpdate stub handler
- `packages/cli/src/program.test.ts` - 26 tests for command tree structure and option parsing
- `packages/cli/src/context.test.ts` - 10 tests for mode detection and context resolution
- `packages/cli/src/index.ts` - Barrel exports for all public API
- `packages/cli/package.json` - Added commander ^14.0.3 dependency

## Decisions Made
- Commander v14 requires `.action()` on root command when subcommands are defined, otherwise it auto-shows help and exits (discovered during GREEN phase)
- Unknown subcommands handled via `command:*` event listener rather than `allowUnknownOption` (which only applies to options, not commands)
- Command handler stubs define their own minimal dep interfaces (e.g., `AuthCommandDeps`, `ThreadsCommandDeps`) rather than depending on full ServiceContainer type
- `{from: 'user'}` parse mode used in tests to avoid node/script argv prefix

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Commander v14 auto-help behavior**
- **Found during:** Task 2 (program.ts GREEN phase)
- **Issue:** Commander v14 shows help and calls process.exit() when parsing with subcommands defined but no `.action()` on root command
- **Fix:** Added `.action(() => {})` on root command to establish default action handler
- **Files modified:** packages/cli/src/program.ts
- **Verification:** All 26 program tests pass
- **Committed in:** 2d498a9

**2. [Rule 1 - Bug] Commander v14 unknown command throws**
- **Found during:** Task 2 (program.ts GREEN phase)
- **Issue:** `allowUnknownOption(true)` does not prevent Commander from throwing on unknown subcommands
- **Fix:** Used `command:*` event listener instead, which intercepts unknown command processing
- **Files modified:** packages/cli/src/program.ts
- **Verification:** Unknown command test passes without exceptions
- **Committed in:** 2d498a9

---

**Total deviations:** 2 auto-fixed (2 bugs with Commander v14 API)
**Impact on plan:** Both fixes necessary for correct Commander behavior. No scope creep.

## Issues Encountered
- Initial commits accidentally went to main repo master branch instead of worktree branch (CWD issue). Resolved by copying files to worktree and re-committing properly. Main repo master reset to base commit.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Commander.js command tree ready for action handler wiring in Plans 11-02, 11-03, 11-04, 11-05
- CliContext interface available for interactive (11-02) and headless (11-03) mode entry points
- Command handler stubs provide clear signatures for implementation in dependent plans
- @flitter/cli barrel exports complete for downstream consumption

## Self-Check: PASSED

- All 9 artifact files verified present
- All 6 commit hashes verified in git history
- 36 tests passing (26 program + 10 context)
- SUMMARY.md exists at correct path

---
*Phase: 11-cli-integration*
*Completed: 2026-04-14*
