# Phase 26: Agent Modes and Deep Reasoning - Context

**Gathered:** 2026-04-07
**Status:** Ready for planning
**Mode:** Auto-generated (autonomous mode — strict AMP alignment)

<domain>
## Phase Boundary

Replace the placeholder agent mode system and boolean deep reasoning toggle with AMP's real implementation:
1. Expand `SessionMode` to carry `primaryModel`, `includeTools`, `deferredTools`, `visible`, `reasoningEffort`, `uiHints` fields matching AMP's `nb` object
2. Define all 7 AMP modes (SMART, FREE, RUSH, AGG, LARGE, DEEP, INTERNAL) with their exact configurations from `34_providers_models_catalog.js`
3. Replace `boolean _deepReasoningActive` with a tri-state enum `medium | high | xhigh`
4. Make `cycleMode()` rotate only through `visible: true` modes and apply real behavior changes
5. Display provider-specific speed suffix (`+fast(6x$)` / `+fast(2x$)`) in the InputArea top-right overlay

</domain>

<decisions>
## Implementation Decisions

### AMP Alignment (Non-Negotiable)
- All mode definitions must exactly match AMP's `nb` object from `34_providers_models_catalog.js`
- The 7 modes are: SMART, FREE, RUSH, AGG, LARGE, DEEP, INTERNAL
- Only `visible: true` modes participate in cycling (AGG is hidden)
- Deep reasoning enum values are exactly `medium`, `high`, `xhigh` — no boolean
- Speed suffix format is exactly `+fast(6x$)` for Anthropic, `+fast(2x$)` for OpenAI
- `agentModeColor()` and `perlinAgentModeColor()` must use AMP's RGB uiHints for each mode

### Claude's Discretion
- Internal module structure (single file vs multiple files for mode definitions)
- Whether to keep backward-compatible `smart/code/ask` aliases or hard-cut to AMP modes
- Test organization

</decisions>

<code_context>
## Existing Code Insights

### Files to Modify
- `packages/flitter-cli/src/state/types.ts` — expand `SessionMode` interface
- `packages/flitter-cli/src/state/app-state.ts` — replace `_deepReasoningActive: boolean` with enum, update `cycleMode()`, update `toggleDeepReasoning()`
- `packages/flitter-cli/src/widgets/border-builders.ts` — `buildTopRightOverlay` to add speed suffix
- `packages/flitter-cli/src/themes/index.ts` — `agentModeColor()` and `perlinAgentModeColor()` to cover all 7 modes with AMP RGB values
- `packages/flitter-cli/src/utils/reasoning-toggle.ts` — update `formatReasoningToggle` for tri-state
- `packages/flitter-cli/src/shortcuts/defaults.ts` — deep reasoning shortcut now cycles tri-state

### AMP Reference Sources
- `tmux-capture/amp-source/34_providers_models_catalog.js` — mode definitions (`nb` object)
- `tmux-capture/amp-source/22_providers_reasoning_modes.js` — reasoning/settings schema
- `tmux-capture/amp-source/input-area-top-right-builder.js` — speed suffix UI logic

### Established Patterns
- State changes via `_notifyListeners()` in AppState
- Border shimmer animation triggered by `_agentModePulseSeq` counter
- ConfigService uses Zod validation; `anthropic.speed` and `openai.speed` schemas already exist

</code_context>

<specifics>
## Specific Ideas

User directive: "对齐 amp，禁止 subagent 自由发挥" — all implementation must strictly follow AMP's observed behavior. No creative additions or deviations.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>
