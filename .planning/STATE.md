---
gsd_state_version: 1.0
milestone: v0.4.0
milestone_name: Close All Gaps — Full AMP Fidelity
status: ready_to_plan
last_updated: "2026-04-06"
last_activity: 2026-04-06
progress:
  total_phases: 14
  completed_phases: 0
  total_plans: 28
  completed_plans: 0
  percent: 0
---

# Project State: flitter-cli

## Project Reference

See: .planning/PROJECT.md (updated 2026-04-06)

**Core value:** Ship a native `flitter-cli` that achieves 100% behavioral and TUI parity with Amp, without depending on coco or ACP bridging.
**Current focus:** Ready to plan Phase 23 (InputArea Rich Border)

## Current Milestone

**v0.4.0** — Close All Gaps: Full AMP Fidelity

## Current Position

Phase: 23 (next to plan)
Plan: —
Status: Ready to plan
Last activity: 2026-04-06 — Roadmap defined, 14 phases (23-36), 28 plans, 73 requirements

## Phase Status

| Phase | Name | Status | Plans |
|-------|------|--------|-------|
| 23 | InputArea Rich Border | Not started | 0/3 |
| 24 | Welcome Screen | Not started | 0/1 |
| 25 | Provider and Model System | Not started | 0/2 |
| 26 | Agent Modes and Deep Reasoning | Not started | 0/1 |
| 27 | ThreadPool Architecture | Not started | 0/3 |
| 28 | Queue Mode and Compaction | Not started | 0/2 |
| 29 | Handoff State Machine | Not started | 0/1 |
| 30 | Skills Modal | Not started | 0/3 |
| 31 | Command Palette Overhaul | Not started | 0/2 |
| 32 | Shortcut Help and Missing Shortcuts | Not started | 0/2 |
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

## Decisions Log

| Date | Decision | Context |
|------|----------|---------|
| 2026-04-06 | InputArea Rich Border is the #1 architectural change | AMP embeds all metadata in border lines; flitter-cli uses separate rows |
| 2026-04-06 | Skip research phase — MISSING-FEATURES.md serves as the audit | 38 features + 42 VF issues already documented with AMP source evidence |

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

---
*Last updated: 2026-04-06 after v0.4.0 milestone start*
