// Flexible and Expanded widgets — set flex parent data on children.
// Amp ref: lv (Flexible), u3 (Expanded)
// Source: .reference/widgets-catalog.md

import { Key } from '../core/key';
import { Widget } from '../framework/widget';
import { RenderObject } from '../framework/render-object';
import { FlexParentData, type FlexFit } from '../layout/parent-data';
import { ParentDataWidget } from './parent-data-widget';

// ---------------------------------------------------------------------------
// Flexible (Amp: lv extends R_)
// ---------------------------------------------------------------------------

/**
 * A widget that controls how a child of a Row, Column, or Flex flexes.
 *
 * With fit='loose' (default), the child can be at most as large as the
 * available space but is allowed to self-size to less.
 *
 * Amp ref: class lv extends R_ (ParentDataWidget)
 */
export class Flexible extends ParentDataWidget {
  readonly flex: number;
  readonly fit: FlexFit;

  constructor(opts: {
    key?: Key;
    child: Widget;
    flex?: number;
    fit?: FlexFit;
  }) {
    super({ key: opts.key, child: opts.child });
    this.flex = opts.flex ?? 1;
    this.fit = opts.fit ?? 'loose';
  }

  // Amp ref: lv.applyParentData(renderObject)
  applyParentData(renderObject: RenderObject): void {
    if (renderObject.parentData instanceof FlexParentData) {
      const pd = renderObject.parentData;
      let needsLayout = false;
      if (pd.flex !== this.flex) {
        pd.flex = this.flex;
        needsLayout = true;
      }
      if (pd.fit !== this.fit) {
        pd.fit = this.fit;
        needsLayout = true;
      }
      if (needsLayout && renderObject.parent) {
        (renderObject.parent as RenderObject).markNeedsLayout();
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Expanded (Amp: u3 extends lv)
// ---------------------------------------------------------------------------

/**
 * A widget that expands a child of a Row, Column, or Flex so that the
 * child fills the available space.
 *
 * Expanded is equivalent to Flexible with fit='tight'.
 *
 * Amp ref: class u3 extends lv (Flexible)
 */
export class Expanded extends Flexible {
  constructor(opts: {
    key?: Key;
    child: Widget;
    flex?: number;
  }) {
    super({
      key: opts.key,
      child: opts.child,
      flex: opts.flex ?? 1,
      fit: 'tight',
    });
  }
}
