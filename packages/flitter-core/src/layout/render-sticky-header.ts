import { Offset, Size, Rect } from '../core/types';
import { BoxConstraints } from '../core/box-constraints';
import { RenderBox, ContainerRenderBox, type PaintContext } from '../framework/render-object';

/**
 * A two-child RenderBox that lays out a header above a body, and pins
 * the header to the viewport top when it scrolls above the visible area.
 *
 * Children order: [header, body].
 *
 * Layout: header on top, body directly below.
 * Paint:  When the header scrolls above the viewport clip rect's top edge,
 *         pin it at the viewport top. When the entire StickyHeader area is
 *         about to scroll out, the next sticky header pushes this one away.
 */
export class RenderStickyHeader extends ContainerRenderBox {
  private get _header(): RenderBox | null {
    return this.children[0] ?? null;
  }

  private get _body(): RenderBox | null {
    return this.children[1] ?? null;
  }

  /**
   * Layout: header fills available width; body fills remaining height.
   * Total size = full width × (header.height + body.height), constrained.
   */
  performLayout(): void {
    const constraints = this.constraints!;
    const header = this._header;
    const body = this._body;

    if (!header && !body) {
      this.size = constraints.constrain(Size.zero);
      return;
    }

    const childConstraints = new BoxConstraints({
      minWidth: constraints.minWidth,
      maxWidth: constraints.maxWidth,
      minHeight: 0,
      maxHeight: Infinity,
    });

    let headerHeight = 0;
    if (header) {
      header.layout(childConstraints);
      header.offset = Offset.zero;
      headerHeight = header.size.height;
    }

    let bodyHeight = 0;
    if (body) {
      body.layout(childConstraints);
      body.offset = new Offset(0, headerHeight);
      bodyHeight = body.size.height;
    }

    const width = Math.max(header?.size.width ?? 0, body?.size.width ?? 0);
    this.size = constraints.constrain(new Size(width, headerHeight + bodyHeight));
  }

  /**
   * Paint with sticky-header logic:
   * 1. Paint body at its normal position.
   * 2. Determine whether the header has scrolled above the viewport top.
   * 3. If so, pin it to the viewport top (or push it up when the total
   *    area is about to leave the viewport).
   * 4. Clear the header row with fillRect before painting to avoid
   *    leftover content from the body bleeding through.
   */
  paint(context: PaintContext, offset: Offset): void {
    const header = this._header;
    const body = this._body;

    if (body) {
      body.paint(context, offset.add(body.offset));
    }

    if (!header) return;

    const clip = this._getCurrentClip(context);
    const headerY = offset.row + header.offset.row;
    const headerH = header.size.height;
    const totalH = this.size.height;

    if (!clip) {
      header.paint(context, new Offset(offset.col + header.offset.col, headerY));
      return;
    }

    const viewTop = clip.top;
    const isHeaderAboveViewport = headerY < viewTop;
    const isContentInViewport =
      (offset.row + totalH) > viewTop && offset.row < (viewTop + clip.height);

    if (isContentInViewport && isHeaderAboveViewport) {
      let pinnedY = viewTop;
      if ((offset.row + totalH) - viewTop < headerH) {
        pinnedY = (offset.row + totalH) - headerH;
      }
      if (typeof context.fillRect === 'function') {
        context.fillRect(clip.left, pinnedY, clip.width, headerH, ' ');
      }
      header.paint(context, new Offset(offset.col + header.offset.col, pinnedY));
    } else {
      header.paint(context, new Offset(offset.col + header.offset.col, headerY));
    }
  }

  /**
   * Extract the current clip Rect from the PaintContext.
   * Works with both ClipCanvas (has .clip getter) and base PaintContext
   * (has protected clipX/Y/W/H fields accessible via cast).
   */
  private _getCurrentClip(context: PaintContext): Rect | null {
    const ctx = context as unknown as { clip?: Rect; clipX?: number; clipY?: number; clipW?: number; clipH?: number };
    if (ctx.clip instanceof Rect) {
      return ctx.clip;
    }
    if (
      typeof ctx.clipX === 'number' &&
      typeof ctx.clipY === 'number' &&
      typeof ctx.clipW === 'number' &&
      typeof ctx.clipH === 'number'
    ) {
      return new Rect(ctx.clipX, ctx.clipY, ctx.clipW, ctx.clipH);
    }
    return null;
  }
}
