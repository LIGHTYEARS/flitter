# Plan 31-01 Summary: Redesign Command Palette Layout

## Status: COMPLETE

## Changes Made

### 1. `packages/flitter-cli/src/commands/command-registry.ts`
- Added `category: string` field to `CommandItem` interface
- Replaced shortcut-derived command loop with explicit AMP-ordered palette commands
- Added `makeShortcutExecutor()` helper for shortcut-bound commands
- Registered all 15 commands matching AMP golden screenshot order
- Used `(appState as any).method?.()` for future methods not yet on AppState

### 2. `packages/flitter-cli/src/widgets/command-palette.ts`
- Defined new `CommandPaletteItem` interface with `id`, `category`, `label`, `description`, `shortcutHint`
- Replaced `SelectionItem[]` with `CommandPaletteItem[]` in props
- Title color: cyan -> yellow (ANSI 3) matching AMP
- Added ">" prefix before TextField (Row layout)
- Removed "Search commands..." placeholder
- Removed "{N}/{M} commands" count indicator
- maxWidth: 60 -> 80 matching AMP
- Replaced SelectionList with custom dual-column rendering:
  - Right-aligned dim category + 2-space gap + bold label
  - Right-aligned shortcut hints (bold cyan modifier + bold key)
  - Selected item: yellow background + black foreground
- Built-in keyboard navigation (ArrowUp/Down, Enter, Escape)
- Scroll support with ScrollController + Scrollbar

### 3. `packages/flitter-cli/src/widgets/app-shell.ts`
- Import `CommandPaletteItem` from command-palette
- Updated `_showCommandPalette()` mapping to use `CommandPaletteItem` fields
- Removed unused `SelectionItem` import

### 4. `packages/flitter-cli/src/shortcuts/registry.ts`
- Added optional `pasteImage?(): void` to `ShortcutHooks` interface

## TypeScript Check
`npx tsc --noEmit` — no new errors from changes (pre-existing warnings only)

## Requirements Coverage
- CPAL-01: DONE — single-line box border, vertically centered, ">" search prefix
- CPAL-02: DONE — category+label dual-column format with right-aligned shortcut hints
- CPAL-03: DONE — 15 commands covering amp/mode/thread/prompt/context/news categories
