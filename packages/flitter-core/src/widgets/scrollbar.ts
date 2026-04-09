// Scrollbar widget — StatefulWidget that renders a scrollbar synced to a ScrollController
// Amp ref: ia class — leaf render object for scrollbar rendering
// Typically placed in a Row alongside an Expanded ScrollView (vertical)
// or in a Column below a scroll view (horizontal)
//
// Enhancements (Gap R07):
//   Phase 1: PaintContext type safety — removed all `as any` casts
//   Phase 2: Horizontal scrollbar support via `axis` property
//   Phase 3: Mouse interaction — click-to-jump and thumb dragging via MouseRegion

import {
  Widget,
  StatefulWidget,
  State,
  type BuildContext,
} from '../framework/widget';
import {
  LeafRenderObjectWidget,
  RenderBox,
  type PaintContext,
} from '../framework/render-object';
import { BoxConstraints } from '../core/box-constraints';
import { Offset, Size } from '../core/types';
import { Color } from '../core/color';
import { ScrollController } from './scroll-controller';
import { MouseRegion, type MouseRegionEvent } from './mouse-region';
import { Key } from '../core/key';

/** Unicode lower-block elements for 1/8 character precision vertical scrollbar rendering (amp ref: ia class). */
const BLOCK_ELEMENTS = [' ', '\u2581', '\u2582', '\u2583', '\u2584', '\u2585', '\u2586', '\u2587', '\u2588'];

/** Unicode left-block elements for 1/8 character precision horizontal scrollbar rendering.
 *  Left block elements fill from the LEFT edge rightward — the horizontal analogue of
 *  lower block elements filling from the bottom upward.
 */
const LEFT_BLOCK_ELEMENTS = [' ', '\u258F', '\u258E', '\u258D', '\u258C', '\u258B', '\u258A', '\u2589', '\u2588'];

// ---------------------------------------------------------------------------
// ScrollbarCellStyle — typed style for scrollbar cell rendering (replaces `any`)
// ---------------------------------------------------------------------------

interface ScrollbarCellStyle {
  fg?: Color;
  bg?: Color;
  inverse?: boolean;
}

// ---------------------------------------------------------------------------
// ScrollInfo — describes current scroll state for rendering the scrollbar
// ---------------------------------------------------------------------------

/**
 * Provides the scroll state information needed to render the scrollbar thumb.
 * Supports both axis-generic fields (totalContentExtent/viewportExtent) and
 * legacy vertical-specific fields (totalContentHeight/viewportHeight).
 */
export interface ScrollInfo {
  /** Total content size along the scroll axis. */
  totalContentExtent?: number;
  /** Viewport size along the scroll axis. */
  viewportExtent?: number;
  /** Current scroll offset along the scroll axis. */
  scrollOffset: number;

  // Backward-compatible aliases (legacy vertical-specific fields):
  /** @deprecated Use totalContentExtent instead. */
  totalContentHeight?: number;
  /** @deprecated Use viewportExtent instead. */
  viewportHeight?: number;
}

// ---------------------------------------------------------------------------
// Scrollbar (Amp: ia)
// ---------------------------------------------------------------------------

/**
 * A StatefulWidget that renders a scrollbar synced to a ScrollController.
 *
 * The scrollbar renders as a line of characters along the scroll axis:
 * - Track: filled with trackChar (default '░') for the full extent
 * - Thumb: filled with thumbChar (default '█') at the scroll position
 *
 * Supports both vertical (default) and horizontal axes.
 * When interactive and a controller is provided, supports click-to-jump and thumb dragging.
 *
 * Usage (vertical):
 *   new Row({ children: [
 *     new Expanded({ child: new SingleChildScrollView({ controller, child }) }),
 *     new Scrollbar({ controller }),
 *   ]})
 *
 * Usage (horizontal):
 *   new Column({ children: [
 *     new Expanded({ child: new SingleChildScrollView({ controller, scrollDirection: 'horizontal', child }) }),
 *     new Scrollbar({ controller, axis: 'horizontal' }),
 *   ]})
 *
 * Amp ref: ia class
 */
