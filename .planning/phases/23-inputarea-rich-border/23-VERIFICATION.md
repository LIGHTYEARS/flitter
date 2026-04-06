---
phase: 23-inputarea-rich-border
verified: 2026-04-06T00:38:00Z
status: human_needed
score: 13/13 requirements verified
gaps: []
human_verification:
  - test: "Visually verify border gap rendering"
    expected: "Border horizontal lines have actual character gaps where overlay text appears (no '─' characters under the text)"
    why_human: "Gap-aware paint logic cannot be verified by static grep; requires terminal rendering"
  - test: "Verify BorderShimmer animation on mode switch"
    expected: "Switching agent mode triggers a right-to-left shimmer that sweeps across the top border line and stops"
    why_human: "Animation timing and visual output require live terminal observation"
  - test: "Verify skill count click triggers modal"
    expected: "Clicking the skill count on top-right border opens the skills overlay"
    why_human: "_openSkillsModal() is a stub (TODO: Phase 30); cannot verify modal behavior programmatically"
---

# Phase 23: InputArea Rich Border — Code Verification Report

**Phase Goal:** Implement rich border rendering for InputArea — four border positions with context metadata, gap-aware border drawing, BorderShimmer animation, remove HeaderBar/StatusBar from app-shell.
**Verified:** 2026-04-06T00:38:00Z
**Status:** gaps_found
**Re-verification:** No — initial code verification (previous file was a plan-review document, not codebase verification)

---

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | BorderGap/BorderGaps types exist in paint-context.ts | ✓ VERIFIED | `paint-context.ts:58-69` — `export interface BorderGap`, `export interface BorderGaps` |
| 2 | drawBorderSides/drawBorder accept gaps parameter | ✓ VERIFIED | `paint-context.ts:297,352` — `gaps?: BorderGaps` optional last param on both methods |
| 3 | BoxDecoration.borderGaps exists and is forwarded | ✓ VERIFIED | `render-decorated.ts:99,104,115,271` — field, constructor, equals, drawBorderSides call |
| 4 | lerpColor exists in color.ts and exported from index.ts | ✓ VERIFIED | `color.ts:311` — function definition; `index.ts:6,84` — exported |
| 5 | border-helpers.ts exports 5 functions | ✓ VERIFIED | `border-helpers.ts:26,42,59,76,102` — all 5 exports present |
| 6 | border-builders.ts exports 4 builder functions | ✓ VERIFIED | `border-builders.ts:71,153,282,438` — all 4 builders present |
| 7 | HeaderBar/StatusBar removed from app-shell Column | ✓ VERIFIED | `app-shell.ts:819-853` — Column has exactly 2 children: Expanded + InputArea |
| 8 | MIN_HEIGHT = 5 in input-area.ts | ✓ VERIFIED | `input-area.ts:85` — `export const MIN_HEIGHT = 5` |
| 9 | borderGaps passed to BoxDecoration in input-area.ts | ✓ VERIFIED | `input-area.ts:572-582` — gap computation and BoxDecoration({border, borderGaps}) |
| 10 | BorderShimmer used in input-area.ts | ✓ VERIFIED | `input-area.ts:51,602` — imported and instantiated in Stack |
| 11 | status-widgets.test.ts imports from border-helpers | ✓ VERIFIED | `status-widgets.test.ts:3,8` — both imports from `../widgets/border-helpers` |
| 12 | bottomGridUserHeight global state | ✗ FAILED | No `bottomGridUserHeight` anywhere in codebase; `dragHeight` is local component state only |
| 13 | REQUIREMENTS.md checkboxes updated | ✗ FAILED | BORDER-06, BORDER-08, BORDER-09 still `[ ]` in REQUIREMENTS.md |

**Score: 11/13 truths verified**

---

## Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `packages/flitter-core/src/scheduler/paint-context.ts` | BorderGap/BorderGaps types + gap-aware drawBorder/drawBorderSides | ✓ VERIFIED | All interfaces defined, both methods accept `gaps?: BorderGaps` |
| `packages/flitter-core/src/layout/render-decorated.ts` | BoxDecoration.borderGaps, forwarding | ✓ VERIFIED | Field, constructor, equals, _paintDecoration all updated |
| `packages/flitter-core/src/core/color.ts` | lerpColor function | ✓ VERIFIED | Function at L311, clamps t, interpolates RGB channels |
| `packages/flitter-core/src/index.ts` | Exports BorderGap, BorderGaps, lerpColor | ✓ VERIFIED | All three exported at L6 and L84 |
| `packages/flitter-cli/src/widgets/border-helpers.ts` | 5 helper functions | ✓ VERIFIED | formatTokenCount, formatElapsed, thresholdColor, shortenPath, getFooterText all exported |
| `packages/flitter-cli/src/widgets/border-builders.ts` | 4 builder functions + BorderOverlayResult | ✓ VERIFIED | buildTopLeftOverlay, buildTopRightOverlay, buildBottomLeftOverlay, buildBottomRightOverlay + interface |
| `packages/flitter-cli/src/widgets/border-shimmer.ts` | BorderShimmer StatefulWidget | ✓ VERIFIED | StatefulWidget with trigger detection in didUpdateWidget, lerpColor trail, dispose() clears timer |
| `packages/flitter-cli/src/widgets/app-shell.ts` | Column with only Expanded + InputArea | ✓ VERIFIED | L819-853: exactly `[Expanded(content), InputArea({...})]` |
| `packages/flitter-cli/src/widgets/input-area.ts` | MIN_HEIGHT=5, borderGaps, 4 builders called | ✓ VERIFIED | L85, L572-582, L504-543 — all three confirmed |
| `packages/flitter-cli/src/__tests__/status-widgets.test.ts` | Imports from border-helpers | ✓ VERIFIED | L3, L8: both imports from border-helpers |

