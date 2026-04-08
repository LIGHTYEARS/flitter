---
gsd_state_version: 1.0
milestone: v0.4.0
milestone_name: "Close All Gaps: Full AMP Fidelity"
status: executing
last_updated: "2026-04-08T03:59:54.943Z"
last_activity: 2026-04-08
progress:
  total_phases: 15
  completed_phases: 13
  total_plans: 31
  completed_plans: 28
  percent: 90
---

# Project State: flitter-cli

## Project Reference

See: .planning/PROJECT.md (updated 2026-04-06)

**Core value:** Ship a native `flitter-cli` that achieves 100% behavioral and TUI parity with Amp, without depending on coco or ACP bridging.
**Current focus:** Phase 37 — Simplify Factory.ts

## Current Milestone

**v0.4.0** — Close All Gaps: Full AMP Fidelity (COMPLETE)

## Current Position

Phase: 37
Plan: Not started
Status: Executing Phase 37
Last activity: 2026-04-08

## Phase Status

| Phase | Name | Status | Plans |
|-------|------|--------|-------|
| 23 | InputArea Rich Border | Complete | 3/3 |
| 24 | Welcome Screen | Complete | 1/1 |
| 25 | Provider and Model System | Complete | 3/3 |
| 26 | Agent Modes and Deep Reasoning | Complete | 1/1 |
| 27 | ThreadPool Architecture | Complete | 3/3 |
| 28 | Queue Mode and Compaction | Complete | 2/2 |
| 29 | Handoff State Machine | Complete | 1/1 |
| 30 | Skills Modal | Complete | 3/3 |
| 31 | Command Palette Overhaul | Complete | 2/2 |
| 32 | Shortcut Help, Shortcuts, Shell Mode | Complete | 3/3 |
| 33 | HITL Confirmation Overhaul | Complete | 2/2 |
| 34 | Activity Group and Subagent Tree | Complete | 2/2 |
| 35 | Image Support and Overlays | Complete | 3/3 |
| 36 | Visual Polish | Complete | 1/1 |

Progress: ██████████ 100%

## Recent Activity

- 2026-03-26: v0.1.0 milestone complete
- 2026-03-28: v0.2.0 milestone complete
- 2026-04-03: v0.3.0 — 11 phases (12-22), 55 requirements, 305+ tests
- 2026-04-06: v0.4.0 milestone started — Close All Gaps
- 2026-04-06: Phase 23 complete — InputArea Rich Border
- 2026-04-07: Phases 24-36 complete — full autonomous execution
- 2026-04-07: v0.4.0 milestone complete — 14 phases, 30 plans, 140 tests (327 expects)

## Decisions Log

| Date | Decision | Context |
|------|----------|---------|
| 2026-04-06 | InputArea Rich Border is the #1 architectural change | AMP embeds all metadata in border lines; flitter-cli uses separate rows |
| 2026-04-06 | Skip research phase — MISSING-FEATURES.md serves as the audit | 38 features + 42 VF issues already documented with AMP source evidence |
| 2026-04-07 | Use @mariozechner/pi-ai for unified LLM provider layer | Phase 25 re-planned to use pi-ai instead of hand-rolled providers |
| 2026-04-07 | 7 AMP agent modes (SMART/FREE/RUSH/AGG/LARGE/DEEP/INTERNAL) | Phase 26 — exact RGB colors and behavior from AMP source |
| 2026-04-07 | ThreadPool manages threadHandleMap with back/forward navigation | Phase 27 — browser-style history stack |
| 2026-04-07 | Phase 29 handoff already existed — added 50 tests instead of re-implementing | Found prior implementation in git history |

## Known Issues

- STATE.md frontmatter `milestone` was incorrectly showing v0.1.0 in previous milestone (init tool bug)
- Pre-existing TS6053 error: tsconfig.json references non-existent `flitter-amp` package
- 7 occurrences of `(appState as any).method?.()` in command-registry.ts for forward-declared methods (safe via optional chaining)

## Accumulated Context

### Roadmap Evolution

- Phase 37 added: Simplify Factory.ts
- Phase 38 added: 建设全链路可观测能力 (planned: 4 plans, 3 waves)

- `flitter-core` supports rendering primitives for chat, tool cards, markdown, scroll, overlays, and status surfaces
- v0.3.0: bootstrap, session lifecycle, conversation model, chat view, input, overlays, tool rendering, content rendering, status/theme, history/persistence, migration closure
- v0.4.0: agent modes, ThreadPool, queue mode, compaction, handoff, skills modal, command palette, shortcut help, shell mode, HITL confirmation, activity groups, image support, 6 overlay types, visual polish
- 140 tests, 327 expect() calls across 6 test files
- AMP reverse-engineered source: `tmux-capture/amp-source/` (34 files)
- AMP golden screenshots: `tmux-capture/screens/` (9 screens, each with plain/ansi/png)

---
*Last updated: 2026-04-07 after v0.4.0 milestone complete*
