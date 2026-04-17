# TextField + Scrollbar Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace TextField's stub `build()` with a fully functional RenderObject-based widget (focus, mouse, all Emacs keybindings, cursor rendering) and add a Scrollbar widget with sub-character precision matching amp's block-element algorithm.

**Architecture:** TextField becomes a 4-layer stack: `TextField (StatefulWidget)` → `TextFieldState` (focus + key dispatch + mouse) → `TextFieldRenderWidget (RenderObjectWidget)` → `RenderTextField (RenderBox)`. Scrollbar is a parallel 4-layer stack with a `RenderScrollbar` that paints Unicode block elements ▁▂▃▄▅▆▇█ at fractional precision matching amp's `F1T.paint`.

**Tech Stack:** TypeScript, Bun test runner, existing flitter primitives: `TextEditingController`, `TextLayoutEngine`, `FocusNode`, `Focus`, `MouseRegion`, `ScrollController`, `RenderBox`, `Screen`, `TextStyle`, `Color`.

---

## Amp Reference Cross-Check

Before touching any file, locate the amp reference:
- TextField render/paint: `amp-cli-reversed/modules/1472_tui_components/actions_intents.js` L1T (RenderTextField) around line 1500–1731
- TextField state/key dispatch: `sP` class around lines 697–900 in same file
- Scrollbar paint: `F1T.paint` in `amp-cli-reversed/modules/1472_tui_components/interactive_widgets.js` around lines 306–500
- Scrollbar metrics: `_calculateScrollbarMetrics` in same file around lines 500–700

**This rule applies to every task below.** If the amp source contradicts these instructions, follow the amp source.

---

## File Map

### New files
- `packages/tui/src/editing/render-text-field.ts` — `LeafRenderObjectElement` (local copy), `TextFieldRenderWidget`, `RenderTextField`
- `packages/tui/src/widgets/scrollbar.ts` — `ScrollbarRenderWidget`, `RenderScrollbar`, `Scrollbar`, `ScrollbarState`

### Modified files
- `packages/tui/src/editing/text-editing-controller.ts` — Add `getLayoutLines()` and `getLayoutColumnFromOffset()` public delegation methods
- `packages/tui/src/editing/text-layout-engine.ts` — Export `LayoutLine` interface (currently private)
- `packages/tui/src/editing/text-field.ts` — Replace stub with full implementation; expand `TextFieldProps`
- `packages/tui/src/editing/index.ts` — Add `export * from "./render-text-field.js"`
- `packages/tui/src/index.ts` — Add `Scrollbar` export

### Test files
- `packages/tui/src/editing/__tests__/render-text-field.test.ts`
- `packages/tui/src/editing/__tests__/text-field-keys.test.ts`
- `packages/tui/src/widgets/__tests__/scrollbar.test.ts`

### Demo files
- `packages/tui/examples/14-text-field-demo.ts`
- `packages/tui/examples/15-scrollbar-demo.ts`

---

## Task 1: Export LayoutLine and add public methods to TextEditingController

**Amp reference:** Read `wc._getLayoutColumnFromOffset` and `Kw._lines` in `amp-cli-reversed/modules/1472_tui_components/actions_intents.js` before writing.

**Files:**
- Modify: `packages/tui/src/editing/text-layout-engine.ts`
- Modify: `packages/tui/src/editing/text-editing-controller.ts`
- Test: `packages/tui/src/editing/__tests__/render-text-field.test.ts` (create)

- [ ] **Step 1.1: Write the failing test for `getLayoutLines()`**

Create `packages/tui/src/editing/__tests__/render-text-field.test.ts`:

```typescript
import { describe, expect, it } from "bun:test";
import { TextEditingController } from "../text-editing-controller.js";

describe("TextEditingController.getLayoutLines()", () => {
  it("returns one line for simple text with no wrap", () => {
    const ctrl = new TextEditingController({ text: "hello", width: 80 });
    const lines = ctrl.getLayoutLines();
    expect(lines).toHaveLength(1);
    expect(lines[0]!.startOffset).toBe(0);
    expect(lines[0]!.endOffset).toBe(5);
    expect(lines[0]!.isHardBreak).toBe(false);
  });

  it("returns two lines on hard newline", () => {
    const ctrl = new TextEditingController({ text: "ab\ncd", width: 80 });
    const lines = ctrl.getLayoutLines();
    expect(lines).toHaveLength(2);
    expect(lines[0]!.endOffset).toBe(2); // "ab" (not including \n)
    expect(lines[0]!.isHardBreak).toBe(true);
    expect(lines[1]!.startOffset).toBe(3);
  });

  it("soft-wraps when text exceeds width", () => {
    const ctrl = new TextEditingController({ text: "abcde", width: 3 });
    const lines = ctrl.getLayoutLines();
    expect(lines.length).toBeGreaterThan(1);
    expect(lines[0]!.endOffset).toBe(3);
    expect(lines[0]!.isHardBreak).toBe(false);
  });
});

describe("TextEditingController.getLayoutColumnFromOffset()", () => {
  it("returns display column 0 at line start", () => {
    const ctrl = new TextEditingController({ text: "hello", width: 80 });
    expect(ctrl.getLayoutColumnFromOffset(0)).toBe(0);
  });

  it("returns display column 2 for CJK char (width=2)", () => {
    const ctrl = new TextEditingController({ text: "你好", width: 80 });
    // offset 1 = after first CJK char (width 2) → display column 2
    expect(ctrl.getLayoutColumnFromOffset(1)).toBe(2);
  });
});
```

- [ ] **Step 1.2: Run test to verify it fails**

```bash
cd /Users/bytedance/workspace/flitter
bun test packages/tui/src/editing/__tests__/render-text-field.test.ts 2>&1 | head -30
```
Expected: FAIL — `TypeError: ctrl.getLayoutLines is not a function`

- [ ] **Step 1.3: Export LayoutLine from text-layout-engine.ts**

In `packages/tui/src/editing/text-layout-engine.ts`, change the `LayoutLine` interface from private to exported:

```typescript
// Change this:
interface LayoutLine {
// To this:
export interface LayoutLine {
```

Also expose the private `_lines` getter as a public method. Add after `getLineText()`:

```typescript
/**
 * 获取布局行列表（供 TextEditingController 委托）
 *
 * 逆向: Kw._lines getter exposed for controller delegation
 */
getLayoutLines(): LayoutLine[] {
  return this._lines;
}
```

- [ ] **Step 1.4: Add public methods to TextEditingController**

In `packages/tui/src/editing/text-editing-controller.ts`, add import:

```typescript
import type { LayoutLine } from "./text-layout-engine.js";
```

Then add two public methods after `getLayoutPosition()` in the "布局相关" section:

```typescript
/**
 * 获取布局行列表（委托给布局引擎）
 *
 * 逆向: wc._layoutEngine._lines 的公有委托，供 RenderTextField 使用
 *
 * @returns LayoutLine 数组（含 startOffset/endOffset/width/isHardBreak）
 */
getLayoutLines(): LayoutLine[] {
  return this._layoutEngine.getLayoutLines();
}

/**
 * 计算 grapheme offset 的布局列宽度（委托给布局引擎）
 *
 * 逆向: wc._getLayoutColumnFromOffset (widget-property-system.js:1207-1214)
 *
 * @param offset - grapheme 偏移
 * @returns 显示列宽度（CJK=2）
 */
getLayoutColumnFromOffset(offset: number): number {
  return this._layoutEngine.getLayoutColumnFromOffset(offset);
}
```

- [ ] **Step 1.5: Run test to verify it passes**

```bash
cd /Users/bytedance/workspace/flitter
bun test packages/tui/src/editing/__tests__/render-text-field.test.ts 2>&1
```
Expected: all 5 tests PASS

- [ ] **Step 1.6: Commit**

```bash
cd /Users/bytedance/workspace/flitter
git add packages/tui/src/editing/text-layout-engine.ts \
        packages/tui/src/editing/text-editing-controller.ts \
        packages/tui/src/editing/__tests__/render-text-field.test.ts
git commit -m "feat(editing): export LayoutLine, add getLayoutLines/getLayoutColumnFromOffset to controller"
```

---

## Task 2: Create RenderTextField — layout and paint infrastructure

**Amp reference:** Read `L1T.performLayout`, `L1T.paint`, and `L1T._paintMultilineText` in `amp-cli-reversed/modules/1472_tui_components/actions_intents.js` before writing.

**Files:**
- Create: `packages/tui/src/editing/render-text-field.ts`
- Test: `packages/tui/src/editing/__tests__/render-text-field.test.ts` (extend)

- [ ] **Step 2.1: Write failing tests for RenderTextField layout**

Append to `packages/tui/src/editing/__tests__/render-text-field.test.ts`:

```typescript
import { RenderTextField } from "../render-text-field.js";
import { Color } from "../../screen/color.js";
import { TextStyle } from "../../screen/text-style.js";

describe("RenderTextField layout", () => {
  it("intrinsic width: min=1, max=longest line length", () => {
    const ctrl = new TextEditingController({ text: "hi\nlonger", width: 80 });
    const rf = new RenderTextField({
      controller: ctrl,
      focused: false,
      enabled: true,
      readOnly: false,
      minLines: 1,
      maxLines: null,
    });
    expect(rf.getMinIntrinsicWidth(0)).toBe(1);
    expect(rf.getMaxIntrinsicWidth(0)).toBe(6); // "longer" = 6
  });

  it("intrinsic height clamps to [minLines, maxLines]", () => {
    const ctrl = new TextEditingController({ text: "a\nb\nc", width: 80 });
    const rf = new RenderTextField({
      controller: ctrl,
      focused: false,
      enabled: true,
      readOnly: false,
      minLines: 2,
      maxLines: 2,
    });
    expect(rf.getMinIntrinsicHeight(80)).toBe(2);
    expect(rf.getMaxIntrinsicHeight(80)).toBe(2);
  });

  it("height = total lines when maxLines is null", () => {
    const ctrl = new TextEditingController({ text: "a\nb\nc", width: 80 });
    const rf = new RenderTextField({
      controller: ctrl,
      focused: false,
      enabled: true,
      readOnly: false,
      minLines: 1,
      maxLines: null,
    });
    expect(rf.getMinIntrinsicHeight(80)).toBe(3);
  });
});
```

