# Phase 12: Native Bootstrap and Runtime Shell - Context

**Gathered:** 2026-04-03
**Status:** Ready for planning
**Mode:** Auto-generated (infrastructure phase, discuss skipped)

<domain>
## Phase Boundary

Establish `flitter-cli` as a first-class package with native bootstrap, config, logging, and terminal lifecycle behavior.

Guardrail: this phase defines the runtime boundary for the rest of the milestone. It must lock package identity, startup path, config namespace, logging bootstrap, and clean shutdown semantics before deeper parity work begins.

</domain>

<decisions>
## Implementation Decisions

### Guardrails First
- Parity failures are scope failures, not polish debt
- Scaffold first, details next
- No coco or ACP bridge dependency in the new runtime boundary
- Port from `flitter-amp` only when behavior matches Amp exactly

### Agent's Discretion
- Exact file/module split inside `packages/flitter-cli`
- How much bootstrap code is mirrored first vs extracted into shared helpers
- Whether legacy `flitter-amp` bootstrap files are temporarily reused via imports during scaffold

</decisions>

<code_context>
## Existing Code Insights

- `packages/flitter-amp/package.json` shows the current package/bin/start-script convention to mirror initially
- `packages/flitter-amp/src/index.ts` is the current top-level bootstrap entrypoint to study/port
- `packages/flitter-amp/src/state/config.ts` owns CLI args + user config loading
- `packages/flitter-amp/src/utils/logger.ts` owns early log-file bootstrap and log-level setup
- `packages/flitter-amp/src/app.ts` owns `startTUI()` and root app bootstrapping into `flitter-core`
- `packages/flitter-amp/src/utils/process.ts` and ACP-layer bootstrap files show current process/runtime assumptions that must not leak into the new boundary

</code_context>

<specifics>
## Specific Ideas

- Create `packages/flitter-cli` with its own `package.json`, `tsconfig.json`, and `src/index.ts`
- Make the package executable as `flitter-cli`
- Move config storage from `.flitter-amp` conventions to `.flitter-cli`
- Lock a clean top-level startup pipeline: parse args -> init logging -> resolve cwd/editor -> bootstrap runtime -> start TUI
- Preserve terminal cleanup semantics even before deeper feature parity lands

</specifics>

<deferred>
## Deferred Ideas

- Detailed session lifecycle and state machine work belongs to Phase 13
- Chat/scroll/input/overlay/tool specifics belong to later phases
- Shared-module extraction between `flitter-amp` and `flitter-cli` is allowed only if it does not blur the new package boundary

</deferred>
