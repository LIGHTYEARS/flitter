// Container widget — StatelessWidget convenience wrapper
// Amp ref: A8 (Container)
// Source: .reference/widgets-catalog.md

import { Key } from '../core/key';
import { BoxConstraints } from '../core/box-constraints';
import { Widget, StatelessWidget, BuildContext } from '../framework/widget';
import { EdgeInsets } from '../layout/edge-insets';
import { BoxDecoration } from '../layout/render-decorated';
import { Padding } from './padding';
import { SizedBox } from './sized-box';
import { DecoratedBox } from './decorated-box';

/**
 * A convenience widget that combines common painting, positioning,
 * and sizing widgets.
 *
 * Container is implemented as a StatelessWidget that composes:
 * - Padding (for margin, outermost)
 * - ConstrainedBox/SizedBox (for width/height/constraints)
 * - DecoratedBox (for decoration)
 * - Padding (for padding, innermost around child)
 *
 * Amp ref: class A8 — Container as a composition widget
 */
export class Container extends StatelessWidget {
  readonly containerChild?: Widget;
  readonly width?: number;
  readonly height?: number;
  readonly padding?: EdgeInsets;
  readonly margin?: EdgeInsets;
  readonly decoration?: BoxDecoration;
  readonly constraints?: BoxConstraints;

  constructor(opts?: {
    key?: Key;
    child?: Widget;
    width?: number;
    height?: number;
    padding?: EdgeInsets;
    margin?: EdgeInsets;
    decoration?: BoxDecoration;
    constraints?: BoxConstraints;
  }) {
    super(opts?.key !== undefined ? { key: opts.key } : undefined);
    this.containerChild = opts?.child;
    this.width = opts?.width;
    this.height = opts?.height;
    this.padding = opts?.padding;
    this.margin = opts?.margin;
    this.decoration = opts?.decoration;
    this.constraints = opts?.constraints;
  }

  build(_context: BuildContext): Widget {
    let result: Widget | undefined = this.containerChild;

    // Inner padding (closest to child)
    if (this.padding) {
      result = new Padding({
        padding: this.padding,
        child: result,
      });
    }

    // Decoration
    if (this.decoration) {
      result = new DecoratedBox({
        decoration: this.decoration,
        child: result,
      });
    }

    // Sizing constraints (width/height/constraints)
    if (this.width !== undefined || this.height !== undefined || this.constraints) {
      if (this.constraints) {
        // Use explicit constraints with width/height overrides
        let c = this.constraints;
        if (this.width !== undefined) {
          c = new BoxConstraints({
            minWidth: this.width,
            maxWidth: this.width,
            minHeight: c.minHeight,
            maxHeight: c.maxHeight,
          });
        }
        if (this.height !== undefined) {
          c = new BoxConstraints({
            minWidth: c.minWidth,
            maxWidth: c.maxWidth,
            minHeight: this.height,
            maxHeight: this.height,
          });
        }
        // Use SizedBox-like approach via ConstrainedBox
        // For simplicity, use SizedBox which wraps RenderConstrainedBox
        result = new SizedBox({
          width: c.isTight ? c.minWidth : undefined,
          height: c.isTight ? c.minHeight : undefined,
          child: result,
        });
      } else {
        result = new SizedBox({
          width: this.width,
          height: this.height,
          child: result,
        });
      }
    }

    // Outer margin
    if (this.margin) {
      result = new Padding({
        padding: this.margin,
        child: result,
      });
    }

    // If nothing was built, return an empty SizedBox
    if (!result) {
      result = SizedBox.shrink();
    }

    return result;
  }
}
