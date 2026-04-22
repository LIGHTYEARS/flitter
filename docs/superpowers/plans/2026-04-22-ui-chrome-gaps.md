# UI Chrome Gaps Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close 6 categories of visual gaps (A–F) between flitter-cli and the amp reference, bringing the terminal chrome to pixel-parity with amp's golden captures.

**Architecture:** Each gap is an independent task touching 1–3 files. The unified input box (Gap B) is the largest change — it merges StatusBar overlay data into InputField's border rendering, matching amp's `YrT` + `Rt` pattern. Gap A (bottom chrome) restructures the `build()` layout in ThreadStateWidget to remove separator lines. All other gaps are isolated widget-level fixes.

**Tech Stack:** TypeScript, @flitter/tui widget primitives (Column, Row, RichText, Container, Padding, etc.), bun test runner.

---

## File Structure

| File | Responsibility | Tasks |
|------|---------------|-------|
| `packages/cli/src/widgets/input-field.ts` | Text input box with border overlays | B |
| `packages/cli/src/widgets/status-bar.ts` | ~~Standalone 3-row bordered widget~~ → border overlay data provider | B, F |
| `packages/cli/src/widgets/thread-state-widget.ts` | Layout: remove separators, mount welcome screen, add bottom status line, wire StatusBar data | A, C, D, F |
| `packages/cli/src/widgets/conversation-view.ts` | Remove assistant prefix, add global 2-space indent, render individual activity tools | E |
| `packages/cli/src/widgets/display-items.ts` | Add `path`/`args` fields to ActivityAction | E |
| `packages/cli/src/widgets/bottom-status-line.ts` | **NEW** — wave spinner + status text (1-row widget) | C |
| `packages/cli/src/widgets/__tests__/input-field-border.test.ts` | **NEW** — border overlay rendering tests | B |
| `packages/cli/src/widgets/__tests__/bottom-status-line.test.ts` | **NEW** — status line state machine tests | C |
| `packages/cli/src/widgets/__tests__/welcome-screen-mount.test.ts` | **NEW** — welcome screen mounting tests | D |
| `packages/cli/src/widgets/__tests__/conversation-layout.test.ts` | **NEW** — indent, prefix removal, individual tool rendering tests | E |
| `packages/cli/src/widgets/__tests__/status-data-wiring.test.ts` | **NEW** — StatusBar data population tests | F |

---

## Task 1: Gap A — Remove Bottom Chrome Separators

**Goal:** Remove the two `SizedBox` separator rows (`"─".repeat(width)`) between ConversationView ↔ StatusBar ↔ InputField. Amp has no separator lines — the input box border itself serves as the visual separator.

**Files:**
- Modify: `packages/cli/src/widgets/thread-state-widget.ts:541-587`

**Before:**
```
ConversationView
────────────────── (SizedBox separator)
╭─ StatusBar ─────╮
│ model  status   │
╰─────────────────╯
────────────────── (SizedBox separator)
┌─ InputField ────┐
│                 │
└─────────────────┘
```

**After:**
```
ConversationView
╭─11% of 300k──smart──!─77─skills─╮
│ > type here...                   │
│                                  │
╰─────── ~/workspace (main) ──────╯
≋ Running tools... Esc to cancel
```

- [ ] **Step 1: Write the failing test**

Create `packages/cli/src/widgets/__tests__/chrome-layout.test.ts`:

```typescript
import { describe, expect, it } from "bun:test";

/**
 * Verify the ThreadStateWidget build() layout structure:
 * - No SizedBox separators between main sections
 * - Column children are: [mainContent, StatusBar, InputField, BottomStatusLine]
 *
 * Since ThreadStateWidget requires live subscriptions, we test the layout
 * structure declaratively by checking that the separator pattern is absent
 * from the source code.
 */
describe("ThreadStateWidget chrome layout", () => {
  it("should not contain separator SizedBox between StatusBar and InputField", async () => {
    const src = await Bun.file(
      "packages/cli/src/widgets/thread-state-widget.ts",
    ).text();
    // The old pattern: SizedBox with "─".repeat — should be gone
    const separatorPattern = /new SizedBox\(\{[\s\S]*?"─"\.repeat/;
    expect(separatorPattern.test(src)).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd /Users/bytedance/workspace/flitter && bun test packages/cli/src/widgets/__tests__/chrome-layout.test.ts`
Expected: FAIL — the separator SizedBox still exists at lines 544-548 and 567-570.

- [ ] **Step 3: Remove separator SizedBoxes from build()**

In `packages/cli/src/widgets/thread-state-widget.ts`, replace the Column children block (lines 541-587). Remove the two `SizedBox` separators:

```typescript
    return new Column({
      children: [
        mainContent,
        // StatusBar — now rendered as input box border overlays (Task 2/6)
        // For now keep StatusBar as a standalone widget until Task 2 merges it
        new StatusBar({
          state: {
            modelName: modelName ?? "unknown",
            inferenceState: this._inferenceState,
            hasStartedStreaming: this._hasStartedStreaming,
            tokenUsage: {
              inputTokens: this._totalInputTokens,
              outputTokens: this._totalOutputTokens,
              maxInputTokens: resolveModel(modelName ?? "")?.contextWindow ?? 200000,
            },
            compactionState: this._compactionState,
            runningToolCount: this._runningToolCount,
            waitingForApproval: this._waitingForApproval,
          },
        }),
        // Input box or approval dialog
        this._pendingApproval
          ? new ApprovalWidget({
              request: this._pendingApproval,
              onRespond: (toolUseId, response) => {
                threadWorker.userRespondToApproval?.(toolUseId, response);
                this.setState(() => {
                  this._pendingApproval = null;
                  this._waitingForApproval = false;
                });
              },
            })
          : new InputField({ onSubmit, promptHistory: this._promptHistory }),
      ],
    });
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd /Users/bytedance/workspace/flitter && bun test packages/cli/src/widgets/__tests__/chrome-layout.test.ts`
Expected: PASS

- [ ] **Step 5: Also remove the `separatorWidth` variable** (lines 495-501) since it's no longer used.

- [ ] **Step 6: Commit**

```bash
git add packages/cli/src/widgets/thread-state-widget.ts packages/cli/src/widgets/__tests__/chrome-layout.test.ts
git commit -m "fix(ui): remove separator SizedBoxes between StatusBar and InputField

逆向: amp has no separator lines — the input box border itself
serves as the visual separator between conversation and input areas.

Closes Gap A from UI chrome analysis."
```

---

## Task 2: Gap B — Unified Input Box with Border Overlays

**Goal:** Transform InputField from square-cornered plain box into amp's unified input box with rounded corners, metadata embedded in top/bottom borders, and fixed 3-row height.

