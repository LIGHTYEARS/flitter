# Requirements: flitter-cli v0.3.0

**Defined:** 2026-04-03
**Core Value:** Ship a native `flitter-cli` that reproduces Amp's end-to-end CLI behavior and TUI experience without depending on coco or ACP bridging.

## v0.3.0 Requirements

### Package and Runtime Foundation

- [ ] **CLI-01**: Developer can launch `flitter-cli` from a dedicated `packages/flitter-cli` entrypoint and package script
- [ ] **CLI-02**: `flitter-cli` bootstraps its own runtime and working-directory context without requiring coco ACP bridge commands
- [ ] **CLI-03**: `flitter-cli` defines its own configuration and data namespace separate from `flitter-amp`
- [ ] **CLI-04**: `flitter-cli` shutdown and error handling leave the terminal in a clean state

### Conversation and TUI Semantics

- [ ] **TUI-01**: User, assistant, thinking, tool, and plan content render as native `flitter-cli` turn state rather than ACP callback artifacts
- [ ] **TUI-02**: Streaming responses update incrementally with stable scroll and follow behavior
- [ ] **TUI-03**: Sticky sections, overlays, status bars, and input flows preserve the Amp-style interaction model on `flitter-core`
- [ ] **TUI-04**: Welcome, empty, loading, and error states are defined for the native CLI lifecycle

### Tool and Command Workflow

- [ ] **TOOL-01**: `flitter-cli` executes or orchestrates tool actions through a native internal event model instead of coco transport assumptions
- [ ] **TOOL-02**: Tool headers, status transitions, payload extraction, and result rendering match the reverse-engineered Amp behavior closely enough for parity work
- [ ] **TOOL-03**: Permission and confirmation flows remain available for commands that require user approval
- [ ] **TOOL-04**: Command-oriented workflows surface progress and failures in the TUI without relying on ACP protocol event names

### Session, History, and Persistence

- [ ] **SESS-01**: User can start a new session and resume a previous one through `flitter-cli`
- [ ] **SESS-02**: Prompt history, thread/session lists, and export flows work under the new package namespace
- [ ] **SESS-03**: Session persistence records enough metadata for resume, inspection, and cleanup

### Migration and Retirement

- [ ] **MIG-01**: The codebase clearly identifies which `flitter-amp` modules are migrated, adapted, or dropped for `flitter-cli`
- [ ] **MIG-02**: `flitter-amp` is removed from the active product path so new development and usage center on `flitter-cli`
- [ ] **MIG-03**: Tests cover migration-critical behavior, including startup, turn rendering, persistence, and retirement/cleanup paths

## v0.4.0+ Requirements

### Extended Parity

- **PAR-01**: Add advanced workflows discovered later in the reverse-engineered source but not required for the first native milestone
- **PAR-02**: Add performance tuning for long transcripts and heavier tool output after baseline parity lands

## Out of Scope

| Feature | Reason |
|---------|--------|
| Keeping ACP bridge architecture as the final runtime | Directly conflicts with the milestone goal |
| Running `flitter-amp` and `flitter-cli` as equal long-term products | Creates split product direction and duplicated maintenance |
| Web or desktop GUI surface | Terminal-first product remains the focus |
| Plugin architecture before parity | Adds abstraction before the baseline product exists |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| CLI-01 | Phase 12 | Pending |
| CLI-02 | Phase 12 | Pending |
| CLI-03 | Phase 12 | Pending |
| CLI-04 | Phase 12 | Pending |
| TUI-01 | Phase 13 | Pending |
| TUI-02 | Phase 13 | Pending |
| TUI-03 | Phase 13 | Pending |
| TUI-04 | Phase 13 | Pending |
| TOOL-01 | Phase 14 | Pending |
| TOOL-02 | Phase 14 | Pending |
| TOOL-03 | Phase 14 | Pending |
| TOOL-04 | Phase 14 | Pending |
| SESS-01 | Phase 15 | Pending |
| SESS-02 | Phase 15 | Pending |
| SESS-03 | Phase 15 | Pending |
| MIG-01 | Phase 16 | Pending |
| MIG-02 | Phase 16 | Pending |
| MIG-03 | Phase 16 | Pending |

**Coverage:**
- v0.3.0 requirements: 18 total
- Mapped to phases: 18
- Unmapped: 0 ✓

---
*Requirements defined: 2026-04-03*
*Last updated: 2026-04-03 after v0.3.0 milestone initialization*
