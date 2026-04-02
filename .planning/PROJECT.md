# flitter-cli

## What This Is

`flitter-cli` is a terminal-first coding assistant client built inside the `flitter` monorepo. It replaces the current `flitter-amp` ACP bridge approach with a native CLI product that recreates Amp's complete interaction model, tool surface, and screen behavior using `flitter-core` as the rendering and input framework.

The product direction is no longer "an ACP client that looks like Amp." It is "a full Amp-style CLI implemented locally on top of flitter-core," using reverse-engineered Amp source behavior as a strict product contract. This milestone targets full parity across startup, session lifecycle, turn model, tool surfaces, overlays, history, persistence, status widgets, and interaction semantics, not a partial or approximate clone.

## Core Value

Ship a native `flitter-cli` that achieves 100% behavioral and TUI parity with Amp, without depending on coco or ACP bridging.

## Milestones

### v0.1.0 — Visual Prototype (COMPLETED 2026-03-27)
Built the UI shell: widget tree matching Amp's layout, themes, tool renderers, welcome screen, density orb, and input area. Established `flitter-core` rendering pipeline.

### v0.2.0 — Make It Actually Work (COMPLETED 2026-03-28)
Fixed ACP protocol correctness, scroll behavior, streaming, tool compatibility, and UX polish so `flitter-amp` became a functional ACP TUI client.

### v0.3.0 — flitter-cli Full Parity (CURRENT)
Replace `flitter-amp` as the product direction with a new `flitter-cli` subpackage. Rebuild the application as a native CLI around `flitter-core`, using reverse-engineered Amp source behavior as the implementation contract and treating every confirmed capability in the Amp matrix as mandatory scope.

**Target features:**
- Create `packages/flitter-cli` as the new primary application package
- Stop relying on coco and ACP bridging for core product behavior
- Reconstruct Amp-equivalent CLI runtime, command dispatch, and tool orchestration
- Reuse and extend `flitter-core` as the rendering, input, layout, and diagnostics foundation
- Preserve and port useful UI work from `flitter-amp` only where it serves the native CLI design
- Treat every capability identified in the reverse-engineered Amp matrix as in-scope for 100% implementation

## Requirements

### Validated

- `flitter-core` provides a usable TUI framework with widget, element, render-object, layout, input, and terminal rendering infrastructure
- `flitter-amp` proved the monorepo can render rich chat, tool cards, sticky sections, dialogs, overlays, markdown, and scrolling on top of `flitter-core`
- Amp reverse-engineering artifacts exist in this repo and can be used as implementation reference
- The Amp capability matrix has been reviewed and all identified product-facing capabilities are confirmed in-scope for exact parity

### Active (v0.3.0)

- [ ] `flitter-cli` exists as a first-class subpackage with its own entrypoint, runtime wiring, package scripts, config namespace, and clean shutdown path
- [ ] Startup, session lifecycle, message submission, cancellation, and status transitions match Amp behavior exactly
- [ ] Chat view, sticky grouping, scrolling, streaming, overlays, command palette, prompt history, and permission flows all reach full parity
- [ ] Tool rendering and workflow semantics cover the complete Amp capability matrix, including handoff, task delegation, search, file operations, diff, todo, and generic fallback behavior
- [ ] Session persistence, thread/session listing, resume, export, and history ergonomics all reach full parity
- [ ] Existing `flitter-amp` code is either migrated intentionally or removed from the active product path

### Out of Scope

- Rebuilding around ACP as the long-term architecture — this milestone replaces that direction
- Non-TUI GUI clients — `flitter-core` terminal UI remains the product surface
- Plugin architecture before core Amp parity — direct implementation first
- Reinventing a second rendering framework outside `flitter-core`
- Shipping an "almost Amp" product — milestone success requires exact parity, not selective approximation

## Context

This is a brownfield pivot inside the `flitter` pnpm monorepo. `packages/flitter-core` already provides the terminal rendering stack, while `packages/flitter-amp` contains a large amount of reusable UI and state logic built under the older ACP-client framing.

The repo also contains reverse-engineering notes (`amp-src-analysis-*.md`) that describe Amp's widget composition, state flow, CLI behavior, and architectural patterns. Those notes now become the primary product spec for the milestone, and the reviewed capability matrix turns those findings into mandatory scope.

The current codebase has significant in-flight changes outside `.planning/`; milestone execution must avoid disturbing that work and only redefine planning artifacts or implementation areas it explicitly owns.

## Constraints

- **UI Framework**: `flitter-core` remains the only rendering and input foundation
- **Product Direction**: `flitter-amp` is legacy; new work centers on `flitter-cli`
- **Spec Source**: Reverse-engineered Amp behavior is the contract when implementation choices are ambiguous
- **Parity Bar**: All identified Amp capabilities are in scope and must be implemented without feature cuts
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
*Last updated: 2026-04-03 after v0.3.0 parity scope expansion*
