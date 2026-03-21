// Text widget — LeafRenderObjectWidget that renders rich text
// Amp ref: e0 (Text), gU0 (RenderText)
// Source: .reference/widgets-catalog.md

import { Key } from '../core/key';
import { TextStyle } from '../core/text-style';
import { TextSpan } from '../core/text-span';
import { Offset, Size } from '../core/types';
import { BoxConstraints } from '../core/box-constraints';
import { stringWidth } from '../core/wcwidth';
import { LeafRenderObjectWidget, RenderBox, PaintContext } from '../framework/render-object';

// ---------------------------------------------------------------------------
// Extended PaintContext for text rendering
// ---------------------------------------------------------------------------

export interface TextPaintContext extends PaintContext {
  drawChar?(col: number, row: number, char: string, style?: TextStyle): void;
  drawText?(col: number, row: number, text: string, style?: TextStyle): void;
}

// ---------------------------------------------------------------------------
// Text widget (Amp: e0)
// ---------------------------------------------------------------------------

/**
 * A leaf widget that displays styled text.
 *
 * Takes a TextSpan tree for rich text with per-segment styling.
 *
 * Amp ref: class e0 extends LeafRenderObjectWidget
 */
export class Text extends LeafRenderObjectWidget {
  readonly text: TextSpan;
  readonly textAlign: 'left' | 'center' | 'right';
  readonly maxLines?: number;
  readonly overflow: 'clip' | 'ellipsis';

  constructor(opts: {
    key?: Key;
    text: TextSpan;
    textAlign?: 'left' | 'center' | 'right';
    maxLines?: number;
    overflow?: 'clip' | 'ellipsis';
  }) {
    super(opts.key !== undefined ? { key: opts.key } : undefined);
    this.text = opts.text;
    this.textAlign = opts.textAlign ?? 'left';
    this.maxLines = opts.maxLines;
    this.overflow = opts.overflow ?? 'clip';
  }

  createRenderObject(): RenderText {
    return new RenderText({
      text: this.text,
      textAlign: this.textAlign,
      maxLines: this.maxLines,
      overflow: this.overflow,
    });
  }

  updateRenderObject(renderObject: RenderText): void {
    renderObject.text = this.text;
    renderObject.textAlign = this.textAlign;
    renderObject.maxLines = this.maxLines;
    renderObject.overflow = this.overflow;
  }
}

// ---------------------------------------------------------------------------
// RenderText (Amp: gU0)
// ---------------------------------------------------------------------------

/**
 * Render object for text content.
 * Computes size from text content and paints styled characters.
 *
 * Amp ref: class gU0 extends j9 (RenderBox)
 */
export class RenderText extends RenderBox {
  private _text: TextSpan;
  private _textAlign: 'left' | 'center' | 'right';
  private _maxLines?: number;
  private _overflow: 'clip' | 'ellipsis';

  constructor(opts: {
    text: TextSpan;
    textAlign?: 'left' | 'center' | 'right';
    maxLines?: number;
    overflow?: 'clip' | 'ellipsis';
  }) {
    super();
    this._text = opts.text;
    this._textAlign = opts.textAlign ?? 'left';
    this._maxLines = opts.maxLines;
    this._overflow = opts.overflow ?? 'clip';
  }

  get text(): TextSpan {
    return this._text;
  }

  set text(value: TextSpan) {
    this._text = value;
    this.markNeedsLayout();
  }

  get textAlign(): 'left' | 'center' | 'right' {
    return this._textAlign;
  }

  set textAlign(value: 'left' | 'center' | 'right') {
    if (this._textAlign === value) return;
    this._textAlign = value;
    this.markNeedsPaint();
  }

  get maxLines(): number | undefined {
    return this._maxLines;
  }

  set maxLines(value: number | undefined) {
    if (this._maxLines === value) return;
    this._maxLines = value;
    this.markNeedsLayout();
  }

  get overflow(): 'clip' | 'ellipsis' {
    return this._overflow;
  }

  set overflow(value: 'clip' | 'ellipsis') {
    if (this._overflow === value) return;
    this._overflow = value;
    this.markNeedsPaint();
  }