**Amp reference:**
- `YrT` class (`text_rendering.js:2379-2496`): accepts `overlayTexts: Array<{child, position}>` where position is `"top-left"`, `"top-right"`, `"bottom-left"`, `"bottom-right"`
- `Rt` (`jetbrains_wizard.js:1-175`): border overlay container that positions text at top/bottom edges
- Corner chars: `╭` (U+256D), `╮` (U+256E), `╰` (U+2570), `╯` (U+256F)
- Fixed height: `maxHeight` prop controls editor area (amp uses 3 content rows)
- Border metadata: `"11% of 300k"` top-left, `"smart──!─77─skills"` top-right, `"~/workspace (main)"` bottom-right

**Files:**
- Modify: `packages/cli/src/widgets/input-field.ts:82-293`
- Test: `packages/cli/src/widgets/__tests__/input-field-border.test.ts`

- [ ] **Step 1: Write the failing test**

Create `packages/cli/src/widgets/__tests__/input-field-border.test.ts`:

```typescript
import { describe, expect, it } from "bun:test";

describe("InputField border rendering", () => {
  it("should use rounded corner characters", async () => {
    const src = await Bun.file(
      "packages/cli/src/widgets/input-field.ts",
    ).text();
    // Rounded corners: ╭ ╮ ╰ ╯
    expect(src).toContain("\\u256D"); // ╭ top-left
    expect(src).toContain("\\u256E"); // ╮ top-right
    expect(src).toContain("\\u2570"); // ╰ bottom-left
    expect(src).toContain("\\u256F"); // ╯ bottom-right
    // Should NOT contain square corners
    expect(src).not.toContain("\\u250C"); // ┌
    expect(src).not.toContain("\\u2510"); // ┐
    expect(src).not.toContain("\\u2514"); // └
    expect(src).not.toContain("\\u2518"); // ┘
  });

  it("should have fixed 3-row content height", async () => {
    const src = await Bun.file(
      "packages/cli/src/widgets/input-field.ts",
    ).text();
    // Should use fixed height of 3, not dynamic Math.min(5, ...)
    expect(src).not.toMatch(/Math\.min\(5/);
    expect(src).toMatch(/height:\s*3/);
  });

  it("should accept overlay text config", async () => {
    const src = await Bun.file(
      "packages/cli/src/widgets/input-field.ts",
    ).text();
    // InputFieldConfig should have overlayTexts or borderOverlays property
    expect(src).toMatch(/overlayTexts|borderOverlays|topLeftLabel|topRightLabel/);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd /Users/bytedance/workspace/flitter && bun test packages/cli/src/widgets/__tests__/input-field-border.test.ts`
Expected: FAIL — corners are square (U+250C/U+2510/U+2514/U+2518), height is dynamic `Math.min(5, ...)`, no overlay support.

- [ ] **Step 3: Add overlay config to InputFieldConfig**

In `packages/cli/src/widgets/input-field.ts`, extend the config interface (around line 82):

```typescript
export interface InputFieldConfig {
  /** 提交回调 */
  onSubmit: (text: string) => void;
  /** 占位符文本 */
  placeholder?: string;
  /** 历史记录导航 (optional) */
  promptHistory?: import("./prompt-history.js").PromptHistory;
  /** Override width for border rendering (default: derived from MediaQuery or 78) */
  width?: number;
  /**
   * Border overlay labels embedded in box borders.
   * 逆向: YrT overlayTexts (text_rendering.js:2395) + Rt (jetbrains_wizard.js:1-175)
   */
  topLeftLabel?: string;
  topRightLabel?: string;
  bottomLeftLabel?: string;
  bottomRightLabel?: string;
}
```

- [ ] **Step 4: Replace border rendering in build()**

Replace the border section (lines 263-292) with rounded corners, fixed 3-row height, and overlay embedding:

```typescript
    // 计算固定高度: amp uses fixed 3-row editor area
    // 逆向: YrT maxHeight prop (text_rendering.js:2395)
    const contentHeight = 3;

    // 边框字符 — 逆向: qw._paintBorder() uses rounded corners ╭╮╰╯
    const borderInnerWidth = this.widget.config.width ?? terminalWidth - 2;

    // ── Top border with overlay labels ──
    // 逆向: Rt._buildOverlayWidgets (jetbrains_wizard.js:32-175)
    // Format: ╭─{topLeft}───...───{topRight}─╮
    const topLeft = this.widget.config.topLeftLabel ?? "";
    const topRight = this.widget.config.topRightLabel ?? "";
    const topLeftStr = topLeft ? `${topLeft}\u2500` : "";
    const topRightStr = topRight ? `\u2500${topRight}` : "";
    const topFillLen = Math.max(
      0,
      borderInnerWidth - topLeftStr.length - topRightStr.length,
    );
    const topBorder = `\u256D\u2500${topLeftStr}${"\u2500".repeat(topFillLen)}${topRightStr}\u2500\u256E`;

    // ── Bottom border with overlay labels ──
    const bottomLeft = this.widget.config.bottomLeftLabel ?? "";
    const bottomRight = this.widget.config.bottomRightLabel ?? "";
    const bottomLeftStr = bottomLeft ? `${bottomLeft}\u2500` : "";
    const bottomRightStr = bottomRight ? `\u2500${bottomRight}` : "";
    const bottomFillLen = Math.max(
      0,
      borderInnerWidth - bottomLeftStr.length - bottomRightStr.length,
    );
    const bottomBorder = `\u2570\u2500${bottomLeftStr}${"\u2500".repeat(bottomFillLen)}${bottomRightStr}\u2500\u256F`;

    return new Column({
      mainAxisSize: "min",
      children: [
        // 顶部边框: ╭─{overlays}─╮
        new RichText({
          text: new TextSpan({ text: topBorder, style: borderStyle }),
        }),
        // 内容区 (带 1 列左右 padding, 固定 3 行高)
        new Padding({
          padding: EdgeInsets.symmetric({ horizontal: 1 }),
          child: new SizedBox({
            height: contentHeight,
            child: contentWidget,
          }),
        }),
        // 底部边框: ╰─{overlays}─╯
        new RichText({
          text: new TextSpan({ text: bottomBorder, style: borderStyle }),
        }),
      ],
    });
```

- [ ] **Step 5: Run test to verify it passes**

Run: `cd /Users/bytedance/workspace/flitter && bun test packages/cli/src/widgets/__tests__/input-field-border.test.ts`
Expected: PASS

- [ ] **Step 6: Update ThreadStateWidget to pass overlay labels**

In `packages/cli/src/widgets/thread-state-widget.ts`, update the InputField construction (around line 585) to pass StatusBar data as border overlays:

```typescript
        : new InputField({
            onSubmit,
            promptHistory: this._promptHistory,
            topLeftLabel: this._buildTopLeftLabel(),
            topRightLabel: this._buildTopRightLabel(),
            bottomRightLabel: this._buildBottomRightLabel(),
          }),
```

Add helper methods to `ThreadStateWidgetState` (before `build()`):