export class Scrollbar extends StatefulWidget {
  readonly controller?: ScrollController;
  readonly getScrollInfo?: () => ScrollInfo;
  readonly thickness: number;
  readonly trackChar: string;
  readonly thumbChar: string;
  readonly showTrack: boolean;
  readonly thumbColor?: Color;
  readonly trackColor?: Color;
  readonly subCharacterPrecision: boolean;
  readonly axis: 'vertical' | 'horizontal';
  readonly interactive: boolean;
  readonly thumbMinExtent: number;

  constructor(opts: {
    key?: Key;
    controller?: ScrollController;
    getScrollInfo?: () => ScrollInfo;
    thickness?: number;
    trackChar?: string;
    thumbChar?: string;
    showTrack?: boolean;
    thumbColor?: Color;
    trackColor?: Color;
    subCharacterPrecision?: boolean;
    axis?: 'vertical' | 'horizontal';
    interactive?: boolean;
    thumbMinExtent?: number;
  }) {
    super(opts.key !== undefined ? { key: opts.key } : undefined);
    this.controller = opts.controller;
    this.getScrollInfo = opts.getScrollInfo;
    this.thickness = opts.thickness ?? 1;
    this.trackChar = opts.trackChar ?? '\u2591'; // ░ light shade
    this.thumbChar = opts.thumbChar ?? '\u2588'; // █ full block
    this.showTrack = opts.showTrack ?? true;
    this.thumbColor = opts.thumbColor;
    this.trackColor = opts.trackColor;
    this.subCharacterPrecision = opts.subCharacterPrecision ?? true;
    this.axis = opts.axis ?? 'vertical';
    this.interactive = opts.interactive ?? true;
    this.thumbMinExtent = opts.thumbMinExtent ?? 1;
  }

  createState(): State<Scrollbar> {
    return new ScrollbarState();
  }
}

// ---------------------------------------------------------------------------
// ScrollbarState
// ---------------------------------------------------------------------------

/**
 * State for Scrollbar. Manages the ScrollController listener lifecycle,
 * mouse interaction state (drag), and builds the underlying _ScrollbarRender
 * leaf widget wrapped in an optional MouseRegion.
 */
class ScrollbarState extends State<Scrollbar> {
  private _isDragging: boolean = false;
  private _dragStartScrollOffset: number = 0;
  private _dragStartAxisPosition: number = 0;
  private _isHovered: boolean = false;

  private _onScrollChanged = (): void => {
    if (this.mounted) {
      this.setState();
    }
  };

  initState(): void {
    super.initState();
    this.widget.controller?.addListener(this._onScrollChanged);
  }

  didUpdateWidget(oldWidget: Scrollbar): void {
    if (oldWidget.controller !== this.widget.controller) {
      oldWidget.controller?.removeListener(this._onScrollChanged);
      this.widget.controller?.addListener(this._onScrollChanged);
    }
  }

  dispose(): void {
    this.widget.controller?.removeListener(this._onScrollChanged);
    super.dispose();
  }

  // ---- Mouse interaction handlers ----

  /**
   * Compute thumb start and end positions for the current scroll state.
   * Used by click handler to determine if the click is on the thumb or track.
   */
  private _getCurrentThumbMetrics(scrollbarExtent: number): { thumbStart: number; thumbEnd: number } | null {
    const ctrl = this.widget.controller;
    if (!ctrl || scrollbarExtent <= 0) return null;

    const totalContent = ctrl.maxScrollExtent + ctrl.viewportSize;
    if (totalContent <= 0 || totalContent <= ctrl.viewportSize) return null;

    const thumbExtent = Math.max(
      this.widget.thumbMinExtent,
      Math.round((ctrl.viewportSize / totalContent) * scrollbarExtent),
    );
    const maxThumbStart = scrollbarExtent - thumbExtent;
    const scrollFraction = ctrl.maxScrollExtent > 0
      ? ctrl.offset / ctrl.maxScrollExtent
      : 0;
    const thumbStart = Math.round(Math.max(0, Math.min(scrollFraction * maxThumbStart, maxThumbStart)));
    return { thumbStart, thumbEnd: thumbStart + thumbExtent };
  }

