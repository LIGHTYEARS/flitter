---
gsd_state_version: 1.0
milestone: v1.3
milestone_name: Amp Architecture Realignment
status: planned
stopped_at: Planning complete, ready for Phase 23 execution
last_updated: "2026-03-23T00:00:00Z"
last_activity: 2026-03-23
progress:
  total_phases: 4
  completed_phases: 0
  total_plans: 9
  completed_plans: 0
  percent: 0
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-03-23)

**Core value:** Flutter-faithful TUI framework with declarative widgets, box-constraint layout, and on-demand cell-level diff rendering
**Current focus:** v1.3 Amp Architecture Realignment — refactoring core pipeline to match Amp's actual ownership model

## Current Position

Phase: 23 of 26 (WidgetsBinding + TerminalManager + FrameScheduler Core) — NOT STARTED
Plan: 0/9 plans complete
Status: Planned
Last activity: 2026-03-23

Progress: [░░░░░░░░░░] 0%

## v1.3 Phase Overview

| Phase | Name | Requirements | Plans | Status |
|-------|------|-------------|-------|--------|
| 23 | WidgetsBinding + TerminalManager + FrameScheduler Core | BIND-01..07, FSCD-01..02, TMGR-01..03 | 3 | Planned |
| 24 | BuildOwner + Element + Input Pipeline Alignment | BIND-08, BOWN-01..02, ELEM-01, RAPP-01, GSCD-01 | 3 | Planned |
| 25 | Integration Testing + Example Validation | INTG-01..03 | 2 | Planned |
| 26 | Cleanup + Dead Code Removal | (cleanup) | 1 | Planned |

## Execution History

(No waves executed yet)

## Performance Metrics

**Velocity (v1.0 + v1.1 + v1.2):**

- v1.0 plans completed: 25
- v1.1 plans completed: 16
- v1.2 plans completed: 17
- Total plans completed: 58
- Total test count: 2603 (0 failures)
- Total examples: 28

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting current work:

- [v1.3]: WidgetsBinding must own TerminalManager (J3 owns wB0) — standalone runApp terminal init caused 4 cascading bugs
- [v1.3]: BuildOwner calls FrameScheduler directly (NB0.scheduleBuildFor calls c9.instance.requestFrame) — no intermediate bridge
- [v1.3]: No scheduleFrame/drawFrame on WidgetsBinding — frame execution entirely via FrameScheduler callbacks
- [v1.3]: runApp is thin wrapper (cz8 just calls J3.instance.runApp) — all init logic inside J3

### Bugs Fixed (pre-v1.3)

4 cascading bugs fixed during v1.2 manual testing that motivated v1.3:
1. `runApp()` never initialized terminal (commit f5d780f)
2. EventDispatcher wrong import path for FocusManager (commit 6990f4f)
3. `Element.markNeedsRebuild()` didn't call `scheduleBuildFor()` (commit 21ebc45)
4. Dual frame scheduling conflict between scheduleFrame and FrameScheduler (commit b4d12c2)

### Pending Todos

None — planning phase complete, ready to execute Phase 23.

### Blockers/Concerns

- v1.3 phases are strictly sequential — each modifies shared core files
- Must preserve all 2603 existing tests through refactoring
- InputBridge may be used in test helpers — check before removing

## Session Continuity

Last session: 2026-03-23T00:00:00Z
Stopped at: v1.3 milestone planning complete
Resume file: None
