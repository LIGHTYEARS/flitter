# Project State: flitter-cli

## Project Reference

See: .planning/PROJECT.md (updated 2026-04-03)

**Core value:** Ship a native `flitter-cli` that achieves 100% behavioral and TUI parity with Amp, without depending on coco or ACP bridging.
**Current focus:** Phase 12 scaffold landed; ready to start Phase 13 session lifecycle work

## Current Milestone

**v0.3.0** — flitter-cli Full Parity

## Current Position

Phase: 13
Plan: —
Status: Phase 12 complete; Phase 13 ready
Last activity: 2026-04-03 — Phase 12 scaffold verified and closed

## Phase Status

| Phase | Name | Status | Plans |
|-------|------|--------|-------|
| 1-6 | v0.1.0 Visual Prototype | Complete | — |
| 7 | Protocol Correctness | Complete | 07-PLAN-01 |
| 8 | Scroll Infrastructure | Complete | 08-PLAN-01 |
| 9 | Streaming Experience | Complete | 09-PLAN-01 |
| 10 | Tool Compatibility | Complete | 10-PLAN-01 |
| 11 | UX Polish | Complete | 11-PLAN-01 |
| 12 | Native Bootstrap and Runtime Shell | Complete | 12-PLAN-01 |

Progress: █░░░░░░░░░ 9% (1/11 phases)

## Recent Activity

- 2026-03-26: v0.1.0 milestone complete
- 2026-03-28: v0.2.0 milestone complete
- 2026-04-03: Product direction reset from `flitter-amp` ACP client to native `flitter-cli`
- 2026-04-03: New milestone initialized for `flitter-cli` package, runtime, and parity roadmap
- 2026-04-03: Requirements and roadmap expanded to full Amp parity scope across phases 12-22
- 2026-04-03: Guardrails hardened so parity failures are treated as scope failures, with scaffold-first sequencing
- 2026-04-03: Phase 12 complete — `packages/flitter-cli` scaffold, config namespace, logger, and bootstrap shell landed

## Decisions Log

| Date | Decision | Context |
|------|----------|---------|
| 2026-04-03 | `flitter-amp` no longer defines the target product | ACP bridge and coco dependency are not acceptable long-term architecture |
| 2026-04-03 | Build `flitter-cli` as a new subpackage | Native CLI boundary is cleaner than mutating the legacy package in place |
| 2026-04-03 | Use reverse-engineered Amp behavior as the milestone spec | This milestone is about full feature recreation, not partial resemblance |
| 2026-04-03 | All identified Amp capabilities are mandatory | Product decision: 100% parity, no scope cuts |
| 2026-04-03 | Guardrails first, execution next; scaffold first, details next | Lock invariants before implementation waves begin |

## Known Issues

- `init milestone-op` currently misreads the active milestone as complete while `roadmap analyze` correctly shows phases 12-22 pending; use roadmap analysis as source of truth
- Legacy code and docs still reference `flitter-amp`; implementation phases must retire those paths carefully
- The source tree contains substantial unrelated in-progress edits; migration work must isolate changes carefully

## Accumulated Context

- `flitter-core` already supports the rendering primitives needed for chat, tool cards, markdown, scroll, overlays, and status surfaces
- `flitter-amp` contains reusable implementation ideas but encodes the wrong top-level architecture
- Reverse-engineering artifacts in `amp-src-analysis-*.md` are now milestone inputs, not archival notes
- The Amp capability matrix is fully in-scope; no identified product-facing module is allowed to fall back to approximation
- Shortcut drift, nested task/handoff simplification, theme-surface reduction, and status-area weakening are explicit parity violations
- Phase 12 established the new workspace package, config namespace, logging namespace, and a minimal native runtime shell without ACP/coco in the boot path

---
*Last updated: 2026-04-03 after Phase 12 completion*