  private _handleClick = (event: MouseRegionEvent): void => {
    const ctrl = this.widget.controller;
    if (!ctrl) return;

    const isVertical = this.widget.axis === 'vertical';
    const scrollbarExtent = ctrl.viewportSize;
    if (scrollbarExtent <= 0) return;

    // Use the axis-appropriate coordinate
    const axisPosition = isVertical ? event.y : event.x;

    // Check if click is on the thumb
    const thumbMetrics = this._getCurrentThumbMetrics(scrollbarExtent);
    if (thumbMetrics) {
      const { thumbStart, thumbEnd } = thumbMetrics;
      if (axisPosition >= thumbStart && axisPosition < thumbEnd) {
        // Click is on the thumb -- start drag
        this._isDragging = true;
        this._dragStartScrollOffset = ctrl.offset;
        this._dragStartAxisPosition = axisPosition;
        return;
      }
    }

    // Click is on the track -- jump to position (linear mapping)
    const fraction = Math.max(0, Math.min(axisPosition / scrollbarExtent, 1));
    const targetOffset = fraction * ctrl.maxScrollExtent;
    ctrl.disableFollowMode();
    ctrl.jumpTo(targetOffset);
  };

  private _handleDrag = (event: MouseRegionEvent): void => {
    if (!this._isDragging) return;

    const ctrl = this.widget.controller;
    if (!ctrl) return;

    const isVertical = this.widget.axis === 'vertical';
    const axisPosition = isVertical ? event.y : event.x;
    const scrollbarExtent = ctrl.viewportSize;
    if (scrollbarExtent <= 0) return;

    // Compute axis delta since drag start
    const axisDelta = axisPosition - this._dragStartAxisPosition;

    // Map axis delta to scroll offset delta
    const totalContent = ctrl.maxScrollExtent + ctrl.viewportSize;
    const thumbExtent = Math.max(
      this.widget.thumbMinExtent,
      Math.round((ctrl.viewportSize / totalContent) * scrollbarExtent),
    );
    const trackAvailable = scrollbarExtent - thumbExtent;
    if (trackAvailable <= 0) return;

    const scrollDelta = (axisDelta / trackAvailable) * ctrl.maxScrollExtent;
    const newOffset = this._dragStartScrollOffset + scrollDelta;

    ctrl.disableFollowMode();
    ctrl.jumpTo(newOffset);
  };

  private _handleRelease = (_event: MouseRegionEvent): void => {
    this._isDragging = false;
  };

  private _handleEnter = (_event: MouseRegionEvent): void => {
    if (!this._isHovered) {
      this._isHovered = true;
      if (this.mounted) {
        this.setState();
      }
    }
  };

  private _handleExit = (_event: MouseRegionEvent): void => {
    if (this._isHovered) {
      this._isHovered = false;
      if (this.mounted) {
        this.setState();
      }
    }
  };

