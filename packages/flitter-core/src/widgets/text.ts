// Text widget — LeafRenderObjectWidget that renders rich text
// Amp ref: e0 (Text), gU0 (RenderText)
// Source: .reference/widgets-catalog.md

import { Key } from '../core/key';
import { TextStyle } from '../core/text-style';
import { TextSpan, TextSpanHyperlink } from '../core/text-span';
import { Color } from '../core/color';
import { Offset, Size, Rect } from '../core/types';
import { BoxConstraints } from '../core/box-constraints';
import { stringWidth } from '../core/wcwidth';
import { LeafRenderObjectWidget, RenderBox, PaintContext } from '../framework/render-object';
import { MouseManager } from '../input/mouse-manager';
import { SystemMouseCursors } from '../input/mouse-cursors';
import { textStyleToCellStyle } from '../scheduler/paint-context';
import type { CellStyle } from '../terminal/cell';
import type { CellHyperlinkValue } from '../terminal/cell';

// ---------------------------------------------------------------------------
// Selection range type
// ---------------------------------------------------------------------------

/** Represents a character index range within the text content. */
export interface TextSelectionRange {
  readonly start: number;
  readonly end: number;
}

/** Character position data cached during layout. */
export interface CharacterPosition {
  readonly col: number;
  readonly row: number;
  readonly width: number;
}

/** Visual line data cached during layout. */
export interface VisualLine {
  readonly startIndex: number;
  readonly endIndex: number;
  readonly row: number;
}

/** Per-character interaction data cached during layout. */
export interface CharacterInteraction {
  readonly hyperlink?: TextSpanHyperlink;
  readonly onClick?: () => void;
}

// ---------------------------------------------------------------------------
// Extended PaintContext for text rendering
// ---------------------------------------------------------------------------

export interface TextPaintContext extends PaintContext {
  drawChar(col: number, row: number, char: string, style?: CellStyle, width?: number, hyperlink?: CellHyperlinkValue): void;
  drawText?(col: number, row: number, text: string, style?: CellStyle): void;
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
 * Supports text selection highlighting and character position tracking.
 *
 * Amp ref: class gU0 extends j9 (RenderBox)
 */
export class RenderText extends RenderBox {
  private _text: TextSpan;
  private _textAlign: 'left' | 'center' | 'right';
  private _maxLines?: number;
  private _overflow: 'clip' | 'ellipsis';

  // --- Selection state ---
  selectable: boolean = false;
  selectedRanges: TextSelectionRange[] = [];
  private _selectionColor?: Color;
  private _copyHighlightColor?: Color;
  private _highlightMode: 'selection' | 'copy' | 'none' = 'none';
  private _copyFadeTimer: ReturnType<typeof setTimeout> | null = null;
  selectableId?: string;

  // --- Character position cache (rebuilt during layout) ---
  private _characterPositions: CharacterPosition[] = [];
  private _visualLines: VisualLine[] = [];
  private _characterInteractions: CharacterInteraction[] = [];