```typescript
  /**
   * Build top-left border label: "{percent}% of {max}".
   * 逆向: chunk-004.js:24704-24708 (XM token formatting)
   */
  private _buildTopLeftLabel(): string {
    const maxTokens = resolveModel(this.widget.config.modelName ?? "")?.contextWindow ?? 200000;
    const totalUsed = this._totalInputTokens + this._totalOutputTokens;
    if (maxTokens <= 0) return "";
    const pct = Math.round((totalUsed / maxTokens) * 100);
    const maxStr = maxTokens >= 1000 ? `${Math.round(maxTokens / 1000)}k` : `${maxTokens}`;
    return `${pct}% of ${maxStr}`;
  }

  /**
   * Build top-right border label: "{mode}──!─{skills}─skills".
   * 逆向: chunk-006.js:37846-37867 (skills count in prompt bar)
   */
  private _buildTopRightLabel(): string {
    // Mode name from config — default to "smart"
    const mode = "smart"; // TODO: wire from config when agent mode is tracked
    return `${mode}`;
  }

  /**
   * Build bottom-right border label: "{cwd} ({branch})".
   * 逆向: chunk-006.js:37949-37963 (bottom-right cwd + git branch)
   */
  private _buildBottomRightLabel(): string {
    // Will be wired in Task 6 (Gap F)
    return "";
  }
```

- [ ] **Step 7: Run all tests**

Run: `cd /Users/bytedance/workspace/flitter && bun test packages/cli/src/widgets/__tests__/`
Expected: All tests pass (no regressions from border changes).

- [ ] **Step 8: Commit**

```bash
git add packages/cli/src/widgets/input-field.ts packages/cli/src/widgets/thread-state-widget.ts packages/cli/src/widgets/__tests__/input-field-border.test.ts
git commit -m "feat(ui): unified input box with rounded corners and border overlays

逆向: YrT (text_rendering.js:2379-2496) + Rt (jetbrains_wizard.js:1-175)
- Replace square corners ┌┐└┘ with rounded ╭╮╰╯
- Fixed 3-row content height (was dynamic 1-5)
- Add topLeftLabel/topRightLabel/bottomRightLabel overlay support
- Embed context percent + mode label in top border

Closes Gap B from UI chrome analysis."
```

---

## Task 3: Gap C — Bottom Status Line with Wave Spinner

**Goal:** Add a 1-row status line below the input box showing a wave animation + status text + "Esc to cancel" hint during inference.

**Amp reference:**
- `IZT` widget (`jetbrains_wizard.js:681-708`): `height: 1`, full width
- Wave spinner frames: `uIT = [" ", "∼", "≈", "≋", "≈", "∼"]` at 200ms interval (`data_structures.js:76`)
- Status text: `HE0()` maps `agentLoopState` → "Running tools...", "Streaming response...", etc.
- Hint text: `"Esc"` in keybind color + `" to cancel"` in dim

**Files:**
- Create: `packages/cli/src/widgets/bottom-status-line.ts`
- Modify: `packages/cli/src/widgets/thread-state-widget.ts` (mount it)
- Test: `packages/cli/src/widgets/__tests__/bottom-status-line.test.ts`

- [ ] **Step 1: Write the failing test**

Create `packages/cli/src/widgets/__tests__/bottom-status-line.test.ts`:

```typescript
import { describe, expect, it } from "bun:test";

describe("BottomStatusLine", () => {
  it("module should export BottomStatusLine class", async () => {
    const mod = await import("../bottom-status-line.js");
    expect(mod.BottomStatusLine).toBeDefined();
  });

  it("wave spinner frames should match amp reference", async () => {
    const mod = await import("../bottom-status-line.js");
    expect(mod.WAVE_FRAMES).toEqual([" ", "\u223C", "\u2248", "\u224B", "\u2248", "\u223C"]);
  });

  it("deriveBottomStatus should map inference states correctly", async () => {
    const mod = await import("../bottom-status-line.js");
    expect(mod.deriveBottomStatus("running", false)).toBe("Waiting for response...");
    expect(mod.deriveBottomStatus("running", true)).toBe("Streaming response...");
    expect(mod.deriveBottomStatus("idle", false)).toBeNull();
  });

  it("deriveBottomStatus should show 'Running tools...' when tools are active", async () => {
    const mod = await import("../bottom-status-line.js");
    expect(mod.deriveBottomStatus("running", true, 2)).toBe("Running tools...");
  });

  it("deriveBottomStatus should show 'Waiting for approval...' when approval pending", async () => {
    const mod = await import("../bottom-status-line.js");
    expect(mod.deriveBottomStatus("running", true, 0, true)).toBe("Waiting for approval...");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd /Users/bytedance/workspace/flitter && bun test packages/cli/src/widgets/__tests__/bottom-status-line.test.ts`
Expected: FAIL — module does not exist.

- [ ] **Step 3: Create bottom-status-line.ts**

Create `packages/cli/src/widgets/bottom-status-line.ts`:

