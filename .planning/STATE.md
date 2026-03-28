# Project State: flitter-amp

## Project Reference

See: .planning/PROJECT.md (updated 2026-03-27)

**Core value:** A truly functional ACP TUI client that correctly communicates with any ACP agent, renders all protocol messages faithfully, and provides a usable chat experience.
**Current focus:** Milestone v0.2.0 complete — ready for next milestone

## Current Milestone

**v0.2.0** — Make It Actually Work (COMPLETED)

## Current Position

Phase: All phases complete
Plan: —
Status: Milestone v0.2.0 complete
Last activity: 2026-03-28 — All 5 phases executed, milestone closed

## Phase Status

| Phase | Name | Status | Plans |
|-------|------|--------|-------|
| 1-6 | v0.1.0 Visual Prototype | Complete | — |
| 7 | Protocol Correctness | Complete | 07-PLAN-01 |
| 8 | Scroll Infrastructure | Complete | 08-PLAN-01 |
| 9 | Streaming Experience | Complete | 09-PLAN-01 |
| 10 | Tool Compatibility | Complete | 10-PLAN-01 |
| 11 | UX Polish | Complete | 11-PLAN-01 |

Progress: ██████████ 100% (5/5 phases)

## Recent Activity

- 2026-03-26: v0.1.0 milestone complete (Phases 1-6)
- 2026-03-27: Full E2E audit — found 25 structural defects across 5 layers
- 2026-03-27: Milestone v0.2.0 initialized — 25 requirements, 5 phases
- 2026-03-28: Phase 7 complete — Protocol Correctness (9 files, 7 requirements)
- 2026-03-28: Phase 8 complete — Scroll Infrastructure (2 files, 4 requirements)
- 2026-03-28: Phase 9 complete — Streaming Experience (4 files, 4 requirements)
- 2026-03-28: Phase 10 complete — Tool Compatibility (7 files, 4 requirements)
- 2026-03-28: Phase 11 complete — UX Polish (4 files, 5 requirements)
- 2026-03-28: Milestone v0.2.0 closed — 25/25 requirements addressed

## Decisions Log

| Date | Decision | Context |
|------|----------|---------|
| 2026-03-26 | Use @agentclientprotocol/sdk v0.16.0 | Standard protocol for multi-agent support |
| 2026-03-26 | Build on flitter-core widgets | Consistent with monorepo architecture |
| 2026-03-26 | Ctrl+Enter submits (multi-line default) | Matches Amp CLI behavior |
| 2026-03-27 | Fix all 5 layers systematically | Tactical fixes proved endless; need structured approach |
| 2026-03-27 | Guardrail: 3+ fix failures → deep research | Prevent surface-level fixes that miss root causes |

## Known Issues

All 25 v0.2.0 requirements addressed. See phase summaries for implementation details.

## Accumulated Context

- `PaintContext.drawChar` expects `CellStyle` (`fg`/`bg`); `TextStyle` (`foreground`/`background`) must be converted at the widget-to-render-object boundary.
- Terminal size detection defaults to 80x24 in certain environments if `process.stdout.columns` is not correctly accessed.
- Headless grid tests can pass while real TUI output is broken if test helpers are more permissive than the renderer's SGR builder.

---
*Last updated: 2026-03-28 after v0.2.0 milestone completion*
