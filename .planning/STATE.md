---
gsd_state_version: 1.0
milestone: v0.4.0
milestone_name: "Close All Gaps: Full AMP Fidelity"
status: executing
last_updated: "2026-04-07T16:28:53.454Z"
last_activity: 2026-04-07 -- Phase 36 execution started
progress:
  total_phases: 14
  completed_phases: 11
  total_plans: 30
  completed_plans: 26
  percent: 87
---

# Project State: flitter-cli

## Project Reference

See: .planning/PROJECT.md (updated 2026-04-06)

**Core value:** Ship a native `flitter-cli` that achieves 100% behavioral and TUI parity with Amp, without depending on coco or ACP bridging.
**Current focus:** Phase 36 — Visual Polish

## Current Milestone

**v0.4.0** — Close All Gaps: Full AMP Fidelity

## Current Position

Phase: 36 (Visual Polish) — EXECUTING
Plan: 1 of 1
Status: Executing Phase 36
Last activity: 2026-04-07 -- Phase 36 execution started

## Phase Status

| Phase | Name | Status | Plans |
|-------|------|--------|-------|
| 23 | InputArea Rich Border | Complete | 3/3 |
| 24 | Welcome Screen | Not started | 0/1 |
| 25 | Provider and Model System | Planned | 0/3 (25-01: W1, 25-02: W1, 25-03: W2) |
| 26 | Agent Modes and Deep Reasoning | Not started | 0/1 |
| 27 | ThreadPool Architecture | Not started | 0/3 |
| 28 | Queue Mode and Compaction | Not started | 0/2 |
| 29 | Handoff State Machine | Not started | 0/1 |
| 30 | Skills Modal | Not started | 0/3 |
| 31 | Command Palette Overhaul | Not started | 0/2 |
| 32 | Shortcut Help, Shortcuts, Shell Mode | Not started | 0/3 |
| 33 | HITL Confirmation Overhaul | Not started | 0/2 |
| 34 | Activity Group and Subagent Tree | Not started | 0/2 |
| 35 | Image Support and Overlays | Not started | 0/3 |
| 36 | Visual Polish | Not started | 0/1 |

Progress: ░░░░░░░░░░ 0%

## Recent Activity

- 2026-03-26: v0.1.0 milestone complete
- 2026-03-28: v0.2.0 milestone complete
- 2026-04-03: v0.3.0 — 11 phases (12-22), 55 requirements, 305+ tests
- 2026-04-06: v0.4.0 milestone started — Close All Gaps
- 2026-04-06: Phase 23 complete — InputArea Rich Border (app-shell wired, BorderShimmer, gap-aware borders)
- 2026-04-07: Phase 25 re-planned — Provider and Model System with @mariozechner/pi-ai (3 plans, 6 tasks, PROV-01/02/03)

## Decisions Log

| Date | Decision | Context |
|------|----------|---------|
| 2026-04-06 | InputArea Rich Border is the #1 architectural change | AMP embeds all metadata in border lines; flitter-cli uses separate rows |
| 2026-04-06 | Skip research phase — MISSING-FEATURES.md serves as the audit | 38 features + 42 VF issues already documented with AMP source evidence |
| 2026-04-06 | Null return from buildTopLeftOverlay/buildBottomLeftOverlay for idle states | Cleanest API for border overlay composition — caller omits overlay rather than rendering empty widget |
| 2026-04-06 | MouseRegion wraps only skill count section in top-right overlay | Matches BORDER-02 spec for clickable zone; mode label and warning indicator are not clickable |

## Known Issues

- STATE.md frontmatter `milestone` was incorrectly showing v0.1.0 in previous milestone (init tool bug)
- REQUIREMENTS.md traceability section still shows many v0.3.0 items as "Pending" despite being completed in code

## Accumulated Context

- `flitter-core` already supports the rendering primitives needed for chat, tool cards, markdown, scroll, overlays, and status surfaces
- v0.3.0 completed: bootstrap, session lifecycle, conversation model, chat view, input, overlays, tool rendering, content rendering, status/theme, history/persistence, migration closure
- 305+ tests across flitter-cli test suite
- `MISSING-FEATURES.md` contains 38 feature-level gaps (sections I-VII) and 42 Visual Fidelity issues (sections VIII-XI)
- The most critical architectural UI difference: AMP uses `borderOverlayText` to embed metadata into InputArea's four border lines
- AMP逆向源码: `tmux-capture/amp-source/` (34 files)
- AMP golden 截屏: `tmux-capture/screens/` (9 界面, 每界面 plain/ansi/png)
- Plan 23-01: BorderGap/BorderGaps types, gap-aware drawBorder/drawBorderSides, lerpColor added to flitter-core
- Plan 23-02: border-helpers.ts (5 helpers), border-builders.ts (4 builders: buildTopLeftOverlay/buildTopRightOverlay/buildBottomLeftOverlay/buildBottomRightOverlay + BorderOverlayResult)

---
*Last updated: 2026-04-06 after v0.4.0 milestone start*