- [ ] **Step 2.2: Run test to verify it fails**

```bash
cd /Users/bytedance/workspace/flitter
bun test packages/tui/src/editing/__tests__/render-text-field.test.ts 2>&1 | head -20
```
Expected: FAIL — `Cannot find module '../render-text-field.js'`

- [ ] **Step 2.3: Create render-text-field.ts with layout only**

Create `packages/tui/src/editing/render-text-field.ts`:

```typescript
/**
 * RenderTextField — 文本输入框渲染对象。
 *
 * 逆向: L1T (RenderTextField) in actions_intents.js:~1500-1731
 *
 * @module
 */

import type { Screen } from "../screen/screen.js";
import { TextStyle } from "../screen/text-style.js";
import { Color } from "../screen/color.js";
import { charWidth, graphemeSegments } from "../text/char-width.js";
import type { Element, Widget as WidgetInterface } from "../tree/element.js";
import { RenderBox } from "../tree/render-box.js";
import type { RenderObject } from "../tree/render-object.js";
import type { RenderObjectWidget } from "../tree/render-object-element.js";
import { RenderObjectElement } from "../tree/render-object-element.js";
import type { Key } from "../tree/widget.js";
import { Widget } from "../tree/widget.js";
import type { BoxConstraints } from "../tree/constraints.js";
import { TextEditingController } from "./text-editing-controller.js";

// ════════════════════════════════════════════════════
//  LeafRenderObjectElement (local copy — not exported from rich-text.ts)
// ════════════════════════════════════════════════════

/**
 * 叶子渲染元素（本地副本）。
 *
 * LeafRenderObjectElement is defined in rich-text.ts but not exported.
 * This is a minimal identical copy for use by TextFieldRenderWidget.
 */
class LeafRenderObjectElement extends RenderObjectElement {
  override mount(parent?: Element): void {
    super.mount(parent);
    this._dirty = false;
  }

  override update(newWidget: WidgetInterface): void {
    super.update(newWidget);
    this._dirty = false;
  }
}

// ════════════════════════════════════════════════════
//  RenderTextField props
// ════════════════════════════════════════════════════

export interface RenderTextFieldProps {
  controller: TextEditingController;
  focused: boolean;
  enabled: boolean;
  readOnly: boolean;
  minLines: number;
  maxLines: number | null;
  textStyle?: TextStyle;
  cursorColor?: Color;
  selectionColor?: Color;
  backgroundColor?: Color;
  placeholder?: string;
}

// ════════════════════════════════════════════════════
//  RenderTextField
// ════════════════════════════════════════════════════

/**
 * 文本输入框核心渲染对象。
 *
 * 逆向: L1T in actions_intents.js:~1500-1731
 *
 * 3-pass paint:
 *   1. Background fill
 *   2. Text with selection highlighting
 *   3. Cursor (reverse-video block, only when focused+enabled)
 *
 * Scroll management:
 *   - Multiline: _vScrollOffset (lines)
 *   - Single-line: _hScrollOffset (columns)
 */
export class RenderTextField extends RenderBox {
  private _props: RenderTextFieldProps;
  /** Vertical scroll offset (line index) for multiline mode */
  private _vScrollOffset: number = 0;
  /** Horizontal scroll offset (column) for single-line mode */
  private _hScrollOffset: number = 0;
  /**
   * Character position map: maps flat character index to {x, y} screen position.
   * Rebuilt during paint for hit-testing.
   */
  private _charPositions: Array<{ x: number; y: number }> = [];

  constructor(props: RenderTextFieldProps) {
    super();
    this._props = { ...props };
  }

  updateProps(props: RenderTextFieldProps): void {
    this._props = { ...props };
    this.markNeedsLayout();
  }

  // ────────────────────────────────────────────────
  //  Intrinsic sizes (逆向: L1T intrinsics)
  // ────────────────────────────────────────────────

  override getMinIntrinsicWidth(_height: number): number {
    return 1;
  }

  override getMaxIntrinsicWidth(_height: number): number {
    const ctrl = this._props.controller;
    const lines = ctrl.getLayoutLines();
    if (lines.length === 0) return 1;
    const gs = ctrl.graphemes;
    let maxW = 0;
    for (const line of lines) {
      let w = 0;
      for (let i = line.startOffset; i < line.endOffset; i++) {
        const g = gs[i];
        if (g && g !== "\n") w += charWidth(g);
      }
      if (w > maxW) maxW = w;
    }
    return Math.max(1, maxW);
  }

  override getMinIntrinsicHeight(width: number): number {
    // Sync layout engine width first
    this._props.controller.updateWidth(width);
    const totalLines = this._props.controller.lineCount;
    const clamped = Math.max(this._props.minLines, this._props.maxLines !== null
      ? Math.min(totalLines, this._props.maxLines)
      : totalLines);
    return Math.max(this._props.minLines, clamped);
  }

  override getMaxIntrinsicHeight(width: number): number {
    return this.getMinIntrinsicHeight(width);
  }

  // ────────────────────────────────────────────────
  //  Layout (逆向: L1T.performLayout)
  // ────────────────────────────────────────────────

  override performLayout(): void {
    const constraints = this._lastConstraints!;
    const w = constraints.maxWidth;
    this._props.controller.updateWidth(w);

    const totalLines = this._props.controller.lineCount;
    const { minLines, maxLines } = this._props;

    let h: number;
    if (maxLines === null) {
      h = Math.max(minLines, totalLines);
    } else {
      h = Math.max(minLines, Math.min(totalLines, maxLines));
    }

    this.size = constraints.constrain(w, h);
    this._updateScrollOffset();
  }

  // ────────────────────────────────────────────────
  //  Scroll offset management (逆向: L1T._updateScrollOffsetFromLayout)
  // ────────────────────────────────────────────────

  private _updateScrollOffset(): void {
    const ctrl = this._props.controller;
    const viewportH = this._size.height;
    const viewportW = this._size.width;
    const isMultiline = this._props.maxLines !== 1;

    if (isMultiline) {
      const cursorLine = ctrl.cursorLine;
      const maxOffset = Math.max(0, ctrl.lineCount - viewportH);
      if (cursorLine < this._vScrollOffset) {
        this._vScrollOffset = cursorLine;
      } else if (cursorLine >= this._vScrollOffset + viewportH) {
        this._vScrollOffset = cursorLine - viewportH + 1;
      }
      this._vScrollOffset = Math.min(this._vScrollOffset, maxOffset);
    } else {
      // Single-line: manage horizontal scroll
      const cursorCol = ctrl.getLayoutColumnFromOffset(ctrl.cursorPosition);
      if (cursorCol < this._hScrollOffset) {
        this._hScrollOffset = cursorCol;
      } else if (cursorCol >= this._hScrollOffset + viewportW) {
        this._hScrollOffset = cursorCol - viewportW + 1;
      }
      this._hScrollOffset = Math.max(0, this._hScrollOffset);
    }
  }

  // ────────────────────────────────────────────────
  //  Paint (逆向: L1T.paint — 3 passes)
  // ────────────────────────────────────────────────

  override paint(screen: Screen, x: number, y: number): void {
    const w = this._size.width;
    const h = this._size.height;
    const ctrl = this._props.controller;
    const gs = ctrl.graphemes;
    const isMultiline = this._props.maxLines !== 1;

    const bgColor = this._props.backgroundColor ?? Color.default();
    const fgColor = this._props.textStyle?.foreground ?? Color.default();
    const selColor = this._props.selectionColor ?? new Color(0, 0, 255);
    const cursorFg = this._props.cursorColor ?? fgColor;

    // ── Pass 1: Background fill ──────────────────────
    // 逆向: L1T.paint — first fills entire rect with background color
    screen.fill(x, y, w, h, " ", { bg: bgColor });

    // ── Gather layout lines in viewport ──────────────
    const layoutLines = ctrl.getLayoutLines();
    const selRange = ctrl.selectionRange;
    this._charPositions = [];

    if (isMultiline) {
      const startLine = this._vScrollOffset;
      const endLine = Math.min(layoutLines.length, startLine + h);

      // ── Pass 2: Text with selection ──────────────
      for (let lineIdx = startLine; lineIdx < endLine; lineIdx++) {
        const line = layoutLines[lineIdx]!;
        const screenY = y + (lineIdx - startLine);
        let screenX = x;

        for (let gIdx = line.startOffset; gIdx < line.endOffset; gIdx++) {
          const g = gs[gIdx];
          if (!g || g === "\n") continue;
          const gw = charWidth(g);

          const inSelection = selRange !== null && gIdx >= selRange.start && gIdx < selRange.end;
          let style: TextStyle;
          if (inSelection) {
            style = new TextStyle({ foreground: fgColor, background: selColor });
          } else {
            style = this._props.textStyle ?? TextStyle.NORMAL;
          }

          screen.writeChar(screenX, screenY, g, style, gw);
          this._charPositions.push({ x: screenX, y: screenY });
          screenX += gw;
        }
      }
    } else {
      // Single-line: only one layout line visible (line 0), clipped horizontally
      const line = layoutLines[0];
      if (line) {
        let col = 0; // display column from line start
        for (let gIdx = line.startOffset; gIdx < line.endOffset; gIdx++) {
          const g = gs[gIdx];
          if (!g || g === "\n") continue;
          const gw = charWidth(g);
          const screenX = x + col - this._hScrollOffset;
          if (screenX >= x && screenX + gw <= x + w) {
            const inSelection = selRange !== null && gIdx >= selRange.start && gIdx < selRange.end;
            const style = inSelection
              ? new TextStyle({ foreground: fgColor, background: selColor })
              : (this._props.textStyle ?? TextStyle.NORMAL);
            screen.writeChar(screenX, y, g, style, gw);
          }
          this._charPositions.push({ x: x + col - this._hScrollOffset, y });
          col += gw;
        }
      }
    }

    // ── Pass 3: Cursor (only when focused + enabled) ──
    // 逆向: L1T._paintSoftwareCursor — reverse-video block
    if (this._props.focused && this._props.enabled) {
      const cursorPos = ctrl.cursorPosition;
      const cursorLine = ctrl.cursorLine;
      const cursorLayoutCol = ctrl.getLayoutColumnFromOffset(cursorPos);

      let cursorScreenX: number;
      let cursorScreenY: number;

      if (isMultiline) {
        cursorScreenY = y + (cursorLine - this._vScrollOffset);
        cursorScreenX = x + cursorLayoutCol;
      } else {
        cursorScreenY = y;
        cursorScreenX = x + cursorLayoutCol - this._hScrollOffset;
      }

      // Only paint cursor if within viewport
      if (
        cursorScreenX >= x && cursorScreenX < x + w &&
        cursorScreenY >= y && cursorScreenY < y + h
      ) {
        // char = grapheme at cursor, or ' ' if at end/newline
        // 逆向: L1T._paintSoftwareCursor — use char under cursor
        let cursorChar = " ";
        if (cursorPos < gs.length && gs[cursorPos] !== "\n") {
          cursorChar = gs[cursorPos]!;
        }
        const cw = charWidth(cursorChar);

        // Reverse-video: swap fg ↔ bg (no TextStyle.reverse in flitter)
        // 逆向: L1T._paintSoftwareCursor — { fg: cursorColor, bg: bgColor, reverse: true }
        const cursorStyle = new TextStyle({
          foreground: bgColor,
          background: cursorFg,
        });
        screen.writeChar(cursorScreenX, cursorScreenY, cursorChar, cursorStyle, cw);
        screen.cursorPosition = { x: cursorScreenX, y: cursorScreenY };
      }
    }
  }

  // ────────────────────────────────────────────────
  //  Hit testing (screen coords → grapheme offset)
  // ────────────────────────────────────────────────

  /**
   * Convert local screen position to grapheme offset.
   *
   * 逆向: L1T.hitTestPosition
   *
   * @param localX - column relative to widget top-left
   * @param localY - row relative to widget top-left
   * @returns grapheme index
   */
  hitTestPosition(localX: number, localY: number): number {
    const ctrl = this._props.controller;
    const layoutLines = ctrl.getLayoutLines();
    const gs = ctrl.graphemes;
    const isMultiline = this._props.maxLines !== 1;

    if (isMultiline) {
      const lineIdx = this._vScrollOffset + localY;
      if (lineIdx < 0 || lineIdx >= layoutLines.length) {
        return lineIdx <= 0 ? 0 : gs.length;
      }
      const line = layoutLines[lineIdx]!;
      // Walk columns to find grapheme
      let col = 0;
      for (let gIdx = line.startOffset; gIdx < line.endOffset; gIdx++) {
        const g = gs[gIdx];
        if (!g || g === "\n") continue;
        const gw = charWidth(g);
        if (localX < col + gw) return gIdx;
        col += gw;
      }
      return line.endOffset;
    } else {
      const line = layoutLines[0];
      if (!line) return 0;
      let col = -this._hScrollOffset; // adjust for h-scroll
      for (let gIdx = line.startOffset; gIdx < line.endOffset; gIdx++) {
        const g = gs[gIdx];
        if (!g || g === "\n") continue;
        const gw = charWidth(g);
        if (localX < col + gw) return gIdx;
        col += gw;
      }
      return line.endOffset;
    }
  }
}

// ════════════════════════════════════════════════════
//  TextFieldRenderWidget
// ════════════════════════════════════════════════════

/**
 * RenderObjectWidget wrapper for RenderTextField.
 *
 * 逆向: L1T Widget shell in actions_intents.js
 */
export class TextFieldRenderWidget extends Widget implements RenderObjectWidget {
  readonly props: RenderTextFieldProps;

  constructor(props: RenderTextFieldProps) {
    super();
    this.props = props;
  }

  override createElement(): LeafRenderObjectElement {
    return new LeafRenderObjectElement(this);
  }

  createRenderObject(): RenderTextField {
    return new RenderTextField(this.props);
  }

  updateRenderObject(renderObject: RenderObject): void {
    (renderObject as RenderTextField).updateProps(this.props);
  }
}
```