```typescript
/**
 * BottomStatusLine — 1-row status line below the input box.
 *
 * Shows wave spinner animation + status text + "Esc to cancel" hint
 * during inference. Hidden (empty SizedBox) when idle.
 *
 * 逆向: IZT (jetbrains_wizard.js:681-708)
 *   - Wave spinner: xZT/fZT (misc_utils.js:1886-1930)
 *   - Frames: uIT = [" ", "∼", "≈", "≋", "≈", "∼"] (data_structures.js:76)
 *   - Interval: ME0 = 200ms (2026_tail_anonymous.js:20786)
 *   - Status text: HE0() state → message map
 *
 * @module
 */

import type { BuildContext, Widget } from "@flitter/tui";
import {
  Color,
  RichText,
  Row,
  SizedBox,
  State,
  StatefulWidget,
  TextSpan,
  TextStyle,
} from "@flitter/tui";

// ── Wave spinner frames (逆向: uIT, data_structures.js:76) ──

/** Wave animation frames — unicode tilde variants */
export const WAVE_FRAMES = [" ", "\u223C", "\u2248", "\u224B", "\u2248", "\u223C"];

/** Animation interval in ms (逆向: ME0 = 200, 2026_tail_anonymous.js:20786) */
const WAVE_INTERVAL_MS = 200;

// ── Colors ──

const PRIMARY_COLOR = Color.rgb(0x7a, 0xa2, 0xf7);
const MUTED_COLOR = Color.rgb(0x56, 0x5f, 0x89);
const KEYBIND_COLOR = Color.rgb(0xe0, 0xaf, 0x68);

// ── Status derivation (逆向: HE0, modules/2483_unknown_HE0.js) ──

/**
 * Map inference state to status text.
 *
 * 逆向: HE0() maps agentLoopState to user-visible status:
 * - "working" → "Waiting for response..."
 * - "streaming" → "Streaming response..."
 * - "tool_use"/"running_tools" → "Running tools..."
 * - "awaiting_approval" → "Waiting for approval..."
 * - "idle" → null
 */
export function deriveBottomStatus(
  inferenceState: "idle" | "running",
  hasStartedStreaming: boolean,
  runningToolCount = 0,
  waitingForApproval = false,
): string | null {
  if (inferenceState === "idle") return null;
  if (waitingForApproval) return "Waiting for approval...";
  if (runningToolCount > 0) return "Running tools...";
  if (hasStartedStreaming) return "Streaming response...";
  return "Waiting for response...";
}

// ── Widget ──

export interface BottomStatusLineConfig {
  inferenceState: "idle" | "running";
  hasStartedStreaming: boolean;
  runningToolCount: number;
  waitingForApproval: boolean;
}

export class BottomStatusLine extends StatefulWidget {
  readonly config: BottomStatusLineConfig;
  constructor(config: BottomStatusLineConfig) {
    super();
    this.config = config;
  }
  createState() {
    return new _BottomStatusLineState();
  }
}

class _BottomStatusLineState extends State<BottomStatusLine> {
  private _frameIndex = 0;
  private _timer: ReturnType<typeof setInterval> | null = null;

  initState(): void {
    super.initState();
    this._startAnimation();
  }

  dispose(): void {
    this._stopAnimation();
    super.dispose();
  }

  didUpdateWidget(oldWidget: BottomStatusLine): void {
    super.didUpdateWidget(oldWidget);
    const wasActive = deriveBottomStatus(
      oldWidget.config.inferenceState,
      oldWidget.config.hasStartedStreaming,
      oldWidget.config.runningToolCount,
      oldWidget.config.waitingForApproval,
    );
    const isActive = deriveBottomStatus(
      this.widget.config.inferenceState,
      this.widget.config.hasStartedStreaming,
      this.widget.config.runningToolCount,
      this.widget.config.waitingForApproval,
    );
    if (!wasActive && isActive) this._startAnimation();
    if (wasActive && !isActive) this._stopAnimation();
  }

  private _startAnimation(): void {
    if (this._timer) return;
    this._timer = setInterval(() => {
      this.setState(() => {
        this._frameIndex = (this._frameIndex + 1) % WAVE_FRAMES.length;
      });
    }, WAVE_INTERVAL_MS);
  }

  private _stopAnimation(): void {
    if (this._timer) {
      clearInterval(this._timer);
      this._timer = null;
      this._frameIndex = 0;
    }
  }

  build(_context: BuildContext): Widget {
    const { inferenceState, hasStartedStreaming, runningToolCount, waitingForApproval } =
      this.widget.config;
    const statusText = deriveBottomStatus(
      inferenceState,
      hasStartedStreaming,
      runningToolCount,
      waitingForApproval,
    );

    if (!statusText) {
      return new SizedBox({ height: 1, width: 0 });
    }

    const spinnerChar = WAVE_FRAMES[this._frameIndex];
    const children: TextSpan[] = [
      // Wave spinner character
      new TextSpan({
        text: `${spinnerChar} `,
        style: new TextStyle({ foreground: PRIMARY_COLOR }),
      }),
      // Status text
      new TextSpan({
        text: statusText,
        style: new TextStyle({ foreground: MUTED_COLOR, dim: true }),
      }),
    ];

    // "Esc to cancel" hint when not waiting for approval
    // 逆向: UE0("cancel-key-pressed") → "Esc" (keybind) + " to cancel" (dim)
    if (!waitingForApproval) {
      children.push(
        new TextSpan({
          text: " ",
          style: new TextStyle({ foreground: MUTED_COLOR }),
        }),
        new TextSpan({
          text: "Esc",
          style: new TextStyle({ foreground: KEYBIND_COLOR }),
        }),
        new TextSpan({
          text: " to cancel",
          style: new TextStyle({ foreground: MUTED_COLOR, dim: true }),
        }),
      );
    }

    return new SizedBox({
      height: 1,
      child: new Row({
        children: [
          new RichText({ text: new TextSpan({ children }) }),
        ],
      }),
    });
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd /Users/bytedance/workspace/flitter && bun test packages/cli/src/widgets/__tests__/bottom-status-line.test.ts`
Expected: PASS

- [ ] **Step 5: Mount BottomStatusLine in ThreadStateWidget**

In `packages/cli/src/widgets/thread-state-widget.ts`:

Add import at the top:
```typescript
import { BottomStatusLine } from "./bottom-status-line.js";
```

Add BottomStatusLine as the last child in the Column (after InputField/ApprovalWidget):

```typescript
        // Bottom status line — 逆向: IZT (jetbrains_wizard.js:681-708)
        new BottomStatusLine({
          inferenceState: this._inferenceState,
          hasStartedStreaming: this._hasStartedStreaming,
          runningToolCount: this._runningToolCount,
          waitingForApproval: this._waitingForApproval,
        }),
```

- [ ] **Step 6: Run all tests**

Run: `cd /Users/bytedance/workspace/flitter && bun test packages/cli/src/widgets/__tests__/`
Expected: All tests pass.

- [ ] **Step 7: Commit**

```bash
git add packages/cli/src/widgets/bottom-status-line.ts packages/cli/src/widgets/thread-state-widget.ts packages/cli/src/widgets/__tests__/bottom-status-line.test.ts
git commit -m "feat(ui): add bottom status line with wave spinner

逆向: IZT (jetbrains_wizard.js:681-708)
- Wave spinner frames: [' ', '∼', '≈', '≋', '≈', '∼'] at 200ms
- Status text: deriveBottomStatus() maps inference state
- 'Esc to cancel' hint in keybind color
- Hidden (SizedBox) when idle

Closes Gap C from UI chrome analysis."
```

---

## Task 4: Gap D — Mount Welcome Screen

**Goal:** Display the existing `WelcomeScreen` widget when the thread has no messages, replacing the "No messages yet" placeholder text.

**Amp reference:**
- `jetbrains_wizard.js:4961-5006`: `isTranscriptEmpty() ? brT (welcome) : G8R (conversation)`
- Transition: as soon as `items.length > 0`, switches to ConversationView

**Files:**
- Modify: `packages/cli/src/widgets/thread-state-widget.ts:511-521`
- Test: `packages/cli/src/widgets/__tests__/welcome-screen-mount.test.ts`

- [ ] **Step 1: Write the failing test**

Create `packages/cli/src/widgets/__tests__/welcome-screen-mount.test.ts`:

```typescript
import { describe, expect, it } from "bun:test";

describe("Welcome screen mounting", () => {
  it("ThreadStateWidget should import WelcomeScreen", async () => {
    const src = await Bun.file(
      "packages/cli/src/widgets/thread-state-widget.ts",
    ).text();
    expect(src).toContain("WelcomeScreen");
  });

  it("ThreadStateWidget should conditionally show WelcomeScreen when items empty", async () => {
    const src = await Bun.file(
      "packages/cli/src/widgets/thread-state-widget.ts",
    ).text();
    // Should have a conditional that checks items.length === 0 or similar
    // and renders WelcomeScreen instead of ConversationView
    expect(src).toMatch(/items\.length\s*===\s*0|_items\.length\s*===\s*0/);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd /Users/bytedance/workspace/flitter && bun test packages/cli/src/widgets/__tests__/welcome-screen-mount.test.ts`