  build(_context: BuildContext): Widget {
    // Compute scroll info from controller or getScrollInfo callback
    let scrollInfo: ScrollInfo | undefined;

    if (this.widget.getScrollInfo) {
      scrollInfo = this.widget.getScrollInfo();
    } else if (this.widget.controller) {
      const ctrl = this.widget.controller;
      // Derive exact scroll info from controller state.
      // ScrollController tracks viewportSize (set by RenderScrollViewport during layout)
      // and maxScrollExtent = totalContentHeight - viewportHeight.
      const vpSize = ctrl.viewportSize;
      scrollInfo = {
        totalContentExtent: vpSize > 0
          ? ctrl.maxScrollExtent + vpSize
          : 0,
        viewportExtent: vpSize,
        scrollOffset: ctrl.offset,
        // Backward compat aliases:
        totalContentHeight: vpSize > 0
          ? ctrl.maxScrollExtent + vpSize
          : 0,
        viewportHeight: vpSize,
      };
    }

    let child: Widget = new _ScrollbarRender({
      scrollInfo,
      axis: this.widget.axis,
      thickness: this.widget.thickness,
      trackChar: this.widget.trackChar,
      thumbChar: this.widget.thumbChar,
      showTrack: this.widget.showTrack,
      thumbColor: this.widget.thumbColor,
      trackColor: this.widget.trackColor,
      subCharacterPrecision: this.widget.subCharacterPrecision,
      isHovered: this._isHovered,
    });

    if (this.widget.interactive && this.widget.controller) {
      child = new MouseRegion({
        onClick: this._handleClick,
        onDrag: this._handleDrag,
        onRelease: this._handleRelease,
        onEnter: this._handleEnter,
        onExit: this._handleExit,
        cursor: 'pointer',
        child,
      });
    }

    return child;
  }
}

// ---------------------------------------------------------------------------
// _ScrollbarRender (LeafRenderObjectWidget)
// ---------------------------------------------------------------------------

class _ScrollbarRender extends LeafRenderObjectWidget {
  readonly scrollInfo?: ScrollInfo;
  readonly axis: 'vertical' | 'horizontal';
  readonly thickness: number;
  readonly trackChar: string;
  readonly thumbChar: string;
  readonly showTrack: boolean;
  readonly thumbColor?: Color;
  readonly trackColor?: Color;
  readonly subCharacterPrecision: boolean;
  readonly isHovered: boolean;

  constructor(opts: {
    scrollInfo?: ScrollInfo;
    axis: 'vertical' | 'horizontal';
    thickness: number;
    trackChar: string;
    thumbChar: string;
    showTrack: boolean;
    thumbColor?: Color;
    trackColor?: Color;
    subCharacterPrecision: boolean;
    isHovered?: boolean;
  }) {
    super();
    this.scrollInfo = opts.scrollInfo;
    this.axis = opts.axis;
    this.thickness = opts.thickness;
    this.trackChar = opts.trackChar;
    this.thumbChar = opts.thumbChar;
    this.showTrack = opts.showTrack;
    this.thumbColor = opts.thumbColor;
    this.trackColor = opts.trackColor;
    this.subCharacterPrecision = opts.subCharacterPrecision;
    this.isHovered = opts.isHovered ?? false;
  }

  createRenderObject(): RenderScrollbar {
    return new RenderScrollbar(
      this.scrollInfo,
      this.axis,
      this.thickness,
      this.trackChar,
      this.thumbChar,
      this.showTrack,
      this.thumbColor,
      this.trackColor,
      this.subCharacterPrecision,
      this.isHovered,
    );
  }

  updateRenderObject(renderObject: RenderScrollbar): void {
    renderObject.scrollInfo = this.scrollInfo;
    renderObject.axis = this.axis;
    renderObject.thickness = this.thickness;
    renderObject.trackChar = this.trackChar;
    renderObject.thumbChar = this.thumbChar;
    renderObject.showTrack = this.showTrack;
    renderObject.thumbColor = this.thumbColor;
    renderObject.trackColor = this.trackColor;
    renderObject.subCharacterPrecision = this.subCharacterPrecision;
    renderObject.isHovered = this.isHovered;
    renderObject.markNeedsPaint();
  }
}

// ---------------------------------------------------------------------------
// RenderScrollbar — leaf render object that paints thumb + track
// ---------------------------------------------------------------------------

/**
 * A leaf RenderBox that paints a scrollbar (vertical or horizontal).
 *
 * Layout:
 *   Vertical: Takes thickness as width, fills available height from constraints.
 *   Horizontal: Takes thickness as height, fills available width from constraints.
 *
 * Paint: Draws track characters for full extent, then overlays thumb characters
 *        at the computed position. Supports sub-character precision via Unicode
 *        block elements (lower blocks for vertical, left blocks for horizontal).
 *
 * Amp ref: ia class render object
 */
