# Phase 23: InputArea Rich Border - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-06
**Phase:** 23-InputArea Rich Border
**Areas discussed:** Border text rendering mechanism, Bottom grid resize, Streaming metadata format, agentModePulse animation

---

## Gray Area Selection

| Option | Description | Selected |
|--------|-------------|----------|
| Border text rendering mechanism | AMP uses buildBorderTransparentTextWidget to replace border chars with text. flitter uses Positioned overlay. New core primitive or keep overlay? | |
| Bottom grid resize | BORDER-08 requires InputArea resizable height with bottomGridUserHeight + drag handle | |
| Streaming metadata format | BORDER-07 requires token/cost/time on border during streaming. Position and format? | |
| agentModePulse animation | BORDER-05 requires shimmer animation on mode change. Exact shimmer or simpler pulse? | |

**User's choice:** Free text — "对齐 amp 的所有渲染、动画、交互机制，如果 flitter-core 的能力不足，优先改造"
**Notes:** User selected all 4 areas implicitly by stating a blanket policy: align with AMP's exact mechanisms for everything, and modify flitter-core as needed to support it.

---

## All Areas (Batch Resolution)

The user's single directive resolved all 4 gray areas simultaneously:

| Area | Decision | Rationale |
|------|----------|-----------|
| Border text rendering | New flitter-core primitive (not Positioned overlay) | Must match AMP's border-embedded text, not floating overlay |
| Bottom grid resize | Implement bottomGridUserHeight + drag handle | AMP parity requirement |
| Streaming metadata | Exact AMP golden positions (top-left context, top-right mode, bottom-left status, bottom-right cwd) | Strict parity with golden files |
| agentModePulse | Full shimmer animation (right-to-left, trail=5, lerpColor) | AMP exact mechanism, not simplified |

---

## Claude's Discretion

- Animation FPS/duration specifics
- bottomGridUserHeight persistence scope (session vs cross-session)
- Border builder function architecture
- Width truncation strategy

## Deferred Ideas

None — discussion stayed within phase scope