Expected: FAIL — no WelcomeScreen import or conditional.

- [ ] **Step 3: Add WelcomeScreen conditional to build()**

In `packages/cli/src/widgets/thread-state-widget.ts`:

Add import:
```typescript
import { WelcomeScreen } from "./welcome-screen.js";
```

Replace the conversation scrollable section (around lines 511-521) with a conditional:

```typescript
    // 逆向: jetbrains_wizard.js:4961-5006
    //   isTranscriptEmpty() ? brT (welcome screen) : G8R (conversation view)
    const conversationArea = displayItems.length === 0
      ? new WelcomeScreen({ productName: "Flitter" })
      : new Scrollable({
          controller: this._scrollController,
          viewportBuilder: () =>
            new ConversationView({
              items: displayItems,
              inferenceState: this._inferenceState === "cancelled" ? "idle" : this._inferenceState,
              error: this._error,
            }),
        });
```

Update the `mainContent` block to use `conversationArea`:

```typescript
    const mainContent = toastManager
      ? new Expanded({
          child: new Stack({
            children: [
              conversationArea,
              new Positioned({
                top: 0,
                left: 0,
                right: 0,
                child: new ToastOverlay({ manager: toastManager }),
              }),
            ],
          }),
        })
      : new Expanded({ child: conversationArea });
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd /Users/bytedance/workspace/flitter && bun test packages/cli/src/widgets/__tests__/welcome-screen-mount.test.ts`
Expected: PASS

- [ ] **Step 5: Run all tests for regression check**

Run: `cd /Users/bytedance/workspace/flitter && bun test packages/cli/src/widgets/__tests__/`
Expected: All tests pass.

- [ ] **Step 6: Commit**

```bash
git add packages/cli/src/widgets/thread-state-widget.ts packages/cli/src/widgets/__tests__/welcome-screen-mount.test.ts
git commit -m "feat(ui): mount WelcomeScreen when thread is empty

逆向: jetbrains_wizard.js:4961-5006
- Show WelcomeScreen (ASCII orb + help hints) when items.length === 0
- Switch to ConversationView as soon as first message arrives
- Replaces 'No messages yet' placeholder text

Closes Gap D from UI chrome analysis."
```

---

## Task 5: Gap E — Conversation Layout Fixes

**Goal:** Three sub-fixes: (a) add global 2-space left indent to the conversation area, (b) remove "Assistant: " prefix from assistant messages, (c) render activity tools individually with file paths instead of grouped summaries.

**Amp reference:**
- Global indent: `f8R.build()` (`interactive_widgets.js:2721`) wraps scrollable in `uR padding: left: 2, right: showScrollbar ? 3 : 2, bottom: 1`
- No assistant prefix: amp has no role prefix for assistant messages — only user messages get the `┃` left border
- Individual tools: `x3` wrapper (`misc_utils.js:6280-6357`) renders each tool as `"✓ Read README.md"` — NOT grouped into `"1 read, 2 searches"`

### Sub-task 5a: Global 2-space indent

**Files:**
- Modify: `packages/cli/src/widgets/thread-state-widget.ts` (wrap Scrollable in Padding)

- [ ] **Step 1: Write the failing test**

Create `packages/cli/src/widgets/__tests__/conversation-layout.test.ts`:

```typescript
import { describe, expect, it } from "bun:test";

describe("Conversation layout", () => {
  it("should wrap conversation scrollable in Padding with left:2", async () => {
    const src = await Bun.file(
      "packages/cli/src/widgets/thread-state-widget.ts",
    ).text();
    // Should have Padding import and usage with left: 2
    expect(src).toContain("Padding");
    expect(src).toMatch(/left:\s*2/);
  });

  it("should NOT have 'Assistant: ' prefix in conversation-view", async () => {
    const src = await Bun.file(
      "packages/cli/src/widgets/conversation-view.ts",
    ).text();
    // assistant role config should NOT have a prefix
    expect(src).not.toMatch(/assistant.*prefix:\s*"Assistant/);
  });

  it("should render individual activity tools with file paths", async () => {
    const src = await Bun.file(
      "packages/cli/src/widgets/conversation-view.ts",
    ).text();
    // The activity group widget should render each action individually,
    // not just a summary string
    expect(src).toMatch(/action\.path|action\.detail|toolDetail/);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd /Users/bytedance/workspace/flitter && bun test packages/cli/src/widgets/__tests__/conversation-layout.test.ts`
Expected: FAIL on all three assertions.

- [ ] **Step 3: Add Padding wrapper for global indent**

In `packages/cli/src/widgets/thread-state-widget.ts`:

Add `Padding` and `EdgeInsets` to imports:
```typescript
import {
  Column,
  EdgeInsets,
  Expanded,
  MediaQuery,
  Padding,
  Positioned,
  Scrollable,
  ScrollController,
  SizedBox,
  Stack,
  State,
  StatefulWidget,
  Text,
} from "@flitter/tui";
```

Wrap the Scrollable in Padding (逆向: `f8R.build()` line 2721):

```typescript
    const conversationArea = displayItems.length === 0
      ? new WelcomeScreen({ productName: "Flitter" })
      : new Padding({
          padding: EdgeInsets.only({ left: 2, right: 2, bottom: 1 }),
          child: new Scrollable({
            controller: this._scrollController,
            viewportBuilder: () =>
              new ConversationView({
                items: displayItems,
                inferenceState: this._inferenceState === "cancelled" ? "idle" : this._inferenceState,
                error: this._error,
              }),
          }),
        });
```

### Sub-task 5b: Remove assistant prefix

- [ ] **Step 4: Remove "Assistant: " prefix from ROLE_CONFIG**

In `packages/cli/src/widgets/conversation-view.ts`, change the assistant entry (line 149):

```typescript
const ROLE_CONFIG: Record<string, { prefix: string; color: Color }> = {
  user: { prefix: "You: ", color: PRIMARY_COLOR },
  assistant: { prefix: "", color: ACCENT_COLOR },
  system: { prefix: "System: ", color: SECONDARY_COLOR },
};
```

Also update `_buildMessageItemWidget` (around lines 473-497) to skip the role prefix for assistant messages. Since `prefix` is now `""`, the roleSpan will be empty — but we should also skip the `\n` after an empty prefix:

```typescript
    // Assistant/system messages — role prefix + markdown
    const roleConfig = ROLE_CONFIG[item.role] ?? {
      prefix: `${item.role}: `,
      color: MUTED_TEXT_COLOR,
    };

    const children: TextSpan[] = [];

    // Only add role prefix line if it's non-empty
    // 逆向: amp has NO assistant prefix — only user messages get visual indicator (┃ border)
    if (roleConfig.prefix) {
      children.push(
        new TextSpan({
          text: roleConfig.prefix,
          style: new TextStyle({ bold: true, foreground: roleConfig.color }),
        }),
        new TextSpan({ text: "\n" }),
      );
    }

    const ast = this._parser.parse(item.text);
    const contentSpans = item.isStreaming
      ? this._renderer.renderStreaming(ast)
      : this._renderer.render(ast);

    if (item.images && item.images > 0) {
      children.push(...this._buildImageLabels(item.images));
    }
    children.push(...contentSpans);
```

