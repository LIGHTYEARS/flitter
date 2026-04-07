# Plan 31-02 Summary: Register All Missing Commands

## Status: COMPLETE

## Changes Made

All 15 commands were registered in the 31-01 commit since adding `category` to CommandItem
and registering commands with categories are inseparable (Plan Splitting Invariant: no transient
inconsistency). This summary documents the verification.

### Commands Registered (exact AMP order)

| # | Category | Label | Shortcut | Status |
|---|----------|-------|----------|--------|
| 1 | amp | help | — | NEW |
| 2 | mode | use rush | — | NEW |
| 3 | mode | use large | — | NEW |
| 4 | mode | use deep | — | NEW |
| 5 | mode | set | — | NEW |
| 6 | mode | toggle | Ctrl+S | EXISTING (from shortcut registry) |
| 7 | thread | switch | — | EXISTING (reordered, relabeled) |
| 8 | thread | new | — | EXISTING (reordered, relabeled) |
| 9 | prompt | open in editor | Ctrl+G | EXISTING (from shortcut registry) |
| 10 | thread | map | — | EXISTING (reordered, relabeled) |
| 11 | thread | switch to cluster | — | NEW |
| 12 | context | analyze | — | NEW |
| 13 | news | open in browser | — | NEW |
| 14 | thread | set visibility | — | EXISTING (reordered, relabeled) |
| 15 | prompt | paste image from clipboard | Ctrl+V | NEW |

### Commands Removed from Palette (not in AMP)

- `thread-navigate-back` — removed (not in AMP palette)
- `thread-navigate-forward` — removed (not in AMP palette)
- `toggle-tool-calls` — removed (exists as Alt+T shortcut only)
- `insert-file-mention` — removed (not in AMP palette)
- All shortcut-derived auto-generated commands — replaced with explicit entries

### Categories Covered

- amp (1 command)
- mode (5 commands)
- thread (6 commands)
- prompt (2 commands)
- context (1 command)
- news (1 command)

**Total**: 15 commands (matches CPAL-03 requirement of 15+)

## TypeScript Check
`npx tsc --noEmit` — no new errors

## Requirements Coverage
- CPAL-03: DONE — 15 commands covering all 6 AMP categories
- CPAL-04: DONE — all specified commands registered (help, use rush/large/deep, mode set/toggle, thread switch/new/map/set visibility, open in editor, paste image, context analyze, news open)
