# Phase 11: UX Polish — Summary

## Changes

### 1. Permission Dialog background mask (UX-01)
**File:** `packages/flitter-amp/src/widgets/permission-dialog.ts`
- Wrapped dialog in a Stack with full-screen semi-transparent overlay (rgba 0,0,0,0.6)
- Dialog content centered on top of the overlay
- Added Stack/Positioned imports

### 2. Remove debug console.error (UX-02)
**File:** `packages/flitter-amp/src/app.ts`
- Replaced `console.error(\`[APP-DEBUG]...\`)` with `log.debug(...)` to avoid stderr noise

### 3. Display agentInfo.name in BottomGrid (UX-03)
**Files:** `packages/flitter-amp/src/app.ts`, `packages/flitter-amp/src/widgets/bottom-grid.ts`
- Added `agentName` prop to BottomGrid
- Displayed as `· agentName` suffix in bottom-right status area
- Passed from `appState.agentName` in App widget

### 4. Markdown paragraph merging (UX-04)
**File:** `packages/flitter-core/src/widgets/markdown.ts`
- Consecutive non-empty, non-special lines are merged into a single paragraph block
- Merging stops at: empty lines, headings, code blocks, blockquotes, lists, horizontal rules, tables

### 5. Markdown heading prefixes (UX-05)
**File:** `packages/flitter-core/src/widgets/markdown.ts`
- H1: `━ ` (heavy horizontal bar)
- H2: `─ ` (light horizontal bar)
- H3: `· ` (middle dot)
- H4: no prefix

## Files Modified (4)
- `packages/flitter-amp/src/widgets/permission-dialog.ts`
- `packages/flitter-amp/src/app.ts`
- `packages/flitter-amp/src/widgets/bottom-grid.ts`
- `packages/flitter-core/src/widgets/markdown.ts`