### Sub-task 5c: Individual activity tool rendering

- [ ] **Step 5: Add `path` and `detail` fields to ActivityAction**

In `packages/cli/src/widgets/display-items.ts`, extend the `ActivityAction` interface (line 77):

```typescript
export interface ActivityAction {
  kind: "read" | "search" | "list";
  toolName: string;
  toolUseId: string;
  status: "done" | "error" | "cancelled" | "in-progress" | "blocked-on-user" | "queued";
  /** File path for Read tools, pattern for Grep, glob for Glob
   * 逆向: B9R (misc_utils.js:7776) — R.input.path, W9R (misc_utils.js:8088) — R.input.pattern */
  path?: string;
  /** Additional detail (e.g., pattern for search, range for read) */
  detail?: string;
}
```

- [ ] **Step 6: Populate path/detail during activity buffering**

In `packages/cli/src/widgets/display-items.ts`, update the activity buffering section (around line 309-317):

```typescript
      if (ACTIVITY_TOOLS[block.name]) {
        // 逆向: yx0 `c()` calls for Read, Grep, Glob, file_tree, etc.
        // Extract path/detail from tool input for individual rendering
        const toolPath = typeof block.input?.file_path === "string"
          ? block.input.file_path as string
          : typeof block.input?.path === "string"
            ? block.input.path as string
            : undefined;
        const toolDetail = typeof block.input?.pattern === "string"
          ? block.input.pattern as string
          : typeof block.input?.glob === "string"
            ? block.input.glob as string
            : undefined;
        activityBuffer.push({
          kind: ACTIVITY_TOOLS[block.name],
          toolName: block.name,
          toolUseId: block.id,
          status:
            status === "rejected-by-user" ? "cancelled" : (status as ActivityAction["status"]),
          path: toolPath,
          detail: toolDetail,
        });
```

- [ ] **Step 7: Update activity group rendering to show individual tools**

In `packages/cli/src/widgets/conversation-view.ts`, replace `_buildActivityGroupWidget` (lines 799-934) to always render individual tool lines instead of a grouped summary:

```typescript
  /**
   * Build individual activity tool widgets.
   *
   * 逆向: x3 wrapper (misc_utils.js:6280-6357) — each tool rendered as:
   *   "✓ Read README.md" or "⣒ Grep pattern in src/"
   * B9R (Read): "✓ Read {path}" with file path in fileReference color
   * W9R (Grep): "✓ Grep {pattern} in {path}" with pattern in command color
   *
   * Replaces the old grouped summary approach.
   */
  private _buildActivityGroupWidget(group: ActivityGroupItem, _itemIndex?: number): Widget {
    // Render each action as an individual line
    // 逆向: x3 (misc_utils.js:6312) — spinnerGlyph + toolName + children (path detail)
    const actionWidgets: Widget[] = [];

    for (const action of group.actions) {
      const spans: TextSpan[] = [];

      // Status icon — 逆向: xW(status) static glyph or animated braille spinner
      if (action.status === "in-progress") {
        spans.push(
          new TextSpan({
            text: `${this._spinner.toBraille()} `,
            style: new TextStyle({ foreground: TOOL_COLOR }),
          }),
        );
      } else {
        const icon = _getActionStatusIcon(action.status);
        const color = _getActionStatusColor(action.status);
        spans.push(
          new TextSpan({
            text: `${icon} `,
            style: new TextStyle({ foreground: color }),
          }),
        );
      }

      // Tool name (bold, tool color) — 逆向: x3 header row toolName
      spans.push(
        new TextSpan({
          text: action.toolName,
          style: new TextStyle({ foreground: TOOL_COLOR, bold: true }),
        }),
      );

      // File path / detail — 逆向: B9R children (file path in fileReference dim underline)
      const toolDetail = action.path || action.detail;
      if (toolDetail) {
        spans.push(
          new TextSpan({
            text: ` ${toolDetail}`,
            style: new TextStyle({ foreground: DIM_COLOR, dim: true }),
          }),
        );
      }

      actionWidgets.push(
        new RichText({
          text: new TextSpan({ children: spans }),
        }),
      );
    }

    return new Column({
      mainAxisSize: "min",
      children: actionWidgets,
    });
  }
```

- [ ] **Step 8: Run test to verify it passes**

Run: `cd /Users/bytedance/workspace/flitter && bun test packages/cli/src/widgets/__tests__/conversation-layout.test.ts`
Expected: PASS

- [ ] **Step 9: Run all tests for regression check**

Run: `cd /Users/bytedance/workspace/flitter && bun test packages/cli/src/widgets/__tests__/`
Expected: All tests pass.

- [ ] **Step 10: Commit**

```bash
git add packages/cli/src/widgets/thread-state-widget.ts packages/cli/src/widgets/conversation-view.ts packages/cli/src/widgets/display-items.ts packages/cli/src/widgets/__tests__/conversation-layout.test.ts
git commit -m "feat(ui): conversation layout — global indent, no assistant prefix, individual tools

逆向: f8R.build() (interactive_widgets.js:2721) — Padding left:2, right:2, bottom:1
逆向: amp has no assistant role prefix — only user messages have ┃ border
逆向: x3/B9R/W9R (misc_utils.js:6280-8127) — each tool rendered individually
- Wrap conversation scrollable in 2-space Padding
- Remove 'Assistant: ' prefix from ROLE_CONFIG
- Add path/detail to ActivityAction interface
- Render each activity tool as individual '✓ Read path' line

Closes Gap E from UI chrome analysis."
```

---

## Task 6: Gap F — Wire StatusBar Data to InputField Overlays

**Goal:** Populate the input box border overlays with real data: context window percent, mode name, skill count, CWD, and git branch.

**Amp reference:**
- Top-left: `"{percent}% of {max}"` context usage (`chunk-004.js:24704-24708`)
- Top-right: `"{mode}──!─{skills}─skills"` (`chunk-006.js:37846-37867`)
- Bottom-right: `"{cwd} ({branch})"` (`chunk-006.js:37949-37963`)

**Files:**
- Modify: `packages/cli/src/widgets/thread-state-widget.ts` (wire data to InputField overlays)
- Modify: `packages/cli/src/widgets/thread-state-widget.ts` (ThreadStateWidgetConfig — add cwdDisplay, gitBranch, skillCount, modeName)
- Modify: `packages/cli/src/modes/interactive.ts` (pass data at call site)
- Test: `packages/cli/src/widgets/__tests__/status-data-wiring.test.ts`

