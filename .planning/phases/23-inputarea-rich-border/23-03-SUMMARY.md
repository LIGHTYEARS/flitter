# 23-03-SUMMARY.md — Wire Everything Together

Phase: 23-inputarea-rich-border  
Plan: 23-03  
Status: COMPLETE  
Date: 2026-04-06

## What Was Done

Plan 23-03 wired together all the infrastructure built in Plans 01 and 02:
removed HeaderBar/StatusBar from app-shell, connected the four border builder
functions to InputArea, added the BorderShimmer animation, and fixed drag resize
to use dynamic screen dimensions.

---

## Task 1 — Remove HeaderBar/StatusBar from app-shell

**Files modified:**
- `packages/flitter-cli/src/widgets/app-shell.ts`
- `packages/flitter-cli/src/widgets/header-bar.ts`
- `packages/flitter-cli/src/widgets/status-bar.ts`
- `packages/flitter-cli/src/__tests__/status-widgets.test.ts`

**Changes:**
- Removed `HeaderBar` and `StatusBar` imports from app-shell.ts.
- Column children changed to `[Expanded(content), InputArea({...allMigratedProps})]`.
- InputArea now receives all props previously consumed by HeaderBar (tokenUsage,
  costUsd, elapsedMs, contextWindowPercent, isInterrupted, hasConversation) and
  StatusBar (cwd, gitBranch, isStreaming, isExecutingCommand, isRunningShell,
  isAutoCompacting, isHandingOff, statusMessage).
- New props added: agentModePulseSeq, skillCount, skillWarningCount, onSkillCountClick,
  screenHeight.
- Added `_agentModePulseSeq` field (monotonically incrementing on mode change).
- Added `_screenHeight` getter returning `process.stdout.rows || 50`.
- Added `_openSkillsModal()` stub (Phase 30 will implement full modal).
- `header-bar.ts` and `status-bar.ts` file headers marked `@deprecated`.
- `status-widgets.test.ts` imports updated from `header-bar`/`status-bar` to `border-helpers`.

**Verification:** All 20 status-widgets tests pass.

---

## Task 2 — Update InputArea with rich borders

**File modified:** `packages/flitter-cli/src/widgets/input-area.ts`

**Changes:**
- `MIN_HEIGHT` changed from 3 to 5 (3 content lines + 2 border rows).
- `InputAreaProps` extended with all 18 new border feature props.
- `InputArea` class fields expanded to store all new props with sensible defaults.
- `_handleDragMove` now uses `this.widget.screenHeight ?? 50` for dynamic maxHeight.
- `build()` calls all four builder functions:
  - `buildTopLeftOverlay` — context window usage (null when no conversation)
  - `buildTopRightOverlay` — mode + skill count
  - `buildBottomLeftOverlay` — status message (null when idle)
  - `buildBottomRightOverlay` — cwd + git branch
- Gap computation from textWidth values, passed as `borderGaps` to `BoxDecoration`.
- Stack now includes shimmer overlay + four Positioned overlay widgets.
- Old mode badge overlay removed (replaced by buildTopRightOverlay).
- Old `overlayTexts` prop handling loop removed; interface marked `@deprecated`.

---

## Task 3 — Create BorderShimmer widget

**File created:** `packages/flitter-cli/src/widgets/border-shimmer.ts`

**Architecture:**
- `BorderShimmer extends StatefulWidget` with props:
  color, backgroundColor, trigger, trail, direction, width.
- `BorderShimmerState`:
  - `_position`: column index of the shimmer head.
  - `_active`: whether animation is running.
  - `_timer`: `setInterval` handle.
  - `_lastTrigger`: tracks trigger to detect changes in `didUpdateWidget`.
- `initState`: stores initial trigger value; does NOT start animation.
- `didUpdateWidget`: starts animation when trigger > 0 and has changed.
- `dispose`: stops and clears interval timer.
- Animation: right-to-left sweep at 2 chars/80ms interval; stops when head exits.
- `_buildShimmerRow`: Row of `Text('─')` with lerpColor gradient trail.
- Idle state: renders a `SizedBox` spacer (no visual output).

**Wire-up in InputArea:**
- Shimmer placed as first Positioned overlay (bottom of Z-stack, behind text overlays).
- Shimmer `right` edge anchored at `topRight.textWidth + 2` to avoid overlapping mode label.

---

## Verification Results

### tsc
All errors are pre-existing (provider/state/tools unused imports, chat-view readonly,
thinking-block italic). Zero new errors introduced by Plan 23-03.

### Tests
```
bun test src/__tests__/status-widgets.test.ts
20 pass, 0 fail
```

### Grep Checks
- HeaderBar/StatusBar in app-shell: only in comments (not code) — PASS
- MIN_HEIGHT = 5 in input-area: line 85 — PASS
- borderGaps in input-area: lines 572, 581 — PASS
- BorderShimmer in input-area: lines 8, 20, 51, 139, 450 — PASS
- border-helpers in status-widgets.test.ts: lines 3, 8 — PASS

---

## Success Criteria Status

| Criterion | Status |
|-----------|--------|
| App-shell Column has exactly 2 children: Expanded + InputArea | PASS |
| InputArea renders metadata at all 4 border positions | PASS |
| Border has genuine gaps where overlay text is placed | PASS |
| MIN_HEIGHT is 5 | PASS |
| Drag resize uses dynamic maxHeight from screen dimensions | PASS |
| BorderShimmer animates on agent mode change | PASS |
| Existing tests pass with updated imports | PASS (20/20) |
| No new TypeScript compilation errors | PASS |

---

## Commits

1. `feat(23-inputarea-rich-border-03/t1)` — app-shell refactor, test updates (a4caae3)
2. `feat(23-inputarea-rich-border-03/t2)` — InputArea rich borders, MIN_HEIGHT=5 (d315a65)
3. `feat(23-inputarea-rich-border-03/t3)` — BorderShimmer widget (9bdda60)

---

## Context for Next Phase

Phase 23 is now complete. The three-plan sequence delivered:
- **Plan 23-01**: BoxDecoration borderGaps, paint-context BorderGap type, shimmer
  placeholder infrastructure.
- **Plan 23-02**: Four border builder functions (buildTopLeftOverlay,
  buildTopRightOverlay, buildBottomLeftOverlay, buildBottomRightOverlay) and five
  helper functions in border-helpers.ts.
- **Plan 23-03**: Wired everything together — app-shell removes HeaderBar/StatusBar,
  InputArea renders rich borders, BorderShimmer animates on mode change.

The InputArea now has AMP-equivalent border metadata at all four corners. The next
architectural work is Phase 24 (Welcome Screen) or Phase 25 (Provider and Model System).