export class RenderScrollbar extends RenderBox {
  scrollInfo?: ScrollInfo;
  axis: 'vertical' | 'horizontal';
  thickness: number;
  trackChar: string;
  thumbChar: string;
  showTrack: boolean;
  thumbColor?: Color;
  trackColor?: Color;
  subCharacterPrecision: boolean;
  isHovered: boolean;

  constructor(
    scrollInfo?: ScrollInfo,
    axis: 'vertical' | 'horizontal' = 'vertical',
    thickness: number = 1,
    trackChar: string = '\u2591',
    thumbChar: string = '\u2588',
    showTrack: boolean = true,
    thumbColor?: Color,
    trackColor?: Color,
    subCharacterPrecision: boolean = true,
    isHovered: boolean = false,
  ) {
    super();
    this.scrollInfo = scrollInfo;
    this.axis = axis;
    this.thickness = thickness;
    this.trackChar = trackChar;
    this.thumbChar = thumbChar;
    this.showTrack = showTrack;
    this.thumbColor = thumbColor;
    this.trackColor = trackColor;
    this.subCharacterPrecision = subCharacterPrecision;
    this.isHovered = isHovered;
  }

  private _effectiveThumbColor(): Color | undefined {
    if (!this.isHovered) return this.thumbColor;
    if (this.thumbColor) {
      if (this.thumbColor.mode === 'rgb') {
        const brighten = (v: number) => Math.min(255, Math.round(v + (255 - v) * 0.3));
        return Color.rgb(brighten(this.thumbColor.r), brighten(this.thumbColor.g), brighten(this.thumbColor.b));
      }
      return this.thumbColor.withAlpha(Math.min(1.0, this.thumbColor.alpha + 0.2));
    }
    return Color.brightWhite;
  }

  // ---- Helpers to read axis-generic ScrollInfo with backward compat ----

  private _getContentExtent(): number {
    if (!this.scrollInfo) return 0;
    return this.scrollInfo.totalContentExtent
      ?? this.scrollInfo.totalContentHeight
      ?? 0;
  }

  private _getViewportExtent(): number {
    if (!this.scrollInfo) return 0;
    return this.scrollInfo.viewportExtent
      ?? this.scrollInfo.viewportHeight
      ?? 0;
  }

  /**
   * Layout: axis-generic sizing.
   * Vertical: width = thickness, height = max available height.
   * Horizontal: height = thickness, width = max available width.
   */
  performLayout(): void {
    const constraints = this.constraints!;
    if (this.axis === 'vertical') {
      const width = Math.max(constraints.minWidth, Math.min(this.thickness, constraints.maxWidth));
      const height = constraints.maxHeight;
      this.size = new Size(width, height);
    } else {
      const width = constraints.maxWidth;
      const height = Math.max(constraints.minHeight, Math.min(this.thickness, constraints.maxHeight));
      this.size = new Size(width, height);
    }
  }

  /**
   * Intrinsic dimensions: axis-dependent.
   */
  getMinIntrinsicWidth(_height: number): number {
    return this.axis === 'vertical' ? this.thickness : 0;
  }

  getMaxIntrinsicWidth(_height: number): number {
    return this.axis === 'vertical' ? this.thickness : Infinity;
  }

  getMinIntrinsicHeight(_width: number): number {
    return this.axis === 'horizontal' ? this.thickness : 0;
  }

  getMaxIntrinsicHeight(_width: number): number {
    return this.axis === 'horizontal' ? this.thickness : Infinity;
  }