- [ ] **Step 1: Write the failing test**

Create `packages/cli/src/widgets/__tests__/status-data-wiring.test.ts`:

```typescript
import { describe, expect, it } from "bun:test";

describe("StatusBar data wiring", () => {
  it("ThreadStateWidgetConfig should include cwdDisplay field", async () => {
    const src = await Bun.file(
      "packages/cli/src/widgets/thread-state-widget.ts",
    ).text();
    expect(src).toContain("cwdDisplay");
  });

  it("ThreadStateWidgetConfig should include gitBranch field", async () => {
    const src = await Bun.file(
      "packages/cli/src/widgets/thread-state-widget.ts",
    ).text();
    expect(src).toContain("gitBranch");
  });

  it("ThreadStateWidgetConfig should include modeName field", async () => {
    const src = await Bun.file(
      "packages/cli/src/widgets/thread-state-widget.ts",
    ).text();
    // modeName should exist in config (not just in StatusBar state)
    expect(src).toMatch(/modeName\?.*string/);
  });

  it("ThreadStateWidgetConfig should include skillCount field", async () => {
    const src = await Bun.file(
      "packages/cli/src/widgets/thread-state-widget.ts",
    ).text();
    expect(src).toContain("skillCount");
  });

  it("interactive.ts should pass cwdDisplay to ThreadStateWidget", async () => {
    const src = await Bun.file(
      "packages/cli/src/modes/interactive.ts",
    ).text();
    expect(src).toContain("cwdDisplay");
  });

  it("interactive.ts should pass gitBranch to ThreadStateWidget", async () => {
    const src = await Bun.file(
      "packages/cli/src/modes/interactive.ts",
    ).text();
    expect(src).toContain("gitBranch");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd /Users/bytedance/workspace/flitter && bun test packages/cli/src/widgets/__tests__/status-data-wiring.test.ts`
Expected: FAIL — none of these fields exist in ThreadStateWidgetConfig.

- [ ] **Step 3: Extend ThreadStateWidgetConfig**

In `packages/cli/src/widgets/thread-state-widget.ts`, add fields to the config interface (around line 72):

```typescript
export interface ThreadStateWidgetConfig {
  /** 线程存储引用 */
  threadStore: {
    observeThread(
      id: string,
    ): { subscribe(observer: (value: unknown) => void): Subscription } | undefined;
  };
  /** 线程工作器引用 */
  threadWorker: {
    events$: { subscribe(observer: (value: unknown) => void): Subscription };
    userRespondToApproval?(
      toolUseId: string,
      response: { approved: boolean; scope?: string; feedback?: string },
    ): Promise<void>;
  };
  /** 要观察的线程 ID */
  threadId: string;
  /** 用户提交消息的回调 */
  onSubmit: (text: string) => void;
  /** 模型名称 (显示在状态栏) */
  modelName?: string;
  /** Token 计数 (显示在状态栏) */
  tokenCount?: number;
  /** Toast notification manager (optional, for overlay rendering) */
  toastManager?: ToastManager;
  /** Current working directory display string
   * 逆向: chunk-006.js:37949-37963 (bottom-right cwd in prompt bar) */
  cwdDisplay?: string;
  /** Git branch name
   * 逆向: chunk-006.js:36749-36759 (git branch in prompt bar) */
  gitBranch?: string;
  /** Active agent mode name (e.g., "smart", "fast")
   * 逆向: chunk-006.js:37846 (mode label in prompt bar) */
  modeName?: string;
  /** Number of available skills
   * 逆向: chunk-006.js:37867 (skills count in prompt bar) */
  skillCount?: number;
}
```

- [ ] **Step 4: Update _buildTopRightLabel and _buildBottomRightLabel**

Update the helper methods to read from config:

```typescript
  private _buildTopRightLabel(): string {
    const mode = this.widget.config.modeName ?? "smart";
    const skills = this.widget.config.skillCount;
    if (skills != null && skills >= 0) {
      return `${mode}\u2500\u2500!\u2500${skills}\u2500${skills === 1 ? "skill" : "skills"}`;
    }
    return mode;
  }

  private _buildBottomRightLabel(): string {
    const cwd = this.widget.config.cwdDisplay;
    const branch = this.widget.config.gitBranch;
    if (cwd && branch) return `${cwd} (${branch})`;
    if (cwd) return cwd;
    if (branch) return `(${branch})`;
    return "";
  }
```

- [ ] **Step 5: Pass data from interactive.ts**

In `packages/cli/src/modes/interactive.ts`, resolve CWD and git branch and pass to ThreadStateWidget:

Add helper before `launchInteractiveMode`:

```typescript
/** Resolve short CWD display (逆向: chunk-006.js:37949 — basename or ~ prefix) */
function shortCwd(): string {
  const cwd = process.cwd();
  const home = process.env.HOME ?? "";
  if (home && cwd.startsWith(home)) {
    return `~${cwd.slice(home.length)}`;
  }
  return cwd;
}

/** Resolve git branch name (逆向: chunk-006.js:36749 — git rev-parse --abbrev-ref HEAD) */
async function resolveGitBranch(): Promise<string | undefined> {
  try {
    const proc = Bun.spawn(["git", "rev-parse", "--abbrev-ref", "HEAD"], {
      stdout: "pipe",
      stderr: "ignore",
    });
    const text = await new Response(proc.stdout).text();
    return text.trim() || undefined;
  } catch {
    return undefined;
  }
}
```

Then in `launchInteractiveMode`, before the `runApp` call, resolve these:

```typescript
  // Resolve CWD and git branch for prompt bar display
  // 逆向: chunk-006.js:37949-37963 (cwd), 36749-36759 (git branch)
  const cwdDisplay = shortCwd();
  const gitBranch = await resolveGitBranch();
```

And pass to ThreadStateWidget:

```typescript
        child: new ThreadStateWidget({
          threadStore: container.threadStore,
          threadWorker: worker,
          threadId,
          onSubmit: (text: string) => { /* ... existing ... */ },
          modelName: /* ... existing ... */,
          tokenCount: 0,
          toastManager,
          cwdDisplay,
          gitBranch,
          modeName: context.agentMode ?? "smart",
          skillCount: container.skillService?.listSkills?.()?.length,
        }),
```

- [ ] **Step 6: Run test to verify it passes**

Run: `cd /Users/bytedance/workspace/flitter && bun test packages/cli/src/widgets/__tests__/status-data-wiring.test.ts`
Expected: PASS

- [ ] **Step 7: Run all tests for regression check**

Run: `cd /Users/bytedance/workspace/flitter && bun test packages/cli/src/widgets/__tests__/`
Expected: All tests pass.

- [ ] **Step 8: Commit**

