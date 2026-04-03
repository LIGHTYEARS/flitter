---
phase: 17-overlay-and-command-surfaces
plan: "04"
subsystem: ui
tags: [file-picker, autocomplete, fuzzy-match, overlay, fd]

# Dependency graph
requires:
  - phase: 17-01
    provides: OverlayManager, overlay IDs/priorities, fuzzyMatch utility
  - phase: 16-01
    provides: InputArea with Autocomplete stub, TextEditingController
provides:
  - listProjectFiles() utility (fd preferred, readdir fallback)
  - FilePicker standalone overlay widget
  - "@" autocomplete trigger in InputArea with file caching
  - "Insert file mention" command in command palette
affects: [20-theme-integration, 22-automated-tests]

# Tech tracking
tech-stack:
  added: [fd]
  patterns: [file-list-caching, dual-invocation-path]

key-files:
  created:
    - packages/flitter-cli/src/utils/file-list.ts
    - packages/flitter-cli/src/widgets/file-picker.ts
  modified:
    - packages/flitter-cli/src/widgets/input-area.ts
    - packages/flitter-cli/src/widgets/app-shell.ts
    - packages/flitter-cli/src/commands/command-registry.ts
    - packages/flitter-cli/src/shortcuts/registry.ts

key-decisions:
  - "Two invocation paths (inline @-autocomplete and standalone OverlayManager picker) sharing listProjectFiles()"
  - "fd preferred with readdir fallback for file listing"
  - "File list caching on InputAreaState with 5-second TTL"
  - "Hardcoded colors (green border, brightBlack muted) — Phase 20 adds theme"
  - "Anchored placement (left:2, bottom:3) for standalone picker near input area"

patterns-established:
  - "File list caching pattern: async provider + TTL cache on widget state"
  - "Dual invocation: lightweight inline autocomplete + richer standalone overlay for same data"

requirements-completed: [OVLY-03]

# Metrics
duration: 17min
completed: 2026-04-03
---

# Phase 17 Plan 04: File Picker and Autocomplete Summary

**listProjectFiles utility with fd/readdir fallback, FilePicker standalone overlay, @-trigger wired into InputArea autocomplete, and "Insert file mention" command in palette**

## Performance

- **Duration:** 17 min
- **Started:** 2026-04-03T12:18:21Z
- **Completed:** 2026-04-03T12:36:09Z
- **Tasks:** 7 (steps 1-7)
- **Files modified:** 6

## Accomplishments
- Created `listProjectFiles()` utility with `fd` (preferred, respects .gitignore) and `readdir` fallback with depth/file caps
- Built `FilePicker` standalone overlay widget ported from flitter-amp with hardcoded colors, FocusScope, fuzzy search, SelectionList
- Wired `@` autocomplete trigger into InputArea's Autocomplete widget with file caching (5s TTL)
- Added `getFiles` prop to InputArea, plumbed through AppShell with `listProjectFiles(cwd)`
- Wired standalone file picker via OverlayManager with anchored placement near the input area
- Added "Insert file mention" command to the command palette via `hooks.showFilePicker()`
- Added `showFilePicker` to ShortcutHooks interface for extensibility

## Task Commits

Each task was committed atomically:

1. **Task 1: Create file listing utility** - `11b6b8a` (feat)
2. **Task 2: Create FilePicker widget** - `9027234` (feat)
3. **Task 3+4+5: Wire @ trigger, getFiles prop, file caching** - `1b4461b` (feat)
4. **Task 6: Wire standalone file picker via OverlayManager** - `e302b94` (feat)
5. **Task 7: Add "Insert file mention" command** - `6ae0464` (feat)
6. **Fix: Remove unused import, restore ShortcutHelpOverlay** - `ff4af54` (fix)

## Files Created/Modified
- `packages/flitter-cli/src/utils/file-list.ts` - listProjectFiles() with fd/readdir, maxDepth, maxFiles
- `packages/flitter-cli/src/widgets/file-picker.ts` - FilePicker StatefulWidget with search, fuzzyMatch scoring, SelectionList
- `packages/flitter-cli/src/widgets/input-area.ts` - Added getFiles prop, @-trigger, file cache with 5s TTL
- `packages/flitter-cli/src/widgets/app-shell.ts` - Added _showFilePicker, getFiles plumbing, FilePicker import
- `packages/flitter-cli/src/commands/command-registry.ts` - Added 'insert-file-mention' command
- `packages/flitter-cli/src/shortcuts/registry.ts` - Added showFilePicker to ShortcutHooks

## Decisions Made
- Two invocation paths share `listProjectFiles()`: inline Autocomplete popup for quick @ mentions, standalone FilePicker overlay for the command palette action
- `fd` preferred over `readdir` because it respects `.gitignore` and is significantly faster on large repos
- File list cache lives on InputAreaState (not AppState) because it's a UI-specific concern; 5s TTL balances freshness with performance
- Standalone picker uses `placement: { type: 'anchored', left: 2, bottom: 3 }` to appear just above the input area
- Colors hardcoded (green, brightBlack) pending Phase 20 theme integration

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Restored accidentally removed ShortcutHelpOverlay import**
- **Found during:** Task 6 (type-check)
- **Issue:** Search/replace for import block accidentally removed the pre-existing `ShortcutHelpOverlay` import
- **Fix:** Re-added `import { ShortcutHelpOverlay } from './shortcut-help-overlay'`
- **Files modified:** packages/flitter-cli/src/widgets/app-shell.ts
- **Verification:** tsc --noEmit passes
- **Committed in:** ff4af54

**2. [Rule 1 - Bug] Removed unused stat import**
- **Found during:** Task 7 (type-check)
- **Issue:** file-list.ts imported `stat` from node:fs/promises but never used it
- **Fix:** Removed unused import
- **Files modified:** packages/flitter-cli/src/utils/file-list.ts
- **Committed in:** ff4af54

---

**Total deviations:** 2 auto-fixed (2 bugs)
**Impact on plan:** Minor — both were import-level issues caught by type-check. No scope creep.

## Issues Encountered
None

## Known Stubs
None — all file listing, autocomplete wiring, and command palette integration is fully functional.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- File picker and autocomplete overlays are complete
- Ready for Plan 17-05 (Shortcut Help Overlay) or Phase 20 (theme integration)
- Automated test coverage deferred to Phase 22 as specified in plan

## Self-Check: PASSED

---
*Phase: 17-overlay-and-command-surfaces*
*Completed: 2026-04-03*
