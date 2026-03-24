// Scrollbar widget — StatefulWidget that renders a vertical scrollbar synced to a ScrollController
// Amp ref: ia class — leaf render object for scrollbar rendering
// Typically placed in a Row alongside an Expanded ScrollView

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
import { Key } from '../core/key';

/** Unicode lower-block elements for 1/8 character precision scrollbar rendering (amp ref: ia class). */
const BLOCK_ELEMENTS = [' ', '\u2581', '\u2582', '\u2583', '\u2584', '\u2585', '\u2586', '\u2587', '\u2588'];

// ---------------------------------------------------------------------------
// ScrollInfo — describes current scroll state for rendering the scrollbar
// ---------------------------------------------------------------------------

/**
 * Provides the scroll state information needed to render the scrollbar thumb.
 */
export interface ScrollInfo {
  totalContentHeight: number;
  viewportHeight: number;
  scrollOffset: number;
}

// ---------------------------------------------------------------------------
// Scrollbar (Amp: ia)
// ---------------------------------------------------------------------------

/**
 * A StatefulWidget that renders a vertical scrollbar synced to a ScrollController.
 *
 * The scrollbar renders as a column of characters:
 * - Track: filled with trackChar (default '░') for the full height
 * - Thumb: filled with thumbChar (default '█') at the scroll position
 *
 * The thumb position and height are calculated from the scroll state:
 * - Thumb position = (scrollOffset / totalContentHeight) * viewportHeight
 * - Thumb height = max(1, (viewportHeight / totalContentHeight) * viewportHeight)
 *
 * Usage:
 *   new Row({ children: [
 *     new Expanded({ child: new SingleChildScrollView({ controller, child }) }),
 *     new Scrollbar({ controller }),
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
  }

  createState(): State<Scrollbar> {
    return new ScrollbarState();
  }
}

// ---------------------------------------------------------------------------
// ScrollbarState
// ---------------------------------------------------------------------------

/**
 * State for Scrollbar. Manages the ScrollController listener lifecycle
 * and builds the underlying _ScrollbarRender leaf widget.
 */
class ScrollbarState extends State<Scrollbar> {
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

  build(_context: BuildContext): Widget {
    // Compute scroll info from controller or getScrollInfo callback
    let scrollInfo: ScrollInfo | undefined;

    if (this.widget.getScrollInfo) {
      scrollInfo = this.widget.getScrollInfo();
    } else if (this.widget.controller) {
      const ctrl = this.widget.controller;
      // Derive scroll info from controller state
      // maxScrollExtent = totalContentHeight - viewportHeight
      // We need viewportHeight; we'll pass 0 as a placeholder and let the
      // render object use its own height as viewportHeight
      scrollInfo = {
        totalContentHeight: ctrl.maxScrollExtent > 0
          ? ctrl.maxScrollExtent + 1 // approximate; render object adjusts
          : 0,
        viewportHeight: 0, // will be overridden by render height
        scrollOffset: ctrl.offset,
      };
    }

    return new _ScrollbarRender({
      scrollInfo,
      thickness: this.widget.thickness,
      trackChar: this.widget.trackChar,
      thumbChar: this.widget.thumbChar,
      showTrack: this.widget.showTrack,
      thumbColor: this.widget.thumbColor,
      trackColor: this.widget.trackColor,
      subCharacterPrecision: this.widget.subCharacterPrecision,
    });
  }
}

// ---------------------------------------------------------------------------
// _ScrollbarRender (LeafRenderObjectWidget)
// ---------------------------------------------------------------------------

class _ScrollbarRender extends LeafRenderObjectWidget {
  readonly scrollInfo?: ScrollInfo;
  readonly thickness: number;
  readonly trackChar: string;
  readonly thumbChar: string;
  readonly showTrack: boolean;
  readonly thumbColor?: Color;
  readonly trackColor?: Color;
  readonly subCharacterPrecision: boolean;

  constructor(opts: {
    scrollInfo?: ScrollInfo;
    thickness: number;
    trackChar: string;
    thumbChar: string;
    showTrack: boolean;
    thumbColor?: Color;
    trackColor?: Color;
    subCharacterPrecision: boolean;
  }) {
    super();
    this.scrollInfo = opts.scrollInfo;
    this.thickness = opts.thickness;
    this.trackChar = opts.trackChar;
    this.thumbChar = opts.thumbChar;
    this.showTrack = opts.showTrack;
    this.thumbColor = opts.thumbColor;
    this.trackColor = opts.trackColor;
    this.subCharacterPrecision = opts.subCharacterPrecision;
  }

  createRenderObject(): RenderScrollbar {
    return new RenderScrollbar(
      this.scrollInfo,
      this.thickness,
      this.trackChar,
      this.thumbChar,
      this.showTrack,
      this.thumbColor,
      this.trackColor,
      this.subCharacterPrecision,
    );
  }

