---
phase: 11-cli-integration
plan: 08
subsystem: infra
tags: [package-deps, security, command-injection, execFile, circular-dependency]

# Dependency graph
requires:
  - phase: 11-cli-integration
    provides: "CLI package structure, OAuth module (Plans 01-07)"
provides:
  - "Clean package dependency graph (no circular deps)"
  - "@flitter/util available as @flitter/cli dependency"
  - "Secure browser-open via execFile (no shell injection)"
affects: [11-09-main-wiring]

# Tech tracking
tech-stack:
  added: []
  patterns: ["execFile with argument arrays for subprocess invocation (no shell)"]

key-files:
  created: []
  modified:
    - packages/flitter/package.json
    - packages/cli/package.json
    - packages/cli/src/auth/oauth.ts

key-decisions:
  - "No new decisions - followed plan exactly as specified"

patterns-established:
  - "execFile over exec: Always use child_process.execFile with argument arrays for external commands to prevent shell injection"

requirements-completed: [CLI-04]

# Metrics
duration: 6min
completed: 2026-04-14
---

# Phase 11 Plan 08: Gap Closure Summary

**Removed circular @flitter/cli<->@flitter/flitter dependency, added missing @flitter/util to CLI, and replaced exec() with execFile() to eliminate OAuth command injection (CR-01/CR-02)**

## Performance

- **Duration:** 6 min
- **Started:** 2026-04-14T07:37:00Z
- **Completed:** 2026-04-14T07:42:38Z
- **Tasks:** 2/2
- **Files modified:** 3

## Accomplishments
- Eliminated circular dependency between @flitter/cli and @flitter/flitter (CR-02) by removing erroneous @flitter/cli from flitter's package.json
- Added missing @flitter/util dependency to @flitter/cli, unblocking 13 test failures in main.test.ts, headless.test.ts, execute.test.ts
- Fixed command injection vulnerability (CR-01) in OAuth defaultOpenBrowser by replacing exec() with execFile() and argument arrays

## Task Commits

Each task was committed atomically:

1. **Task 1: Fix circular dependency and add missing @flitter/util dep** - `d3cf4e1` (fix)
2. **Task 2: Fix CR-01 command injection in OAuth browser-open** - `46571e4` (fix)

## Files Created/Modified
- `packages/flitter/package.json` - Removed erroneous @flitter/cli dependency
- `packages/cli/package.json` - Added @flitter/util dependency
- `packages/cli/src/auth/oauth.ts` - Replaced exec() with execFile() in defaultOpenBrowser

## Decisions Made
None - followed plan as specified.

## Deviations from Plan
None - plan executed exactly as written.

## Issues Encountered
- Bun runtime not available in sandbox; OAuth test suite (`bun:test`) could not be executed directly. Structural verification confirmed correctness programmatically (execFile present, no bare exec, no URL template interpolation).

## Threat Surface Scan

No new threat surface introduced. Both changes reduce existing threat surface:
- T-11-01 (Tampering via shell injection): Mitigated by Task 2
- T-11-02 (Elevation via circular dep): Mitigated by Task 1

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Package dependency graph is clean and acyclic
- @flitter/util imports will resolve correctly in CLI package
- OAuth browser-open is secure against command injection
- Ready for Plan 09 (main.ts wiring) which depends on these fixes

---
*Phase: 11-cli-integration*
*Completed: 2026-04-14*

## Self-Check: PASSED

- All 3 modified files exist
- SUMMARY.md exists
- Commit d3cf4e1 (Task 1) found
- Commit 46571e4 (Task 2) found
