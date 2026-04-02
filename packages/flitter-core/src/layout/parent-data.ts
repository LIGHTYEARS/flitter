// Parent data classes for layout containers.
// FlexParentData — used by RenderFlex (Row, Column, Expanded).
// PositionedParentData — used by RenderStack (future plan).
//
// Amp ref: class S_ extends PJ (FlexParentData), amp-strings.txt:530350
// Reference: .reference/render-tree.md

import { BoxParentData } from '../framework/render-object';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type FlexFit = 'tight' | 'loose';

// ---------------------------------------------------------------------------
// FlexParentData (Amp: S_ extends PJ)
// ---------------------------------------------------------------------------

/**
 * Parent data for children of a RenderFlex container.
 *
 * Amp ref: class S_ extends PJ {
 *   flex;    // number, default 0
 *   fit;     // "tight" | "loose", default "tight"
 *   constructor(flex = 0, fit = "tight") { super(); this.flex = flex; this.fit = fit; }
 * }
 */
export class FlexParentData extends BoxParentData {
  flex: number;
  fit: FlexFit;

  constructor(flex: number = 0, fit: FlexFit = 'tight') {
    super();
    this.flex = flex;
    this.fit = fit;
  }

  toString(): string {
    return `FlexParentData(flex: ${this.flex}, fit: ${this.fit})`;
  }
}

// ---------------------------------------------------------------------------
// PositionedParentData (for Stack, used later)
// ---------------------------------------------------------------------------

/**
 * Parent data for children of a RenderStack container.
 * Children with any positional property set are "positioned".
 */
export class PositionedParentData extends BoxParentData {
  left?: number;
  top?: number;
  right?: number;
  bottom?: number;
  width?: number;
  height?: number;

  /**
   * Returns true if any positional property (left, top, right, bottom,
   * width, height) is defined.
   */
  isPositioned(): boolean {
    return (
      this.left !== undefined ||
      this.top !== undefined ||
      this.right !== undefined ||
      this.bottom !== undefined ||
      this.width !== undefined ||
      this.height !== undefined
    );
  }
}