  updateRenderObject(renderObject: any): void {
    const r = renderObject as RenderScrollbar;
    r.scrollInfo = this.scrollInfo;
    r.thickness = this.thickness;
    r.trackChar = this.trackChar;
    r.thumbChar = this.thumbChar;
    r.showTrack = this.showTrack;
    r.thumbColor = this.thumbColor;
    r.trackColor = this.trackColor;
    r.subCharacterPrecision = this.subCharacterPrecision;
    r.markNeedsPaint();
  }
}

// ---------------------------------------------------------------------------
// RenderScrollbar — leaf render object that paints thumb + track
// ---------------------------------------------------------------------------

/**
 * A leaf RenderBox that paints a vertical scrollbar.
 *
 * Layout: Takes thickness as width, fills available height from constraints.
 * Paint: Draws track characters for full height, then overlays thumb characters
 *        at the computed position.
 *
 * Amp ref: ia class render object
 */
export class RenderScrollbar extends RenderBox {
  scrollInfo?: ScrollInfo;
  thickness: number;
  trackChar: string;
  thumbChar: string;
  showTrack: boolean;
  thumbColor?: Color;
  trackColor?: Color;
  subCharacterPrecision: boolean;

  constructor(
    scrollInfo?: ScrollInfo,
    thickness: number = 1,
    trackChar: string = '\u2591',
    thumbChar: string = '\u2588',
    showTrack: boolean = true,
    thumbColor?: Color,
    trackColor?: Color,
    subCharacterPrecision: boolean = true,
  ) {
    super();
    this.scrollInfo = scrollInfo;
    this.thickness = thickness;
    this.trackChar = trackChar;
    this.thumbChar = thumbChar;
    this.showTrack = showTrack;
    this.thumbColor = thumbColor;
    this.trackColor = trackColor;
    this.subCharacterPrecision = subCharacterPrecision;
  }

  /**
   * Layout: width = thickness, height = max available height.
   * The scrollbar always wants to fill the available height.
   */
  performLayout(): void {
    const constraints = this.constraints!;
    const width = Math.max(constraints.minWidth, Math.min(this.thickness, constraints.maxWidth));
    const height = constraints.maxHeight;
    this.size = new Size(width, height);
  }

  /**
   * Returns the intrinsic width = thickness.
   */
  getMinIntrinsicWidth(_height: number): number {
    return this.thickness;
  }

  getMaxIntrinsicWidth(_height: number): number {
    return this.thickness;
  }

  /**
   * Compute thumb position and height from scroll info.
   * Returns { thumbTop, thumbHeight } in rows relative to the scrollbar.
   */
  computeThumbMetrics(viewportHeight: number): { thumbTop: number; thumbHeight: number } | null {
    if (!this.scrollInfo || viewportHeight <= 0) return null;

    let totalContentHeight = this.scrollInfo.totalContentHeight;
    let vpHeight = this.scrollInfo.viewportHeight;
    const scrollOffset = this.scrollInfo.scrollOffset;

    // If viewportHeight was not provided (0), use our render height
    if (vpHeight <= 0) {
      vpHeight = viewportHeight;
      // Also adjust totalContentHeight if it was derived from maxScrollExtent
      // maxScrollExtent = totalContentHeight - viewportHeight
      // so totalContentHeight = maxScrollExtent + viewportHeight
      if (totalContentHeight > 0) {
        totalContentHeight = totalContentHeight - 1 + vpHeight; // undo the +1 approximation
      }
    }

    if (totalContentHeight <= 0 || totalContentHeight <= vpHeight) {
      // No scrollbar needed (content fits in viewport)
      return null;
    }

    const thumbHeight = Math.max(1, Math.round((vpHeight / totalContentHeight) * viewportHeight));
    const maxThumbTop = viewportHeight - thumbHeight;
    const scrollFraction = scrollOffset / (totalContentHeight - vpHeight);
    const thumbTop = Math.round(Math.max(0, Math.min(scrollFraction * maxThumbTop, maxThumbTop)));

    return { thumbTop, thumbHeight };
  }

