---
phase: 17-overlay-and-command-surfaces
plan: "05"
subsystem: ui
tags: [overlay, shortcut-help, keyboard-shortcuts, focus-scope, registry]

requires:
  - phase: 17-overlay-and-command-surfaces
    provides: ShortcutRegistry, OverlayManager, overlay IDs/priorities, default shortcuts

provides:
  - ShortcutHelpOverlay widget with registry-derived grouped shortcut display
  - showShortcutHelp hook wired in AppShell (replaces stub)
  - Toggle behavior for ? shortcut (open/close)

affects: [20-theme-integration, 22-automated-tests]

tech-stack:
  added: []
  patterns:
    - Registry-driven overlay content (no fallback/hardcoded lists)
    - Modal overlay with FocusScope key absorption

key-files:
  created:
    - packages/flitter-cli/src/widgets/shortcut-help-overlay.ts
  modified:
    - packages/flitter-cli/src/widgets/app-shell.ts

key-decisions:
  - "Registry as sole source of truth — no fallback hardcoded shortcut list"
  - "No internal Stack/mask — OverlayManager handles modal mask with modal:true"
  - "Static Input section for widget-level behaviors (Enter, @, $, $$) as constant"
  - "Hardcoded colors (cyan/blue/brightBlack/white) — Phase 20 adds theme support"
  - "Same priority as command palette (50) — guard prevents stacking"

patterns-established:
  - "Registry-driven overlay: overlay content derives from ShortcutRegistry, eliminating drift between actual bindings and help display"
  - "Modal overlay with FocusScope key absorption: all keys absorbed while overlay is shown, only Escape and ? dismiss"

requirements-completed: [OVLY-04]

duration: 7min
completed: 2026-04-03
---

# Phase 17 Plan 05: Shortcut Help / Discovery Surface Summary

**ShortcutHelpOverlay widget reading all shortcuts from ShortcutRegistry with grouped display, modal key absorption, and toggle via ? key**

## Performance

- **Duration:** 7 min
- **Started:** 2026-04-03T12:18:21Z
- **Completed:** 2026-04-03T12:25:06Z
- **Tasks:** 2 implementation tasks + verification
- **Files modified:** 2 (1 created, 1 modified)

## Accomplishments
- Created ShortcutHelpOverlay StatelessWidget that reads grouped shortcuts from ShortcutRegistry (single source of truth)
- Wired showShortcutHelp hook in AppShell replacing the Phase 17-05 stub
- Toggle behavior: pressing ? opens the overlay, pressing ? or Escape closes it
- Modal overlay absorbs all keyboard input while shown (FocusScope)
- Static Input section (Enter, @, $, $$) appended as widget-level behaviors
- Footer with colored keybind highlights ("Press ? or Esc to close")

## Task Commits

Each task was committed atomically:

1. **Task 1: Create ShortcutHelpOverlay widget** - `1a13cf7` (feat)
2. **Task 2: Wire showShortcutHelp hook in AppShell** - `e20df9a` (feat)

## Files Created/Modified
- `packages/flitter-cli/src/widgets/shortcut-help-overlay.ts` - ShortcutHelpOverlay StatelessWidget with groupsFromRegistry helper, static Input shortcuts, FocusScope key absorption, centered bordered card (maxWidth: 55)
- `packages/flitter-cli/src/widgets/app-shell.ts` - Added ShortcutHelpOverlay import, replaced showShortcutHelp stub with _showShortcutHelp() method using OverlayManager.show() with modal:true

## Decisions Made
- **Registry as sole source of truth.** No fallback hardcoded list. If the registry is empty, the overlay shows only the static Input section. This eliminates drift risk where help lists bindings that do not match actual behavior.
- **Modal overlay with key absorption.** The help overlay is informational and should prevent accidental input. All keys except Escape and ? are swallowed.
- **Static Input section.** Enter, @, $, $$ are widget-level behaviors (TextField/InputArea) that cannot be registered as global shortcuts. Maintained as a static constant.
- **No theme integration yet.** Colors are hardcoded. Phase 20 adds theme support.
- **No internal Stack/mask.** Unlike the amp version, the cli version delegates the semi-transparent background mask to OverlayManager (modal: true). This keeps the overlay widget focused on content.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Verification

- Type-check: clean (only pre-existing warnings in unrelated files)
- Tests: 305 pass, 0 fail, 626 expect() calls

## Next Phase Readiness
- Shortcut help overlay is complete and functional
- All registered shortcuts from the ShortcutRegistry appear in grouped display
- Adding new shortcuts to defaults.ts automatically reflects in the help overlay
- Phase 20 will add theme support (replacing hardcoded colors)
- Phase 22 will add automated tests for widget construction

## Self-Check: PASSED

- FOUND: packages/flitter-cli/src/widgets/shortcut-help-overlay.ts
- FOUND: packages/flitter-cli/src/widgets/app-shell.ts
- FOUND: .planning/phases/17-overlay-and-command-surfaces/17-05-SUMMARY.md
- FOUND: commit 1a13cf7
- FOUND: commit e20df9a

---
*Phase: 17-overlay-and-command-surfaces*
*Completed: 2026-04-03*
