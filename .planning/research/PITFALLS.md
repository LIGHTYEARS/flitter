# Research: Pitfalls for v0.3.0 flitter-cli

**Date:** 2026-04-03
**Milestone:** v0.3.0 — flitter-cli

## Main Risks

### Legacy package drag
Porting code mechanically from `flitter-amp` can preserve ACP-centric assumptions and leave the new package as a thin rename. Every migrated module must be checked for transport/runtime leakage.

### Visual parity without runtime parity
The previous milestone proved the UI can look right while the product boundary stays wrong. This milestone must validate behavior, not just layout screenshots.

### Half-migration state
Keeping `flitter-amp` and `flitter-cli` both partially active will create duplicated scripts, configs, and user expectations. The roadmap must include an explicit migration/retirement phase.

### Spec drift from reverse-engineered notes
The reverse-engineering artifacts are spread across many files. Without a synthesized milestone contract, implementation can drift toward whichever existing module is easiest to port.

### Dirty worktree interference
The repository already has substantial in-flight edits. Migration work must avoid broad renames or cleanup passes that trample unrelated progress.

## Prevention

- Establish `flitter-cli` package and runtime contract first
- Define requirement coverage against behavior, not package names
- Include explicit migration/removal requirements for `flitter-amp`
- Keep planning and implementation scopes narrow until the dirty tree is understood