  /**
   * Compute thumb position and extent from scroll info.
   * Returns { thumbStart, thumbExtent } in units (rows for vertical, columns for horizontal)
   * relative to the scrollbar.
   *
   * Also provides backward-compatible aliases { thumbTop, thumbHeight } for vertical callers.
   */
  computeThumbMetrics(scrollbarExtent: number): { thumbStart: number; thumbExtent: number; thumbTop: number; thumbHeight: number } | null {
    if (!this.scrollInfo || scrollbarExtent <= 0) return null;

    const totalContentExtent = this._getContentExtent();
    const vpExtent = this._getViewportExtent() > 0
      ? this._getViewportExtent()
      : scrollbarExtent;
    const scrollOffset = this.scrollInfo.scrollOffset;

    // Recompute totalContentExtent when viewportExtent was not originally provided
    const effectiveTotalContent = this._getViewportExtent() > 0
      ? totalContentExtent
      : (totalContentExtent > 0 ? totalContentExtent - 1 + vpExtent : 0);

    if (effectiveTotalContent <= 0 || effectiveTotalContent <= vpExtent) {
      // No scrollbar needed (content fits in viewport)
      return null;
    }

    const thumbExtent = Math.max(1, Math.round((vpExtent / effectiveTotalContent) * scrollbarExtent));
    const maxThumbStart = scrollbarExtent - thumbExtent;
    const scrollFraction = scrollOffset / (effectiveTotalContent - vpExtent);
    const thumbStart = Math.round(Math.max(0, Math.min(scrollFraction * maxThumbStart, maxThumbStart)));

    return {
      thumbStart,
      thumbExtent,
      // Backward-compatible aliases for existing vertical callers:
      thumbTop: thumbStart,
      thumbHeight: thumbExtent,
    };
  }

  /**
   * Paint the scrollbar: track + thumb.
   * Dispatches to axis-specific paint methods.
   */
  paint(context: PaintContext, offset: Offset): void {
    if (typeof context.drawChar !== 'function') return;

    if (this.scrollInfo) {
      const contentExtent = this._getContentExtent();
      const vpExtent = this._getViewportExtent();
      if (vpExtent > 0 && contentExtent <= vpExtent) return;
    }

    if (this.axis === 'vertical') {
      this._paintVertical(context, offset);
    } else {
      this._paintHorizontal(context, offset);
    }
  }

  // ---- Vertical paint (original logic, with type safety) ----

  private _paintVertical(context: PaintContext, offset: Offset): void {
    const height = this.size.height;
    const width = this.size.width;
    const effectiveThumbColor = this._effectiveThumbColor();

    const trackStyle: ScrollbarCellStyle = {};
    const thumbStyle: ScrollbarCellStyle = {};
    if (this.trackColor) trackStyle.fg = this.trackColor;
    if (effectiveThumbColor) thumbStyle.fg = effectiveThumbColor;

    // Draw track
    if (this.showTrack) {
      for (let row = 0; row < height; row++) {
        for (let col = 0; col < width; col++) {
          context.drawChar(
            offset.col + col,
            offset.row + row,
            this.trackChar,
            this.trackColor ? trackStyle as Record<string, unknown> : undefined,
            1,
          );
        }
      }
    }

    if (this.subCharacterPrecision) {
      this._paintVerticalSubChar(context, offset, height, width);
    } else {
      // Standard whole-character rendering
      const metrics = this.computeThumbMetrics(height);
      if (metrics) {
        const { thumbTop, thumbHeight } = metrics;
        for (let row = thumbTop; row < thumbTop + thumbHeight && row < height; row++) {
          for (let col = 0; col < width; col++) {
            context.drawChar(
              offset.col + col,
              offset.row + row,
              this.thumbChar,
              effectiveThumbColor ? thumbStyle as Record<string, unknown> : undefined,
              1,
            );
          }
        }
      }
    }
  }