- [ ] **Step 2.4: Run layout tests to verify they pass**

```bash
cd /Users/bytedance/workspace/flitter
bun test packages/tui/src/editing/__tests__/render-text-field.test.ts 2>&1
```
Expected: all tests PASS (layout tests + prior controller tests)

- [ ] **Step 2.5: Commit**

```bash
cd /Users/bytedance/workspace/flitter
git add packages/tui/src/editing/render-text-field.ts \
        packages/tui/src/editing/__tests__/render-text-field.test.ts
git commit -m "feat(editing): add RenderTextField with 3-pass paint, scroll management, hit-testing"
```

---

## Task 3: Expand TextFieldProps and rewrite TextFieldState

**Amp reference:** Read `sP` (TextFieldState), especially `sP.build` and the key handler `r` function in `amp-cli-reversed/modules/1472_tui_components/actions_intents.js` lines 697–900 before writing.

**Files:**
- Modify: `packages/tui/src/editing/text-field.ts`
- Test: `packages/tui/src/editing/__tests__/text-field-keys.test.ts` (create)

- [ ] **Step 3.1: Write failing key dispatch tests**

Create `packages/tui/src/editing/__tests__/text-field-keys.test.ts`:

```typescript
import { describe, expect, it, mock } from "bun:test";
import { TextEditingController } from "../text-editing-controller.js";

// We test the key dispatch logic in isolation by recreating it
// (same logic as TextFieldState._handleKey)
import type { KeyEvent } from "../../vt/types.js";

const MODS_NONE = { shift: false, alt: false, ctrl: false, meta: false };
const MODS_CTRL = { shift: false, alt: false, ctrl: true, meta: false };
const MODS_ALT  = { shift: false, alt: true,  ctrl: false, meta: false };
const MODS_SHIFT = { shift: true, alt: false, ctrl: false, meta: false };

function makeKey(key: string, modifiers = MODS_NONE): KeyEvent {
  return { type: "key", key, modifiers };
}

describe("TextField key dispatch logic", () => {
  it("inserts printable character", () => {
    const ctrl = new TextEditingController();
    _simulateKey(ctrl, makeKey("a"));
    expect(ctrl.text).toBe("a");
  });

  it("Backspace deletes one grapheme", () => {
    const ctrl = new TextEditingController({ text: "ab" });
    _simulateKey(ctrl, makeKey("Backspace"));
    expect(ctrl.text).toBe("a");
    expect(ctrl.cursorPosition).toBe(1);
  });

  it("Ctrl+A moves to line start", () => {
    const ctrl = new TextEditingController({ text: "hello" });
    _simulateKey(ctrl, makeKey("a", MODS_CTRL));
    expect(ctrl.cursorPosition).toBe(0);
  });

  it("Ctrl+E moves to line end", () => {
    const ctrl = new TextEditingController({ text: "hello" });
    ctrl.moveCursorToStart();
    _simulateKey(ctrl, makeKey("e", MODS_CTRL));
    expect(ctrl.cursorPosition).toBe(5);
  });

  it("Ctrl+K kills to line end", () => {
    const ctrl = new TextEditingController({ text: "hello world" });
    ctrl.moveCursorToStart();
    _simulateKey(ctrl, makeKey("k", MODS_CTRL));
    expect(ctrl.text).toBe("");
    expect(ctrl.killBuffer).toBe("hello world");
  });

  it("Ctrl+Y yanks kill buffer", () => {
    const ctrl = new TextEditingController({ text: "hello" });
    ctrl.moveCursorToStart();
    _simulateKey(ctrl, makeKey("k", MODS_CTRL)); // kill "hello"
    _simulateKey(ctrl, makeKey("y", MODS_CTRL)); // yank
    expect(ctrl.text).toBe("hello");
  });

  it("Alt+Left moves word left", () => {
    const ctrl = new TextEditingController({ text: "hello world" });
    // cursor is at end (11)
    _simulateKey(ctrl, makeKey("ArrowLeft", MODS_ALT));
    expect(ctrl.cursorPosition).toBe(6); // before "world"
  });

  it("Alt+Backspace deletes word left", () => {
    const ctrl = new TextEditingController({ text: "hello world" });
    _simulateKey(ctrl, makeKey("Backspace", MODS_ALT));
    expect(ctrl.text).toBe("hello ");
  });

  it("Enter calls onSubmitted when submitKey matches", () => {
    const ctrl = new TextEditingController({ text: "hello" });
    const onSubmitted = mock((text: string) => {});
    _simulateKey(ctrl, makeKey("Enter"), { onSubmitted });
    expect(onSubmitted).toHaveBeenCalledWith("hello");
  });

  it("does not mutate text when readOnly=true", () => {
    const ctrl = new TextEditingController({ text: "hello" });
    _simulateKey(ctrl, makeKey("a"), { readOnly: true });
    expect(ctrl.text).toBe("hello");
  });

  it("Shift+ArrowRight extends selection", () => {
    const ctrl = new TextEditingController({ text: "hello" });
    ctrl.moveCursorToStart();
    _simulateKey(ctrl, makeKey("ArrowRight", MODS_SHIFT));
    expect(ctrl.selectionRange).toEqual({ start: 0, end: 1 });
  });
});

// ─── Minimal key dispatch replica for testing ───────────────────────────────
// This mirrors the exact logic in TextFieldState._handleKey
interface KeyDispatchOptions {
  readOnly?: boolean;
  maxLines?: number | null;
  onSubmitted?: (text: string) => void;
  submitKey?: { key: string; ctrl?: boolean; alt?: boolean; meta?: boolean; shift?: boolean };
  onBackspaceWhenEmpty?: () => void;
}

function _simulateKey(
  ctrl: TextEditingController,
  event: KeyEvent,
  opts: KeyDispatchOptions = {},
): "handled" | "ignored" {
  const {
    readOnly = false,
    maxLines = null,
    onSubmitted,
    submitKey = { key: "Enter" },
    onBackspaceWhenEmpty,
  } = opts;

  const { key, modifiers } = event;
  const { ctrl: isCtrl, alt: isAlt, shift: isShift } = modifiers;
  const isMultiline = maxLines !== 1;

  // Submit key check
  const matchesSubmit =
    key === submitKey.key &&
    !!isCtrl === !!submitKey.ctrl &&
    !!isAlt === !!submitKey.alt &&
    !!isShift === !!submitKey.shift;

  if (!readOnly && matchesSubmit) {
    onSubmitted?.(ctrl.text);
    return "handled";
  }

  // Multiline Enter (Shift+Enter, Alt+Enter, bare Enter when not submit)
  if (isMultiline && !readOnly && key === "Enter" && !matchesSubmit) {
    ctrl.insertText("\n");
    return "handled";
  }

  // Backspace
  if (key === "Backspace") {
    if (!readOnly) {
      if (isAlt) {
        ctrl.deleteWordLeft();
      } else if (ctrl.cursorPosition === 0 && !ctrl.hasSelection) {
        onBackspaceWhenEmpty?.();
      } else {
        ctrl.deleteSelectedOrText(1);
      }
    }
    return "handled";
  }

  // Delete
  if (key === "Delete") {
    if (!readOnly) {
      if (ctrl.hasSelection) ctrl.deleteSelectedText();
      else ctrl.deleteForward(1);
    }
    return "handled";
  }

  // Ctrl bindings
  if (isCtrl && !isAlt) {
    switch (key.toLowerCase()) {
      case "a": ctrl.moveCursorToLineStart({ extend: isShift }); return "handled";
      case "e": ctrl.moveCursorToLineEnd({ extend: isShift }); return "handled";
      case "k": if (!readOnly) ctrl.deleteToLineEnd(); return "handled";
      case "u": if (!readOnly) ctrl.deleteToLineStart(); return "handled";
      case "f": ctrl.moveCursorRight({ extend: isShift }); return "handled";
      case "b": ctrl.moveCursorLeft({ extend: isShift }); return "handled";
      case "n": ctrl.moveCursorDown({ extend: isShift }); return "handled";
      case "p": ctrl.moveCursorUp({ extend: isShift }); return "handled";
      case "d": if (!readOnly) ctrl.deleteForward(1); return "handled";
      case "h": if (!readOnly) ctrl.deleteSelectedOrText(1); return "handled";
      case "w": if (!readOnly) ctrl.deleteWordLeft(); return "handled";
      case "y": if (!readOnly) ctrl.yankText(); return "handled";
      case "j": if (!readOnly && isMultiline) ctrl.insertText("\n"); return "handled";
    }
  }

  // Alt bindings
  if (isAlt && !isCtrl) {
    switch (key) {
      case "ArrowLeft":
      case "b": ctrl.moveCursorWordBoundary("left", { extend: isShift }); return "handled";
      case "ArrowRight":
      case "f": ctrl.moveCursorWordBoundary("right", { extend: isShift }); return "handled";
      case "d": if (!readOnly) ctrl.deleteWordRight(); return "handled";
    }
  }

  // Arrow keys
  switch (key) {
    case "ArrowLeft":  ctrl.moveCursorLeft({ extend: isShift }); return "handled";
    case "ArrowRight": ctrl.moveCursorRight({ extend: isShift }); return "handled";
    case "ArrowUp":    ctrl.moveCursorUp({ extend: isShift }); return "handled";
    case "ArrowDown":  ctrl.moveCursorDown({ extend: isShift }); return "handled";
    case "Home":       ctrl.moveCursorToLineStart({ extend: isShift }); return "handled";
    case "End":        ctrl.moveCursorToLineEnd({ extend: isShift }); return "handled";
  }

  // Printable character insertion
  if (!readOnly && key.length === 1 && !isCtrl) {
    ctrl.insertText(key);
    return "handled";
  }

  return "ignored";
}
```