  constructor(opts: {
    text: TextSpan;
    textAlign?: 'left' | 'center' | 'right';
    maxLines?: number;
    overflow?: 'clip' | 'ellipsis';
    selectable?: boolean;
    selectionColor?: Color;
    copyHighlightColor?: Color;
    selectableId?: string;
  }) {
    super();
    this._text = opts.text;
    this._textAlign = opts.textAlign ?? 'left';
    this._maxLines = opts.maxLines;
    this._overflow = opts.overflow ?? 'clip';
    if (opts.selectable !== undefined) this.selectable = opts.selectable;
    if (opts.selectionColor !== undefined) this._selectionColor = opts.selectionColor;
    if (opts.copyHighlightColor !== undefined) this._copyHighlightColor = opts.copyHighlightColor;
    if (opts.selectableId !== undefined) this.selectableId = opts.selectableId;
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

  // --- Selection accessors ---

  get selectionColor(): Color | undefined {
    return this._selectionColor;
  }

  set selectionColor(value: Color | undefined) {
    this._selectionColor = value;
    if (this._highlightMode !== 'none') this.markNeedsPaint();
  }

  get copyHighlightColor(): Color | undefined {
    return this._copyHighlightColor;
  }

  set copyHighlightColor(value: Color | undefined) {
    this._copyHighlightColor = value;
    if (this._highlightMode === 'copy') this.markNeedsPaint();
  }

  get highlightMode(): 'selection' | 'copy' | 'none' {
    return this._highlightMode;
  }

  // --- Position cache accessors (read-only) ---

  get characterPositions(): ReadonlyArray<CharacterPosition> {
    return this._characterPositions;
  }

  get visualLines(): ReadonlyArray<VisualLine> {
    return this._visualLines;
  }

  // --- Selection methods ---

  /**
   * Update selection range and highlight mode.
   * Clamps start/end to valid character indices.
   */
  updateSelection(start: number, end: number, mode: 'selection' | 'copy'): void {
    const totalChars = this._characterPositions.length;
    const clampedStart = Math.max(0, Math.min(start, totalChars));
    const clampedEnd = Math.max(clampedStart, Math.min(end, totalChars));
    this.selectedRanges = [{ start: clampedStart, end: clampedEnd }];
    this._highlightMode = mode;
    this.markNeedsPaint();
  }

  /**
   * Clear all selection state.
   */
  clearSelection(): void {
    if (this.selectedRanges.length === 0 && this._highlightMode === 'none') return;
    this.selectedRanges = [];
    this._highlightMode = 'none';
    this.markNeedsPaint();
  }

  // --- Position query methods ---

  /**
   * Returns the bounding rectangle for a character at the given index.
   * Returns null if the index is out of range.
   */
  getCharacterRect(index: number): Rect | null {
    if (index < 0 || index >= this._characterPositions.length) return null;
    const pos = this._characterPositions[index]!;
    return new Rect(pos.col, pos.row, pos.width, 1);
  }

  /**
   * Returns the character index closest to the given (x, y) position.
   * Coordinates are relative to the render object's origin (not global offset).
   * Returns -1 if no characters exist.
   */
  getOffsetForPosition(x: number, y: number): number {
    if (this._characterPositions.length === 0) return -1;

    // Find the visual line matching the y coordinate
    let targetLine: VisualLine | null = null;
    for (const line of this._visualLines) {
      if (line.row === y) {
        targetLine = line;
        break;
      }
    }

    // If no exact row match, find the closest row
    if (targetLine === null) {
      let bestDist = Infinity;
      for (const line of this._visualLines) {
        const dist = Math.abs(line.row - y);
        if (dist < bestDist) {
          bestDist = dist;
          targetLine = line;
        }
      }
    }

    if (targetLine === null) return -1;

    // Search characters within this line for the closest x position
    let bestIndex = targetLine.startIndex;
    let bestDist = Infinity;

    for (let i = targetLine.startIndex; i < targetLine.endIndex; i++) {
      const pos = this._characterPositions[i]!;
      // Distance from x to the center of the character
      const charCenter = pos.col + pos.width / 2;
      const dist = Math.abs(x - charCenter);
      if (dist < bestDist) {
        bestDist = dist;
        bestIndex = i;
      }
    }

    // If x is past the last character, return the end of the line
    if (targetLine.endIndex > targetLine.startIndex) {
      const lastPos = this._characterPositions[targetLine.endIndex - 1]!;
      if (x >= lastPos.col + lastPos.width) {
        return targetLine.endIndex - 1;
      }
    }

    return bestIndex;
  }

  // --- Interaction query methods ---

  /**
   * Find the character index whose cell contains the exact (x, y) position.
   * Returns -1 if no character cell contains the position.
   * Unlike getOffsetForPosition (which returns the nearest), this requires
   * the point to be within the character cell bounds [col, col+width).
   */
  private _getCharacterIndexAtExactPosition(x: number, y: number): number {
    if (this._characterPositions.length === 0) return -1;

    // Find the visual line matching the y coordinate exactly
    let targetLine: VisualLine | null = null;
    for (const line of this._visualLines) {
      if (line.row === y) {
        targetLine = line;
        break;
      }
    }
    if (targetLine === null) return -1;

    // Search characters within this line for an exact cell hit
    for (let i = targetLine.startIndex; i < targetLine.endIndex; i++) {
      const pos = this._characterPositions[i]!;
      if (x >= pos.col && x < pos.col + pos.width) {
        return i;
      }
    }

    return -1;
  }

  /**
   * Returns the hyperlink at the given (x, y) position, or null if none.
   * Coordinates are relative to the render object's origin.
   */
  getHyperlinkAtPosition(x: number, y: number): TextSpanHyperlink | null {
    const charIdx = this._getCharacterIndexAtExactPosition(x, y);
    if (charIdx < 0 || charIdx >= this._characterInteractions.length) return null;

    const interaction = this._characterInteractions[charIdx]!;
    return interaction.hyperlink ?? null;
  }

  /**
   * Returns the onClick handler at the given (x, y) position, or null if none.
   * Coordinates are relative to the render object's origin.
   */
  getOnClickAtPosition(x: number, y: number): (() => void) | null {
    const charIdx = this._getCharacterIndexAtExactPosition(x, y);
    if (charIdx < 0 || charIdx >= this._characterInteractions.length) return null;

    const interaction = this._characterInteractions[charIdx]!;
    return interaction.onClick ?? null;
  }

  /**
   * Handle a mouse event at the given position.
   *
   * On 'click': invokes onClick handler if found at position.
   * On 'enter'/'hover': updates cursor to POINTER if hyperlink/onClick present.
   * On 'exit': resets cursor to DEFAULT.
   *
   * @param event Mouse event with type and position
   */
  handleMouseEvent(event: { type: string; x: number; y: number }): void {
    const { type, x, y } = event;

    if (type === 'click') {
      const onClick = this.getOnClickAtPosition(x, y);
      if (onClick) {
        onClick();
        return;
      }
      // Hyperlink click could log or open the URI; for now just a no-op
      // since opening URIs requires platform integration
    } else if (type === 'enter' || type === 'hover') {
      const hasInteraction =
        this.getHyperlinkAtPosition(x, y) !== null ||
        this.getOnClickAtPosition(x, y) !== null;

      if (hasInteraction) {
        MouseManager.instance.updateCursorOverride(SystemMouseCursors.POINTER);
      }
    } else if (type === 'exit') {
      MouseManager.instance.updateCursorOverride(SystemMouseCursors.DEFAULT);
    }
  }

  /**
   * Extract lines from the TextSpan tree.
   * Returns an array of lines, where each line is an array of { char, style, hyperlink, onClick } segments.
   */
  private _getLines(): { char: string; style: TextStyle; hyperlink?: TextSpanHyperlink; onClick?: () => void }[][] {
    const segments: { text: string; style: TextStyle; hyperlink?: TextSpanHyperlink; onClick?: () => void }[] = [];
    this._text.visitChildren((text, style, hyperlink, onClick) => {
      segments.push({ text, style, hyperlink, onClick });
    });

    // Build character-level line data
    const lines: { char: string; style: TextStyle; hyperlink?: TextSpanHyperlink; onClick?: () => void }[][] = [[]];
    for (const seg of segments) {
      for (const ch of seg.text) {
        if (ch === '\n') {
          lines.push([]);
        } else {
          lines[lines.length - 1]!.push({
            char: ch,
            style: seg.style,
            hyperlink: seg.hyperlink,
            onClick: seg.onClick,
          });
        }
      }
    }
    return lines;
  }

  /**
   * Compute the display width of a line (array of char+style pairs).
   */
  private _lineWidth(line: { char: string; style: TextStyle; hyperlink?: TextSpanHyperlink; onClick?: () => void }[]): number {
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

    // Rebuild character position cache
    this._rebuildPositionCache(displayLines);
  }

  /**
   * Rebuild the character position and visual line caches.
   * Called during performLayout() after the text lines are computed.
   */
  private _rebuildPositionCache(displayLines: { char: string; style: TextStyle; hyperlink?: TextSpanHyperlink; onClick?: () => void }[][]): void {
    const positions: CharacterPosition[] = [];
    const visualLines: VisualLine[] = [];
    const interactions: CharacterInteraction[] = [];
    const availWidth = this.size.width;
    let charIndex = 0;

    for (let lineIdx = 0; lineIdx < displayLines.length; lineIdx++) {
      const line = displayLines[lineIdx]!;
      const lineW = this._lineWidth(line);

      // Compute left offset for alignment (same logic as paint)
      let leftOffset = 0;
      if (this._textAlign === 'center') {
        leftOffset = Math.floor((availWidth - lineW) / 2);
      } else if (this._textAlign === 'right') {
        leftOffset = availWidth - lineW;
      }
      if (leftOffset < 0) leftOffset = 0;

      const lineStartIndex = charIndex;

      let col = leftOffset;
      for (const { char, hyperlink, onClick } of line) {
        const charW = stringWidth(char);
        positions.push({ col, row: lineIdx, width: charW });
        interactions.push({
          hyperlink: hyperlink,
          onClick: onClick,
        });
        col += charW;
        charIndex++;
      }

      visualLines.push({
        startIndex: lineStartIndex,
        endIndex: charIndex,
        row: lineIdx,
      });
    }

    this._characterPositions = positions;
    this._visualLines = visualLines;
    this._characterInteractions = interactions;
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

    // Build a set of highlighted character indices for fast lookup
    const highlightedIndices = this._buildHighlightSet();

    // Determine highlight color based on mode
    const highlightColor = this._getHighlightColor();

    // Track global character index across lines (for selection highlighting)
    let charIndex = 0;

    for (let lineIdx = 0; lineIdx < displayLines.length && lineIdx < availHeight; lineIdx++) {
      let line = displayLines[lineIdx]!;
      let lineW = this._lineWidth(line);
      const lineCharCount = line.length;

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
      for (let ci = 0; ci < line.length; ci++) {
        const { char, style, hyperlink } = line[ci]!;
        const charW = stringWidth(char);
        if (col - offset.col + charW > availWidth) break; // clip at width boundary

        const hlValue: CellHyperlinkValue | undefined = hyperlink
          ? (hyperlink.id ? { uri: hyperlink.uri, id: hyperlink.id } : hyperlink.uri)
          : undefined;

        const globalCharIdx = charIndex + ci;
        if (this.selectable && highlightColor && highlightedIndices.has(globalCharIdx)) {
          const highlightedStyle = style.copyWith({ background: highlightColor });
          ctx.drawChar!(col, row, char, textStyleToCellStyle(highlightedStyle), undefined, hlValue);
        } else {
          ctx.drawChar!(col, row, char, textStyleToCellStyle(style), undefined, hlValue);
        }
        col += charW;
      }

      charIndex += lineCharCount;
    }
  }

  /**
   * Build a Set of character indices that are within any selected range.
   */
  private _buildHighlightSet(): Set<number> {
    const set = new Set<number>();
    if (!this.selectable || this._highlightMode === 'none' || this.selectedRanges.length === 0) {
      return set;
    }
    for (const range of this.selectedRanges) {
      for (let i = range.start; i < range.end; i++) {
        set.add(i);
      }
    }
    return set;
  }

  /**
   * Get the appropriate highlight color based on the current highlight mode.
   */
  private _getHighlightColor(): Color | undefined {
    if (this._highlightMode === 'selection') {
      return this._selectionColor;
    }
    if (this._highlightMode === 'copy') {
      return this._copyHighlightColor ?? this._selectionColor;
    }
    return undefined;
  }

  /**
   * Apply ellipsis: truncate line so it fits in availWidth with '...' at end.
   */
  private _applyEllipsis(
    line: { char: string; style: TextStyle; hyperlink?: TextSpanHyperlink; onClick?: () => void }[],
    availWidth: number,
  ): { char: string; style: TextStyle; hyperlink?: TextSpanHyperlink; onClick?: () => void }[] {
    const ellipsis = '...';
    const ellipsisWidth = 3; // each '.' is width 1

    if (availWidth <= ellipsisWidth) {
      // Not enough room for ellipsis, just show dots that fit
      const result: { char: string; style: TextStyle; hyperlink?: TextSpanHyperlink; onClick?: () => void }[] = [];
      const lastStyle = line.length > 0 ? line[line.length - 1]!.style : new TextStyle();
      for (let i = 0; i < availWidth; i++) {
        result.push({ char: '.', style: lastStyle });
      }
      return result;
    }

    // Truncate line to fit availWidth - ellipsisWidth, then append '...'
    const targetWidth = availWidth - ellipsisWidth;
    const result: { char: string; style: TextStyle; hyperlink?: TextSpanHyperlink; onClick?: () => void }[] = [];
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
