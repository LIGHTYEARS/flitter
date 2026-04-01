// BoxConstraints — immutable box layout constraints
// Amp ref: l3 class in render-tree, used by RenderBox.performLayout()

import { Size } from './types';

/**
 * Immutable layout constraints for box-model rendering.
 * All dimension values are integers, except Infinity which is preserved.
 */
export class BoxConstraints {
  readonly minWidth: number;
  readonly minHeight: number;
  readonly maxWidth: number;
  readonly maxHeight: number;

  constructor(opts?: {
    minWidth?: number;
    minHeight?: number;
    maxWidth?: number;
    maxHeight?: number;
  }) {
    const raw = opts ?? {};
    this.minWidth = roundOrInf(raw.minWidth ?? 0);
    this.minHeight = roundOrInf(raw.minHeight ?? 0);
    this.maxWidth = roundOrInf(raw.maxWidth ?? Infinity);
    this.maxHeight = roundOrInf(raw.maxHeight ?? Infinity);
  }

  // --- Factory constructors ---

  /** Create tight constraints where min equals max on both axes. */
  static tight(size: Size): BoxConstraints {
    return new BoxConstraints({
      minWidth: size.width,
      minHeight: size.height,
      maxWidth: size.width,
      maxHeight: size.height,
    });
  }

  /** Create constraints that are tight only on specified axes. */
  static tightFor(opts?: { width?: number; height?: number }): BoxConstraints {
    const w = opts?.width;
    const h = opts?.height;
    return new BoxConstraints({
      minWidth: w ?? 0,
      maxWidth: w ?? Infinity,
      minHeight: h ?? 0,
      maxHeight: h ?? Infinity,
    });
  }

  /** Create loose constraints: min=0, max=size. */
  static loose(size: Size): BoxConstraints {
    return new BoxConstraints({
      minWidth: 0,
      minHeight: 0,
      maxWidth: size.width,
      maxHeight: size.height,
    });
  }

  // --- Constraint operations ---

  /**
   * Return a normalized copy where max >= min on both axes.
   * If min > max on an axis, max is raised to equal min (Flutter semantics).
   */
  normalize(): BoxConstraints {
    return new BoxConstraints({
      minWidth: this.minWidth,
      maxWidth: Math.max(this.minWidth, this.maxWidth),
      minHeight: this.minHeight,
      maxHeight: Math.max(this.minHeight, this.maxHeight),
    });
  }

  /**
   * Return a copy with the specified axes tightened (min = max = value).
   * Axes not specified are left unchanged.
   */
  tighten(opts?: { width?: number; height?: number }): BoxConstraints {
    return new BoxConstraints({
      minWidth: opts?.width ?? this.minWidth,
      maxWidth: opts?.width ?? this.maxWidth,
      minHeight: opts?.height ?? this.minHeight,
      maxHeight: opts?.height ?? this.maxHeight,
    });
  }

  /** Return a copy with minWidth=0 and minHeight=0, keeping max values. */
  loosen(): BoxConstraints {
    return new BoxConstraints({
      minWidth: 0,
      minHeight: 0,
      maxWidth: this.maxWidth,
      maxHeight: this.maxHeight,
    });
  }

  /** Clamp a size to fit within these constraints. */
  constrain(size: Size): Size {
    return new Size(
      clamp(size.width, this.minWidth, this.maxWidth),
      clamp(size.height, this.minHeight, this.maxHeight),
    );
  }

  /** Clamp a width value to [minWidth, maxWidth]. Defaults to minWidth if no argument given. */
  constrainWidth(width?: number): number {
    return clamp(width ?? this.minWidth, this.minWidth, this.maxWidth);
  }

  /** Clamp a height value to [minHeight, maxHeight]. Defaults to minHeight if no argument given. */
  constrainHeight(height?: number): number {
    return clamp(height ?? this.minHeight, this.minHeight, this.maxHeight);
  }

  /**
   * Produce tighter constraints by intersecting with another set.
   * The result's mins are raised and maxes are lowered to fit within both.
   */
  enforce(constraints: BoxConstraints): BoxConstraints {
    return new BoxConstraints({
      minWidth: clamp(this.minWidth, constraints.minWidth, constraints.maxWidth),
      maxWidth: clamp(this.maxWidth, constraints.minWidth, constraints.maxWidth),
      minHeight: clamp(this.minHeight, constraints.minHeight, constraints.maxHeight),
      maxHeight: clamp(this.maxHeight, constraints.minHeight, constraints.maxHeight),
    });
  }

  /** Shrink constraints by edge insets (e.g., for padding). */
  deflate(edges: { left: number; top: number; right: number; bottom: number }): BoxConstraints {
    const horizontal = edges.left + edges.right;
    const vertical = edges.top + edges.bottom;
    const deflatedMinWidth = Math.max(0, this.minWidth - horizontal);
    const deflatedMaxWidth = Math.max(deflatedMinWidth, this.maxWidth - horizontal);
    const deflatedMinHeight = Math.max(0, this.minHeight - vertical);
    const deflatedMaxHeight = Math.max(deflatedMinHeight, this.maxHeight - vertical);
    return new BoxConstraints({
      minWidth: deflatedMinWidth,
      maxWidth: deflatedMaxWidth,
      minHeight: deflatedMinHeight,
      maxHeight: deflatedMaxHeight,
    });
  }

  // --- Queries ---

  /** True if min equals max on both axes (only one size is allowed). */
  get isTight(): boolean {
    return this.minWidth === this.maxWidth && this.minHeight === this.maxHeight;
  }

  /** True if maxWidth is finite. */
  get hasBoundedWidth(): boolean {
    return this.maxWidth < Infinity;
  }

  /** True if maxHeight is finite. */
  get hasBoundedHeight(): boolean {
    return this.maxHeight < Infinity;
  }

  /** True if all values are non-negative and min <= max on both axes (Flutter semantics). */
  get isNormalized(): boolean {
    return (
      this.minWidth >= 0 &&
      this.minHeight >= 0 &&
      this.minWidth <= this.maxWidth &&
      this.minHeight <= this.maxHeight
    );
  }

  /** The largest size that satisfies the constraints. */
  get biggest(): Size {
    return new Size(this.maxWidth, this.maxHeight);
  }

  /** The smallest size that satisfies the constraints. */
  get smallest(): Size {
    return new Size(this.minWidth, this.minHeight);
  }

  // --- Equality ---

  equals(other: BoxConstraints): boolean {
    return (
      this.minWidth === other.minWidth &&
      this.minHeight === other.minHeight &&
      this.maxWidth === other.maxWidth &&
      this.maxHeight === other.maxHeight
    );
  }

  toString(): string {
    if (this.isTight) {
      return `BoxConstraints.tight(${this.minWidth} x ${this.minHeight})`;
    }
    return (
      `BoxConstraints(` +
      `w: ${this.minWidth}..${fmtDim(this.maxWidth)}, ` +
      `h: ${this.minHeight}..${fmtDim(this.maxHeight)})`
    );
  }
}

// --- Helpers ---

/** Round to integer, but preserve Infinity. */
function roundOrInf(v: number): number {
  return Number.isFinite(v) ? Math.round(v) : v;
}

/** Clamp value between min and max. */
function clamp(value: number, min: number, max: number): number {
  if (value < min) return min;
  if (value > max) return max;
  return value;
}

/** Format a dimension for toString (show "Inf" for Infinity). */
function fmtDim(v: number): string {
  return Number.isFinite(v) ? String(v) : 'Inf';
}