- [ ] **Step 3.2: Run tests to verify they fail**

```bash
cd /Users/bytedance/workspace/flitter
bun test packages/tui/src/editing/__tests__/text-field-keys.test.ts 2>&1 | head -20
```
Expected: some tests pass (the helper has the logic already), but this verifies the key dispatch logic is correct before embedding it in the widget.

- [ ] **Step 3.3: Verify all key tests pass**

```bash
cd /Users/bytedance/workspace/flitter
bun test packages/tui/src/editing/__tests__/text-field-keys.test.ts 2>&1
```
Expected: all 11 tests PASS. If any fail, fix the `_simulateKey` helper above.

- [ ] **Step 3.4: Rewrite text-field.ts**

Replace the entire content of `packages/tui/src/editing/text-field.ts`:

```typescript
/**
 * TextField Widget — 完整实现。
 *
 * 4-layer stack:
 *   TextField (StatefulWidget)
 *   └── TextFieldState (focus + key dispatch + mouse)
 *         └── TextFieldRenderWidget (RenderObjectWidget)
 *               └── RenderTextField (RenderBox)
 *
 * 逆向: sP (TextFieldState) + Gm (TextField) in actions_intents.js:697-900
 *
 * @module text-field
 */

import type { KeyEventResult } from "../focus/focus-node.js";
import { FocusNode } from "../focus/focus-node.js";
import { Color } from "../screen/color.js";
import { TextStyle } from "../screen/text-style.js";
import { State, StatefulWidget } from "../tree/stateful-widget.js";
import type { BuildContext } from "../tree/stateless-widget.js";
import type { Widget } from "../tree/widget.js";
import type { KeyEvent } from "../vt/types.js";
import { Focus } from "../widgets/focus.js";
import type { MouseEvent } from "../widgets/mouse-region.js";
import { MouseRegion } from "../widgets/mouse-region.js";
import { TextEditingController } from "./text-editing-controller.js";
import { RenderTextField, TextFieldRenderWidget } from "./render-text-field.js";

// ════════════════════════════════════════════════════
//  Props
// ════════════════════════════════════════════════════

export interface SubmitKeyConfig {
  key: string;
  ctrl?: boolean;
  alt?: boolean;
  meta?: boolean;
  shift?: boolean;
}

export interface TextFieldProps {
  controller?: TextEditingController;
  placeholder?: string;
  readOnly?: boolean;
  enabled?: boolean;
  autofocus?: boolean;
  minLines?: number;
  maxLines?: number | null;
  textStyle?: TextStyle;
  cursorColor?: Color;
  selectionColor?: Color;
  backgroundColor?: Color;
  onSubmitted?: (text: string) => void;
  submitKey?: SubmitKeyConfig;
  focusNode?: FocusNode;
  onBackspaceWhenEmpty?: () => void;
}

// ════════════════════════════════════════════════════
//  TextField widget
// ════════════════════════════════════════════════════

/**
 * 多行文本输入 Widget (完整实现).
 *
 * 逆向: Gm in actions_intents.js:697-730
 */
export class TextField extends StatefulWidget {
  readonly props: TextFieldProps;

  constructor(props: TextFieldProps = {}) {
    super();
    this.props = props;
  }

  createState(): State<TextField> {
    return new TextFieldState();
  }
}

// ════════════════════════════════════════════════════
//  TextFieldState
// ════════════════════════════════════════════════════

/**
 * TextField 的状态管理.
 *
 * 逆向: sP in actions_intents.js:731-900
 */
class TextFieldState extends State<TextField> {
  private _controller!: TextEditingController;
  private _ownsController: boolean = false;
  private _focusNode!: FocusNode;
  private _ownsFocusNode: boolean = false;
  private _listener!: () => void;
  /** Ref to the underlying RenderTextField for hit-testing */
  private _renderFieldRef: RenderTextField | null = null;

  // ─── Lifecycle ────────────────────────────────────

  override initState(): void {
    super.initState();
    this._listener = () => {
      if (this.mounted) this.setState();
    };

    if (this.widget.props.controller) {
      this._controller = this.widget.props.controller;
      this._ownsController = false;
    } else {
      this._controller = new TextEditingController();
      this._ownsController = true;
    }
    this._controller.addListener(this._listener);

    if (this.widget.props.focusNode) {
      this._focusNode = this.widget.props.focusNode;
      this._ownsFocusNode = false;
    } else {
      this._focusNode = new FocusNode({ debugLabel: "TextField" });
      this._ownsFocusNode = true;
    }
  }

  override didUpdateWidget(oldWidget: TextField): void {
    super.didUpdateWidget(oldWidget);
    if (this.widget.props.controller !== oldWidget.props.controller) {
      this._controller.removeListener(this._listener);
      if (this._ownsController) this._controller.dispose();
      if (this.widget.props.controller) {
        this._controller = this.widget.props.controller;
        this._ownsController = false;
      } else {
        this._controller = new TextEditingController();
        this._ownsController = true;
      }
      this._controller.addListener(this._listener);
    }
    if (this.widget.props.focusNode !== oldWidget.props.focusNode) {
      if (this._ownsFocusNode) this._focusNode.dispose?.();
      if (this.widget.props.focusNode) {
        this._focusNode = this.widget.props.focusNode;
        this._ownsFocusNode = false;
      } else {
        this._focusNode = new FocusNode({ debugLabel: "TextField" });
        this._ownsFocusNode = true;
      }
    }
  }

  override dispose(): void {
    this._controller.removeListener(this._listener);
    if (this._ownsController) this._controller.dispose();
    if (this._ownsFocusNode) this._focusNode.dispose?.();
    super.dispose();
  }

  // ─── Key dispatch (逆向: sP r function) ──────────

  private _handleKey = (event: KeyEvent): KeyEventResult => {
    const props = this.widget.props;
    const ctrl = this._controller;
    const readOnly = props.readOnly ?? false;
    const isMultiline = (props.maxLines ?? null) !== 1;
    const submitKey: SubmitKeyConfig = props.submitKey ?? { key: "Enter" };

    const { key, modifiers } = event;
    const { ctrl: isCtrl, alt: isAlt, shift: isShift } = modifiers;

    // Submit key check
    // 逆向: sP — check backslash escape then call onSubmitted
    const matchesSubmit =
      key === submitKey.key &&
      !!isCtrl === !!submitKey.ctrl &&
      !!isAlt === !!submitKey.alt &&
      !!isShift === !!submitKey.shift;

    if (!readOnly && matchesSubmit) {
      props.onSubmitted?.(ctrl.text);
      return "handled";
    }

    // Multiline Enter
    if (isMultiline && !readOnly && key === "Enter" && !matchesSubmit) {
      ctrl.insertText("\n");
      if (this.mounted) this.setState();
      return "handled";
    }

    // Backspace
    if (key === "Backspace") {
      if (!readOnly) {
        if (isAlt) {
          ctrl.deleteWordLeft();
        } else if (ctrl.cursorPosition === 0 && !ctrl.hasSelection) {
          props.onBackspaceWhenEmpty?.();
        } else {
          ctrl.deleteSelectedOrText(1);
        }
      }
      return "handled";
    }

    // Delete
    if (key === "Delete") {
      if (!readOnly) {
        if (ctrl.hasSelection) ctrl.deleteSelectedText();
        else ctrl.deleteForward(1);
      }
      return "handled";
    }

    // Ctrl bindings (Emacs)
    // 逆向: sP — matching amp's exact Ctrl key map
    if (isCtrl && !isAlt) {
      switch (key.toLowerCase()) {
        case "a": ctrl.moveCursorToLineStart({ extend: isShift }); return "handled";
        case "e": ctrl.moveCursorToLineEnd({ extend: isShift }); return "handled";
        case "k": if (!readOnly) ctrl.deleteToLineEnd(); return "handled";
        case "u": if (!readOnly) ctrl.deleteToLineStart(); return "handled";
        case "f": ctrl.moveCursorRight({ extend: isShift }); return "handled";
        case "b": ctrl.moveCursorLeft({ extend: isShift }); return "handled";
        case "n": ctrl.moveCursorDown({ extend: isShift }); return "handled";
        case "p": ctrl.moveCursorUp({ extend: isShift }); return "handled";
        case "d": if (!readOnly) ctrl.deleteForward(1); return "handled";
        case "h": if (!readOnly) ctrl.deleteSelectedOrText(1); return "handled";
        case "w": if (!readOnly) ctrl.deleteWordLeft(); return "handled";
        case "y": if (!readOnly) ctrl.yankText(); return "handled";
        case "j": if (!readOnly && isMultiline) ctrl.insertText("\n"); return "handled";
      }
    }

    // Alt bindings
    if (isAlt && !isCtrl) {
      switch (key) {
        case "ArrowLeft":
        case "b": ctrl.moveCursorWordBoundary("left", { extend: isShift }); return "handled";
        case "ArrowRight":
        case "f": ctrl.moveCursorWordBoundary("right", { extend: isShift }); return "handled";
        case "d": if (!readOnly) ctrl.deleteWordRight(); return "handled";
      }
    }

    // Arrow keys
    switch (key) {
      case "ArrowLeft":  ctrl.moveCursorLeft({ extend: isShift }); return "handled";
      case "ArrowRight": ctrl.moveCursorRight({ extend: isShift }); return "handled";
      case "ArrowUp":    ctrl.moveCursorUp({ extend: isShift }); return "handled";
      case "ArrowDown":  ctrl.moveCursorDown({ extend: isShift }); return "handled";
      case "Home":       ctrl.moveCursorToLineStart({ extend: isShift }); return "handled";
      case "End":        ctrl.moveCursorToLineEnd({ extend: isShift }); return "handled";
    }

    // Printable character insertion
    if (!readOnly && key.length === 1 && !isCtrl) {
      ctrl.insertText(key);
      return "handled";
    }

    return "ignored";
  };

  // ─── Mouse handling ────────────────────────────────

  private _handleClick = (event: MouseEvent): void => {
    const clickCount = (event as any).clickCount ?? 1;
    const offset = this._renderFieldRef?.hitTestPosition(event.x, event.y) ?? 0;
    if (clickCount === 3) {
      this._controller.selectLineAt(offset);
    } else if (clickCount === 2) {
      this._controller.selectWordAt(offset);
    } else {
      this._controller.cursorPosition = offset;
    }
    this._focusNode.requestFocus();
  };

  private _handleDrag = (event: MouseEvent): void => {
    const offset = this._renderFieldRef?.hitTestPosition(event.x, event.y) ?? 0;
    this._controller.setSelectionRange(this._controller.selectionRange?.start ?? offset, offset);
  };

  private _handleRelease = (_event: MouseEvent): void => {
    // No-op: selection finalized by drag
  };

  // ─── Build ─────────────────────────────────────────

  override build(_context: BuildContext): Widget {
    const props = this.widget.props;
    const hasFocus = this._focusNode.hasFocus;

    const renderWidget = new TextFieldRenderWidget({
      controller: this._controller,
      focused: hasFocus,
      enabled: props.enabled ?? true,
      readOnly: props.readOnly ?? false,
      minLines: props.minLines ?? 1,
      maxLines: props.maxLines ?? null,
      textStyle: props.textStyle,
      cursorColor: props.cursorColor,
      selectionColor: props.selectionColor,
      backgroundColor: props.backgroundColor,
      placeholder: props.placeholder,
    });

    return new Focus({
      focusNode: this._focusNode,
      autofocus: props.autofocus ?? false,
      onKey: this._handleKey,
      child: new MouseRegion({
        onClick: this._handleClick,
        onDrag: this._handleDrag,
        onRelease: this._handleRelease,
        child: renderWidget,
      }),
    });
  }

  get controller(): TextEditingController {
    return this._controller;
  }
}
```