  /**
   * Extract lines from the TextSpan tree.
   * Returns an array of lines, where each line is an array of { char, style } segments.
   */
  private _getLines(): { char: string; style: TextStyle }[][] {
    const segments: { text: string; style: TextStyle }[] = [];
    this._text.visitChildren((text, style) => {
      segments.push({ text, style });
    });

    // Build character-level line data
    const lines: { char: string; style: TextStyle }[][] = [[]];
    for (const seg of segments) {
      for (const ch of seg.text) {
        if (ch === '\n') {
          lines.push([]);
        } else {
          lines[lines.length - 1]!.push({ char: ch, style: seg.style });
        }
      }
    }
    return lines;
  }

  /**
   * Compute the display width of a line (array of char+style pairs).
   */
  private _lineWidth(line: { char: string; style: TextStyle }[]): number {
    let w = 0;
    for (const { char } of line) {
      w += stringWidth(char);
    }
    return w;
  }

  // Amp ref: gU0.performLayout()
  performLayout(): void {
    const constraints = this.constraints!;
    const lines = this._getLines();

    // Apply maxLines clipping
    const displayLines = this._maxLines !== undefined
      ? lines.slice(0, this._maxLines)
      : lines;

    // Compute intrinsic width: max line width
    let maxLineWidth = 0;
    for (const line of displayLines) {
      const w = this._lineWidth(line);
      if (w > maxLineWidth) maxLineWidth = w;
    }

    // Compute intrinsic height: number of display lines
    const intrinsicHeight = displayLines.length;

    // Constrain to parent constraints
    this.size = constraints.constrain(
      new Size(maxLineWidth, intrinsicHeight),
    );
  }

  // Amp ref: gU0.paint()
  paint(context: PaintContext, offset: Offset): void {
    const ctx = context as TextPaintContext;
    if (!ctx.drawChar) return;

    const lines = this._getLines();
    const displayLines = this._maxLines !== undefined
      ? lines.slice(0, this._maxLines)
      : lines;
    const availWidth = this.size.width;
    const availHeight = this.size.height;

    for (let lineIdx = 0; lineIdx < displayLines.length && lineIdx < availHeight; lineIdx++) {
      let line = displayLines[lineIdx]!;
      let lineW = this._lineWidth(line);

      // Handle overflow: ellipsis
      const isTruncated = this._maxLines !== undefined
        && lines.length > this._maxLines
        && lineIdx === displayLines.length - 1;
      const isWidthTruncated = lineW > availWidth;

      if ((isTruncated || isWidthTruncated) && this._overflow === 'ellipsis') {
        line = this._applyEllipsis(line, availWidth);
        lineW = this._lineWidth(line);
      }

      // Compute left offset for alignment
      let leftOffset = 0;
      if (this._textAlign === 'center') {
        leftOffset = Math.floor((availWidth - lineW) / 2);
      } else if (this._textAlign === 'right') {
        leftOffset = availWidth - lineW;
      }
      if (leftOffset < 0) leftOffset = 0;

      // Paint characters
      let col = offset.col + leftOffset;
      const row = offset.row + lineIdx;
      for (const { char, style } of line) {
        const charW = stringWidth(char);
        if (col - offset.col + charW > availWidth) break; // clip at width boundary
        ctx.drawChar!(col, row, char, style);
        col += charW;
      }
    }
  }

  /**
   * Apply ellipsis: truncate line so it fits in availWidth with '...' at end.
   */
  private _applyEllipsis(
    line: { char: string; style: TextStyle }[],
    availWidth: number,
  ): { char: string; style: TextStyle }[] {
    const ellipsis = '...';
    const ellipsisWidth = 3; // each '.' is width 1

    if (availWidth <= ellipsisWidth) {
      // Not enough room for ellipsis, just show dots that fit
      const result: { char: string; style: TextStyle }[] = [];
      const lastStyle = line.length > 0 ? line[line.length - 1]!.style : new TextStyle();
      for (let i = 0; i < availWidth; i++) {
        result.push({ char: '.', style: lastStyle });
      }
      return result;
    }

    // Truncate line to fit availWidth - ellipsisWidth, then append '...'
    const targetWidth = availWidth - ellipsisWidth;
    const result: { char: string; style: TextStyle }[] = [];
    let currentWidth = 0;
    for (const entry of line) {
      const charW = stringWidth(entry.char);
      if (currentWidth + charW > targetWidth) break;
      result.push(entry);
      currentWidth += charW;
    }

    // Append '...'
    const lastStyle = result.length > 0 ? result[result.length - 1]!.style : new TextStyle();
    for (const ch of ellipsis) {
      result.push({ char: ch, style: lastStyle });
    }

    return result;
  }
}
