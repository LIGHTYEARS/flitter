/**
 * StickyHeader — pins header at viewport top during scroll.
 *
 * 逆向: d9R (Widget) + E9R (RenderObject) in chunk-006.js:28390-28456
 *
 * A two-child render object where child[0] is the header and child[1] is
 * the body. When the header's natural position scrolls above the viewport
 * (detected via ClipScreen's getClipRegion), it "sticks" at the viewport top.
 *
 * @module
 */

import type { Screen } from "../screen/screen.js";
import { BoxConstraints } from "../tree/constraints.js";
import type { Element, Widget as WidgetInterface } from "../tree/element.js";
import { RenderBox } from "../tree/render-box.js";
import type { RenderObject } from "../tree/render-object.js";
import type { RenderObjectWidget } from "../tree/render-object-element.js";
import type { Key } from "../tree/widget.js";
import { Widget } from "../tree/widget.js";
import { MultiChildRenderObjectElement } from "./multi-child-render-object-element.js";

// ════════════════════════════════════════════════════
//  Helper — L50() equivalent
// ════════════════════════════════════════════════════

/**
 * 逆向: L50(T) in modules/1935_unknown_gB.js:1-4
 *
 * Returns the clip region if the screen is a ClipScreen, otherwise null.
 */
function getClipRegion(
  screen: Screen,
): { x: number; y: number; width: number; height: number } | null {
  const maybeClip = screen as unknown as {
    getClipRegion?: () => { x: number; y: number; width: number; height: number };
  };
  if (typeof maybeClip.getClipRegion === "function") {
    return maybeClip.getClipRegion();
  }
  return null;
}

// ════════════════════════════════════════════════════
//  RenderStickyHeader
// ════════════════════════════════════════════════════

/**
 * 逆向: E9R extends O9 (chunk-006.js:28406-28456)
 */
export class RenderStickyHeader extends RenderBox {
  get headerBox(): RenderBox | undefined {
    return this._children[0] as RenderBox | undefined;
  }

  get bodyBox(): RenderBox | undefined {
    return this._children[1] as RenderBox | undefined;
  }

  // 逆向: E9R.performLayout (chunk-006.js:28413-28429)
  performLayout(): void {
    const constraints = this._lastConstraints;
    if (!constraints) return;

    const header = this.headerBox;
    const body = this.bodyBox;

    if (!header || !body) {
      this.setSize(constraints.minWidth, constraints.minHeight);
      return;
    }

    // Header gets bounded height constraints
    const headerConstraints = new BoxConstraints({
      minWidth: constraints.minWidth,
      maxWidth: constraints.maxWidth,
      minHeight: 0,
      maxHeight: constraints.maxHeight,
    });
    header.layout(headerConstraints);
    header.setOffset(0, 0);

    // Body gets unbounded height (infinite) — it scrolls
    const bodyConstraints = new BoxConstraints({
      minWidth: constraints.minWidth,
      maxWidth: constraints.maxWidth,
      minHeight: 0,
      maxHeight: Number.POSITIVE_INFINITY,
    });
    body.layout(bodyConstraints);
    body.setOffset(0, header.size.height);

    const totalHeight = header.size.height + body.size.height;
    const finalWidth = constraints.maxWidth;
    this.setSize(finalWidth, totalHeight);
  }

  // 逆向: E9R.paint (chunk-006.js:28430-28455)
  // NOTE: Flitter paint convention — offsetX/Y is the node's absolute position.
  // Amp paint convention — R/a is the parent's absolute position, and the node
  // internally does R + this.offset. We adapt accordingly.
  override paint(screen: Screen, offsetX: number, offsetY: number): void {
    const header = this.headerBox;
    const body = this.bodyBox;

    if (!header || !body) {
      super.paint(screen, offsetX, offsetY);
      return;
    }

    // Paint children normally first
    super.paint(screen, offsetX, offsetY);

    // Check if we need to re-paint header as sticky
    const clipRegion = getClipRegion(screen);
    if (!clipRegion) return;

    // In Flitter, offsetX/Y is already this node's absolute position
    const nodeX = offsetX;
    const nodeY = offsetY;
    const nodeBottom = nodeY + this._size.height;

    // Header's absolute Y position
    const headerAbsY = nodeY + header.offset.y;
    const headerHeight = header.size.height;

    // Clip region bounds
    const clipTop = clipRegion.y;
    const clipBottom = clipRegion.y + clipRegion.height;

    // 逆向: line 28447 — is this node visible in the clip region?
    const isVisible = nodeBottom > clipTop && nodeY < clipBottom;

    // 逆向: line 28448 — has the header scrolled above the clip region?
    const headerAboveClip = headerAbsY < clipTop;

    if (!isVisible || !headerAboveClip) return;

    // 逆向: lines 28450-28451 — compute sticky Y position
    let stickyY = clipTop;
    // If the entire widget is about to scroll out, push header up with it
    if (nodeBottom - clipTop < headerHeight) {
      stickyY = nodeBottom - headerHeight;
    }
    // Don't paint if the sticky header would be entirely above clip
    if (stickyY + headerHeight <= clipTop) return;

    // 逆向: lines 28453-28454 — clear area and re-paint header at sticky position
    const headerAbsX = nodeX + header.offset.x;
    screen.fill(clipRegion.x, stickyY, clipRegion.width, headerHeight, " ", {});
    header.paint(screen, headerAbsX, stickyY);
  }
}

// ════════════════════════════════════════════════════
//  StickyHeader Widget
// ════════════════════════════════════════════════════

interface StickyHeaderArgs {
  key?: Key;
  header: WidgetInterface;
  body: WidgetInterface;
}

/**
 * 逆向: d9R extends Dn (chunk-006.js:28390-28405)
 */
export class StickyHeader extends Widget implements RenderObjectWidget {
  readonly header: WidgetInterface;
  readonly body: WidgetInterface;

  constructor(args: StickyHeaderArgs) {
    super({ key: args.key });
    this.header = args.header;
    this.body = args.body;
  }

  get children(): WidgetInterface[] {
    return [this.header, this.body];
  }

  createElement(): Element {
    return new MultiChildRenderObjectElement(this as unknown as WidgetInterface);
  }

  createRenderObject(): RenderObject {
    return new RenderStickyHeader();
  }

  updateRenderObject(_renderObject: RenderObject): void {
    // 逆向: d9R.updateRenderObject is empty (chunk-006.js:28404)
  }
}
