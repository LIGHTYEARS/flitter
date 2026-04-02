# Phase 12: Native Bootstrap and Runtime Shell — Context

**Auto-generated:** Infrastructure phase, minimal context required.

## Phase Boundary

Create `packages/flitter-cli` as a first-class workspace package and establish its runtime shell: entrypoint, package metadata, scripts, config namespace, logging bootstrap, and clean terminal lifecycle.

This phase is scaffold-first. It defines the package boundary and startup contract that later parity phases build on.

## Key Decisions

- **D-01**: `flitter-cli` is a new workspace package, not a rename of `flitter-amp`
- **D-02**: No core bootstrap path may depend on coco or ACP bridge commands
- **D-03**: Guardrails first, execution next; scaffold first, details next
- **D-04**: Parity failures are scope failures, but this phase only locks runtime shell and startup invariants, not later UI detail parity
- **D-05**: Reuse monorepo conventions from existing packages where safe, but do not preserve `flitter-amp` naming in the new package boundary