  /**
   * Paint the scrollbar: track + thumb.
   * When subCharacterPrecision is enabled, uses Unicode block elements
   * for 1/8th character precision rendering.
   */
  paint(context: PaintContext, offset: Offset): void {
    const ctx = context as any;
    if (typeof ctx.drawChar !== 'function') return;

    const height = this.size.height;
    const width = this.size.width;

    // Build track and thumb styles
    const trackStyle: any = {};
    const thumbStyle: any = {};
    if (this.trackColor) trackStyle.fg = this.trackColor;
    if (this.thumbColor) thumbStyle.fg = this.thumbColor;

    // Draw track
    if (this.showTrack) {
      for (let row = 0; row < height; row++) {
        for (let col = 0; col < width; col++) {
          ctx.drawChar(
            offset.col + col,
            offset.row + row,
            this.trackChar,
            this.trackColor ? trackStyle : undefined,
            1,
          );
        }
      }
    }

    if (this.subCharacterPrecision) {
      // Sub-character precision rendering using BLOCK_ELEMENTS
      // Unicode lower block elements (\u2581-\u2588) fill from the BOTTOM of the cell upward.
      //
      // For each character row we determine the overlap with the thumb region:
      //   - Fully covered → full block (█) in thumb color
      //   - Top edge (thumb starts mid-row, covers bottom portion) → lower block in thumb fg
      //   - Bottom edge (thumb covers top portion, stops mid-row) → invert: lower block
      //     representing the UNCOVERED bottom gap drawn with track fg + thumb bg
      //   - No overlap → track char already drawn, skip

      if (!this.scrollInfo || height <= 0) return;

      let totalContentHeight = this.scrollInfo.totalContentHeight;
      let vpHeight = this.scrollInfo.viewportHeight;
      const scrollOffset = this.scrollInfo.scrollOffset;

      if (vpHeight <= 0) {
        vpHeight = height;
        if (totalContentHeight > 0) {
          totalContentHeight = totalContentHeight - 1 + vpHeight;
        }
      }

      if (totalContentHeight <= 0 || totalContentHeight <= vpHeight) return;

      const scrollRatio = vpHeight / totalContentHeight;
      const scrollPositionRatio = scrollOffset / (totalContentHeight - vpHeight);

      const totalEighths = height * 8;
      const thumbEighths = Math.max(8, Math.round(scrollRatio * totalEighths)); // minimum 1 char
      const thumbTopEighths = Math.round(scrollPositionRatio * (totalEighths - thumbEighths));
      const thumbBottomEighths = thumbTopEighths + thumbEighths;

      for (let row = 0; row < height; row++) {
        const rowTopEighths = row * 8;
        const rowBottomEighths = rowTopEighths + 8;

        // Calculate how many eighths of this row are covered by the thumb
        const overlapStart = Math.max(rowTopEighths, thumbTopEighths);
        const overlapEnd = Math.min(rowBottomEighths, thumbBottomEighths);
        const coveredEighths = Math.max(0, overlapEnd - overlapStart);

        if (coveredEighths <= 0) {
          // No overlap — track char already drawn
          continue;
        }

        for (let col = 0; col < width; col++) {
          if (coveredEighths >= 8) {
            // Fully covered by thumb
            ctx.drawChar(
              offset.col + col,
              offset.row + row,
              BLOCK_ELEMENTS[8], // █
              this.thumbColor ? thumbStyle : undefined,
              1,
            );
          } else if (overlapStart > rowTopEighths) {
            // Top edge of thumb: thumb starts mid-row, covers bottom portion.
            // Lower block element naturally fills from bottom — perfect match.
            // Draw lower N/8 in thumb color.
            ctx.drawChar(
              offset.col + col,
              offset.row + row,
              BLOCK_ELEMENTS[coveredEighths],
              this.thumbColor ? thumbStyle : undefined,
              1,
            );
          } else {
            // Bottom edge of thumb: thumb covers top portion, stops mid-row.
            // Lower block elements can't represent top-fill directly.
            // Trick: draw the UNCOVERED bottom gap as a lower block in track color,
            // with thumb color as background for the covered top portion.
            const gapEighths = 8 - coveredEighths;
            const invertedStyle: any = {};
            if (this.trackColor) invertedStyle.fg = this.trackColor;
            if (this.thumbColor) invertedStyle.bg = this.thumbColor;
            // When no explicit colors, use inverse attribute to swap fg/bg
            if (!this.trackColor && !this.thumbColor) {
              invertedStyle.inverse = true;
            } else if (!this.trackColor) {
              invertedStyle.bg = this.thumbColor;
            } else if (!this.thumbColor) {
              invertedStyle.fg = this.trackColor;
            }
            ctx.drawChar(
              offset.col + col,
              offset.row + row,
              BLOCK_ELEMENTS[gapEighths],
              invertedStyle,
              1,
            );
          }
        }
      }
    } else {
      // Standard whole-character rendering
      const metrics = this.computeThumbMetrics(height);
      if (metrics) {
        const { thumbTop, thumbHeight } = metrics;
        for (let row = thumbTop; row < thumbTop + thumbHeight && row < height; row++) {
          for (let col = 0; col < width; col++) {
            ctx.drawChar(
              offset.col + col,
              offset.row + row,
              this.thumbChar,
              this.thumbColor ? thumbStyle : undefined,
              1,
            );
          }
        }
      }
    }
  }
}
