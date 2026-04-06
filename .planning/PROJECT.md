# flitter-cli

## What This Is

`flitter-cli` is a terminal-first coding assistant client built inside the `flitter` monorepo. It replaces the current `flitter-amp` ACP bridge approach with a native CLI product that recreates Amp's complete interaction model, tool surface, and screen behavior using `flitter-core` as the rendering and input framework.

The product direction is no longer "an ACP client that looks like Amp." It is "a full Amp-style CLI implemented locally on top of flitter-core," using reverse-engineered Amp source behavior as a strict product contract. This milestone targets full parity across startup, session lifecycle, turn model, tool surfaces, overlays, history, persistence, status widgets, interaction semantics, and shortcut/editor ergonomics, not a partial or approximate clone.

## Core Value

Ship a native `flitter-cli` that achieves 100% behavioral and TUI parity with Amp, without depending on coco or ACP bridging.

## Milestones

### v0.1.0 — Visual Prototype (COMPLETED 2026-03-27)
Built the UI shell: widget tree matching Amp's layout, themes, tool renderers, welcome screen, density orb, and input area. Established `flitter-core` rendering pipeline.

### v0.2.0 — Make It Actually Work (COMPLETED 2026-03-28)
Fixed ACP protocol correctness, scroll behavior, streaming, tool compatibility, and UX polish so `flitter-amp` became a functional ACP TUI client.

### v0.3.0 — flitter-cli Full Parity (COMPLETED 2026-04-06)
Replaced `flitter-amp` with native `flitter-cli` subpackage. Built 11 phases (12-22) covering bootstrap, session lifecycle, conversation model, chat view, input, overlays, tool rendering, content rendering, status/theme, history/persistence, and migration closure. 55 requirements, 305+ tests.

### v0.4.0 — Close All Gaps: Full AMP Fidelity (CURRENT)
Close all gaps identified by reverse-engineering audit (`MISSING-FEATURES.md`): 38 missing/partial features + 42 Visual Fidelity differences. Move from "structurally similar" to "pixel-level identical."

**Target features:**
- InputArea Rich Border: embed context %, skill count, model/mode, cwd/branch into border lines; eliminate standalone HeaderBar/StatusBar
- ThreadPool architecture: real multi-thread with switchThread/createThread/deleteThread + ThreadHandle
- Skills modal: complete implementation with Local/Global grouping, detail panel, keyboard navigation
- Command Palette: category+label dual-column format, 15+ commands, `>` prefix, centered layout
- Shortcut help: InputArea-embedded dual-column layout (not modal card)
- HITL confirmation: command content preview, inverted-color option buttons, `[y]/[n]/[a]` labels, feedback input mode
- Activity Group: collapsible groups with tree-line characters, summary aggregation
- Welcome ASCII Art Logo with Perlin gradient animation
- Missing shortcuts: Ctrl+V paste images, Shift+Enter/Alt+Enter newline, Tab/Shift+Tab message navigation
- Deep reasoning tri-state (medium/high/xhigh), agent mode switching logic
- Queue mode, Handoff state machine, Compaction system
- OSC8 terminal hyperlinks, streaming block cursor, agentModePulse border animation
- Provider expansion (8 missing) + model catalog with metadata
- Toast notifications, confirmation overlay, context detail/analyze overlays
- Edit previous message (Up arrow), auto-copy on selection

## Requirements

### Validated

- `flitter-core` provides a usable TUI framework with widget, element, render-object, layout, input, and terminal rendering infrastructure
- `flitter-amp` proved the monorepo can render rich chat, tool cards, sticky sections, dialogs, overlays, markdown, and scrolling on top of `flitter-core`
- Amp reverse-engineering artifacts exist in this repo and can be used as implementation reference
- The Amp capability matrix has been reviewed and all identified product-facing capabilities are confirmed in-scope for exact parity
- `flitter-cli` exists as a first-class subpackage with bootstrap, session lifecycle, turn model, chat view, input, overlays, tool rendering, content rendering, status/theme, history/persistence (v0.3.0)
- 305+ tests cover session, conversation, screen state, shortcuts, tool dispatch, and integration flows (v0.3.0)

### Active (v0.4.0)

