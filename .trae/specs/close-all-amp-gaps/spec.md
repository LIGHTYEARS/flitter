# Close All AMP Gaps Spec

## Why

The 2026-Q2 audit identified 120 total gaps between Flitter and AMP's Chat View TUI, of which ~85 remain open. Current alignment is ~29% overall / ~43% for user-visible features. This spec drives implementation of ALL remaining gaps to achieve full AMP parity.

## What Changes

All 85 unchecked tasks from the audit roadmap (`deep-audit-amp-alignment-2026Q2/tasks.md`) will be implemented across 6 waves:

- **Wave 1 (P0)**: Renderer class completion, ACP reconnection wiring, LiveHandle integration
- **Wave 2 (P1 Rendering/Input)**: present() cleanup, control char filtering, Kitty CSI u, RepaintBoundary P2/P3
- **Wave 3 (P1 Text/ACP/Visual)**: GFM tables, code block fallback, type safety, reconnection UI, FilePicker overlay, visual fidelity
- **Wave 4 (P1 New Features)**: Tab message navigation, message edit/restore, CommandPalette expansion, token/cost display
- **Wave 5 (P1 Animation)**: AnimationController migration for spinners and scroll
- **Wave 6 (P2 All)**: Type cleanup, rendering optimizations, input system, TextField/InputArea, visual polish, ACP protocol, scroll/virtualization, new P2 features

## Impact

- Affected code: `packages/flitter-core/src/**` (terminal, framework, input, layout, widgets, animation)
- Affected code: `packages/flitter-amp/src/**` (acp, state, widgets, shortcuts, themes)
- Test commands: `bun test` in each package
- Type-check: `bun run typecheck` in each package

## Critical Discovery: renderer.ts Truncated

**`packages/flitter-core/src/terminal/renderer.ts` is truncated at line 285.** The file contains only constants and `buildSgrDelta()`. The `Renderer` class (imported by `TerminalManager`) does not exist. The `CursorState` interface definition is cut off mid-word. This is the single highest-priority fix -- without `Renderer`, no terminal output can be produced.

## ADDED Requirements

### Requirement: Complete Renderer Class
The system SHALL have a working `Renderer` class in `renderer.ts` that:
- Accepts `RowPatch[]` diff and `CursorState`
- Wraps output in BSU/ESU (synchronized update) sequences
- Hides cursor during rendering, restores after
- Emits minimal SGR deltas between consecutive cells using `buildSgrDelta()`
- Handles cursor movement (CUP sequences), skipping sequential cells on the same row
- Filters control characters (U+0000-U+001F except tab/newline) from cell content
- Tracks `_currentRow`/`_currentCol` state to skip redundant cursor moves
- Produces correct output for the existing `renderer-cursor-opt.test.ts` and `renderer-fallback.test.ts` test suites

### Requirement: ACP Reconnection Runtime Integration
The system SHALL integrate ReconnectionManager, HeartbeatMonitor, and LiveHandle into the main application flow in `index.ts`.

### Requirement: Full AMP Feature Parity
The system SHALL implement all 85 remaining gap items as documented in the audit.
