# Roadmap: flitter-cli

**Created:** 2026-04-03
**Granularity:** Coarse
**Core Value:** Ship a native `flitter-cli` that reproduces Amp's end-to-end CLI behavior and TUI experience without depending on coco or ACP bridging

## Milestone 1: v0.1.0 — Visual Prototype (COMPLETED)

Phases 1-6 built the initial Amp-like TUI shell on `flitter-core`.

---

## Milestone 2: v0.2.0 — Make It Actually Work (COMPLETED)

Phases 7-11 fixed the ACP-client implementation so the legacy `flitter-amp` package became functionally usable.

---

## Milestone 3: v0.3.0 — flitter-cli

### Phase 12: Native Package and Runtime Scaffold

**Goal:** Establish `flitter-cli` as a first-class package with a native runtime boundary, configuration namespace, and terminal lifecycle.

**Requirements:** CLI-01, CLI-02, CLI-03, CLI-04

**Key Changes:**
1. Create `packages/flitter-cli` with package metadata, scripts, and entrypoint
2. Define native startup, shutdown, error, and working-directory handling
3. Move config and data conventions to `flitter-cli` naming and locations
4. Set the runtime boundary so core behavior no longer depends on coco ACP bridge commands

**Success Criteria:**
1. `flitter-cli` starts from its own package entrypoint
2. Runtime bootstrap no longer requires coco ACP bridge wiring
3. Config/data paths clearly resolve under `flitter-cli`
4. Terminal restores cleanly on exit and error

**Status:** Pending

---

### Phase 13: Native Turn Model and TUI Wiring

**Goal:** Rebind the TUI to native `flitter-cli` domain state so conversations, streaming, overlays, and status surfaces behave like the reverse-engineered Amp model.

**Requirements:** TUI-01, TUI-02, TUI-03, TUI-04

**Key Changes:**
1. Define native turn/state structures for user, assistant, thinking, tools, plans, and lifecycle states
2. Port or adapt `flitter-amp` widgets onto the new runtime boundary
3. Preserve streaming, sticky grouping, overlays, status bars, and input ergonomics
4. Define welcome, loading, error, and empty states for the native lifecycle

**Success Criteria:**
1. Conversation rendering is driven by native `flitter-cli` state
2. Streaming updates preserve stable scroll and follow behavior
3. Overlays and status bars remain functional under the new runtime
4. Empty/welcome/error states are explicitly covered

**Status:** Pending

---

### Phase 14: Tool and Command Execution Parity

**Goal:** Implement native command and tool workflow semantics so execution surfaces no longer depend on ACP protocol assumptions.

**Requirements:** TOOL-01, TOOL-02, TOOL-03, TOOL-04

**Key Changes:**
1. Define internal tool event model and command workflow state machine
2. Map tool statuses, payloads, and outputs to the reverse-engineered Amp behavior
3. Preserve permission and confirmation flows where user approval is required
4. Surface command progress and failures directly through `flitter-cli`

**Success Criteria:**
1. Tool rendering no longer depends on ACP event naming
2. Tool headers and status transitions match the intended Amp mental model
3. Approval flows can interrupt and resume execution correctly
4. Failures are visible and actionable in the TUI

**Status:** Pending

---

### Phase 15: Sessions, History, and Persistence

**Goal:** Make `flitter-cli` self-sufficient for session storage, resume, history, and export workflows.

**Requirements:** SESS-01, SESS-02, SESS-03

**Key Changes:**
1. Port or rebuild session persistence under the new namespace
2. Support recent-thread browsing, prompt history, and exports from `flitter-cli`
3. Define metadata needed for cleanup, resume, and inspection

**Success Criteria:**
1. User can start and resume sessions in `flitter-cli`
2. Prompt history and thread/session lists work under the new package
3. Export and cleanup flows operate on persisted session metadata

**Status:** Pending

---

### Phase 16: Migration Closure and flitter-amp Retirement

**Goal:** Complete the product transition so `flitter-cli` is the active path and `flitter-amp` no longer defines the maintained product.

**Requirements:** MIG-01, MIG-02, MIG-03

**Key Changes:**
1. Produce a concrete migration inventory for reused, adapted, and dropped `flitter-amp` modules
2. Remove or retire `flitter-amp` from active scripts, docs, and developer flow
3. Add migration-critical tests for startup, turn rendering, persistence, and cleanup/removal paths

**Success Criteria:**
1. The active package and developer entrypoint are clearly `flitter-cli`
2. `flitter-amp` is no longer the product default
3. Migration-critical behavior is covered by tests
4. Cleanup/removal paths do not leave stale references behind

**Status:** Pending

---

## Coverage

| Requirement | Phase | Status |
|-------------|-------|--------|
| CLI-01 | 12 | Pending |
| CLI-02 | 12 | Pending |
| CLI-03 | 12 | Pending |
| CLI-04 | 12 | Pending |
| TUI-01 | 13 | Pending |
| TUI-02 | 13 | Pending |
| TUI-03 | 13 | Pending |
| TUI-04 | 13 | Pending |
| TOOL-01 | 14 | Pending |
| TOOL-02 | 14 | Pending |
| TOOL-03 | 14 | Pending |
| TOOL-04 | 14 | Pending |
| SESS-01 | 15 | Pending |
| SESS-02 | 15 | Pending |
| SESS-03 | 15 | Pending |
| MIG-01 | 16 | Pending |
| MIG-02 | 16 | Pending |
| MIG-03 | 16 | Pending |

**v0.3.0 requirements:** 18 total
**Mapped:** 18 (100%)
**Complete:** 0

---
*Roadmap created: 2026-04-03*
*Last updated: 2026-04-03 after v0.3.0 milestone initialization*
