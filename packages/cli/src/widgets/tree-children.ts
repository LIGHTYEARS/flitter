/**
 * TreeChildren — renders children with box-drawing tree connectors.
 *
 * 逆向: Jb class (chunk-006.js:16763-16785) + JH class (modules/2600_unknown_JH.js)
 *        frT (chunk-006.js:16710) — RenderObjectWidget
 *        yJT (chunk-006.js:16787) — RenderObject with paint-phase connectors
 *
 * amp's Jb creates a JH tree style with connectorColor = mutedForeground,
 * then passes children to frT (a render-object-backed tree widget).
 *
 * JH defines:
 *   tee = "├", elbow = "╰", horizontal = "─", vertical = "│", indent = 4
 *   connector = tee/elbow + "──" + " " = 4 chars ("├── " or "╰── ")
 *   getAncestorPrefix(isLast) = isLast ? "    " : "│   "
 *
 * This implementation uses a RenderObject (RenderTreeChildren) that:
 * 1. Lays out children with (maxWidth - connectorWidth) and offsets them at x=connectorWidth
 * 2. In paint phase, draws connectors (├──/╰──) and continuation lines (│)
 *
 * @module tree-children
 */

import type { Element } from "@flitter/tui";
import { BoxConstraints, Color, RenderBox, Screen, TextStyle, Widget } from "@flitter/tui";
import { MultiChildRenderObjectElement } from "../../../tui/src/widgets/multi-child-render-object-element.js";
import type { RenderObject } from "../../../tui/src/tree/render-object.js";

// ════════════════════════════════════════════════════
//  Constants — 逆向: JH class fields
// ════════════════════════════════════════════════════

const TEE_CONNECTOR = "├── ";
const ELBOW_CONNECTOR = "╰── ";
const VERTICAL = "│";
const CONNECTOR_WIDTH = 4; // all connectors are 4 chars wide
const CONNECTOR_COLOR = Color.default();

// ════════════════════════════════════════════════════
//  RenderTreeChildren — 逆向: yJT (chunk-006.js:16787)
// ════════════════════════════════════════════════════

/**
 * Render object that lays out children vertically with tree connector indent,
 * and paints ├──/╰──/│ connectors in the left gutter.
 *
 * 逆向: yJT extends O9 (multi-child RenderBox)
 */
export class RenderTreeChildren extends RenderBox {
  performLayout(): void {
    const constraints = this._lastConstraints!;
    const childWidth = Math.max(0, constraints.maxWidth - CONNECTOR_WIDTH);
    const childConstraints = new BoxConstraints({
      minWidth: 0,
      maxWidth: childWidth,
      minHeight: 0,
      maxHeight: Infinity,
    });

    let totalHeight = 0;
    for (const child of this._children) {
      if (child instanceof RenderBox) {
        child.layout(childConstraints);
        child.setOffset(CONNECTOR_WIDTH, totalHeight);
        totalHeight += child.size.height;
      }
    }

    this.setSize(constraints.maxWidth, Math.max(constraints.minHeight, totalHeight));
  }

  override paint(screen: Screen, offsetX: number, offsetY: number): void {
    this._needsPaint = false;

    const children = this._children;
    const childHeights: number[] = [];
    for (const child of children) {
      if (child instanceof RenderBox) {
        childHeights.push(child.size.height);
      }
    }

    // Paint tree connectors in the left gutter
    paintTreeConnectors(screen, childHeights, offsetX, offsetY);

    // Paint children at their offsets
    for (const child of children) {
      if (child instanceof RenderBox) {
        child.paint(screen, offsetX + child.offset.x, offsetY + child.offset.y);
      }
    }
  }
}

// ════════════════════════════════════════════════════
//  TreeChildren Widget — 逆向: Jb → frT
// ════════════════════════════════════════════════════

export interface TreeChildrenConfig {
  children: Widget[];
}

/**
 * TreeChildren — wraps each child with tree connectors (├──/╰──/│).
 *
 * 逆向: Jb → frT with JH style, showTreeCharacters = true
 */
export class TreeChildren extends Widget {
  readonly config: TreeChildrenConfig;

  constructor(config: TreeChildrenConfig) {
    super();
    this.config = config;
  }

  get children(): Widget[] {
    return this.config.children;
  }

  createRenderObject(): RenderObject {
    return new RenderTreeChildren();
  }

  updateRenderObject(_renderObject: RenderObject): void {
    // No mutable properties on RenderTreeChildren
  }

  createElement(): Element {
    return new MultiChildRenderObjectElement(this);
  }
}

// ════════════════════════════════════════════════════
//  Tree connector paint function
//  逆向: yJT.paint (chunk-006.js:16787)
// ════════════════════════════════════════════════════

/**
 * Paint tree connectors onto a Screen.
 * For each child, paints ├── (or ╰── for last) on the first row,
 * and │ on continuation rows (rows 1..height-1) for non-last children.
 *
 * 逆向: yJT.paint (chunk-006.js:16787) — iterates children, paints connector
 * on row 0, then │ on rows 1..height-1 for non-last children.
 *
 * @param screen - target screen to paint on
 * @param childHeights - height (in rows) of each child
 * @param offsetX - X offset for painting
 * @param offsetY - Y offset for painting
 */
export function paintTreeConnectors(
  screen: Screen,
  childHeights: number[],
  offsetX: number,
  offsetY: number,
): void {
  const connectorStyle = new TextStyle({ foreground: CONNECTOR_COLOR, dim: true });
  let y = offsetY;

  for (let i = 0; i < childHeights.length; i++) {
    const isLast = i === childHeights.length - 1;
    const height = childHeights[i]!;
    const connector = isLast ? ELBOW_CONNECTOR : TEE_CONNECTOR;

    // Paint connector prefix on first row of this child
    let x = offsetX;
    for (const ch of connector) {
      screen.writeChar(x, y, ch, connectorStyle);
      x++;
    }

    // For non-last children: paint │ on continuation rows
    if (!isLast) {
      for (let row = 1; row < height; row++) {
        screen.writeChar(offsetX, y + row, VERTICAL, connectorStyle);
      }
    }

    y += height;
  }
}
