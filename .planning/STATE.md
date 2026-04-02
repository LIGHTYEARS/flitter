# Project State: flitter-cli

## Project Reference

See: .planning/PROJECT.md (updated 2026-04-03)

**Core value:** Ship a native `flitter-cli` that reproduces Amp's end-to-end CLI behavior and TUI experience without depending on coco or ACP bridging.
**Current focus:** Milestone v0.3.0 initialized, ready to start Phase 12

## Current Milestone

**v0.3.0** — flitter-cli

## Current Position

Phase: Not started (ready for Phase 12)
Plan: —
Status: Roadmap approved, ready to begin implementation
Last activity: 2026-04-03 — Milestone v0.3.0 roadmap created

## Phase Status

| Phase | Name | Status | Plans |
|-------|------|--------|-------|
| 1-6 | v0.1.0 Visual Prototype | Complete | — |
| 7 | Protocol Correctness | Complete | 07-PLAN-01 |
| 8 | Scroll Infrastructure | Complete | 08-PLAN-01 |
| 9 | Streaming Experience | Complete | 09-PLAN-01 |
| 10 | Tool Compatibility | Complete | 10-PLAN-01 |
| 11 | UX Polish | Complete | 11-PLAN-01 |

Progress: ░░░░░░░░░░ 0% (0/5 phases)

## Recent Activity

- 2026-03-26: v0.1.0 milestone complete
- 2026-03-28: v0.2.0 milestone complete
- 2026-04-03: Product direction reset from `flitter-amp` ACP client to native `flitter-cli`
- 2026-04-03: New milestone initialized for `flitter-cli` package, runtime, and parity roadmap
- 2026-04-03: Requirements and roadmap approved for phases 12-16

## Decisions Log

| Date | Decision | Context |
|------|----------|---------|
| 2026-04-03 | `flitter-amp` no longer defines the target product | ACP bridge and coco dependency are not acceptable long-term architecture |
| 2026-04-03 | Build `flitter-cli` as a new subpackage | Native CLI boundary is cleaner than mutating the legacy package in place |
| 2026-04-03 | Use reverse-engineered Amp behavior as the milestone spec | This milestone is about full feature recreation, not partial resemblance |

## Known Issues

- Legacy code and docs still reference `flitter-amp`; implementation phases must retire those paths carefully
- The source tree contains substantial unrelated in-progress edits; migration work must isolate changes carefully

## Accumulated Context

- `flitter-core` already supports the rendering primitives needed for chat, tool cards, markdown, scroll, overlays, and status surfaces
- `flitter-amp` contains reusable implementation ideas but encodes the wrong top-level architecture
- Reverse-engineering artifacts in `amp-src-analysis-*.md` are now milestone inputs, not archival notes

---
*Last updated: 2026-04-03 after v0.3.0 milestone initialization*
