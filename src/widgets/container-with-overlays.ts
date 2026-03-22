// ContainerWithOverlays — Container with edge/corner overlays using Stack+Positioned
// Amp ref: bt class (extends A8/Container)
// Source: .reference/widgets-catalog.md

import { Key } from '../core/key';
import { BoxConstraints } from '../core/box-constraints';
import { Widget, StatelessWidget, BuildContext } from '../framework/widget';
import { EdgeInsets } from '../layout/edge-insets';
import { BoxDecoration } from '../layout/render-decorated';
import { Container } from './container';
import { Stack } from './stack';
import { Positioned } from './stack';
import { Row } from './flex';
import { SizedBox } from './sized-box';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Vertical position for an overlay: top or bottom edge of the container. */
export type OverlayPosition = 'top' | 'bottom';

/** Horizontal alignment for an overlay within its edge. */
export type OverlayAlignment = 'left' | 'center' | 'right';

/**
 * Specification for a single overlay widget.
 *
 * Each overlay is placed at a given position (top/bottom) with a given
 * alignment (left/center/right) and optional horizontal offset.
 */
export interface OverlaySpec {
  readonly child: Widget;
  readonly position: OverlayPosition;
  readonly alignment: OverlayAlignment;
  readonly offsetX?: number;
}

// ---------------------------------------------------------------------------
// ContainerWithOverlays (Amp: bt)
// ---------------------------------------------------------------------------

/**
 * A convenience widget that extends Container functionality with edge/corner
 * overlays. Internally wraps a Container in a Stack with Positioned children
 * for each overlay group.
 *
 * Overlays are grouped by position (top/bottom) and alignment (left/center/right).
 * Each group produces a single Positioned widget at the correct edge/corner.
 * Multiple overlays in the same group are arranged in a Row.
 *
 * Amp ref: class bt extends A8 (Container)
 */
export class ContainerWithOverlays extends StatelessWidget {
  readonly containerChild?: Widget;
  readonly padding?: EdgeInsets;
  readonly overlays: readonly OverlaySpec[];
  readonly overlayGroupSpacing: number;
  readonly decoration?: BoxDecoration;
  readonly constraints?: BoxConstraints;
  readonly width?: number;
  readonly height?: number;
  readonly margin?: EdgeInsets;

  constructor(opts?: {
    key?: Key;
    child?: Widget;
    padding?: EdgeInsets;
    overlays?: readonly OverlaySpec[];
    overlayGroupSpacing?: number;
    decoration?: BoxDecoration;
    constraints?: BoxConstraints;
    width?: number;
    height?: number;
    margin?: EdgeInsets;
  }) {
    super(opts?.key !== undefined ? { key: opts.key } : undefined);
    this.containerChild = opts?.child;
    this.padding = opts?.padding;
    this.overlays = opts?.overlays ?? [];
    this.overlayGroupSpacing = opts?.overlayGroupSpacing ?? 1;
    this.decoration = opts?.decoration;
    this.constraints = opts?.constraints;
    this.width = opts?.width;
    this.height = opts?.height;
    this.margin = opts?.margin;
  }

  build(_context: BuildContext): Widget {
    // Step 1: Build the main container
    const container = new Container({
      child: this.containerChild,
      padding: this.padding,
      decoration: this.decoration,
      constraints: this.constraints,
      width: this.width,
      height: this.height,
    });

    // Step 2: If no overlays, apply margin and return the plain container
    if (this.overlays.length === 0) {
      if (this.margin) {
        return new Container({ child: container, margin: this.margin });
      }
      return container;
    }

    // Step 3: Group overlays by position and alignment
    const groups = this._groupOverlays();

    // Step 4: Build Positioned widgets for each group
    const positionedChildren: Widget[] = [];
    groups.forEach((specs, key) => {
      const positioned = this._buildPositionedGroup(key, specs);
      positionedChildren.push(positioned);
    });

    // Step 5: Wrap container + overlays in a Stack
    const stack = new Stack({
      children: [container, ...positionedChildren],
      fit: 'passthrough',
    });

    // Step 6: Apply margin if present
    if (this.margin) {
      return new Container({ child: stack, margin: this.margin });
    }

    return stack;
  }

  /**
   * Groups overlays by their position+alignment key.
   * Returns a Map preserving insertion order.
   */
  private _groupOverlays(): Map<string, OverlaySpec[]> {
    const groups = new Map<string, OverlaySpec[]>();

    for (const spec of this.overlays) {
      const key = `${spec.position}:${spec.alignment}`;
      let group = groups.get(key);
      if (!group) {
        group = [];
        groups.set(key, group);
      }
      group.push(spec);
    }

    return groups;
  }

  /**
   * Builds a Positioned widget for a group of overlays at the same
   * position and alignment.
   */
  private _buildPositionedGroup(groupKey: string, specs: OverlaySpec[]): Widget {
    const [position, alignment] = groupKey.split(':') as [OverlayPosition, OverlayAlignment];

    // Build the overlay content — single child or Row for multiple
    let overlayContent: Widget;
    if (specs.length === 1) {
      overlayContent = specs[0].child;
    } else {
      // Multiple overlays in the same group: arrange in a Row with spacing
      const rowChildren: Widget[] = [];
      for (let i = 0; i < specs.length; i++) {
        if (i > 0 && this.overlayGroupSpacing > 0) {
          rowChildren.push(new SizedBox({ width: this.overlayGroupSpacing }));
        }
        rowChildren.push(specs[i].child);
      }
      overlayContent = new Row({ children: rowChildren });
    }

    // Compute Positioned properties based on position and alignment
    const posOpts: {
      child: Widget;
      left?: number;
      right?: number;
      top?: number;
      bottom?: number;
    } = { child: overlayContent };

    // Vertical positioning
    if (position === 'top') {
      posOpts.top = 0;
    } else {
      posOpts.bottom = 0;
    }

    // Horizontal alignment
    // Calculate base offsetX from the first spec (or 0)
    const baseOffsetX = specs[0]?.offsetX ?? 0;

    switch (alignment) {
      case 'left':
        posOpts.left = baseOffsetX;
        break;
      case 'right':
        posOpts.right = baseOffsetX;
        break;
      case 'center':
        // Center alignment: set both left=0 and right=0 so the
        // Positioned child can be centered by the Stack layout.
        // The offsetX is not applied for center (it's inherently centered).
        posOpts.left = baseOffsetX;
        posOpts.right = baseOffsetX;
        break;
    }

    return new Positioned(posOpts);
  }
}
