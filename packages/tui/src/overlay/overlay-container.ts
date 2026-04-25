/**
 * OverlayContainer -- positioned overlay entry point.
 *
 * Wraps content with an overlay entry point that allows positioned overlays
 * to be inserted at specific edges (top / bottom / left / right).
 *
 * This is a simplified version of amp's CompositedTransform positioning.
 * Amp uses full CompositedTransformTarget/Follower positioning via LayerLink;
 * Flitter just needs edge-based positioning for overlays like dropdowns and tooltips.
 *
 * No direct amp source for "OverlayContainer" as a named class -- amp achieves
 * equivalent behavior through Stack + Positioned in various places:
 *   逆向: chunk-006.js:21387-21414 -- Stack(fit: "expand") + Positioned children
 *   逆向: pZT (CompositedTransformFollower) -- positioned overlay follower pattern
 *
 * @module
 */

import type { Widget as WidgetInterface } from "../tree/element.js";
import { type BuildContext, StatelessWidget } from "../tree/stateless-widget.js";
import type { Key } from "../tree/widget.js";
import { Positioned, Stack } from "../widgets/stack.js";

// ════════════════════════════════════════════════════
//  Types
// ════════════════════════════════════════════════════

/**
 * Overlay position specification.
 *
 * Describes where an overlay widget should be placed relative to the container edges.
 */
export interface OverlayPosition {
  /** The widget to render as an overlay. */
  widget: WidgetInterface;
  /** Which edge to anchor the overlay to. */
  position: "top" | "bottom" | "left" | "right";
  /** Optional offset from the anchored edge (in cells/rows). Defaults to 0. */
  offset?: number;
}

// ════════════════════════════════════════════════════
//  OverlayContainer Widget
// ════════════════════════════════════════════════════

/** OverlayContainer constructor arguments. */
interface OverlayContainerArgs {
  /** Optional key. */
  key?: Key;
  /** The base content widget. */
  child: WidgetInterface;
  /** List of positioned overlays to render above the child. */
  overlays?: OverlayPosition[];
}

/**
 * OverlayContainer -- positions overlay widgets at container edges.
 *
 * Builds a Stack with the child as the base layer and each overlay
 * wrapped in a Positioned widget anchored to its specified edge.
 *
 * @example
 * ```ts
 * new OverlayContainer({
 *   child: new SizedBox({ width: 80, height: 24 }),
 *   overlays: [
 *     { widget: new Text("Header"), position: "top", offset: 0 },
 *     { widget: new Text("Footer"), position: "bottom" },
 *   ],
 * });
 * ```
 */
export class OverlayContainer extends StatelessWidget {
  /** The base content widget. */
  readonly child: WidgetInterface;

  /** List of positioned overlays. */
  readonly overlays: readonly OverlayPosition[];

  constructor(args: OverlayContainerArgs) {
    super({ key: args.key });
    this.child = args.child;
    this.overlays = args.overlays ?? [];
  }

  /**
   * Builds a Stack with the child as base and overlays as Positioned layers.
   *
   * Edge mapping:
   * - "top"    -> Positioned({ top: offset, left: 0, right: 0 })
   * - "bottom" -> Positioned({ bottom: offset, left: 0, right: 0 })
   * - "left"   -> Positioned({ left: offset, top: 0, bottom: 0 })
   * - "right"  -> Positioned({ right: offset, top: 0, bottom: 0 })
   *
   * 逆向: amp uses Stack + Positioned for equivalent overlay patterns
   *   (chunk-006.js:21387-21414)
   */
  build(_context: BuildContext): WidgetInterface {
    const children: WidgetInterface[] = [this.child];

    for (const overlay of this.overlays) {
      const offset = overlay.offset ?? 0;
      let positioned: Positioned;

      switch (overlay.position) {
        case "top":
          positioned = new Positioned({
            child: overlay.widget,
            top: offset,
            left: 0,
            right: 0,
          });
          break;
        case "bottom":
          positioned = new Positioned({
            child: overlay.widget,
            bottom: offset,
            left: 0,
            right: 0,
          });
          break;
        case "left":
          positioned = new Positioned({
            child: overlay.widget,
            left: offset,
            top: 0,
            bottom: 0,
          });
          break;
        case "right":
          positioned = new Positioned({
            child: overlay.widget,
            right: offset,
            top: 0,
            bottom: 0,
          });
          break;
      }

      children.push(positioned);
    }

    return new Stack({ children });
  }
}
