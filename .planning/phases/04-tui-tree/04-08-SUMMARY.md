---
phase: 4
plan: 08
status: complete
---

# FrameScheduler, BuildOwner, and PipelineOwner -- Summary

## One-Liner
Implemented the three-tree frame engine: BuildOwner collects dirty elements for depth-ordered rebuild, PipelineOwner manages root constraints and layout/paint flushing, and FrameScheduler orchestrates the build-layout-paint-render pipeline with frame pacing.

## What Was Built
- `build-owner.ts`: `BuildOwner implements BuildOwnerLike` with:
  - `_dirtyElements: Set<Element>` with `hasDirtyElements` getter
  - `setOnNeedFrame(callback)` for frame request notification
  - `scheduleBuildFor(element)`: adds to dirty set, calls onNeedFrame
  - `buildScopes()`: iterative loop (max 10 rounds) that snapshots dirty set, sorts by depth ascending, calls `performRebuild()` on each, processes any newly-dirtied elements in subsequent rounds
- `pipeline-owner.ts`: `PipelineOwner implements PipelineOwnerLike` with:
  - Root render object and root constraints management
  - `updateRootConstraints(size)`: creates tight constraints, compares with current, marks root needsLayout if changed
  - `requestLayout(node)`: triggers onNeedFrame
  - `requestPaint(node)`: adds to paint set, triggers onNeedFrame
  - `flushLayout()`: if root is RenderBox, calls `root.layout(rootConstraints)`, returns success boolean
  - `flushPaint()`: clears `_needsPaint` on all queued nodes, empties paint set
  - `removeFromQueues(node)`: removes from paint set
- `frame-scheduler.ts`: `FrameScheduler` with:
  - `MIN_FRAME_INTERVAL = 16` ms constant for ~60fps throttling
  - `addFrameCallback(id, callback, phase, priority)` / `removeFrameCallback(id)` for persistent per-phase callbacks
  - `addPostFrameCallback(callback)` for one-shot post-frame callbacks
  - `requestFrame()`: defers to setTimeout when within MIN_FRAME_INTERVAL, marks scheduled if frame in progress
  - `executeFrame()`: runs build-layout-paint-render phases in order, then post-frame callbacks; if scheduled flag set during frame, runs one additional follow-up frame
  - `_executePhase(phase)`: filters callbacks by phase, sorts by priority ascending, executes
  - `disableFramePacing()` for synchronous test execution

## Key Decisions
- BuildOwner.buildScopes() uses a max-iteration guard (10 rounds) to prevent infinite rebuild loops from cascading dirty elements
- PipelineOwner.flushLayout() checks `instanceof RenderBox` before calling layout, allowing future non-box render objects
- FrameScheduler uses a two-level frame execution: `executeFrame()` calls `_runFrame()` and then checks if `_frameScheduled` was set during execution for a single follow-up frame (not unbounded recursion)
- Frame pacing uses `setTimeout` with remaining milliseconds rather than `requestAnimationFrame`, appropriate for terminal (non-browser) environment
- Post-frame callbacks are one-shot: copied and cleared before execution, so callbacks added during post-frame execution go to the next frame

## Test Coverage
25 tests across 4 describe blocks covering BuildOwner (scheduleBuildFor adds dirty, requests frame via mock, buildScopes depth-ordered, calls performRebuild, clears dirty set, handles cascaded dirty from rebuild), PipelineOwner (setRootRenderObject saves, updateRootConstraints creates tight and triggers layout, constraint-unchanged skips extra layout, flushLayout uses root constraints, flushLayout returns false without root, requestPaint adds to set, flushPaint clears needsPaint, removeFromQueues removes), FrameScheduler (build-layout-paint-render order, callback registered to correct phase, removeFrameCallback, priority sorting, post-frame after all phases, post-frame one-shot, requestFrame during frame sets scheduled, scheduled triggers follow-up frame), and integration tests (dirty element through full buildScopes pipeline, setState-scheduleBuildFor-buildScopes chain, full three-phase build-layout-paint coordination). Additionally, 23 end-to-end integration tests in `integration.test.ts` validate the complete three-tree engine.

## Artifacts
- `packages/tui/src/tree/frame-scheduler.ts`
- `packages/tui/src/tree/build-owner.ts`
- `packages/tui/src/tree/pipeline-owner.ts`
- `packages/tui/src/tree/frame-scheduler.test.ts`
- `packages/tui/src/tree/integration.test.ts`
- `packages/tui/src/tree/index.ts`