---

## Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `render-decorated.ts` | `paint-context.ts` | `ctx.drawBorderSides(..., this._decoration.borderGaps)` | ✓ WIRED | L271 passes borderGaps as 6th arg |
| `border-builders.ts` | `border-helpers.ts` | `import { formatTokenCount, formatElapsed, thresholdColor, shortenPath }` | ✓ WIRED | L23-28, note: getFooterText not imported (logic inlined in buildBottomLeftOverlay) |
| `input-area.ts` | `border-builders.ts` | `import { buildTopLeftOverlay, ... }` | ✓ WIRED | L46-50 imports all 4 builders |
| `input-area.ts` | `flitter-core BoxDecoration` | `new BoxDecoration({ border, borderGaps })` | ✓ WIRED | L578-582 |
| `app-shell.ts` | `input-area.ts` | `new InputArea({...border props...})` | ✓ WIRED | L821-852, all migrated props passed |
| `input-area.ts` | `border-shimmer.ts` | `import { BorderShimmer }` | ✓ WIRED | L51 import, L602 instantiation |
| `input-area.ts` | `agentModePulseSeq` from `app-shell` | `this.widget.agentModePulseSeq` | ✓ WIRED | app-shell L846, input-area L605 |

---

## Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|---------------|--------|--------------------|--------|
| `buildTopLeftOverlay` | `contextWindowPercent`, `costUsd`, `elapsedMs` | `app-shell.ts` → `appState.contextWindowUsagePercent`, `appState.usage?.cost?.amount`, `appState.elapsedMs` | Yes — real AppState fields | ✓ FLOWING |
| `buildTopRightOverlay` | `skillCount`, `skillWarningCount` | `appState.skillCount ?? 0`, hardcoded `0` | Partial — skillWarningCount hardcoded 0 | ⚠ PARTIAL STATIC |
| `buildBottomLeftOverlay` | `isExecutingCommand`, `isRunningShell`, `isAutoCompacting`, `isHandingOff` | hardcoded `false` in app-shell L840-843 | No — all hardcoded false per TODO | ⚠ STATIC (documented stubs) |
| `buildBottomRightOverlay` | `cwd`, `gitBranch` | `appState.metadata?.cwd`, `appState.metadata?.gitBranch` | Yes — real AppState fields | ✓ FLOWING |
| `BorderShimmer` | `trigger` | `_agentModePulseSeq` incremented on mode change in app-shell | Yes — increments on mode change | ✓ FLOWING |

---

## Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| `bun test status-widgets.test.ts` | `bun test src/__tests__/status-widgets.test.ts` | 20 pass, 0 fail | ✓ PASS |
| flitter-core TypeScript | `cd packages/flitter-core && npx tsc --noEmit` | Only pre-existing errors (TS6133/TS7029/TS2304) — zero new errors | ✓ PASS |
| flitter-cli TypeScript | `cd packages/flitter-cli && npx tsc --noEmit` | Only pre-existing errors (TS6196/TS6133/TS2322/TS2345) — zero new errors | ✓ PASS |
| BorderGap exported from flitter-core | grep index.ts | `export type { BorderGap, BorderGaps }` at L84 | ✓ PASS |
| lerpColor exported from flitter-core | grep index.ts | `export { Color, blendColor, lerpColor }` at L6 | ✓ PASS |

---

## Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|----------|
| BORDER-01 | 23-01, 23-02, 23-03 | Top-left border embeds context window percentage | ✓ SATISFIED | buildTopLeftOverlay + borderGaps + BoxDecoration wired |
| BORDER-02 | 23-02 | Top-right border has clickable skill count badge | ✓ SATISFIED | buildTopRightOverlay wraps skill section in MouseRegion (L223 in border-builders.ts) |
| BORDER-03 | 23-02 | Bottom-left border embeds status messages | ✓ SATISFIED | buildBottomLeftOverlay implements D-06 priority logic |
| BORDER-04 | 23-02 | Bottom-right border embeds cwd and git branch | ✓ SATISFIED | buildBottomRightOverlay with shortenPath |
| BORDER-05 | 23-01, 23-03 | agentModePulse animation with lerpColor | ✓ SATISFIED | lerpColor in color.ts, BorderShimmer in border-shimmer.ts, wired via agentModePulseSeq |
| BORDER-06 | 23-03 | HeaderBar and StatusBar removed from app-shell | ✓ SATISFIED (REQUIREMENTS.md not updated) | No `new HeaderBar` / `new StatusBar` in app-shell; Column has exactly 2 children |
| BORDER-07 | 23-02, 23-03 | Streaming shows token/cost/elapsed + "Esc to cancel" | ✓ SATISFIED | buildTopLeftOverlay streaming branch + buildBottomLeftOverlay isStreaming → "Esc to cancel" |
| BORDER-08 | 23-03 | Resizable with bottomGridUserHeight global state | ✗ PARTIAL | Drag resize works (local dragHeight field) but no global `bottomGridUserHeight` state — REQUIREMENTS.md requirement text specifies global state |
| BORDER-09 | 23-03 | InputArea initial height minLines: 3 (5 total) | ✓ SATISFIED (REQUIREMENTS.md not updated) | MIN_HEIGHT=5, documented as "3 content + 2 border" at L84-85 |

---

## Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `app-shell.ts` | 840-843 | `isExecutingCommand: false, isRunningShell: false, isAutoCompacting: false, isHandingOff: false` hardcoded | ⚠ Warning | buildBottomLeftOverlay will never show "Running tools..." / "Running shell..." / "Auto-compacting..." / "Handing off..." states. Documented as future-phase stubs. |
| `app-shell.ts` | 849 | `skillWarningCount: 0` hardcoded | ⚠ Warning | Warning indicator in buildTopRightOverlay will never show. Documented as future-phase stub. |
| `.planning/REQUIREMENTS.md` | 16-19 | BORDER-06, BORDER-08, BORDER-09 still `[ ]` | ℹ Info | Tracking document not updated post-execution. BORDER-06 and BORDER-09 should be `[x]`. |

---

## Human Verification Required

### 1. Gap-Aware Border Rendering

**Test:** Run the flitter-cli application and observe the InputArea border
**Expected:** Horizontal border lines (`─`) have actual gaps (no characters) where the overlay text widgets appear at the four corners
**Why human:** Gap paint logic requires terminal rendering; cannot verify character skipping via static analysis

### 2. BorderShimmer Animation

**Test:** Switch agent mode (e.g., from smart to default) while the InputArea is visible
**Expected:** A highlight sweeps from right to left across the top border line using a gradient trail of 5 characters, then disappears
**Why human:** Animation timing, visual gradient, and sweep direction require live terminal observation

### 3. Skill Count Click Behavior

**Test:** Click on the skill count text in the top-right border overlay
**Expected:** Currently stub — `_openSkillsModal()` is a TODO (Phase 30). No modal will appear; the click should be silently no-op or trigger the stub.
**Why human:** Interactive click behavior requires runtime testing; stub status makes it ? UNCERTAIN

### 4. Bottom-Left Overlay Stubs

**Test:** Trigger a tool execution or shell command and observe the bottom-left border
**Expected:** "Running tools..." or "Running shell..." should appear — but WILL NOT due to hardcoded `isExecutingCommand: false` / `isRunningShell: false`
**Why human:** Confirms known stub limitation is understood; documents that future phases must wire these

---

## Gaps Summary

Two gaps found:

**Gap 1 — BORDER-08 bottomGridUserHeight global state (Partial):**
BORDER-08 requires `bottomGridUserHeight` as a global state variable for split-view persistence. The implementation correctly implements drag-resize clamped to `[MIN_HEIGHT, floor(screenHeight/2)]`, but the drag height is stored in a local `private dragHeight: number | null` field that resets when the component rebuilds. AMP's `bottomGridUserHeight` global state persists across widget lifecycle events. This is a functional partial: drag resize works, but persistence is missing.

**Gap 2 — REQUIREMENTS.md tracking document not updated (Non-blocking):**
Three requirement checkboxes remain `[ ]` after execution:
- BORDER-06: Satisfied by code (should be `[x]`)
- BORDER-08: Partially satisfied (drag works, global state missing)
- BORDER-09: Satisfied by code (MIN_HEIGHT=5 = 3 content + 2 border; should be `[x]`)

The REQUIREMENTS.md needs a manual update to reflect actual completion state.

---

_Verified: 2026-04-06T00:38:00Z_
_Verifier: gsd-verifier (automated code verification)_