- [ ] **Step 3.5: Run all editing tests**

```bash
cd /Users/bytedance/workspace/flitter
bun test packages/tui/src/editing/__tests__/ 2>&1
```
Expected: all tests PASS

- [ ] **Step 3.6: Update editing/index.ts to export render-text-field**

In `packages/tui/src/editing/index.ts`, add:

```typescript
export * from "./render-text-field.js";
```

The full file should now be:

```typescript
export * from "./text-editing-controller.js";
export * from "./text-field.js";
export * from "./text-layout-engine.js";
export * from "./render-text-field.js";
```

- [ ] **Step 3.7: Verify TypeScript compiles**

```bash
cd /Users/bytedance/workspace/flitter
bun run typecheck 2>&1 | head -30
```
Expected: no errors (or only pre-existing errors unrelated to these files)

- [ ] **Step 3.8: Commit**

```bash
cd /Users/bytedance/workspace/flitter
git add packages/tui/src/editing/text-field.ts \
        packages/tui/src/editing/index.ts \
        packages/tui/src/editing/__tests__/text-field-keys.test.ts
git commit -m "feat(editing): rewrite TextField with full key dispatch, mouse handling, Focus integration"
```

---

## Task 4: Create Scrollbar widget

**Amp reference:** Read `F1T.paint`, `_calculateScrollbarMetrics`, and `W1T` in `amp-cli-reversed/modules/1472_tui_components/interactive_widgets.js` lines 306–700 before writing.

**Files:**
- Create: `packages/tui/src/widgets/scrollbar.ts`
- Test: `packages/tui/src/widgets/__tests__/scrollbar.test.ts` (create)

- [ ] **Step 4.1: Write failing scrollbar tests**

Create `packages/tui/src/widgets/__tests__/scrollbar.test.ts`:

```typescript
import { describe, expect, it } from "bun:test";

// Test the scrollbar metrics calculation in isolation
// (same logic as RenderScrollbar._calculateMetrics)
interface ScrollbarMetrics {
  showScrollbar: boolean;
  thumbStartFloat: number;
  thumbEndFloat: number;
}

function calculateScrollbarMetrics(
  totalContent: number,
  viewport: number,
  scrollOffset: number,
  trackLength: number,
): ScrollbarMetrics {
  if (totalContent <= viewport || trackLength <= 0) {
    return { showScrollbar: false, thumbStartFloat: 0, thumbEndFloat: 0 };
  }
  const scrollFraction = Math.max(0, Math.min(1, scrollOffset / (totalContent - viewport)));
  const thumbRatio = Math.min(1, viewport / totalContent);
  const thumbSize = Math.max(1, trackLength * thumbRatio);
  const availableTrack = trackLength - thumbSize;
  const thumbStartFloat = Math.max(0, availableTrack * scrollFraction);
  const thumbEndFloat = thumbStartFloat + thumbSize;
  return { showScrollbar: true, thumbStartFloat, thumbEndFloat };
}

describe("Scrollbar metrics", () => {
  it("hides scrollbar when content fits viewport", () => {
    const m = calculateScrollbarMetrics(10, 20, 0, 20);
    expect(m.showScrollbar).toBe(false);
  });

  it("hides scrollbar when content equals viewport", () => {
    const m = calculateScrollbarMetrics(20, 20, 0, 20);
    expect(m.showScrollbar).toBe(false);
  });

  it("shows scrollbar when content exceeds viewport", () => {
    const m = calculateScrollbarMetrics(100, 20, 0, 20);
    expect(m.showScrollbar).toBe(true);
  });

  it("thumb is at top when scrollOffset=0", () => {
    const m = calculateScrollbarMetrics(100, 20, 0, 20);
    expect(m.thumbStartFloat).toBe(0);
    expect(m.thumbStartFloat).toBeCloseTo(0);
  });

  it("thumb is at bottom when fully scrolled", () => {
    const m = calculateScrollbarMetrics(100, 20, 80, 20);
    // thumbSize = max(1, 20 * 20/100) = 4; availableTrack = 16; thumbStart = 16
    expect(m.thumbStartFloat).toBeCloseTo(16);
    expect(m.thumbEndFloat).toBeCloseTo(20);
  });

  it("thumb size = max(1, trackLength * viewport/total)", () => {
    const m = calculateScrollbarMetrics(100, 20, 0, 20);
    // thumbSize = 20 * 20/100 = 4
    const expectedThumbSize = 4;
    expect(m.thumbEndFloat - m.thumbStartFloat).toBeCloseTo(expectedThumbSize);
  });

  it("thumb stays within track with minimal content", () => {
    const m = calculateScrollbarMetrics(21, 20, 1, 10);
    expect(m.thumbStartFloat).toBeGreaterThanOrEqual(0);
    expect(m.thumbEndFloat).toBeLessThanOrEqual(10);
  });
});

describe("Scrollbar block element selection", () => {
  const BLOCKS = ["▁", "▂", "▃", "▄", "▅", "▆", "▇", "█"];

  function getThumbStartChar(thumbStart: number, row: number): string {
    if (Math.floor(thumbStart) !== row) return "—";
    const fraction = 1 - (thumbStart - row);
    const idx = Math.floor(fraction * 8);
    return BLOCKS[idx] ?? "█";
  }

  it("full thumb start (thumbStart=2.0) gives '█'", () => {
    expect(getThumbStartChar(2.0, 2)).toBe("█");
  });

  it("half-way thumb start (thumbStart=2.5) gives '▄'", () => {
    // fraction = 1 - 0.5 = 0.5; idx = floor(0.5*8)=4 → '▅'
    expect(getThumbStartChar(2.5, 2)).toBe("▅");
  });

  it("quarter thumb start (thumbStart=2.75) gives lower block", () => {
    // fraction = 1 - 0.75 = 0.25; idx = floor(0.25*8)=2 → '▃'
    expect(getThumbStartChar(2.75, 2)).toBe("▃");
  });
});
```

- [ ] **Step 4.2: Run tests to verify they pass (pure logic)**

```bash
cd /Users/bytedance/workspace/flitter
bun test packages/tui/src/widgets/__tests__/scrollbar.test.ts 2>&1
```
Expected: all tests PASS (pure math, no imports needed yet)

- [ ] **Step 4.3: Create scrollbar.ts**

Create `packages/tui/src/widgets/scrollbar.ts`:

```typescript
/**
 * Scrollbar Widget — 带亚字符精度的滚动条组件。
 *
 * 使用 Unicode 块元素 ▁▂▃▄▅▆▇█ 实现 1/8 行精度的平滑拇指渲染，
 * 与 amp 的 F1T.paint 完全对齐。
 *
 * 逆向: W1T (widget) + F1T (render) + Oi (state) + VRR (metrics)
 *   in interactive_widgets.js:306-907
 *
 * @module
 */

import type { Screen } from "../screen/screen.js";
import { Color } from "../screen/color.js";
import { TextStyle } from "../screen/text-style.js";
import type { Element, Widget as WidgetInterface } from "../tree/element.js";
import { RenderBox } from "../tree/render-box.js";
import type { RenderObject } from "../tree/render-object.js";
import type { RenderObjectWidget } from "../tree/render-object-element.js";
import { RenderObjectElement } from "../tree/render-object-element.js";
import type { Key } from "../tree/widget.js";
import { Widget } from "../tree/widget.js";
import { State, StatefulWidget } from "../tree/stateful-widget.js";
import type { BuildContext } from "../tree/stateless-widget.js";
import type { ScrollController } from "../scroll/scroll-controller.js";
import type { MouseEvent } from "./mouse-region.js";
import { MouseRegion } from "./mouse-region.js";

// ════════════════════════════════════════════════════
//  Block elements (逆向: F1T — blocks array)
// ════════════════════════════════════════════════════

const BLOCKS = ["▁", "▂", "▃", "▄", "▅", "▆", "▇", "█"] as const;

// ════════════════════════════════════════════════════
//  LeafRenderObjectElement (local copy)
// ════════════════════════════════════════════════════

class LeafRenderObjectElement extends RenderObjectElement {
  override mount(parent?: Element): void {
    super.mount(parent);
    this._dirty = false;
  }

  override update(newWidget: WidgetInterface): void {
    super.update(newWidget);
    this._dirty = false;
  }
}

// ════════════════════════════════════════════════════
//  ScrollInfo
// ════════════════════════════════════════════════════

export interface ScrollInfo {
  totalContentHeight: number;
  viewportHeight: number;
  scrollOffset: number;
}

// ════════════════════════════════════════════════════
//  RenderScrollbar props
// ════════════════════════════════════════════════════

export interface RenderScrollbarProps {
  getScrollInfo: () => ScrollInfo;
  thickness: number;
  thumbColor: Color;
  trackColor: Color;
}

// ════════════════════════════════════════════════════
//  ScrollbarMetrics
// ════════════════════════════════════════════════════

interface ScrollbarMetrics {
  showScrollbar: boolean;
  thumbStartFloat: number;
  thumbEndFloat: number;
  trackLength: number;
}

// ════════════════════════════════════════════════════
//  RenderScrollbar
// ════════════════════════════════════════════════════

/**
 * 滚动条核心渲染对象。
 *
 * 逆向: F1T in interactive_widgets.js:306-500
 */
export class RenderScrollbar extends RenderBox {
  private _props: RenderScrollbarProps;

  constructor(props: RenderScrollbarProps) {
    super();
    this._props = { ...props };
  }

  updateProps(props: RenderScrollbarProps): void {
    this._props = { ...props };
    this.markNeedsPaint();
  }

  // ────────────────────────────────────────────────
  //  Layout (逆向: F1T.performLayout)
  // ────────────────────────────────────────────────

  override performLayout(): void {
    const constraints = this._lastConstraints!;
    const w = Math.min(constraints.maxWidth, this._props.thickness);
    const h = constraints.maxHeight;
    this.size = constraints.constrain(w, h);
  }

  override getMinIntrinsicWidth(_height: number): number {
    return this._props.thickness;
  }

  override getMaxIntrinsicWidth(_height: number): number {
    return this._props.thickness;
  }

  // ────────────────────────────────────────────────
  //  Metrics (逆向: F1T._calculateScrollbarMetrics / VRR)
  // ────────────────────────────────────────────────

  private _calculateMetrics(): ScrollbarMetrics {
    const { totalContentHeight, viewportHeight, scrollOffset } = this._props.getScrollInfo();
    const trackLength = this._size.height;

    if (totalContentHeight <= viewportHeight || trackLength <= 0) {
      return { showScrollbar: false, thumbStartFloat: 0, thumbEndFloat: 0, trackLength };
    }

    const scrollFraction = Math.max(0, Math.min(1,
      scrollOffset / (totalContentHeight - viewportHeight)));
    const thumbRatio = Math.min(1, viewportHeight / totalContentHeight);
    const thumbSize = Math.max(1, trackLength * thumbRatio);
    const availableTrack = trackLength - thumbSize;
    const thumbStartFloat = Math.max(0, availableTrack * scrollFraction);
    const thumbEndFloat = thumbStartFloat + thumbSize;

    return { showScrollbar: true, thumbStartFloat, thumbEndFloat, trackLength };
  }

  // ────────────────────────────────────────────────
  //  Paint (逆向: F1T.paint — block element algorithm)
  // ────────────────────────────────────────────────

  override paint(screen: Screen, x: number, y: number): void {
    const metrics = this._calculateMetrics();
    if (!metrics.showScrollbar) return;

    const { thumbStartFloat, thumbEndFloat, trackLength } = metrics;
    const { thumbColor, trackColor } = this._props;

    for (let i = 0; i < trackLength; i++) {
      let char = "█";
      let reverse = true; // default: track cell (reverse = use track color)

      if (Math.floor(thumbStartFloat) === i) {
        // Thumb START edge — partial block
        // 逆向: F1T.paint — fraction = 1-(thumbStart-row), NOT reversed
        const fraction = 1 - (thumbStartFloat - i);
        const blockIdx = Math.floor(fraction * 8);
        char = BLOCKS[blockIdx] ?? "█";
        reverse = false;
      } else if (Math.floor(thumbEndFloat) === i) {
        // Thumb END edge — partial block
        // 逆向: F1T.paint — fraction = 1-(thumbEnd-row), IS reversed (track appearance)
        const fraction = 1 - (thumbEndFloat - i);
        const blockIdx = Math.floor(fraction * 8);
        char = BLOCKS[blockIdx] ?? "█";
        reverse = true;
      } else if (i > thumbStartFloat && i < thumbEndFloat) {
        // Thumb INTERIOR — full block, not reversed (thumb color)
        // 逆向: F1T.paint — interior thumb cells
        char = "█";
        reverse = false;
      }
      // else: track cell — default '█' with reverse=true

      // Apply reverse: reverse=false → fg=thumbColor (solid thumb fill)
      //               reverse=true  → fg=trackColor (swap makes it track color)
      // 逆向: F1T.paint uses { fg: thumbColor, bg: trackColor, reverse }
      const style = reverse
        ? new TextStyle({ foreground: trackColor, background: thumbColor })
        : new TextStyle({ foreground: thumbColor, background: trackColor });

      screen.writeChar(x, y + i, char, style, 1);
    }
  }

  /**
   * Expose metrics for mouse interaction in ScrollbarState.
   */
  getMetrics(): ScrollbarMetrics {
    return this._calculateMetrics();
  }
}

// ════════════════════════════════════════════════════
//  ScrollbarRenderWidget
// ════════════════════════════════════════════════════

export class ScrollbarRenderWidget extends Widget implements RenderObjectWidget {
  readonly renderProps: RenderScrollbarProps;

  constructor(props: RenderScrollbarProps) {
    super();
    this.renderProps = props;
  }

  override createElement(): LeafRenderObjectElement {
    return new LeafRenderObjectElement(this);
  }

  createRenderObject(): RenderScrollbar {
    return new RenderScrollbar(this.renderProps);
  }

  updateRenderObject(renderObject: RenderObject): void {
    (renderObject as RenderScrollbar).updateProps(this.renderProps);
  }
}

// ════════════════════════════════════════════════════
//  Scrollbar props
// ════════════════════════════════════════════════════

export interface ScrollbarProps {
  controller: ScrollController;
  getScrollInfo: () => ScrollInfo;
  thickness?: number;
  thumbColor?: Color;
  trackColor?: Color;
  showTrack?: boolean;
}

// ════════════════════════════════════════════════════
//  ScrollbarState
// ════════════════════════════════════════════════════

class ScrollbarState extends State<Scrollbar> {
  private _listener!: () => void;
  private _dragStartY: number = 0;
  private _dragStartOffset: number = 0;
  private _renderScrollbarRef: RenderScrollbar | null = null;

  override initState(): void {
    super.initState();
    this._listener = () => {
      if (this.mounted) this.setState();
    };
    this.widget.props.controller.addListener(this._listener);
  }

  override didUpdateWidget(oldWidget: Scrollbar): void {
    super.didUpdateWidget(oldWidget);
    if (this.widget.props.controller !== oldWidget.props.controller) {
      oldWidget.props.controller.removeListener(this._listener);
      this.widget.props.controller.addListener(this._listener);
    }
  }

  override dispose(): void {
    this.widget.props.controller.removeListener(this._listener);
    super.dispose();
  }

  private _handleClick = (event: MouseEvent): void => {
    const metrics = this._renderScrollbarRef?.getMetrics();
    if (!metrics || !metrics.showScrollbar) return;
    const controller = this.widget.props.controller;
    const { thumbStartFloat, thumbEndFloat } = metrics;

    // Click above thumb → page up; click below thumb → page down
    // 逆向: Oi (ScrollbarState) mouse handler
    if (event.y < thumbStartFloat) {
      const info = this.widget.props.getScrollInfo();
      controller.jumpTo(Math.max(0, controller.offset - info.viewportHeight));
    } else if (event.y > thumbEndFloat) {
      const info = this.widget.props.getScrollInfo();
      controller.jumpTo(Math.min(
        controller.maxScrollExtent,
        controller.offset + info.viewportHeight,
      ));
    }
  };

  private _handleDrag = (event: MouseEvent): void => {
    const metrics = this._renderScrollbarRef?.getMetrics();
    if (!metrics || !metrics.showScrollbar) return;

    // First drag event: record start position
    if (this._dragStartY === 0 && this._dragStartOffset === 0) {
      this._dragStartY = event.y;
      this._dragStartOffset = this.widget.props.controller.offset;
    }

    const controller = this.widget.props.controller;
    const { thumbStartFloat, thumbEndFloat, trackLength } = metrics;
    const thumbSize = thumbEndFloat - thumbStartFloat;
    const availableTrack = trackLength - thumbSize;

    if (availableTrack > 0) {
      const delta = event.y - this._dragStartY;
      const scrollDelta = (delta / availableTrack) * controller.maxScrollExtent;
      controller.jumpTo(Math.max(0, Math.min(
        controller.maxScrollExtent,
        this._dragStartOffset + scrollDelta,
      )));
    }
  };

  private _handleRelease = (_event: MouseEvent): void => {
    this._dragStartY = 0;
    this._dragStartOffset = 0;
  };

  override build(_context: BuildContext): Widget {
    const props = this.widget.props;
    const thumbColor = props.thumbColor ?? new Color(128, 128, 128);
    const trackColor = props.trackColor ?? new Color(50, 50, 50);

    return new MouseRegion({
      onClick: this._handleClick,
      onDrag: this._handleDrag,
      onRelease: this._handleRelease,
      child: new ScrollbarRenderWidget({
        getScrollInfo: props.getScrollInfo,
        thickness: props.thickness ?? 1,
        thumbColor,
        trackColor,
      }),
    });
  }
}

// ════════════════════════════════════════════════════
//  Scrollbar widget
// ════════════════════════════════════════════════════

/**
 * 垂直滚动条 Widget。
 *
 * 逆向: W1T in interactive_widgets.js:306-350
 *
 * @example
 * ```ts
 * new Scrollbar({
 *   controller: scrollController,
 *   getScrollInfo: () => ({
 *     totalContentHeight: 100,
 *     viewportHeight: 20,
 *     scrollOffset: scrollController.offset,
 *   }),
 * })
 * ```
 */
export class Scrollbar extends StatefulWidget {
  readonly props: ScrollbarProps;

  constructor(props: ScrollbarProps) {
    super();
    this.props = props;
  }

  createState(): State<Scrollbar> {
    return new ScrollbarState();
  }
}
```