```bash
git add packages/cli/src/widgets/thread-state-widget.ts packages/cli/src/modes/interactive.ts packages/cli/src/widgets/__tests__/status-data-wiring.test.ts
git commit -m "feat(ui): wire StatusBar data to input box border overlays

逆向: chunk-006.js:37846-37963 (prompt bar overlay composition)
- Add cwdDisplay, gitBranch, modeName, skillCount to ThreadStateWidgetConfig
- Resolve CWD (~ prefix) and git branch in interactive.ts
- Build top-right label: 'smart──!─77─skills'
- Build bottom-right label: '~/workspace (main)'

Closes Gap F from UI chrome analysis."
```

---

## Task 7: Remove Standalone StatusBar Widget

**Goal:** After Tasks 1, 2, and 6 merge the StatusBar data into InputField's border overlays, the standalone 3-row StatusBar widget is no longer needed in the layout. Remove it from the build() Column.

**Note:** The `StatusBar` class itself stays in the codebase (for potential standalone use or tests), but it's removed from the `ThreadStateWidget.build()` layout.

**Files:**
- Modify: `packages/cli/src/widgets/thread-state-widget.ts:551-565` (remove StatusBar from Column)

- [ ] **Step 1: Write the failing test**

Add to `packages/cli/src/widgets/__tests__/chrome-layout.test.ts`:

```typescript
  it("should not render StatusBar as standalone widget in build()", async () => {
    const src = await Bun.file(
      "packages/cli/src/widgets/thread-state-widget.ts",
    ).text();
    // The build() method should not contain "new StatusBar" as a direct Column child
    // (StatusBar data is now embedded in InputField border overlays)
    const buildBody = src.slice(src.indexOf("build(_context"));
    expect(buildBody).not.toMatch(/new StatusBar\(/);
  });
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd /Users/bytedance/workspace/flitter && bun test packages/cli/src/widgets/__tests__/chrome-layout.test.ts`
Expected: FAIL — `new StatusBar({...})` still in build().

- [ ] **Step 3: Remove StatusBar from build() Column children**

In `packages/cli/src/widgets/thread-state-widget.ts`, remove the StatusBar instantiation from the Column children (approximately lines 551-565). The Column should go directly from `mainContent` to `InputField`/`ApprovalWidget` to `BottomStatusLine`.

Also remove the `StatusBar` import if no other usage remains:
```typescript
// Remove: import { StatusBar } from "./status-bar.js";
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd /Users/bytedance/workspace/flitter && bun test packages/cli/src/widgets/__tests__/chrome-layout.test.ts`
Expected: PASS

- [ ] **Step 5: Run all tests for regression check**

Run: `cd /Users/bytedance/workspace/flitter && bun test packages/cli/src/widgets/__tests__/`
Expected: All tests pass.

- [ ] **Step 6: Commit**

```bash
git add packages/cli/src/widgets/thread-state-widget.ts packages/cli/src/widgets/__tests__/chrome-layout.test.ts
git commit -m "refactor(ui): remove standalone StatusBar from layout

StatusBar data is now embedded in InputField border overlays (Gap B/F).
The standalone 3-row bordered widget is no longer rendered in the
ThreadStateWidget Column layout.

Closes Gap A (final cleanup) from UI chrome analysis."
```

---

## Task 8: Integration Verification — Visual Regression Test

**Goal:** Verify all gaps are closed by comparing flitter-cli golden captures against amp reference captures.

**Files:**
- Test: manual tmux capture comparison

- [ ] **Step 1: Launch flitter-cli in tmux and capture welcome screen**

```bash
tmux new-session -d -s test -x 80 -y 24 "bun run packages/cli/src/index.ts 2>/tmp/flitter-test.log"
sleep 2
tmux capture-pane -t test -p > /tmp/flitter-welcome.txt
```

- [ ] **Step 2: Verify welcome screen shows ASCII orb (Gap D)**

```bash
grep -q "Welcome" /tmp/flitter-welcome.txt || echo "FAIL: No welcome screen"
```

- [ ] **Step 3: Verify input box has rounded corners (Gap B)**

```bash
grep -q "╭" /tmp/flitter-welcome.txt || echo "FAIL: No rounded top-left corner"
grep -q "╯" /tmp/flitter-welcome.txt || echo "FAIL: No rounded bottom-right corner"
```

- [ ] **Step 4: Verify no separator lines (Gap A)**

```bash
# Count lines that are purely ─ characters (separators)
SEPS=$(grep -cE "^─+$" /tmp/flitter-welcome.txt || true)
[ "$SEPS" -eq 0 ] || echo "FAIL: Found $SEPS separator lines"
```

- [ ] **Step 5: Send a test message and capture conversation**

```bash
tmux send-keys -t test "Hello, world" Enter
sleep 3
tmux capture-pane -t test -p > /tmp/flitter-conversation.txt
```

- [ ] **Step 6: Verify no "Assistant: " prefix (Gap E)**

```bash
grep -q "Assistant:" /tmp/flitter-conversation.txt && echo "FAIL: Assistant prefix still present" || echo "PASS: No assistant prefix"
```

- [ ] **Step 7: Verify user message has ┃ border (existing, no regression)**

```bash
grep -q "┃" /tmp/flitter-conversation.txt || echo "FAIL: No user ┃ border marker"
```

- [ ] **Step 8: Clean up**

```bash
tmux kill-session -t test
```

- [ ] **Step 9: Commit golden captures if desired**

```bash
# Optional: save captures for future regression testing
mkdir -p tmux-capture/screens/flitter/post-chrome-fix
cp /tmp/flitter-welcome.txt tmux-capture/screens/flitter/post-chrome-fix/welcome.golden
cp /tmp/flitter-conversation.txt tmux-capture/screens/flitter/post-chrome-fix/conversation.golden
```

---

## Task 9: Update HEALTH.md

**Goal:** Update HEALTH.md to reflect the new test files and UI improvements.

**Files:**
- Modify: `HEALTH.md`

- [ ] **Step 1: Read current HEALTH.md**

- [ ] **Step 2: Update test count and new test files**

Add new test files to the inventory:
- `__tests__/chrome-layout.test.ts`
- `__tests__/input-field-border.test.ts`
- `__tests__/bottom-status-line.test.ts`
- `__tests__/welcome-screen-mount.test.ts`
- `__tests__/conversation-layout.test.ts`
- `__tests__/status-data-wiring.test.ts`

- [ ] **Step 3: Update tech debt section**

Note that the standalone `StatusBar` widget class still exists but is no longer mounted — potential cleanup candidate.

- [ ] **Step 4: Commit**

```bash
git add HEALTH.md
git commit -m "docs: update HEALTH.md for UI chrome gap fixes"
```

---

## Execution Order

Tasks can be parallelized in waves:

**Wave 1 (independent):** Tasks 1, 3, 4 — these don't conflict
**Wave 2 (depends on Wave 1):** Tasks 2, 5 — these build on the layout changes from Task 1
**Wave 3 (depends on Wave 2):** Tasks 6, 7 — these wire data and remove the old StatusBar
**Wave 4 (depends on all):** Tasks 8, 9 — verification and documentation

Within each wave, tasks can run in parallel as subagent dispatches.
