# Phase 23: InputArea Rich Border - Research

**Researched:** 2026-04-06
**Domain:** TUI border rendering, widget composition, animation
**Confidence:** HIGH

## Summary

Phase 23 replaces standalone HeaderBar and StatusBar rows with AMP's `borderOverlayText` mechanism -- embedding all metadata (context %, skill count, model/mode, cwd/branch, streaming stats) directly into InputArea's four border lines. This is the single most impactful UI architecture change in v0.4.0, transforming a 4-child Column layout (Expanded+HeaderBar+InputArea+StatusBar) into a 2-child layout (Expanded+InputArea).

The flitter-core border rendering pipeline currently draws borders character-by-character via `drawBorderSides()` in PaintContext, which fills every cell on horizontal/vertical edges with box-drawing characters. The key extension needed is a mechanism to **skip** specific character ranges on border lines where overlay text will be painted by child widgets positioned via `Stack`+`Positioned`. The existing `BorderOverlayText` interface in input-area.ts already defines the `{ position, child }` contract and the Stack overlay approach is already used for the mode badge -- this pattern will be extended to all four positions with text that visually replaces border characters.

**Primary recommendation:** Extend the current `Stack`+`Positioned` overlay approach in InputArea (not modify flitter-core's `drawBorderSides`). The overlay text widgets use background-color matching the terminal background so they visually replace border characters. This matches AMP's approach where `buildBorderTransparentTextWidget` creates text widgets with transparent/matching background that paint over the border line, and avoids modifying the core rendering pipeline.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** Implement a true `borderOverlayText` rendering primitive in flitter-core that replaces border characters with text at specified positions (top-left, top-right, bottom-left, bottom-right), matching AMP's `buildBorderTransparentTextWidget` mechanism. Do NOT use the current `Stack` + `Positioned` overlay approach -- text must genuinely replace border line characters so the visual result is `╭─11% of 300k───...──smart──!─77─skills─╮` where text is part of the border line, not layered on top.
- **D-02:** The rendering primitive must accept an array of `{ position, child: Widget }` overlay specs and integrate with `drawBorderSides` (or a new border paint path) so that the border line drawing leaves gaps where overlay text is placed, then renders the text widgets in those gaps.
- **D-03:** Each position (top-left, top-right, bottom-left, bottom-right) connects its text to the border line with `─` separator characters. AMP format: `╭─{top-left-text}───...───{top-right-text}─╮` -- text flows seamlessly into the border.
- **D-04:** Top-left: context window usage percentage when conversation active (e.g., `11% of 300k`), with threshold coloring: <50% default dim, 50-80% warning (yellow), >80% destructive (red). During streaming also shows cost and elapsed: `11% of 300k · $0.41 · 3s`. Idle with no conversation: empty (pure border line).
- **D-05:** Top-right: agent mode label (e.g., `smart`) in mode color + skill warning indicator `!` (when skillWarningCount > 0) + skill count + `skills` label (e.g., `smart──!─77─skills`). Skill count section is clickable -- opens Skills modal. `!` and count use warning color; mode label uses mode-specific color (smartModeColor for smart mode).
- **D-06:** Bottom-left: context-dependent status messages. Streaming: `Esc to cancel` (Esc in keybind blue, rest dim). Waiting for approval: `Waiting for approval...` (dim). Running tools: `Running tools...` (dim). Idle: empty (no "? for shortcuts").
- **D-07:** Bottom-right: shortened cwd + git branch (e.g., `~/.oh-my-coco/studio/flitter (master)`), dim foreground. Path shortened via `toHomeRelative()` + `shorten()`.
- **D-08:** Remove `HeaderBar` widget from app-shell Column layout. Migrate all its rendering logic (WaveSpinner, token usage formatting, cost/elapsed formatting, threshold coloring) into the border builder functions.
- **D-09:** Remove `StatusBar` widget from app-shell Column layout. Migrate all its rendering logic (footer text states, cwd/branch display, context warning, copy highlight) into the border builder functions and app-shell state.
- **D-10:** After removal, app-shell Column becomes: `[Expanded(ChatView), InputArea]` -- only two children.
- **D-11:** InputArea defaults to `minLines: 3` (3 content lines + 2 border lines = 5 total lines), matching AMP golden files where InputArea is always 5 lines tall (L58-L62). Current `MIN_HEIGHT = 3` (1 content + 2 border) must change to `MIN_HEIGHT = 5` (3 content + 2 border).
- **D-12:** Implement `bottomGridUserHeight` global state that persists the user-adjusted InputArea height.
- **D-13:** Drag handle is the top border line itself -- MouseRegion on `top:0, left:0, right:0`.
- **D-14:** Implement AMP's `wTT` shimmer animation on InputArea top border when agent mode changes. Animation direction: right-to-left, trail length: 5 characters, using lerpColor between mode color and default border color. Requires a timer/animation tick mechanism.
- **D-15:** Animation triggers on agent mode transition. Runs for a finite duration then stops. The shimmer affects only the top border line characters.

### Claude's Discretion
- Exact animation FPS and duration for agentModePulse (AMP uses configurable fps/speed)
- Whether `bottomGridUserHeight` persists across sessions or is session-only
- Internal architecture of border builder functions (how many functions, naming)
- How to handle truncation when border content exceeds available width

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| BORDER-01 | InputArea top-left border embeds context window percentage text using borderOverlayText mechanism | Finding F1 (border pipeline), F2 (AMP buildBorderTransparentTextWidget), F3 (golden format), F5 (extension approach) |
| BORDER-02 | InputArea top-right border embeds skill count badge that triggers Skills modal on click | Finding F2 (AMP T9 onClick pattern), F3 (golden format: `smart──!─77─skills`), F4 (state flow) |
| BORDER-03 | InputArea bottom-left border embeds current model name and agent mode label | Note: REQUIREMENTS.md says "model name and agent mode" but CONTEXT.md D-06 says "context-dependent status messages" (streaming/approval/idle). CONTEXT.md decisions take precedence -- bottom-left shows status text, not model/mode. Finding F2 (AMP bottom-left builder), F4 (state flow) |
| BORDER-04 | InputArea bottom-right border embeds current working directory and git branch name | Finding F3 (golden: `~/.oh-my-coco/studio/flitter (master)`), F4 (cwd/gitBranch from AppState.metadata) |
| BORDER-05 | InputArea border supports agentModePulse animation (lerpColor between mode color and default border color on mode change) | Finding F7 (animation primitives: AnimationController + Ticker exist, lerpColor needs creation) |
| BORDER-06 | Standalone HeaderBar and StatusBar rows are removed; all metadata lives on InputArea border lines | Finding F4 (complete prop map from HeaderBar/StatusBar to migrate) |
| BORDER-07 | Streaming state displays token count, cost, elapsed time, and "Esc to cancel" on InputArea border | Finding F3 (golden streaming: `╭─11% of 300k · $0.41──...`), F4 (HeaderBar formatUsageDisplay migration) |
| BORDER-08 | Resizable bottom grid with bottomGridUserHeight global state and drag-resize handle | Finding F6 (AMP drag pattern analysis, existing MouseRegion in input-area.ts) |
| BORDER-09 | InputArea initial height respects minLines: 3 configuration, matching AMP's default 3-line editing area | Finding F3 (golden shows 5 total lines: L58-L62 = 2 border + 3 content) |
</phase_requirements>

## Standard Stack

This phase is entirely internal to the flitter-core and flitter-cli packages. No external libraries are needed.

### Core (Internal Packages)
| Package | Purpose | Why |
|---------|---------|-----|
| `flitter-core` | Rendering primitives: RenderDecoratedBox, PaintContext, Border, AnimationController, Ticker | All border rendering and animation infrastructure lives here |
| `flitter-cli` | InputArea, AppShell, HeaderBar, StatusBar widgets | All modification targets for this phase |

### Supporting
| Utility | Purpose | When to Use |
|---------|---------|-------------|
| `Color.toRgb()` + new `lerpColor()` | RGB interpolation for shimmer animation | BORDER-05 agentModePulse requires blending between mode color and border color |
| `AnimationController` + `Ticker` | Frame-synchronized animation timing | BORDER-05 shimmer animation needs per-frame updates |
| `CliThemeProvider` | Theme-aware colors (keybind, smartModeColor, warning, destructive) | All border text coloring |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Modify `drawBorderSides` in flitter-core | Keep pure Stack+Positioned overlay (current approach) | D-01 explicitly rejects Stack+Positioned; requires core paint path modification |
| Custom RenderObject (like AMP's `IhR`) | Composed widget tree with modified border paint | Custom RenderObject is more AMP-faithful but higher complexity; composed widget with gap-aware border painting is sufficient |

## Architecture Patterns

### Pattern 1: Gap-Aware Border Painting [VERIFIED: codebase analysis]

**What:** Extend `drawBorderSides` (or a wrapper) to accept gap specifications that skip drawing horizontal border characters where overlay text will be placed. The border drawing loop iterates `col = x+1` to `col = x+w-1` for horizontal lines -- the extension adds skip ranges.

**When to use:** When rendering InputArea borders with embedded text.

**How it works end-to-end:**

```
Container (BoxDecoration with Border)
  → RenderDecoratedBox._paintDecoration()
    → ctx.drawBorderSides(col, row, w, h, sides)
      → For top/bottom horizontal lines: iterate col by col
        → NEW: skip ranges [startCol, endCol] where overlay text occupies
      → For corners: draw as normal
      → For vertical sides: draw as normal
```

The key extension point is `PaintContext.drawBorderSides()` at [paint-context.ts L302-398](file:///Users/bytedance/.oh-my-coco/studio/flitter/packages/flitter-core/src/scheduler/paint-context.ts#L302-L398). Currently it draws all horizontal cells in a for-loop:

```typescript
// Current: draws every cell
for (let col = x; col < x + w; col++) {
  this.drawChar(col, y, chars.h, cs, 1);
}
```

The extension adds an optional `gaps` parameter:

```typescript
// Extended: skip ranges where overlay text lives
drawBorderSides(x, y, w, h, sides, gaps?: {
  top?: Array<{ start: number; end: number }>;
  bottom?: Array<{ start: number; end: number }>;
})
```

**Example:**
```typescript
// Source: codebase analysis of paint-context.ts + render-decorated.ts
// For: ╭─11% of 300k───...───smart──!─77─skills─╮
// Gaps on top line: [2, 15] for "11% of 300k", [w-21, w-2] for "smart──!─77─skills"
```

### Pattern 2: Border Overlay Text Widget Assembly [VERIFIED: AMP source analysis]

**What:** InputArea's build method assembles overlay text widgets for each of the 4 positions, wraps them in the `BorderOverlayText` interface, and passes them as `overlayTexts` prop. The overlays are rendered as `Positioned` children in a `Stack` that sits on top of the bordered container.

**When to use:** In InputArea's build method, constructing the border content.

**Architecture of AMP's approach (from obfuscated source):**

```typescript
// AMP constructs an `_` array (overlayTexts) with position specs:
_.push({
  child: new T0({ mainAxisSize: "min", children: GR }), // Row of text spans
  position: "top-right"
});
_.push({
  child: new pR({ text: new F(K, new iR({ color: a.foreground, dim: true })) }), // styled text
  position: "bottom-right"
});
// Then passes to IhR custom RenderObject:
return new IhR({ overlayTexts: _, ... });
```

`pR` is a text widget (like flitter's `Text` with `TextSpan`).
`iR` is a style (like `TextStyle`).
`F` is a `TextSpan`.
`T0` is a `Column`/layout container.
`T9` is a `MouseRegion` wrapper (for click handling).

### Pattern 3: InputArea as Self-Contained Bottom Grid [VERIFIED: AMP source + golden files]

**What:** After removing HeaderBar and StatusBar, InputArea becomes the sole bottom element. It contains all metadata in its border lines and manages its own height.

**Golden file evidence (5-line InputArea):**

Welcome screen (no conversation):
```
L58: ╭───────────────────────────...───────────────smart──!─77─skills─╮
L59: │                                                                 │
L60: │                                                                 │
L61: │                                                                 │
L62: ╰───────────────────────────...─~/.oh-my-coco/studio/flitter (master)─╯
```

Conversation reply (with context usage):
```
L58: ╭─11% of 300k───────────────...───────────────smart──!─77─skills─╮
L59: │                                                                 │
L60: │                                                                 │
L61: │                                                                 │
L62: ╰───────────────────────────...─~/.oh-my-coco/studio/flitter (master)─╯
```

Streaming (with cost):
```
L58: ╭─11% of 300k · $0.41───────...───────────────smart──!─77─skills─╮
L59-L61: │ (content lines) │
L62: ╰───────────────────────────...─~/.oh-my-coco/studio/flitter (master)─╯
L63:  ≋ Running tools...         Esc to cancel    <-- OUTSIDE InputArea border
```

**Critical observation:** The streaming/HITL golden files show that `Running tools...` / `Esc to cancel` / `Waiting for approval...` appear on a SEPARATE line BELOW the InputArea border (L63), not inside the bottom border. This is the **footer status line** managed by AMP's `yB()` state machine. However, D-06 places status messages in the bottom-left border position. This means the bottom-left of InputArea shows status when there IS a bottom-left message (like handoff/queue mode), while the separate footer line shows streaming status. The golden L63 line is from AMP's footer bar which is a separate rendering surface (WaveSpinner + status text + "Esc to cancel"). This is an important distinction for the planner.

**Revised understanding:** Looking more carefully at the goldens:
- L62 bottom border: `╰───...─~/.oh-my-coco/studio/flitter (master)─╯` -- only cwd/branch, no status text
- L63 (streaming): ` ≋ Running tools...         Esc to cancel` -- separate footer line
- L63 (HITL): ` Waiting for approval...  Esc to cancel` -- separate footer line

This means the D-06 "bottom-left" status messages may actually be for special modes only (handoff, queue), not for streaming/tools. The streaming footer may need to remain as a separate line OR be absorbed into the bottom-left border. The CONTEXT.md D-06 says "Streaming: `Esc to cancel`" goes in bottom-left, which contradicts what the golden shows. **D-06 is the locked decision and takes precedence over golden interpretation.** The planner should implement D-06 as specified, putting status messages in the bottom-left border.

### Anti-Patterns to Avoid
- **Modifying drawBorderSides signature without backward compatibility:** Every Container in the app uses drawBorderSides. The gap parameter must be optional with default behavior unchanged.
- **Measuring overlay text width in build() instead of at paint time:** Text width depends on emoji width and character widths. Use `W8()` equivalent (character-aware string width calculation) at widget construction time.
- **Forgetting to handle empty overlays:** When no conversation is active, top-left should be empty (pure border line). The gap calculation must handle null/empty overlay gracefully.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Animation timing | Custom setInterval loop | `AnimationController` + `Ticker` from `flitter-core/src/animation/` | Frame-synchronized, integrates with FrameScheduler, supports curves, already tested |
| Color interpolation | Manual RGB math | New `lerpColor(a, b, t)` utility in `Color` class | Need proper RGB conversion from named/ansi256 colors via `toRgb()` |
| String width measurement | `.length` property | Existing terminal-aware width function (unicode/emoji-aware) | CJK and emoji characters are 2-cells wide; `wcwidth` from flitter-core handles this |
| Token formatting | Inline formatting | Migrate `formatTokenCount`, `formatElapsed`, `thresholdColor` from header-bar.ts | Already tested, correct edge cases |
| Path shortening | New path shortener | Migrate `shortenPath` from status-bar.ts | Already handles HOME replacement and max-length truncation |
| Footer state machine | New if-else chain | Migrate `getFooterText` from status-bar.ts | Priority-ordered state resolution already correct |

**Key insight:** Most of the rendering logic already exists in HeaderBar and StatusBar. The work is migration (extracting helpers to shared modules, rewiring them into border builder functions), not creation.

## Architecture: Border Rendering Pipeline End-to-End [VERIFIED: codebase]

### Current Pipeline

```
Container({ decoration: BoxDecoration({ border: Border.all(...) }) })
  → creates RenderDecoratedBox (render-decorated.ts)
    → performLayout(): deflates constraints by border width, layouts child
    → paint(): calls _paintDecoration() then child.paint()
      → _paintDecoration(): calls ctx.drawBorderSides()
        → PaintContext.drawBorderSides() (paint-context.ts L302-398)
          → Fast path: all sides same style/color → delegates to drawBorder()
          → Slow path: per-side rendering:
            1. Draw horizontal lines (top, bottom) cell-by-cell
            2. Draw vertical lines (left, right) cell-by-cell
            3. Draw corners with appropriate box-drawing chars
```

### Extension for Gap-Aware Borders

**Option A: Modify `drawBorderSides` to accept gaps** [RECOMMENDED]
- Add optional `gaps` parameter to `drawBorderSides`
- Modify the horizontal line loops to skip gap ranges
- `RenderDecoratedBox._paintDecoration()` passes gaps from decoration metadata
- `BoxDecoration` gets a new optional `borderGaps` property

**Option B: New `drawBorderWithOverlays` method on PaintContext**
- Separate method that draws borders with gaps
- Called from a new `RenderBorderedWithOverlays` RenderObject
- Avoids modifying existing API but adds new surface area

**Option C: Post-paint overlay (paint order trick)**
- Border paints normally (all characters)
- Overlay text paints on top, overwriting border characters with text + background color
- Simplest but violates D-01 which says "genuinely replace border line characters"

**Decision for D-01 compliance:** D-01 says "text must genuinely replace border line characters" and "Do NOT use the current Stack + Positioned overlay approach". This means Option A or B -- the border paint path must be aware of the gaps. However, the practical visual result of Option C is identical (text overwrites border chars with background-colored text). Given D-01's explicit rejection of Stack+Positioned and requirement for genuine replacement, **Option A is the correct approach**: modify `drawBorderSides` to accept gap specs.

**Implementation detail for Option A:**

```typescript
// New type for border gaps
interface BorderGap {
  /** Column offset from border left edge where gap starts (inclusive) */
  start: number;
  /** Column offset where gap ends (exclusive) */
  end: number;
}

// Extended drawBorderSides signature
drawBorderSides(x, y, w, h, sides, gaps?: {
  top?: BorderGap[];
  bottom?: BorderGap[];
}): void {
  // In horizontal line loops, skip columns in gap ranges:
  if (hasTop) {
    const topGaps = gaps?.top ?? [];
    for (let col = x; col < x + w; col++) {
      if (topGaps.some(g => col >= x + g.start && col < x + g.end)) continue;
      this.drawChar(col, y, chars.h, cs, 1);
    }
  }
}
```

**Then in RenderDecoratedBox or a new widget:**

```typescript
// The border overlay text positions are measured during build,
// converted to gap ranges, and passed through to drawBorderSides
```

### How AMP Does It [VERIFIED: obfuscated source analysis]

AMP uses `IhR`, a custom RenderObject that:
1. Takes `overlayTexts` array with `{ position, child }` specs
2. Renders a border box
3. Renders overlay text children on top of the border
4. Manages the `bottomGridUserHeight` resize logic
5. Handles the shimmer overlay layer

The `buildBorderTransparentTextWidget(text, style, emojiWidth)` method:
1. Creates a `Text` widget with the given text and style
2. The text has a **background color matching the terminal background** (`a.background`)
3. This makes the text appear "transparent" against the border -- it overwrites border chars with text that has the same background, creating seamless integration
4. Returns the widget to be positioned in the overlay

**Key AMP pattern:** The text IS painted on top of border characters. AMP does NOT skip border characters during drawing. Instead, the text widget's background color matches the border background, creating a visual replacement. But D-01 explicitly wants genuine replacement (gaps in the border line). We implement both: gap-aware border paint + overlay text positioned in those gaps.

## State Data Flow: Props to Migrate [VERIFIED: codebase]

### From HeaderBar (to be removed)
| Prop | Source in AppShell | Destination |
|------|-------------------|-------------|
| `isProcessing` | `appState.isProcessing` | Top-left border: controls whether cost/elapsed are shown |
| `isInterrupted` | `appState.isInterrupted` | Top-left border: warning state |
| `tokenUsage` | `appState.usage` (UsageInfo) | Top-left border: `XX% of YYk` text |
| `costUsd` | `appState.usage?.cost?.amount ?? 0` | Top-left border: `· $X.XXXX` |
| `elapsedMs` | `appState.elapsedMs` | Top-left border: `· Xs` |
| `contextWindowUsagePercent` | (not currently passed) | Top-left border: threshold coloring |

**Helpers to migrate from header-bar.ts:**
- `formatTokenCount(count)` -- formats to k/M notation [VERIFIED: header-bar.ts L32-40](file:///Users/bytedance/.oh-my-coco/studio/flitter/packages/flitter-cli/src/widgets/header-bar.ts#L32-L40)
- `formatElapsed(ms)` -- formats to s/m/h notation [VERIFIED: header-bar.ts L46-55](file:///Users/bytedance/.oh-my-coco/studio/flitter/packages/flitter-cli/src/widgets/header-bar.ts#L46-L55)
- `thresholdColor(percent)` -- returns red/yellow/blue based on usage [VERIFIED: header-bar.ts L61-65](file:///Users/bytedance/.oh-my-coco/studio/flitter/packages/flitter-cli/src/widgets/header-bar.ts#L61-L65)

### From StatusBar (to be removed)
| Prop | Source in AppShell | Destination |
|------|-------------------|-------------|
| `cwd` | `appState.metadata.cwd` | Bottom-right border |
| `gitBranch` | `appState.metadata.gitBranch` | Bottom-right border |
| `isProcessing` | `appState.isProcessing` | Bottom-left border status text |
| `isStreaming` | `appState.lifecycle === 'streaming'` | Bottom-left border: `Esc to cancel` |
| `isInterrupted` | `appState.isInterrupted` | Bottom-left border: state text |
| `isExecutingCommand` | (not currently wired) | Bottom-left: `Executing command...` |
| `isRunningShell` | (not currently wired) | Bottom-left: `Running shell...` |
| `isAutoCompacting` | (not currently wired) | Bottom-left: `Auto-compacting...` |
| `isHandingOff` | (not currently wired) | Bottom-left: `Handing off...` |
| `statusMessage` | (not currently wired) | Bottom-left: custom message |
| `copyHighlight` | `_copyHighlight` state in AppShellState | Bottom-left: `Copied!` |
| `searchState` | `_reverseSearchActive` + query | Bottom-left: search indicator |
| `hintText` | (not currently wired) | Bottom-left: dim hint |
| `agentName` | (not currently wired) | Bottom-right: agent name |
| `deepReasoningActive` | (not currently wired) | Bottom-left: `[Deep Reasoning]` |

**Helpers to migrate from status-bar.ts:**
- `shortenPath(fullPath, maxLen)` -- HOME replacement + truncation [VERIFIED: status-bar.ts L329-339](file:///Users/bytedance/.oh-my-coco/studio/flitter/packages/flitter-cli/src/widgets/status-bar.ts#L329-L339)
- `getFooterText(props)` -- priority-ordered status text [VERIFIED: status-bar.ts L66-81](file:///Users/bytedance/.oh-my-coco/studio/flitter/packages/flitter-cli/src/widgets/status-bar.ts#L66-L81)

### New Props Needed by InputArea
| Prop | Type | Source |
|------|------|--------|
| `tokenUsage` | `UsageInfo \| null` | `appState.usage` |
| `costUsd` | `number` | `appState.usage?.cost?.amount ?? 0` |
| `elapsedMs` | `number` | `appState.elapsedMs` |
| `contextWindowPercent` | `number` | `appState.contextWindowUsagePercent` |
| `cwd` | `string` | `appState.metadata.cwd` |
| `gitBranch` | `string \| undefined` | `appState.metadata.gitBranch` |
| `isStreaming` | `boolean` | `appState.lifecycle === 'streaming'` |
| `isInterrupted` | `boolean` | `appState.isInterrupted` |
| `statusMessage` | `string \| undefined` | Contextual status text |
| `agentModePulseSeq` | `number` | Incremented on mode change |
| `skillCount` | `number` | From skill service |
| `skillWarningCount` | `number` | From skill service |
| `hasConversation` | `boolean` | `getMessages().length > 0` |
| `onSkillCountClick` | `() => void` | Opens skills modal |

## AMP's Drag-Resize Mechanism [VERIFIED: AMP source]

From the AMP source, `IhR` manages resize:

```javascript
// AMP drag pattern (from obfuscated source):
onDrag: (D) => {
  if (this.bottomGridDragStartY === null)
    this.bottomGridDragStartY = Math.floor(D.localPosition.y),
    this.bottomGridDragStartHeight = this.bottomGridUserHeight;
  let z = Math.floor(D.localPosition.y) - this.bottomGridDragStartY,
      J = Math.max(4, this.bottomGridDragStartHeight - z),  // min height = 4
      cR = Math.min(J, t),  // t = maxHeight
      hR = Math.floor(cR);
  if (this.bottomGridUserHeight !== hR)
    this.setState(() => { this.bottomGridUserHeight = hR });
},
onDragRelease: () => {
  this.bottomGridDragStartY = null;
  this.bottomGridDragStartHeight = null;
}
```

**Key details:**
- Minimum height is 4 (in AMP; D-11 says our minimum is 5 = 3 content + 2 border)
- `bottomGridUserHeight` is stored in the InputArea state, managed via setState
- Drag delta is `startY - currentY` (dragging UP increases height)
- Height is clamped to `[minHeight, maxHeight]` where maxHeight comes from available screen space
- The existing flitter-cli InputArea already has a drag mechanism at [input-area.ts L279-300](file:///Users/bytedance/.oh-my-coco/studio/flitter/packages/flitter-cli/src/widgets/input-area.ts#L279-L300) that follows a very similar pattern

**What to change:** The existing drag mechanism works but uses hardcoded `MIN_HEIGHT = 3` and `maxHeight = floor(50/2)`. Update to MIN_HEIGHT = 5 and compute maxHeight from actual screen height.

## AMP's agentModePulse Shimmer Animation [VERIFIED: AMP source]

From the AMP source:

```javascript
// Shimmer widget (wTT) creation:
new wTT({
  color: V,                    // mode color (e.g., smartModeColor)
  backgroundColor: a.background, // terminal background
  trigger: this.agentModePulseSeq,  // increments on mode change
  fps: N,                      // configurable FPS
  speed: D,                    // 1 or 3 (fasterAnimation)
  trail: 5,                    // trail length in characters
  leftOffset: 0,
  direction: "right-to-left"
})

// Positioned on top border, between left edge and right overlays:
new ma({  // Positioned
  top: 0,
  left: 1,    // after left corner
  right: J,   // J = rightOverlayWidth + 2 (before right overlays)
  height: 1,
  child: new wTT(...)
})
```

**Key details:**
- `wTT` is a StatefulWidget that:
  1. Watches `trigger` prop for changes (agentModePulseSeq)
  2. On trigger change, starts a timer/animation that sweeps a color gradient across the top border
  3. Uses `lerpColor(backgroundColor, modeColor, t)` to create a gradient trail
  4. Trail is 5 characters wide, moving right-to-left
  5. Overwrites horizontal border characters with colored versions
  6. Runs for one complete sweep then stops
- Speed controls how many characters advance per frame tick
- FPS controls the frame rate (AMP defaults appear to be around 30fps based on standard TUI rates)

### Animation Primitives Available in flitter-core [VERIFIED: codebase]

| Primitive | Location | Status |
|-----------|----------|--------|
| `Ticker` | `animation/ticker.ts` | Available, frame-synchronized via FrameScheduler |
| `AnimationController` | `animation/animation-controller.ts` | Available, supports forward/reverse/stop/reset, value from 0..1 |
| `Curves` | `animation/curves.ts` | Available, includes linear, easeIn, easeOut, etc. |
| `Color.toRgb()` | `core/color.ts` | Available, converts named/ansi256 to RGB |
| `blendColor(front, back)` | `core/color.ts` | Available, alpha-based blending |
| `lerpColor(a, b, t)` | -- | **NOT AVAILABLE -- MUST CREATE** |
| `WaveSpinner` | `widgets/wave-spinner.ts` | Reference implementation for timer-based animation |

**lerpColor implementation plan:**

```typescript
// Add to core/color.ts
export function lerpColor(a: Color, b: Color, t: number): Color {
  const rgbA = a.toRgb();
  const rgbB = b.toRgb();
  if (rgbA.mode !== 'rgb' || rgbB.mode !== 'rgb') return t < 0.5 ? a : b;
  const r = Math.round(rgbA.r + (rgbB.r - rgbA.r) * t);
  const g = Math.round(rgbA.g + (rgbB.g - rgbA.g) * t);
  const bl = Math.round(rgbA.b + (rgbB.b - rgbA.b) * t);
  return Color.rgb(r, g, bl);
}
```

**Shimmer widget design:**

```typescript
class BorderShimmer extends StatefulWidget {
  readonly color: Color;           // mode color (target)
  readonly backgroundColor: Color; // border default color (source)
  readonly trigger: number;        // pulse sequence number
  readonly trail: number;          // trail length (5)
  readonly direction: 'right-to-left' | 'left-to-right';
  // ...
}

class BorderShimmerState extends State<BorderShimmer> {
  private _ticker: Ticker | null = null;
  private _position: number = 0;  // current head position
  private _active: boolean = false;
  private _totalWidth: number = 0; // measured from parent constraints

  // On trigger change: start animation
  // Each tick: advance position, setState to repaint
  // Paint: for each column in range, calculate distance from head,
  //        compute lerpColor(bg, color, 1 - distance/trail),
  //        draw border char with that color
  // When position > totalWidth + trail: stop
}
```

**Recommended FPS/duration:** 30 FPS (standard TUI frame rate, matching WaveSpinner's 200ms/frame ~= 5fps but shimmer needs smoother motion). Duration = width / speed frames. With speed=1, a 200-char-wide border at 30fps takes ~6.7 seconds. With speed=3, ~2.2 seconds. AMP's `fasterAnimation` hint uses speed=3 for certain modes. **Recommend: 30 FPS, speed=2 default for ~3.3 second sweep.**

## Golden File Character-by-Character Breakdown [VERIFIED: golden files]

### Welcome Screen Top Border (L58)
```
╭───────────...───────────────smart──!─77─skills─╮
│                                                  │
^                                                  ^
corner+h+h+...+h+h+h+h+"smart"+"──"+"!"+"─"+"77"+"─"+"skills"+"─"+corner
```

Structure:
- `╭` (rounded top-left corner, U+256D)
- `─` repeated (U+2500, horizontal line fills remaining space)
- `smart` (mode label, in smartModeColor)
- `──` (separator, border color)
- `!` (warning indicator, warning color) -- only when skillWarningCount > 0
- `─` (separator)
- `77` (skill count, warning color when warnings, foreground otherwise)
- `─` (separator)
- `skills` (label, dim foreground)
- `─` (separator)
- `╮` (rounded top-right corner, U+256E)

### Conversation Reply Top Border (L58)
```
╭─11% of 300k───────────...───────────────smart──!─77─skills─╮
```

Structure:
- `╭` corner
- `─` single separator
- `11% of 300k` (context usage text: `11%` in threshold color + ` of 300k` dim)
- `─` repeated (fills middle)
- `smart──!─77─skills` (same as welcome)
- `─` separator
- `╮` corner

### Streaming Top Border (L58)
```
╭─11% of 300k · $0.41───────────...───────────────smart──!─77─skills─╮
```

Structure:
- Same as conversation reply but with cost appended: ` · $0.41`
- During active streaming, elapsed time also appears: ` · $0.41 · 3s`
- The `·` separator is U+00B7 (middle dot)

### Bottom Border (L62, all states)
```
╰───────────────...───~/.oh-my-coco/studio/flitter (master)─╯
```

Structure:
- `╰` (rounded bottom-left corner, U+2570)
- `─` repeated (fills left + middle)
- `~/.oh-my-coco/studio/flitter (master)` (dim foreground text)
- `─` single separator
- `╯` (rounded bottom-right corner, U+256F)

### Bottom-Left Content (when present, e.g., D-06 status messages)

Not visible in current goldens for streaming/HITL (those show footer BELOW the box). But D-06 specifies:
```
╰─Esc to cancel───────────...───~/.oh-my-coco/studio/flitter (master)─╯
```
Where `Esc` is in keybind blue, rest is dim.

## Common Pitfalls

### Pitfall 1: Border Character Gap Calculation Off-By-One
**What goes wrong:** Overlay text extends beyond the gap, or border characters leak into the text area.
**Why it happens:** The gap range is exclusive/inclusive inconsistency, or forgetting that the corner characters (`╭`, `╮`, `╰`, `╯`) occupy column 0 and column w-1.
**How to avoid:** Gap calculations start at column 1 (after left corner) and end at column w-2 (before right corner). Use consistent `[start, end)` half-open intervals. Write unit tests that verify character-by-character output against golden files.
**Warning signs:** Visual artifacts where border chars show through text or text extends past border edge.

### Pitfall 2: Removing HeaderBar/StatusBar Breaks Existing Tests
**What goes wrong:** Tests that assert on HeaderBar/StatusBar widget presence or output fail.
**Why it happens:** status-widgets.test.ts and other tests reference these widgets.
**How to avoid:** Update tests to verify the same content now rendered in border overlays. Migrate test assertions to check InputArea border content instead.
**Warning signs:** Test failures mentioning HeaderBar, StatusBar, or StatusBarProps.

### Pitfall 3: MIN_HEIGHT Change Breaks Auto-Expand Calculation
**What goes wrong:** InputArea height computation produces wrong values after changing MIN_HEIGHT from 3 to 5.
**Why it happens:** `_computeHeight()` returns `Math.max(visibleLines + 2, MIN_HEIGHT)`. If MIN_HEIGHT changes but the formula doesn't account for 3 content lines minimum, it may produce incorrect results.
**How to avoid:** Change MIN_HEIGHT to 5 and verify that `_computeHeight()` returns 5 for 0-3 lines of content, 6 for 4 lines, etc.
**Warning signs:** InputArea appears too short or too tall on initial render.

### Pitfall 4: Shimmer Animation Not Cleaning Up
**What goes wrong:** Ticker keeps firing after InputArea is disposed or mode stops changing.
**Why it happens:** Forgetting to dispose the Ticker in InputAreaState.dispose(), or not stopping the animation after one complete sweep.
**How to avoid:** Always dispose Ticker in dispose(). Track animation completion (position > totalWidth + trail) and stop Ticker when done.
**Warning signs:** Memory leak, CPU spinning, or ghost animation artifacts.

### Pitfall 5: Drag Resize Max Height Uses Hardcoded Value
**What goes wrong:** InputArea can't grow past half of a hardcoded 50-row screen, or can grow past the actual available space.
**Why it happens:** Current code uses `Math.floor(50 / 2)` as max height instead of actual screen dimensions.
**How to avoid:** Get actual screen height from the binding/terminal and compute maxHeight dynamically. Can use `WidgetsBinding.instance.screenSize.height` or equivalent.
**Warning signs:** InputArea overflows screen or has unreasonably low max height.

### Pitfall 6: Wide Characters (CJK/Emoji) Break Border Gap Alignment
**What goes wrong:** Overlay text with CJK characters causes misalignment because each char occupies 2 cells.
**Why it happens:** Gap width is calculated using string length instead of display width.
**How to avoid:** Use `wcwidth` from flitter-core for all width calculations. AMP uses `W8(text, emojiWidth)` for the same purpose.
**Warning signs:** Border text wraps or overlaps with border characters when non-ASCII content is present.

## Code Examples

### Example 1: Extending drawBorderSides with Gaps

```typescript
// Source: analysis of paint-context.ts drawBorderSides
// This shows the key modification to the horizontal line drawing loop

// NEW: Gap specification type
interface BorderGap {
  start: number;  // Column offset from border left edge (inclusive)
  end: number;    // Column offset (exclusive)
}

// In PaintContext.drawBorderSides, modify the top-line drawing:
if (hasTop) {
  const { style, color } = sides.top!;
  const chars = BOX_DRAWING[style];
  const cs: CellStyle = color ? { fg: color } : {};
  const topGaps = gaps?.top ?? [];
  for (let col = x; col < x + w; col++) {
    // Skip columns that fall within any gap range
    const inGap = topGaps.some(g => col >= x + g.start && col < x + g.end);
    if (!inGap) {
      this.drawChar(col, y, chars.h, cs, 1);
    }
  }
}
```

### Example 2: Border Builder Function for Top-Left

```typescript
// Source: analysis of AMP input-area-top-left-builder.js + header-bar.ts
// Builds the top-left overlay text for context window usage

function buildTopLeftOverlay(
  usage: UsageInfo | null,
  costUsd: number,
  elapsedMs: number,
  isProcessing: boolean,
  hasConversation: boolean,
  theme: CliTheme,
): { widget: Widget; textWidth: number } | null {
  if (!hasConversation || !usage) return null;

  const percent = usage.size > 0 ? Math.round((usage.used / usage.size) * 100) : 0;
  const formattedSize = formatTokenCount(usage.size);
  const color = thresholdColor(percent);
  const mutedColor = theme.base.mutedForeground;

  const spans: TextSpan[] = [];
  spans.push(new TextSpan({
    text: `${percent}% of ${formattedSize}`,
    style: new TextStyle({ foreground: color, dim: percent < 50 }),
  }));

  if (isProcessing && costUsd > 0) {
    spans.push(new TextSpan({
      text: ` \u00B7 $${costUsd.toFixed(2)}`,
      style: new TextStyle({ foreground: mutedColor, dim: true }),
    }));
  }

  if (isProcessing && elapsedMs > 0) {
    spans.push(new TextSpan({
      text: ` \u00B7 ${formatElapsed(elapsedMs)}`,
      style: new TextStyle({ foreground: mutedColor, dim: true }),
    }));
  }

  const widget = new Text({ text: new TextSpan({ children: spans }) });
  // Calculate display width for gap specification
  const textWidth = calculateDisplayWidth(spans); // wcwidth-based
  return { widget, textWidth };
}
```

### Example 3: lerpColor Implementation

```typescript
// Source: analysis of Color class in core/color.ts
// New utility function for shimmer animation

export function lerpColor(a: Color, b: Color, t: number): Color {
  const clamped = Math.max(0, Math.min(1, t));
  const rgbA = a.toRgb();
  const rgbB = b.toRgb();
  // If either can't convert to RGB (defaultColor), snap to nearest
  if (rgbA.mode !== 'rgb' || rgbB.mode !== 'rgb') {
    return clamped < 0.5 ? a : b;
  }
  const r = Math.round(rgbA.r + (rgbB.r - rgbA.r) * clamped);
  const g = Math.round(rgbA.g + (rgbB.g - rgbA.g) * clamped);
  const bl = Math.round(rgbA.b + (rgbB.b - rgbA.b) * clamped);
  return Color.rgb(r, g, bl);
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Separate HeaderBar + StatusBar rows | All metadata in InputArea border lines | Phase 23 (this phase) | Saves 2 vertical rows, matches AMP layout |
| Stack+Positioned overlay for mode badge | Gap-aware border paint with overlay text in gaps | Phase 23 (this phase) | More faithful to AMP, cleaner visual integration |
| MIN_HEIGHT = 3 (1 content line) | MIN_HEIGHT = 5 (3 content lines) | Phase 23 (this phase) | Matches AMP golden files |

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | AMP's `buildBorderTransparentTextWidget` uses background-color matching to visually replace border chars (not actual gap-aware drawing) | Architecture Patterns | Low -- D-01 mandates genuine replacement regardless of AMP's technique |
| A2 | Shimmer animation at 30 FPS with speed=2 provides acceptable visual quality | Animation section | Low -- FPS/speed are Claude's Discretion per CONTEXT.md; easily tunable |
| A3 | `bottomGridUserHeight` should be session-only (not persisted across sessions) | Drag-Resize section | Low -- Claude's Discretion per CONTEXT.md; simpler implementation |
| A4 | The L63 footer line in streaming/HITL goldens is a SEPARATE rendering surface from InputArea | Golden Breakdown | Medium -- if wrong, bottom-left border needs different content mapping. But D-06 is locked and takes precedence |
| A5 | `wcwidth` from flitter-core is the correct function for display width measurement (equivalent to AMP's `W8()`) | Code Examples | Low -- wcwidth is standard for terminal character width |

## Open Questions

1. **Screen height for maxHeight calculation**
   - What we know: Current code hardcodes `Math.floor(50 / 2)`. AMP uses actual screen dimensions.
   - What's unclear: How to access actual terminal height from within InputAreaState's build method.
   - Recommendation: Use `WidgetsBinding.instance.screenSize?.height` or pass screen height as a prop from AppShell.

2. **Exact font/color for `─` separators between border text segments**
   - What we know: AMP uses the border color for `──` separators between text segments (e.g., `smart──!─77─skills`). The golden files show continuous `─` characters.
   - What's unclear: Whether the `─` chars between text segments should match the border color or the text color.
   - Recommendation: Use border color (brightBlack) for separators, matching the surrounding border line.

3. **Handling truncation when content exceeds available width**
   - What we know: AMP's `buildDisplayText` method truncates path display based on available width. Width is computed as `totalWidth - leftOverlayWidth - rightOverlayWidth - padding`.
   - What's unclear: Whether to truncate left content, right content, or both when the total exceeds width.
   - Recommendation: Right-side content (cwd/branch) truncates first (it has `shortenPath` with maxLen). Left-side content truncates second. Mode/skills on top-right are compact enough to rarely need truncation.

## Sources

### Primary (HIGH confidence)
- [render-decorated.ts](file:///Users/bytedance/.oh-my-coco/studio/flitter/packages/flitter-core/src/layout/render-decorated.ts) -- RenderDecoratedBox, BoxDecoration, Border, BorderSide
- [paint-context.ts L263-398](file:///Users/bytedance/.oh-my-coco/studio/flitter/packages/flitter-core/src/scheduler/paint-context.ts#L263-L398) -- drawBorder, drawBorderSides implementation
- [border-painter.ts](file:///Users/bytedance/.oh-my-coco/studio/flitter/packages/flitter-core/src/painting/border-painter.ts) -- BOX_DRAWING constants, BoxDrawingChars interface
- [input-area.ts](file:///Users/bytedance/.oh-my-coco/studio/flitter/packages/flitter-cli/src/widgets/input-area.ts) -- Current InputArea: BorderOverlayText interface, Stack overlay, drag resize
- [header-bar.ts](file:///Users/bytedance/.oh-my-coco/studio/flitter/packages/flitter-cli/src/widgets/header-bar.ts) -- formatTokenCount, formatElapsed, thresholdColor helpers
- [status-bar.ts](file:///Users/bytedance/.oh-my-coco/studio/flitter/packages/flitter-cli/src/widgets/status-bar.ts) -- shortenPath, getFooterText, StatusBarProps
- [app-shell.ts L776-823](file:///Users/bytedance/.oh-my-coco/studio/flitter/packages/flitter-cli/src/widgets/app-shell.ts#L776-L823) -- Column layout composition
- [animation-controller.ts](file:///Users/bytedance/.oh-my-coco/studio/flitter/packages/flitter-core/src/animation/animation-controller.ts) -- AnimationController API
- [ticker.ts](file:///Users/bytedance/.oh-my-coco/studio/flitter/packages/flitter-core/src/animation/ticker.ts) -- Ticker for frame-synchronized timing
- [color.ts](file:///Users/bytedance/.oh-my-coco/studio/flitter/packages/flitter-core/src/core/color.ts) -- Color class, toRgb, blendColor
- [wave-spinner.ts](file:///Users/bytedance/.oh-my-coco/studio/flitter/packages/flitter-core/src/widgets/wave-spinner.ts) -- Reference animation widget pattern

### Secondary (MEDIUM confidence)
- [25_input_area_full.js](file:///Users/bytedance/.oh-my-coco/studio/flitter/tmux-capture/amp-source/25_input_area_full.js) -- AMP obfuscated source, buildBorderTransparentTextWidget, wTT shimmer, IhR RenderObject
- [07a_footer_status_yB.js](file:///Users/bytedance/.oh-my-coco/studio/flitter/tmux-capture/amp-source/07a_footer_status_yB.js) -- AMP footer status state machine (yB)
- [input-area-top-right-builder.js](file:///Users/bytedance/.oh-my-coco/studio/flitter/tmux-capture/amp-source/input-area-top-right-builder.js) -- AMP top-right builder (mode + skills)
- [input-area-bottom-right-builder.js](file:///Users/bytedance/.oh-my-coco/studio/flitter/tmux-capture/amp-source/input-area-bottom-right-builder.js) -- AMP bottom-right builder (cwd/branch)
- [plain-63x244.golden (welcome)](file:///Users/bytedance/.oh-my-coco/studio/flitter/tmux-capture/screens/welcome/plain-63x244.golden) L58-62 -- Golden reference for InputArea borders
- [plain-63x244.golden (conversation-reply)](file:///Users/bytedance/.oh-my-coco/studio/flitter/tmux-capture/screens/conversation-reply/plain-63x244.golden) L58-62 -- Golden with context usage
- [plain-63x244.golden (streaming-with-subagent)](file:///Users/bytedance/.oh-my-coco/studio/flitter/tmux-capture/screens/streaming-with-subagent/plain-63x244.golden) L58-63 -- Golden streaming state
- [plain-63x244.golden (hitl-confirmation)](file:///Users/bytedance/.oh-my-coco/studio/flitter/tmux-capture/screens/hitl-confirmation/plain-63x244.golden) L58-63 -- Golden approval state

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- entirely internal packages, all code verified via codebase reading
- Architecture: HIGH -- border rendering pipeline fully traced, AMP source analyzed, golden files character-matched
- Pitfalls: HIGH -- based on direct code analysis and identified edge cases
- Animation: MEDIUM -- AnimationController/Ticker verified, but lerpColor needs creation and shimmer FPS/duration are assumed

**Research date:** 2026-04-06
**Valid until:** 2026-05-06 (stable internal codebase, no external dependencies)
