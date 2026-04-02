# flitter-cli

## What This Is

`flitter-cli` is a terminal-first coding assistant client built inside the `flitter` monorepo. It replaces the current `flitter-amp` ACP bridge approach with a native CLI product that recreates Amp's complete interaction model, tool surface, and screen behavior using `flitter-core` as the rendering and input framework.

The product direction is no longer "an ACP client that looks like Amp." It is "a full Amp-style CLI implemented locally on top of flitter-core," using reverse-engineered source behavior as the primary specification.

## Core Value

Ship a native `flitter-cli` that reproduces Amp's end-to-end CLI behavior and TUI experience without depending on coco or ACP bridging.

## Milestones

### v0.1.0 — Visual Prototype (COMPLETED 2026-03-27)
Built the UI shell: widget tree matching Amp's layout, themes, tool renderers, welcome screen, density orb, and input area. Established `flitter-core` rendering pipeline.

### v0.2.0 — Make It Actually Work (COMPLETED 2026-03-28)
Fixed ACP protocol correctness, scroll behavior, streaming, tool compatibility, and UX polish so `flitter-amp` became a functional ACP TUI client.

### v0.3.0 — flitter-cli (CURRENT)
Replace `flitter-amp` as the product direction with a new `flitter-cli` subpackage. Rebuild the application as a native CLI around `flitter-core`, using reverse-engineered Amp source behavior to reproduce command flow, session model, tool execution, status surfaces, and interactive TUI semantics end to end.

**Target features:**
- Create `packages/flitter-cli` as the new primary application package
- Stop relying on coco and ACP bridging for core product behavior
- Reconstruct Amp-equivalent CLI runtime, command dispatch, and tool orchestration
- Reuse and extend `flitter-core` as the rendering, input, layout, and diagnostics foundation
- Preserve and port useful UI work from `flitter-amp` only where it serves the native CLI design

## Requirements

### Validated

- `flitter-core` provides a usable TUI framework with widget, element, render-object, layout, input, and terminal rendering infrastructure
- `flitter-amp` proved the monorepo can render rich chat, tool cards, sticky sections, dialogs, overlays, markdown, and scrolling on top of `flitter-core`
- Amp reverse-engineering artifacts exist in this repo and can be used as implementation reference

### Active (v0.3.0)

- [ ] `flitter-cli` exists as a first-class subpackage with its own entrypoint, runtime wiring, and package scripts
- [ ] Core runtime behavior is native to `flitter-cli`, not delegated through coco ACP bridging
- [ ] Session model, turn lifecycle, tool execution, and status surfaces follow the reverse-engineered Amp behavior closely enough to serve as the implementation contract
- [ ] Existing `flitter-amp` code is either migrated intentionally or removed from the active product path

### Out of Scope

- Rebuilding around ACP as the long-term architecture — this milestone replaces that direction
- Non-TUI GUI clients — `flitter-core` terminal UI remains the product surface
- Plugin architecture before core Amp parity — direct implementation first
- Reinventing a second rendering framework outside `flitter-core`

## Context

This is a brownfield pivot inside the `flitter` pnpm monorepo. `packages/flitter-core` already provides the terminal rendering stack, while `packages/flitter-amp` contains a large amount of reusable UI and state logic built under the older ACP-client framing.

The repo also contains reverse-engineering notes (`amp-src-analysis-*.md`) that describe Amp's widget composition, state flow, CLI behavior, and architectural patterns. Those notes now become the primary product spec for the next milestone.

The current codebase has significant in-flight changes outside `.planning/`; milestone initialization must avoid disturbing that work and only redefine planning artifacts for the new direction.

## Constraints

- **UI Framework**: `flitter-core` remains the only rendering and input foundation
- **Product Direction**: `flitter-amp` is legacy; new work centers on `flitter-cli`
- **Spec Source**: Reverse-engineered Amp behavior is the contract when implementation choices are ambiguous
- **Migration Safety**: Planning work must not overwrite unrelated in-progress source edits in the dirty worktree
- **Terminal Scope**: Desktop terminal experience first; no web/mobile fallback in this milestone

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Create `flitter-cli` instead of extending `flitter-amp` | The ACP-bridge architecture is the wrong product boundary | — Pending |
| Use reverse-engineered Amp behavior as spec | The goal is full feature recreation, not approximate visual homage | — Pending |
| Keep `flitter-core` as the rendering substrate | Existing framework already matches the desired TUI architecture | ✓ Good |
| Treat `flitter-amp` as a migration source, not the destination | Some code is reusable, but the package framing is not | — Pending |

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
*Last updated: 2026-04-03 after v0.3.0 milestone initialization*
