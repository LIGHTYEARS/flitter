---
phase: 30
plan: 03
title: "Wire SKILLS_MODAL Overlay + AppState Integration + Pending Skills Injection"
status: completed
completed_at: 2026-04-07
commits:
  - hash: c6e30a5
    message: "feat(skills): register SKILLS_MODAL overlay ID and priority 50"
  - hash: 2b6fc1c
    message: "feat(skills): integrate SkillService into AppState with pending skills methods"
  - hash: c9d1945
    message: "feat(skills): wire _openSkillsModal to real SkillsModal overlay with all callbacks"
files_modified:
  - packages/flitter-cli/src/state/overlay-ids.ts
  - packages/flitter-cli/src/state/app-state.ts
  - packages/flitter-cli/src/widgets/app-shell.ts
---

# Summary: Plan 30-03

## What was built

### Task 1: Register SKILLS_MODAL in overlay-ids.ts
- Added `SKILLS_MODAL: 'skillsModal'` to `OVERLAY_IDS`
- Added `SKILLS_MODAL: 50` to `OVERLAY_PRIORITIES` — user-triggered modal tier matching COMMAND_PALETTE, SHORTCUT_HELP, THREAD_LIST

### Task 2: Integrate SkillService into AppState + pending skills methods
- Added `readonly skillService: SkillService` field, initialized in constructor
- Updated `skillCount` getter to delegate to SkillService (falls back to `tools.length` for backward compat)
- Added `skillWarningCount` getter delegating to `SkillService.warningCount`
- Added `_pendingSkills: SkillDefinition[]` private field
- Added `addPendingSkill(skill)` — deduplicates by name matching AMP's `!T.some((a)=>a.name===R.name)`
- Added `removePendingSkill(name)` — filters by name matching AMP's `T.filter((a)=>a.name!==R)`
- Added `clearPendingSkills()` — resets to empty array
- Added `getPendingSkills()` — returns current pending array
- Added `consumePendingSkillsMessage()` — builds injection message, clears pending list, returns message string or null
- Wired SkillService listener to auto-sync `tools` array and notify AppState listeners

### Task 3: Wire _openSkillsModal in app-shell.ts
- Replaced `_openSkillsModal()` stub with real OverlayManager-based implementation
- Toggle behavior: dismiss if already open, show if closed (matching _showCommandPalette pattern)
- SkillsModal receives `skills`, `errors`, `warnings`, `cwd` from SkillService/AppState
- `onAddSkill` callback: dismisses overlay and logs
- `onDocs` callback: dismisses overlay and logs
- `onInsertPrompt` callback: dismisses overlay, inserts text into textController, sets cursor position
- `onInvokeSkill` callback: calls `appState.addPendingSkill()` for pending skills injection
- Updated `skillWarningCount` from hardcoded `0` to `this.widget.appState.skillWarningCount`
- Removed all `@deprecated`, `TODO: Phase 30`, and stub markers

## TypeScript verification

```
npx tsc --noEmit — 0 new errors from modified files (29 pre-existing errors in other files)
```

## AMP alignment verification

All methods and wiring match AMP's reverse-engineered behavior:
- `26_toast_skills.js` — addPendingSkill/removePendingSkill deduplication and filter logic: exact match
- `30_main_tui_state.js` — `isShowingSkillListModal`, `pendingSkills[]`, `skillWarningCount` UI state fields: all wired
- `03_skills_modal_state_f9T.js` — modal overlay as fullscreen modal with toggle behavior: exact match
