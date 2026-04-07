# Phase 36 Context: Visual Polish

## Requirements

| ID | Description | AMP Reference |
|------|----------------------------------------------|------------------------------------------|
| VPOL-01 | Streaming cursor uses block character with 500ms blink animation (not scanning bar) | AMP uses `\u2588` FULL BLOCK, ~500ms blink |
| VPOL-02 | Tool call file paths use OSC8 terminal hyperlink protocol for clickable editor links | AMP wraps file paths in `\x1b]8;;{url}\x07{text}\x1b]8;;\x07` |
| VPOL-03 | Edit file tool card displays inline diff preview with green/red line highlighting | AMP shows DiffCard in collapsed header view |
| VPOL-04 | Prompt symbol in idle state shows only ">" (no extra text) | AMP idle prompt: plain ">" character |
| VPOL-05 | Spinner color follows agent mode color (not static) | AMP: `this._spinner.toBraille()` with `color: T.app.toolRunning` replaced by mode color |

## Current State

### VPOL-01: Streaming Cursor
- `streaming-cursor.ts` uses `\u258C` (LEFT HALF BLOCK, `▌`) with 530ms blink
- AMP requirement: `\u2588` (FULL BLOCK, `█`) with 500ms blink
- InputArea's TextField already uses `cursorChar: '\u2588'` — but StreamingCursor appends `▌` not `█`

### VPOL-02: OSC8 Hyperlinks
- No OSC8 support exists anywhere in the codebase
- Tool header details render file paths as plain text
- Need to wrap file paths in OSC8 escape sequences for terminal hyperlink support

### VPOL-03: Diff Preview in Collapsed Header
- `edit-file-tool.ts` only shows DiffCard when `isExpanded=true`
- When collapsed, only the header is returned (no diff summary in header row)
- Already has `countDiffStats()` — used only in expanded view
- Need: show "+N/-M" stats inline in the collapsed ToolHeader details

### VPOL-04: Prompt Symbol
- `prompt-symbol.ts` maps `idle` to `\u203A` (›) — a SINGLE RIGHT-POINTING ANGLE QUOTATION MARK
- AMP idle prompt is simply ">" (U+003E, ASCII greater-than)
- Other states also use fancy unicode — AMP uses simple ">" for idle only

### VPOL-05: Spinner Mode Color
- `tool-header.ts` spinner uses `mutedColor` (theme.base.mutedForeground / brightBlack)
- AMP: activity group spinner uses `color: T.app.toolRunning` (which is blue)
- Requirement says "follows agent mode color" — AMP's `BM(L)` returns mode-specific secondaryColor
- ToolHeader spinner should use the agent mode color, passed down or resolved from theme

## Key Files

| File | Role |
|------|------|
| `packages/flitter-cli/src/widgets/streaming-cursor.ts` | VPOL-01: cursor char + blink interval |
| `packages/flitter-cli/src/widgets/tool-call/tool-header.ts` | VPOL-02: file path detail spans, VPOL-05: spinner color |
| `packages/flitter-cli/src/widgets/tool-call/edit-file-tool.ts` | VPOL-03: diff stats in collapsed view |
| `packages/flitter-cli/src/utils/prompt-symbol.ts` | VPOL-04: idle symbol |
| `packages/flitter-cli/src/themes/index.ts` | VPOL-05: agentModeColor() |

## AMP Evidence

- AMP mode catalog (`34_providers_models_catalog.js`): Each mode has `uiHints.secondaryColor` (RGB)
- AMP activity group (`01_activity_group_state_z1R.js`): Spinner color = `T.app.toolRunning`
- AMP input-area builders: `BM(L)` resolves mode -> color, used for border overlays
- AMP idle prompt: simple ">" character (no fancy unicode)