  private _paintVerticalSubChar(context: PaintContext, offset: Offset, height: number, width: number): void {
    if (!this.scrollInfo || height <= 0) return;
    const effectiveThumbColor = this._effectiveThumbColor();

    const totalContentExtent = this._getContentExtent();
    const vpExtent = this._getViewportExtent() > 0
      ? this._getViewportExtent()
      : height;

    const effectiveTotalContent = this._getViewportExtent() > 0
      ? totalContentExtent
      : (totalContentExtent > 0 ? totalContentExtent - 1 + vpExtent : 0);
    const scrollOffset = this.scrollInfo.scrollOffset;

    if (effectiveTotalContent <= 0 || effectiveTotalContent <= vpExtent) return;

    const scrollRatio = vpExtent / effectiveTotalContent;
    const maxScrollOffset = effectiveTotalContent - vpExtent;
    const scrollPositionRatio = maxScrollOffset > 0 ? scrollOffset / maxScrollOffset : 0;

    const totalEighths = height * 8;
    const thumbEighths = Math.max(8, Math.floor(scrollRatio * totalEighths));
    const maxThumbTopEighths = totalEighths - thumbEighths;
    const thumbTopEighths = Math.floor(Math.max(0, Math.min(scrollPositionRatio * maxThumbTopEighths, maxThumbTopEighths)));
    const thumbBottomEighths = thumbTopEighths + thumbEighths;

    for (let row = 0; row < height; row++) {
      const rowTopEighths = row * 8;
      const rowBottomEighths = rowTopEighths + 8;

      const overlapStart = Math.max(rowTopEighths, thumbTopEighths);
      const overlapEnd = Math.min(rowBottomEighths, thumbBottomEighths);
      const coveredEighths = Math.max(0, overlapEnd - overlapStart);

      if (coveredEighths <= 0) continue;

      for (let col = 0; col < width; col++) {
        if (coveredEighths >= 8) {
          const style: ScrollbarCellStyle = {};
          if (effectiveThumbColor) { style.fg = effectiveThumbColor; style.bg = effectiveThumbColor; }
          context.drawChar(
            offset.col + col,
            offset.row + row,
            BLOCK_ELEMENTS[8],
            (effectiveThumbColor) ? style as Record<string, unknown> : undefined,
            1,
          );
        } else if (overlapStart > rowTopEighths) {
          const style: ScrollbarCellStyle = {};
          if (effectiveThumbColor) style.fg = effectiveThumbColor;
          if (this.trackColor) style.bg = this.trackColor;
          if (!effectiveThumbColor && !this.trackColor) style.inverse = true;
          context.drawChar(
            offset.col + col,
            offset.row + row,
            BLOCK_ELEMENTS[coveredEighths],
            style as Record<string, unknown>,
            1,
          );
        } else {
          const gapEighths = 8 - coveredEighths;
          const style: ScrollbarCellStyle = {};
          if (this.trackColor) style.fg = this.trackColor;
          if (effectiveThumbColor) style.bg = effectiveThumbColor;
          if (!this.trackColor && !effectiveThumbColor) style.inverse = true;
          context.drawChar(
            offset.col + col,
            offset.row + row,
            BLOCK_ELEMENTS[gapEighths],
            style as Record<string, unknown>,
            1,
          );
        }
      }
    }
  }

  // ---- Horizontal paint ----

  private _paintHorizontal(context: PaintContext, offset: Offset): void {
    const height = this.size.height;
    const width = this.size.width;
    const effectiveThumbColor = this._effectiveThumbColor();

    const trackStyle: ScrollbarCellStyle = {};
    const thumbStyle: ScrollbarCellStyle = {};
    if (this.trackColor) trackStyle.fg = this.trackColor;
    if (effectiveThumbColor) thumbStyle.fg = effectiveThumbColor;

    // Draw track across full width
    if (this.showTrack) {
      for (let row = 0; row < height; row++) {
        for (let col = 0; col < width; col++) {
          context.drawChar(
            offset.col + col,
            offset.row + row,
            this.trackChar,
            this.trackColor ? trackStyle as Record<string, unknown> : undefined,
            1,
          );
        }
      }
    }

    if (this.subCharacterPrecision) {
      this._paintHorizontalSubChar(context, offset, height, width);
    } else {
      const metrics = this.computeThumbMetrics(width);
      if (metrics) {
        const { thumbStart, thumbExtent } = metrics;
        for (let col = thumbStart; col < thumbStart + thumbExtent && col < width; col++) {
          for (let row = 0; row < height; row++) {
            context.drawChar(
              offset.col + col,
              offset.row + row,
              this.thumbChar,
              effectiveThumbColor ? thumbStyle as Record<string, unknown> : undefined,
              1,
            );
          }
        }
      }
    }
  }

