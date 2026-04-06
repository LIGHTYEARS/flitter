---
gsd_state_version: 1.0
milestone: v0.4.0
milestone_name: Close All Gaps — Full AMP Fidelity
status: defining_requirements
last_updated: "2026-04-06"
last_activity: 2026-04-06
progress:
  total_phases: 0
  completed_phases: 0
  total_plans: 0
  completed_plans: 0
  percent: 0
---

# Project State: flitter-cli

## Project Reference

See: .planning/PROJECT.md (updated 2026-04-06)

**Core value:** Ship a native `flitter-cli` that achieves 100% behavioral and TUI parity with Amp, without depending on coco or ACP bridging.
**Current focus:** Defining requirements for v0.4.0

## Current Milestone

**v0.4.0** — Close All Gaps: Full AMP Fidelity

## Current Position

Phase: Not started (defining requirements)
Plan: —
Status: Defining requirements
Last activity: 2026-04-06 — Milestone v0.4.0 started

## Phase Status

| Phase | Name | Status | Plans |
|-------|------|--------|-------|
| — | — | — | — |

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
