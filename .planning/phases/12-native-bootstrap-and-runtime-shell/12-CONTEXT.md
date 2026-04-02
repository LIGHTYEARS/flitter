# Phase 12: Native Bootstrap and Runtime Shell - Context

**Gathered:** 2026-04-03
**Status:** Ready for planning
**Mode:** Auto-generated (infrastructure phase; discuss skipped)

<domain>
## Phase Boundary

Establish `flitter-cli` as a first-class package with native bootstrap, config, logging, and terminal lifecycle behavior.

This phase is scaffold-first. It must lock the package/runtime boundary and remove coco/ACP bridge assumptions from the boot path before later phases add detailed parity behavior.

</domain>

<decisions>
## Implementation Decisions

### Guardrails
- Parity failures are scope failures, not polish debt
- Guardrails first, execution next
- Scaffold first, details next

### the agent's Discretion
Within those guardrails, the agent may choose the safest package/bootstrap structure that fits the existing monorepo and preserves compatibility with later full-parity phases.

</decisions>

<code_context>
## Existing Code Insights

- `packages/flitter-core` is the rendering/input substrate and remains the only UI framework
- `packages/flitter-amp` currently owns the closest bootstrap/runtime shell patterns and is the primary migration source for this phase
- Existing monorepo package and TypeScript conventions should be reused where safe

</code_context>

<specifics>
## Specific Ideas

- Create `packages/flitter-cli` with package metadata, scripts, tsconfig, and entrypoint
- Establish native config/logging namespace for `flitter-cli`
- Define top-level startup/shutdown/error lifecycle before implementing deeper parity details
- Keep this phase focused on scaffold and runtime boundary, not feature-complete parity surfaces

</specifics>

<deferred>
## Deferred Ideas

- Detailed session lifecycle parity
- Detailed chat/tool/content/status parity
- History, persistence, and migration closure details beyond what Phase 12 needs to scaffold safely

</deferred>