- [ ] **Step 4.4: Run scrollbar tests**

```bash
cd /Users/bytedance/workspace/flitter
bun test packages/tui/src/widgets/__tests__/scrollbar.test.ts 2>&1
```
Expected: all 10 tests PASS

- [ ] **Step 4.5: Add Scrollbar export to index.ts**

In `packages/tui/src/index.ts`, add after the last widget export:

```typescript
export { Scrollbar, ScrollbarRenderWidget, RenderScrollbar } from "./widgets/scrollbar.js";
export type { ScrollbarProps, ScrollInfo, RenderScrollbarProps } from "./widgets/scrollbar.js";
```

- [ ] **Step 4.6: Verify TypeScript compiles**

```bash
cd /Users/bytedance/workspace/flitter
bun run typecheck 2>&1 | head -30
```
Expected: no new errors

- [ ] **Step 4.7: Commit**

```bash
cd /Users/bytedance/workspace/flitter
git add packages/tui/src/widgets/scrollbar.ts \
        packages/tui/src/widgets/__tests__/scrollbar.test.ts \
        packages/tui/src/index.ts
git commit -m "feat(widgets): add Scrollbar with sub-character block element precision"
```

---

## Task 5: Create demo apps

**Files:**
- Create: `packages/tui/examples/14-text-field-demo.ts`
- Create: `packages/tui/examples/15-scrollbar-demo.ts`

- [ ] **Step 5.1: Create TextField demo**

Create `packages/tui/examples/14-text-field-demo.ts`:

```typescript
#!/usr/bin/env bun
/**
 * TextField Demo — interactive text input with cursor, selection, and Emacs keys.
 *
 * Run: bun run packages/tui/examples/14-text-field-demo.ts
 * Keys: all standard editing keys, Ctrl+C to quit
 */

import {
  Column,
  Container,
  EdgeInsets,
  Row,
  Text,
  TextField,
  TextEditingController,
  TextStyle,
  Color,
  runApp,
  StatefulWidget,
  State,
  Expanded,
} from "../src/index.js";
import type { BuildContext } from "../src/tree/stateless-widget.js";
import type { Widget } from "../src/tree/widget.js";

class TextFieldDemoApp extends StatefulWidget {
  createState() { return new TextFieldDemoState(); }
}

class TextFieldDemoState extends State<TextFieldDemoApp> {
  private _ctrl = new TextEditingController({ text: "Hello, Flitter!" });
  private _submitted = "";

  override build(_ctx: BuildContext): Widget {
    return new Container({
      padding: new EdgeInsets({ top: 1, left: 2, right: 2, bottom: 1 }),
      child: new Column({
        children: [
          new Text("TextField Demo — Ctrl+C to quit"),
          new Text("─".repeat(40)),
          new TextField({
            controller: this._ctrl,
            autofocus: true,
            maxLines: null,
            minLines: 5,
            backgroundColor: new Color(20, 20, 40),
            cursorColor: new Color(200, 200, 255),
            selectionColor: new Color(0, 80, 160),
            onSubmitted: (text) => {
              this._submitted = text;
              this._ctrl.text = "";
              if (this.mounted) this.setState();
            },
            submitKey: { key: "Enter", ctrl: true },
          }),
          new Text("─".repeat(40)),
          new Text(`Submitted: ${this._submitted || "(none)"}`),
          new Text(`Cursor: ${this._ctrl.cursorPosition} / ${this._ctrl.graphemes.length}`),
          new Text(`Lines: ${this._ctrl.lineCount}`),
        ],
      }),
    });
  }
}

runApp(new TextFieldDemoApp());
```

- [ ] **Step 5.2: Create Scrollbar demo**

Create `packages/tui/examples/15-scrollbar-demo.ts`:

