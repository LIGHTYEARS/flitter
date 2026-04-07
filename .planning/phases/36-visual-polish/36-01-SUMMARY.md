# Phase 36 Summary: Visual Polish

## Completed Requirements

| ID | Description | Status |
|------|----------------------------------------------|--------|
| VPOL-01 | Block cursor (█) with 500ms blink | Done |
| VPOL-02 | OSC8 terminal hyperlinks for file paths | Done |
| VPOL-03 | Diff preview stats in collapsed header | Done |
| VPOL-04 | Idle prompt symbol ">" | Done |
| VPOL-05 | Spinner color follows toolRunning theme | Done |

## Changes Made

### VPOL-01: Block Cursor
- `streaming-cursor.ts`: Changed CURSOR_CHAR from `\u258C` (▌) to `\u2588` (█)
- Changed CURSOR_BLINK_INTERVAL_MS from 530 to 500

### VPOL-02: OSC8 Hyperlinks
- New file `utils/osc8-link.ts` with `wrapOSC8Link()` and `fileLink()` utilities
- Applied OSC8 wrapping to file path details in:
  - `edit-file-tool.ts`
  - `read-tool.ts`
  - `create-file-tool.ts`
  - `grep-tool.ts`

### VPOL-03: Collapsed Diff Stats
- `edit-file-tool.ts`: Diff extraction moved before expansion check
- "+N/-M" stats string added to ToolHeader details array
- Visible in both collapsed and expanded views

### VPOL-04: Idle Prompt Symbol
- `prompt-symbol.ts`: Changed idle mapping from `\u203A` (›) to `>` (ASCII)
- Updated test assertion in `prompt-symbol.test.ts`

### VPOL-05: Mode-Aware Spinner Color
- `tool-header.ts`: Added optional `spinnerColor` prop
- Spinner now uses `theme.app.toolRunning` (blue) instead of `mutedColor` (brightBlack)
- Supports mode-specific color override via `spinnerColor` prop

## Verification
- TypeScript typecheck: no new errors
- prompt-symbol tests: 9/9 passing
- tool-rendering tests: 59/60 passing (1 pre-existing failure from Phase 34 ACTV-05)
