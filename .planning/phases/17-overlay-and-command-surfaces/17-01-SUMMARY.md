---
phase: 17-overlay-and-command-surfaces
plan: "01"
subsystem: ui
tags: [overlay, shortcuts, fuzzy-match, shortcut-registry, overlay-manager]

requires:
  - phase: 16
    provides: AppShell with inline shortcut handlers, InputArea, AppState
provides:
  - OverlayManager with priority-sorted stack and buildOverlays widget builder
  - ShortcutRegistry with centralized dispatch, introspection, and conflict detection
  - Default shortcut registrations for the Phase 16 shortcut matrix
  - Fuzzy match utilities (fuzzyMatch, fuzzyMatchDetailed, scoreCommand)
  - Overlay IDs and priority constants
affects: [17-02-permission-dialog, 17-03-command-palette, 17-04-file-picker, 17-05-shortcut-help]

tech-stack:
  added: []
  patterns:
    - "Observer pattern for OverlayManager (addListener/removeListener/notifyListeners)"
    - "ShortcutRegistry dispatch-first key handling replacing inline switch/case"
    - "ShortcutContext + ShortcutHooks for decoupled widget-level actions"
    - "buildOverlays(baseContent) wrapping for overlay Stack composition"

key-files:
  created:
    - packages/flitter-cli/src/state/overlay-manager.ts
    - packages/flitter-cli/src/state/overlay-ids.ts
    - packages/flitter-cli/src/utils/fuzzy-match.ts
    - packages/flitter-cli/src/shortcuts/registry.ts
    - packages/flitter-cli/src/shortcuts/defaults.ts
    - packages/flitter-cli/src/shortcuts/index.ts
  modified:
    - packages/flitter-cli/src/state/app-state.ts
    - packages/flitter-cli/src/widgets/app-shell.ts

key-decisions:
  - "OverlayManager lives on AppState (not AppShellState) so non-widget code can show overlays"
  - "ShortcutRegistry replaces inline switch/case handlers for centralized source of truth"
  - "Phase 21 shortcuts (Ctrl+R) registered as stubs so help overlay lists them"
  - "ShortcutHooks interface decouples widget-level actions from registry actions"
  - "No theme integration yet — colors use hardcoded defaults (Phase 20)"

patterns-established:
  - "Overlay registration: overlayManager.show({ id, priority, modal, placement, builder })"
  - "Shortcut registration: registry.register({ id, binding, displayKey, description, category, action })"
  - "Widget-level hooks via ShortcutHooks interface for actions needing widget internals"

requirements-completed: []

duration: 12min
completed: 2026-04-03
---

# Phase 17 Plan 01: Overlay Infrastructure and OverlayManager Integration Summary

**OverlayManager with priority-sorted stack, ShortcutRegistry replacing inline handlers, fuzzy-match utilities, and overlay IDs ported to flitter-cli**

## Performance

- **Duration:** 12 min
- **Started:** 2026-04-03T11:25:00Z
- **Completed:** 2026-04-03T11:37:00Z
- **Tasks:** 8
- **Files modified:** 8

## Accomplishments
- Ported OverlayManager from flitter-amp with full priority-sorted stack (show/dismiss/dismissTop/buildOverlays)
- Created ShortcutRegistry with dispatch, introspection, and conflict detection
- Registered all Phase 16 shortcuts in the registry, replacing 8 inline handlers in AppShell
- Ported fuzzy-match utilities for command palette and file picker use
- Wired OverlayManager into AppState and AppShell with buildOverlays wrapping
- Escape key now dismisses top overlay before falling through to app exit

## Task Commits

Each task was committed atomically:

1. **Task 1: Port OverlayManager** - `f931cb0` (feat)
2. **Task 2: Port overlay-ids** - `d100391` (feat)
3. **Task 3: Port fuzzy-match** - `6fa8c7c` (feat)
4. **Task 4: Port ShortcutRegistry** - `2b89e2f` (feat)
5. **Task 5: Create default shortcuts + index** - `e140cf9` (feat)
6. **Task 6: Wire OverlayManager into AppState** - `41fab5b` (feat)
7. **Task 7+8: Wire registry/overlays into AppShell, remove inline handlers** - `cb39d00` (feat)
8. **Task fix: Correct relative import paths** - `f43d3d3` (fix)

## Files Created/Modified
- `packages/flitter-cli/src/state/overlay-manager.ts` - Priority-sorted overlay stack with buildOverlays widget builder
- `packages/flitter-cli/src/state/overlay-ids.ts` - OVERLAY_IDS and OVERLAY_PRIORITIES constants
- `packages/flitter-cli/src/utils/fuzzy-match.ts` - fuzzyMatch, fuzzyMatchDetailed, scoreCommand
- `packages/flitter-cli/src/shortcuts/registry.ts` - ShortcutRegistry, ShortcutEntry, ShortcutContext, ShortcutHooks
- `packages/flitter-cli/src/shortcuts/defaults.ts` - registerDefaultShortcuts with Phase 16 matrix
- `packages/flitter-cli/src/shortcuts/index.ts` - Barrel re-exports for shortcuts module
- `packages/flitter-cli/src/state/app-state.ts` - Added overlayManager property
- `packages/flitter-cli/src/widgets/app-shell.ts` - ShortcutRegistry dispatch, buildOverlays wrapping, overlay listener

## Decisions Made
- **OverlayManager on AppState**: Enables non-widget code (e.g., permission request handlers in the provider layer) to show overlays without needing a widget reference.
- **ShortcutRegistry replaces inline handlers**: Centralizes all shortcut definitions so the help overlay (Plan 17-05) can read the same source of truth.
- **Phase 21 stubs in registry**: Ctrl+R history search is registered as a stub that logs and returns 'handled'. The registry entry exists so the help overlay lists it.
- **ShortcutHooks decoupling**: Widget-level actions (showCommandPalette, openInEditor, etc.) go through a hooks interface, avoiding tight coupling between the registry and widget internals.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Incorrect relative import paths in state/ and shortcuts/ modules**
- **Found during:** Task 8 (test verification)
- **Issue:** Files in `src/state/` and `src/shortcuts/` used `../../../../flitter-core` (4 levels up) instead of `../../../flitter-core` (3 levels up), causing module resolution failures at test time.
- **Fix:** Corrected all relative imports to use `../../../flitter-core/...`
- **Files modified:** overlay-manager.ts, registry.ts, defaults.ts
- **Verification:** All 305 tests pass, tsc --noEmit clean
- **Committed in:** `f43d3d3`

---

**Total deviations:** 1 auto-fixed (1 bug)
**Impact on plan:** Import path correction required for module resolution. No scope creep.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Overlay infrastructure is complete and ready for Plans 17-02 through 17-05
- OverlayManager.show() is the single entry point for all overlay consumers
- ShortcutRegistry hooks (showCommandPalette, showShortcutHelp) are stubs waiting for Plans 17-03 and 17-05
- All 305 tests pass, type-check clean

---
*Phase: 17-overlay-and-command-surfaces*
*Completed: 2026-04-03*