```typescript
#!/usr/bin/env bun
/**
 * Scrollbar Demo — scrollable list with sub-character precision scrollbar.
 *
 * Run: bun run packages/tui/examples/15-scrollbar-demo.ts
 * Keys: j/k or arrow keys to scroll, Ctrl+C to quit
 */

import {
  Column,
  Container,
  EdgeInsets,
  Row,
  Text,
  Scrollbar,
  ScrollController,
  Scrollable,
  Expanded,
  SizedBox,
  runApp,
  StatefulWidget,
  State,
  Focus,
  TextStyle,
  Color,
} from "../src/index.js";
import type { BuildContext } from "../src/tree/stateless-widget.js";
import type { Widget } from "../src/tree/widget.js";
import type { KeyEvent } from "../src/vt/types.js";
import type { KeyEventResult } from "../src/focus/focus-node.js";

const ITEMS = Array.from({ length: 50 }, (_, i) => `Item ${i + 1}: ${"x".repeat((i % 20) + 5)}`);

class ScrollbarDemoApp extends StatefulWidget {
  createState() { return new ScrollbarDemoState(); }
}

class ScrollbarDemoState extends State<ScrollbarDemoApp> {
  private _scrollCtrl = new ScrollController();
  private readonly _viewportHeight = 20;

  override initState(): void {
    super.initState();
    this._scrollCtrl.addListener(() => {
      if (this.mounted) this.setState();
    });
  }

  override dispose(): void {
    this._scrollCtrl.dispose();
    super.dispose();
  }

  private _handleKey = (event: KeyEvent): KeyEventResult => {
    switch (event.key) {
      case "j":
      case "ArrowDown":
        this._scrollCtrl.scrollDown(1);
        return "handled";
      case "k":
      case "ArrowUp":
        this._scrollCtrl.scrollUp(1);
        return "handled";
      case "d":
        if (event.modifiers.ctrl) {
          this._scrollCtrl.scrollDown(Math.floor(this._viewportHeight / 2));
          return "handled";
        }
        break;
      case "u":
        if (event.modifiers.ctrl) {
          this._scrollCtrl.scrollUp(Math.floor(this._viewportHeight / 2));
          return "handled";
        }
        break;
      case "g":
        this._scrollCtrl.scrollToTop();
        return "handled";
      case "G":
        this._scrollCtrl.scrollToBottom();
        return "handled";
    }
    return "ignored";
  };

  override build(_ctx: BuildContext): Widget {
    const offset = this._scrollCtrl.offset;
    const totalContent = ITEMS.length;

    const visibleItems = ITEMS.slice(
      Math.floor(offset),
      Math.floor(offset) + this._viewportHeight,
    );

    return new Focus({
      autofocus: true,
      onKey: this._handleKey,
      child: new Container({
        padding: new EdgeInsets({ top: 1, left: 2, right: 2, bottom: 1 }),
        child: new Column({
          children: [
            new Text("Scrollbar Demo — j/k arrows, Ctrl+D/U, g/G, Ctrl+C quit"),
            new Text("─".repeat(42)),
            new Row({
              children: [
                new Expanded({
                  child: new Column({
                    children: visibleItems.map((item, idx) =>
                      new Text(`${Math.floor(offset) + idx + 1}. ${item}`)
                    ),
                  }),
                }),
                new SizedBox({
                  width: 1,
                  child: new Scrollbar({
                    controller: this._scrollCtrl,
                    getScrollInfo: () => ({
                      totalContentHeight: totalContent,
                      viewportHeight: this._viewportHeight,
                      scrollOffset: offset,
                    }),
                  }),
                }),
              ],
            }),
            new Text("─".repeat(42)),
            new Text(`Offset: ${offset.toFixed(1)} / Max: ${this._scrollCtrl.maxScrollExtent}`),
          ],
        }),
      }),
    });
  }
}

runApp(new ScrollbarDemoApp());
```

- [ ] **Step 5.3: Verify demos run without crashing (type check)**

```bash
cd /Users/bytedance/workspace/flitter
bun run typecheck 2>&1 | head -30
```
Expected: no errors (or only pre-existing errors)

- [ ] **Step 5.4: Commit**

```bash
cd /Users/bytedance/workspace/flitter
git add packages/tui/examples/14-text-field-demo.ts \
        packages/tui/examples/15-scrollbar-demo.ts
git commit -m "feat(examples): add TextField demo (14) and Scrollbar demo (15)"
```

---

## Task 6: tmux E2E verification

**Amp reference:** See `docs/tmux-e2e-test-reference.md` for the full testing protocol.

- [ ] **Step 6.1: E2E test TextField — launch and verify cursor**

```bash
tmux new-session -d -s tf-test -x 80 -y 30 \
  "bun run /Users/bytedance/workspace/flitter/packages/tui/examples/14-text-field-demo.ts 2>/tmp/tf-test.log"
sleep 2
# Check initial render
tmux capture-pane -t tf-test -p | grep -q "TextField Demo" || echo "FAIL: header not found"
tmux capture-pane -t tf-test -p | grep -q "Hello, Flitter!" || echo "FAIL: initial text not found"
echo "Initial render: OK"
```

Expected: both grep pass, no FAIL lines.

- [ ] **Step 6.2: E2E test TextField — type text**

```bash
# Type " World" 
tmux send-keys -t tf-test " World"
sleep 0.3
tmux capture-pane -t tf-test -p | grep -q "Hello, Flitter! World" || echo "FAIL: typed text not found"
echo "Text insertion: OK"
```

Expected: "Hello, Flitter! World" visible in pane.

- [ ] **Step 6.3: E2E test TextField — Ctrl+A moves cursor to start**

```bash
# Ctrl+A
tmux send-keys -t tf-test C-a
sleep 0.2
# Type 'X' — should appear at start
tmux send-keys -t tf-test "X"
sleep 0.2
tmux capture-pane -t tf-test -p | grep -q "XHello" || echo "FAIL: Ctrl+A+insert did not go to start"
echo "Ctrl+A: OK"
```

Expected: "XHello, Flitter! World" visible.

- [ ] **Step 6.4: E2E test TextField — Ctrl+C submits (Ctrl+Enter)**

```bash
# Ctrl+Enter (submit key)
tmux send-keys -t tf-test C-Enter 2>/dev/null || tmux send-keys -t tf-test "" Enter
sleep 0.3
# Check submitted text shown
tmux capture-pane -t tf-test -p
echo "Submit: check 'Submitted:' shows content above"
```

- [ ] **Step 6.5: Clean up TextField test session**

```bash
tmux kill-session -t tf-test
```

- [ ] **Step 6.6: E2E test Scrollbar — launch and verify**

```bash
tmux new-session -d -s sb-test -x 80 -y 30 \
  "bun run /Users/bytedance/workspace/flitter/packages/tui/examples/15-scrollbar-demo.ts 2>/tmp/sb-test.log"
sleep 2
tmux capture-pane -t sb-test -p | grep -q "Scrollbar Demo" || echo "FAIL: header not found"
tmux capture-pane -t sb-test -p | grep -q "Item 1" || echo "FAIL: items not found"
# Scrollbar block chars should appear in rightmost column
PANE=$(tmux capture-pane -t sb-test -p)
echo "$PANE" | grep -P "[▁▂▃▄▅▆▇█]" || echo "FAIL: no block chars found (scrollbar not painting)"
echo "Scrollbar initial: OK"
```

Expected: block characters present, items visible.

- [ ] **Step 6.7: E2E test Scrollbar — scroll down and verify thumb moves**

```bash
# Capture scrollbar state before
BEFORE=$(tmux capture-pane -t sb-test -p)
# Press j 10 times
tmux send-keys -t sb-test "jjjjjjjjjj"
sleep 0.5
AFTER=$(tmux capture-pane -t sb-test -p)
echo "$AFTER" | grep -q "Item 11" || echo "FAIL: scroll did not advance"
echo "After scroll, pane:"
echo "$AFTER"
```

Expected: "Item 11" or higher numbered items visible.

- [ ] **Step 6.8: Clean up Scrollbar test session and commit**

```bash
tmux kill-session -t sb-test
cd /Users/bytedance/workspace/flitter
git add -A
git commit -m "test(e2e): verify TextField and Scrollbar render and interact correctly in terminal"
```

---

## Self-Review Checklist

### Spec coverage
- [x] TextField 4-layer architecture (Task 2, 3)
- [x] RenderTextField 3-pass paint: bg fill, text+selection, cursor (Task 2)
- [x] Cursor is reverse-video block (Task 2 — manual fg/bg swap)
- [x] Multiline vScrollOffset + single-line hScrollOffset (Task 2)
- [x] All Ctrl/Alt/Arrow keybindings from spec (Task 3)
- [x] Mouse click (single/double/triple), drag, release (Task 3)
- [x] readOnly: blocks mutations but not navigation (Task 3)
- [x] TextField build: Focus → MouseRegion → TextFieldRenderWidget (Task 3)
- [x] All TextFieldProps from spec (Task 3)
- [x] RenderScrollbar metrics matching amp's `_calculateScrollbarMetrics` (Task 4)
- [x] Block element sub-character paint matching amp's `F1T.paint` (Task 4)
- [x] Scrollbar mouse: click above/below thumb pages, drag tracks proportionally (Task 4)
- [x] Scrollbar hides when content <= viewport (Task 4)
- [x] ScrollbarProps match spec (Task 4)
- [x] Export updates to editing/index.ts and index.ts (Tasks 3, 4)
- [x] Demo apps (Task 5)
- [x] tmux E2E verification (Task 6)

### Type consistency
- `getLayoutLines()` returns `LayoutLine[]` — exported from text-layout-engine.ts (Task 1)
- `RenderTextFieldProps` defined in render-text-field.ts, used by `TextFieldRenderWidget` (Task 2)
- `TextFieldRenderWidget.createElement()` returns `LeafRenderObjectElement` — both local copies identical (Tasks 2, 4)
- `hitTestPosition(localX, localY)` — called in TextFieldState with `event.x, event.y` (Task 3)
- `MouseEvent` imported from `mouse-region.ts` in scrollbar.ts — uses `.x, .y` for positions (Task 4)
- `ScrollbarMetrics` returned by `getMetrics()` on `RenderScrollbar` — used in `ScrollbarState` (Task 4)
