---
phase: 6
title: "Polish and Production Features"
status: complete
timestamp: 2026-03-26
---

# Phase 6 Summary

## What Was Built

Phase 6 adds polish and production-readiness features to flitter-amp:

1. **$EDITOR Integration** (`utils/editor.ts`) — Utility to spawn $EDITOR with a temp file and return edited text. Ctrl+G key binding registered (full integration pending TUI suspend API).

2. **Prompt History** (`state/history.ts`) — In-memory history with circular cursor navigation. Prompts are pushed on submit. Ctrl+R navigates backward through history.

3. **Error Boundaries** — ChatView renders errors as a red banner at the top of the conversation. AppState.error flows through to the display without crashes.

4. **Mouse Support** — Documented as built-in via flitter-core's MouseManager. No additional code needed — the framework handles mouse events when terminal mode is active.

5. **@File Picker** (`widgets/file-picker.ts`) — SelectionList overlay widget with green border, positioned at bottom-left near input area. Full @-trigger wiring deferred until TextEditingController onChange is available.

6. **Configuration File** (`state/config.ts`) — Loads `~/.flitter-amp/config.json` on startup with graceful fallback. Supports: agent, editor, cwd, expandToolCalls, historySize, logLevel. CLI flags override config file values.

## Commits

- `feat(phase-6): add $EDITOR integration and prompt history`
- `feat(phase-6): add error boundaries and mouse support documentation`
- `feat(phase-6): add @file picker and config file loading`

## Architecture Decisions

- History is owned by `AppStateWidget` (not global AppState) since it's UI-local state
- Config merging: user config → defaults, CLI flags → override config
- File picker overlay is lowest priority (after permission dialog and command palette)
- Mouse support is framework-provided, requiring zero flitter-amp code

## Framework Dependencies (Deferred)

These features have infrastructure ready but await flitter-core APIs:
- TUI suspend/resume for Ctrl+G editor spawn
- TextEditingController exposure for Ctrl+R text injection and @-trigger detection
