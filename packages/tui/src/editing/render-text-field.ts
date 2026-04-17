/**
 * RenderTextField — 文本输入框渲染对象。
 *
 * 逆向: L1T (RenderTextField) in actions_intents.js:~1500-1731
 *
 * @module
 */

import { Color } from "../screen/color.js";
import type { Screen } from "../screen/screen.js";
import { TextStyle } from "../screen/text-style.js";
import { charWidth } from "../text/char-width.js";
import type { Element, Widget as WidgetInterface } from "../tree/element.js";
import { RenderBox } from "../tree/render-box.js";
import type { RenderObject } from "../tree/render-object.js";
import type { RenderObjectWidget } from "../tree/render-object-element.js";
import { RenderObjectElement } from "../tree/render-object-element.js";
import { Widget } from "../tree/widget.js";
import type { TextEditingController } from "./text-editing-controller.js";

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
    this._props.controller.updateWidth(width);
    const totalLines = this._props.controller.lineCount;
    const { minLines, maxLines } = this._props;
    if (maxLines !== null) {
      return Math.max(minLines, Math.min(totalLines, maxLines));
    }
    return Math.max(minLines, totalLines);
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
    const selColor = this._props.selectionColor ?? Color.blue();
    const cursorFg = this._props.cursorColor ?? fgColor;

    // ── Pass 1: Background fill ──────────────────────
    // 逆向: L1T.paint — first fills entire rect with background color
    screen.fill(x, y, w, h, " ", { bg: bgColor });

    const layoutLines = ctrl.getLayoutLines();
    const selRange = ctrl.selectionRange;

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
          const style = inSelection
            ? new TextStyle({ foreground: fgColor, background: selColor })
            : (this._props.textStyle ?? TextStyle.NORMAL);

          screen.writeChar(screenX, screenY, g, style, gw);
          screenX += gw;
        }
      }
    } else {
      // Single-line: horizontal scrolling
      const line = layoutLines[0];
      if (line) {
        let col = 0;
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

      if (
        cursorScreenX >= x &&
        cursorScreenX < x + w &&
        cursorScreenY >= y &&
        cursorScreenY < y + h
      ) {
        let cursorChar = " ";
        if (cursorPos < gs.length && gs[cursorPos] !== "\n") {
          cursorChar = gs[cursorPos]!;
        }
        const cw = charWidth(cursorChar);

        // Reverse-video: swap fg ↔ bg (TextStyle has no .reverse property)
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
      let col = -this._hScrollOffset;
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