- [ ] InputArea Rich Border replaces HeaderBar/StatusBar with borderOverlayText on all four border sides
- [ ] ThreadPool architecture provides real multi-thread management (create, switch, delete, back/forward)
- [ ] Skills modal provides complete skill browsing with Local/Global grouping, detail panel, and keyboard navigation
- [ ] Command Palette matches AMP format (category+label, centered, `>` prefix, 15+ commands)
- [ ] Shortcut help renders as InputArea-embedded dual-column layout matching AMP
- [ ] HITL confirmation dialog matches AMP layout (content preview, `[y]/[n]/[a]` labels, feedback mode)
- [ ] Activity Group uses collapsible tree with tree-line characters and summary aggregation
- [ ] Welcome screen displays ASCII Art Logo with Perlin gradient animation
- [ ] All missing shortcuts registered (Ctrl+V, Shift+Enter, Tab/Shift+Tab, Up arrow edit)
- [ ] Deep reasoning supports tri-state (medium/high/xhigh), agent mode switching has real logic
- [ ] Queue mode, Handoff state machine, and Compaction system implemented
- [ ] Streaming uses block cursor; border supports agentModePulse animation; OSC8 hyperlinks in tool output
- [ ] Provider system expanded with 8 missing providers + full model catalog with metadata
- [ ] Toast notifications, confirmation overlay, context detail/analyze overlays implemented
- [ ] Image paste (Ctrl+V), image preview, Kitty graphics protocol support implemented

### Out of Scope

- Non-TUI GUI clients -- `flitter-core` terminal UI remains the product surface
- Plugin architecture before fidelity gaps are closed
- Reinventing a second rendering framework outside `flitter-core`
- WebSocket event stream migration (use polling/HTTP with state machine patterns instead)
- IDE integrations (JetBrains installer, IDE picker) -- post-fidelity scope

## Context

`flitter-cli` (v0.3.0) is a functional native CLI with 305+ tests covering the full development stack. The v0.3.0 milestone completed 11 phases (12-22) establishing bootstrap, session lifecycle, conversation model, chat view, input, overlays, tool rendering, content rendering, status/theme, history/persistence, and migration closure.

However, a systematic reverse-engineering audit comparing AMP source code and `tmux-capture/screens/` golden files against `flitter-cli` implementation revealed significant fidelity gaps: 38 missing/partial features documented in `MISSING-FEATURES.md` sections I-VII, and 42 Visual Fidelity differences documented in sections VIII-XI (12 Critical, 17 Major, 13 Minor).

The most fundamental architectural UI difference is that AMP embeds all metadata (context %, skill count, model/mode, cwd/branch) into InputArea's four border lines using `borderOverlayText`, while `flitter-cli` uses standalone `HeaderBar` and `StatusBar` rows -- consuming 2 extra lines and placing information in different positions.

Reference artifacts: `MISSING-FEATURES.md`, `FIDELITY-REPORT.md`, `tmux-capture/amp-source/` (逆向源码), `tmux-capture/screens/` (golden TUI 截屏).

## Constraints

- **UI Framework**: `flitter-core` remains the only rendering and input foundation
- **Product Direction**: `flitter-amp` is legacy; new work centers on `flitter-cli`
- **Spec Source**: Reverse-engineered Amp behavior is the contract when implementation choices are ambiguous
- **Parity Bar**: All identified Amp capabilities are in scope and must be implemented without feature cuts
- **Guardrail**: Parity failures are scope failures, not polish debt, and cannot be silently deferred inside an in-scope phase
- **Execution Order**: Guardrails first, execution next; scaffold first, details next
- **Migration Safety**: Planning and implementation work must not overwrite unrelated in-progress source edits in the dirty worktree
- **Terminal Scope**: Desktop terminal experience first; no web/mobile fallback in this milestone

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Create `flitter-cli` instead of extending `flitter-amp` | The ACP-bridge architecture is the wrong product boundary | — Pending |
| Use reverse-engineered Amp behavior as spec | The goal is full feature recreation, not approximate visual homage | ✓ Good |
| Keep `flitter-core` as the rendering substrate | Existing framework already matches the desired TUI architecture | ✓ Good |
| Treat `flitter-amp` as a migration source, not the destination | Some code is reusable, but the package framing is not | — Pending |
| Accept no scope cuts on the Amp capability matrix | Product decision: 100% parity is required across all identified modules | ✓ Good |
| Sequence work as guardrails first, scaffold first | Lock invariants and package/runtime boundaries before detail parity work | ✓ Good |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd:transition`):
1. Requirements invalidated? Move to Out of Scope with reason
2. Requirements validated? Move to Validated with phase reference
3. New requirements emerged? Add to Active
4. Decisions to log? Add to Key Decisions
5. "What This Is" still accurate? Update if drifted

**After each milestone** (via `/gsd:complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-04-06 after Phase 23 completion — InputArea Rich Border complete (gap-aware border rendering, four overlay positions, BorderShimmer animation, HeaderBar/StatusBar removed)*
