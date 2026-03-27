# Project State: flitter-amp

## Project Reference

See: .planning/PROJECT.md (updated 2026-03-27)

**Core value:** A truly functional ACP TUI client that correctly communicates with any ACP agent, renders all protocol messages faithfully, and provides a usable chat experience.
**Current focus:** Phase 7 — Protocol Correctness

## Current Milestone

**v0.2.0** — Make It Actually Work

## Current Position

Phase: 7 — Protocol Correctness
Plan: —
Status: Context gathered, ready for planning
Last activity: 2026-03-28 — Phase 7 context captured

## Phase Status

| Phase | Name | Status | Plans |
|-------|------|--------|-------|
| 1-6 | v0.1.0 Visual Prototype | Complete | — |
| 7 | Protocol Correctness | Pending | — |
| 8 | Scroll Infrastructure | Pending | — |
| 9 | Streaming Experience | Pending | — |
| 10 | Tool Compatibility | Pending | — |
| 11 | UX Polish | Pending | — |

Progress: ░░░░░░░░░░ 0% (0/5 phases)

## Recent Activity

- 2026-03-26: v0.1.0 milestone complete (Phases 1-6)
- 2026-03-27: Full E2E audit — found 25 structural defects across 5 layers
- 2026-03-27: Milestone v0.2.0 initialized — 25 requirements, 5 phases
- 2026-03-28: Phase 7 context gathered — 11 decisions captured

## Decisions Log

| Date | Decision | Context |
|------|----------|---------|
| 2026-03-26 | Use @agentclientprotocol/sdk v0.16.0 | Standard protocol for multi-agent support |
| 2026-03-26 | Build on flitter-core widgets | Consistent with monorepo architecture |
| 2026-03-26 | Ctrl+Enter submits (multi-line default) | Matches Amp CLI behavior |
| 2026-03-27 | Fix all 5 layers systematically | Tactical fixes proved endless; need structured approach |
| 2026-03-27 | Guardrail: 3+ fix failures → deep research | Prevent surface-level fixes that miss root causes |

## Known Issues

See REQUIREMENTS.md for full v0.2.0 defect list (25 items across Protocol, Scroll, Streaming, Tool, UX layers).

## Accumulated Context

- `PaintContext.drawChar` expects `CellStyle` (`fg`/`bg`); `TextStyle` (`foreground`/`background`) must be converted at the widget-to-render-object boundary.
- Terminal size detection defaults to 80x24 in certain environments if `process.stdout.columns` is not correctly accessed.
- Headless grid tests can pass while real TUI output is broken if test helpers are more permissive than the renderer's SGR builder.

---
*Last updated: 2026-03-28 after Phase 7 context capture*
