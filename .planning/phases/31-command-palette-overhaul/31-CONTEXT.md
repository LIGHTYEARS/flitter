# Phase 31: Command Palette Overhaul — Context

## AMP Golden Screenshot Analysis

Source: `tmux-capture/screens/amp/slash-command-popup/plain-63x244.golden`

### Visual Layout (exact from screenshot)

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                                Command Palette                               │
│ > █                                                                          │
│                                                                              │
│          amp  help                                                           │
│         mode  use rush                                                       │
│         mode  use large                                                      │
│         mode  use deep                                                       │
│         mode  set                                                            │
│         mode  toggle                                                Ctrl s   │
│       thread  switch                                                         │
│       thread  new                                                            │
│       prompt  open in editor                                        Ctrl g   │
│       thread  map                                                            │
│       thread  switch to cluster                                              │
│      context  analyze                                                        │
│         news  open in browser                                                │
│       thread  set visibility                                                 │
│       prompt  paste image from clipboard                            Ctrl v   │
└──────────────────────────────────────────────────────────────────────────────┘
```

### Key Observations

1. **Border**: Single-line box border (`┌─┐│└─┘`), same as current implementation
2. **Title**: "Command Palette" centered, bold, yellow (ANSI color 3 = yellow)
3. **Search**: ">" prefix followed by cursor, no "Search commands..." placeholder visible when empty
4. **Empty line**: Between search input and command list
5. **Command format**: `category  label` — right-aligned category (dim), two spaces, bold label
6. **Category column width**: Right-aligned, padded to the widest category ("context" = 7 chars)
7. **Shortcut hints**: Right-aligned at the right edge of the box, format `Ctrl s` (bold cyan "Ctrl", space, bold letter)
8. **No count indicator**: AMP does NOT show "X/Y commands" count text
9. **Vertically centered**: The box is vertically centered in the terminal viewport
10. **Box width**: ~80 characters wide (constrained, not full-width)

### ANSI Styling Details (from ansi golden)

- Title: `[1m[38;5;3m` = bold + color 3 (yellow)
- Category: `[2m` = dim
- Label: `[1m` = bold
- Selected item (first): `[48;5;3m` (yellow background) + `[38;5;0m` (black foreground)
- Shortcut "Ctrl": `[1m[38;5;4m` = bold + color 4 (blue/cyan)
- Shortcut key: `[1m` = bold (white)

### Command List (exact 16 commands in order)

| # | Category | Label | Shortcut |
|---|----------|-------|----------|
| 1 | amp | help | — |
| 2 | mode | use rush | — |
| 3 | mode | use large | — |
| 4 | mode | use deep | — |
| 5 | mode | set | — |
| 6 | mode | toggle | Ctrl s |
| 7 | thread | switch | — |
| 8 | thread | new | — |
| 9 | prompt | open in editor | Ctrl g |
| 10 | thread | map | — |
| 11 | thread | switch to cluster | — |
| 12 | context | analyze | — |
| 13 | news | open in browser | — |
| 14 | thread | set visibility | — |
| 15 | prompt | paste image from clipboard | Ctrl v |
| 16 | (possible more below scroll) | | |

## Current Implementation Gap

### command-palette.ts
- Has title "Command Palette" (cyan, not yellow — AMP uses yellow)
- Has "Search commands..." placeholder — AMP has no placeholder
- Shows `{N}/{M} commands` count — AMP does not
- Uses SelectionList with `> label - description` format — AMP uses `category  label` dual-column
- maxWidth: 60 — AMP appears ~80 chars

### command-registry.ts
- Has 8 non-shortcut commands: thread-new, thread-switch, thread-map, thread-set-visibility, thread-navigate-back, thread-navigate-forward, toggle-tool-calls, insert-file-mention
- Missing: help, use rush, use large, use deep, mode set, switch to cluster, context analyze, news open in browser
- No `category` field on CommandItem

## Requirements Coverage

| Req | Description | Status |
|-----|-------------|--------|
| CPAL-01 | Single-line box border, vertically centered, ">" search prefix | Partial: has border + centering, needs ">" prefix |
| CPAL-02 | category+label dual-column format with right-aligned shortcut hints | Missing |
| CPAL-03 | 15+ commands covering amp/mode/thread/prompt/context/news | Partial: ~13 with shortcuts, missing several |
| CPAL-04 | Specific commands list | Missing many |