  private _paintHorizontalSubChar(context: PaintContext, offset: Offset, height: number, width: number): void {
    if (!this.scrollInfo || width <= 0) return;
    const effectiveThumbColor = this._effectiveThumbColor();

    const totalContentExtent = this._getContentExtent();
    const vpExtent = this._getViewportExtent() > 0
      ? this._getViewportExtent()
      : width;

    const effectiveTotalContent = this._getViewportExtent() > 0
      ? totalContentExtent
      : (totalContentExtent > 0 ? totalContentExtent - 1 + vpExtent : 0);
    const scrollOffset = this.scrollInfo.scrollOffset;

    if (effectiveTotalContent <= 0 || effectiveTotalContent <= vpExtent) return;

    const scrollRatio = vpExtent / effectiveTotalContent;
    const maxScrollOffset = effectiveTotalContent - vpExtent;
    const scrollPositionRatio = maxScrollOffset > 0 ? scrollOffset / maxScrollOffset : 0;

    const totalEighths = width * 8;
    const thumbEighths = Math.max(8, Math.floor(scrollRatio * totalEighths));
    const maxThumbLeftEighths = totalEighths - thumbEighths;
    const thumbLeftEighths = Math.floor(Math.max(0, Math.min(scrollPositionRatio * maxThumbLeftEighths, maxThumbLeftEighths)));
    const thumbRightEighths = thumbLeftEighths + thumbEighths;

    for (let col = 0; col < width; col++) {
      const colLeftEighths = col * 8;
      const colRightEighths = colLeftEighths + 8;

      const overlapStart = Math.max(colLeftEighths, thumbLeftEighths);
      const overlapEnd = Math.min(colRightEighths, thumbRightEighths);
      const coveredEighths = Math.max(0, overlapEnd - overlapStart);

      if (coveredEighths <= 0) continue;

      for (let row = 0; row < height; row++) {
        if (coveredEighths >= 8) {
          const style: ScrollbarCellStyle = {};
          if (effectiveThumbColor) { style.fg = effectiveThumbColor; style.bg = effectiveThumbColor; }
          context.drawChar(
            offset.col + col,
            offset.row + row,
            LEFT_BLOCK_ELEMENTS[8],
            (effectiveThumbColor) ? style as Record<string, unknown> : undefined,
            1,
          );
        } else if (overlapStart > colLeftEighths) {
          const gapEighths = 8 - coveredEighths;
          const style: ScrollbarCellStyle = {};
          if (this.trackColor) style.fg = this.trackColor;
          if (effectiveThumbColor) style.bg = effectiveThumbColor;
          if (!this.trackColor && !effectiveThumbColor) style.inverse = true;
          context.drawChar(
            offset.col + col,
            offset.row + row,
            LEFT_BLOCK_ELEMENTS[gapEighths],
            style as Record<string, unknown>,
            1,
          );
        } else {
          const style: ScrollbarCellStyle = {};
          if (effectiveThumbColor) style.fg = effectiveThumbColor;
          if (this.trackColor) style.bg = this.trackColor;
          if (!effectiveThumbColor && !this.trackColor) style.inverse = true;
          context.drawChar(
            offset.col + col,
            offset.row + row,
            LEFT_BLOCK_ELEMENTS[coveredEighths],
            style as Record<string, unknown>,
            1,
          );
        }
      }
    }
  }
}
