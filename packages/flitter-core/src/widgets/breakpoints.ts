// Responsive Breakpoint Utilities — Layout breakpoints based on terminal size
// Gap R09: Breakpoint definitions, builder widgets, and query utilities
//
// Provides:
// - Named width/height breakpoints for terminal TUI applications
// - Breakpoints static utility class for computing breakpoint state
// - BreakpointTheme InheritedWidget for custom threshold configuration
// - ResponsiveBuilder widget that rebuilds on breakpoint changes
// - ResponsiveSwitch widget for declarative breakpoint-based child selection
// - responsiveValue() function for selecting values by breakpoint
//
// All breakpoint computation is pure and stateless. Context-aware accessors
// compose with the existing MediaQuery InheritedWidget. Custom breakpoint
// schemes are supported via BreakpointTheme.

import { Key } from '../core/key';
import { Widget, InheritedWidget, StatelessWidget, BuildContext } from '../framework/widget';
import { MediaQuery } from './media-query';

// ---------------------------------------------------------------------------
// Breakpoint Data Types
// ---------------------------------------------------------------------------

/**
 * Named width breakpoint categories for terminal layouts.
 * Ordered from narrowest to widest.
 */
export type WidthBreakpoint = 'compact' | 'standard' | 'expanded' | 'wide';

/**
 * Named height breakpoint categories for terminal layouts.
 * Ordered from shortest to tallest.
 */
export type HeightBreakpoint = 'short' | 'medium' | 'tall';

/**
 * Terminal orientation derived from width vs height comparison.
 */
export type TerminalOrientation = 'landscape' | 'portrait' | 'square';

/**
 * Complete breakpoint state computed from a terminal size.
 */
export interface BreakpointState {
  /** Current width breakpoint name. */
  readonly width: WidthBreakpoint;
  /** Current height breakpoint name. */
  readonly height: HeightBreakpoint;
  /** Derived orientation. */
  readonly orientation: TerminalOrientation;
  /** Raw terminal size (cols x rows). */
  readonly size: { readonly width: number; readonly height: number };
}

/**
 * Configuration for width breakpoint thresholds.
 * Each value is the minimum column count for that breakpoint.
 * Must satisfy: compact < standard < expanded < wide.
 */
export interface WidthBreakpointConfig {
  readonly compact: number;   // always 0
  readonly standard: number;  // default: 80
  readonly expanded: number;  // default: 120
  readonly wide: number;      // default: 160
}

/**
 * Configuration for height breakpoint thresholds.
 * Each value is the minimum row count for that breakpoint.
 * Must satisfy: short < medium < tall.
 */
export interface HeightBreakpointConfig {
  readonly short: number;   // always 0
  readonly medium: number;  // default: 24
  readonly tall: number;    // default: 40
}

/**
 * Full breakpoint configuration.
 */
export interface BreakpointConfig {
  readonly width: WidthBreakpointConfig;
  readonly height: HeightBreakpointConfig;
}

// ---------------------------------------------------------------------------
// Breakpoints Utility Class
// ---------------------------------------------------------------------------

/**
 * Utility class for computing and querying terminal breakpoints.
 *
 * Provides:
 * - Default breakpoint thresholds for terminal TUI applications.
 * - Static methods for computing BreakpointState from raw dimensions.
 * - Context-aware static methods that read from MediaQuery.
 * - Comparison utilities for breakpoint ordering.
 *
 * Usage:
 *   // From raw dimensions:
 *   const state = Breakpoints.compute(80, 24);
 *   // state.width === 'standard', state.height === 'medium'
 *
 *   // From BuildContext (reads MediaQuery):
 *   const state = Breakpoints.of(context);
 *
 *   // Comparison:
 *   Breakpoints.isWidthAtLeast(context, 'expanded') // true if >= 120 cols
 */
export class Breakpoints {
  /** Default width breakpoint thresholds. */
  static readonly defaultWidthConfig: WidthBreakpointConfig = {
    compact: 0,
    standard: 80,
    expanded: 120,
    wide: 160,
  };

  /** Default height breakpoint thresholds. */
  static readonly defaultHeightConfig: HeightBreakpointConfig = {
    short: 0,
    medium: 24,
    tall: 40,
  };

  /** Default full configuration. */
  static readonly defaultConfig: BreakpointConfig = {
    width: Breakpoints.defaultWidthConfig,
    height: Breakpoints.defaultHeightConfig,
  };

  // --- Ordered breakpoint names for comparison ---

  private static readonly WIDTH_ORDER: readonly WidthBreakpoint[] = [
    'compact', 'standard', 'expanded', 'wide',
  ];

  private static readonly HEIGHT_ORDER: readonly HeightBreakpoint[] = [
    'short', 'medium', 'tall',
  ];

  // -----------------------------------------------------------------------
  // Computation
  // -----------------------------------------------------------------------

  /**
   * Compute the BreakpointState from raw terminal dimensions.
   *
   * @param cols - Terminal width in columns.
   * @param rows - Terminal height in rows.
   * @param config - Optional custom breakpoint configuration.
   */
  static compute(
    cols: number,
    rows: number,
    config: BreakpointConfig = Breakpoints.defaultConfig,
  ): BreakpointState {
    return {
      width: Breakpoints.computeWidth(cols, config.width),
      height: Breakpoints.computeHeight(rows, config.height),
      orientation: Breakpoints.computeOrientation(cols, rows),
      size: { width: cols, height: rows },
    };
  }

  /**
   * Compute the width breakpoint for the given column count.
   * Walks the thresholds from widest to narrowest, returning the first match.
   */
  static computeWidth(
    cols: number,
    config: WidthBreakpointConfig = Breakpoints.defaultWidthConfig,
  ): WidthBreakpoint {
    if (cols >= config.wide) return 'wide';
    if (cols >= config.expanded) return 'expanded';
    if (cols >= config.standard) return 'standard';
    return 'compact';
  }

  /**
   * Compute the height breakpoint for the given row count.
   */
  static computeHeight(
    rows: number,
    config: HeightBreakpointConfig = Breakpoints.defaultHeightConfig,
  ): HeightBreakpoint {
    if (rows >= config.tall) return 'tall';
    if (rows >= config.medium) return 'medium';
    return 'short';
  }

  /**
   * Compute the terminal orientation from dimensions.
   */
  static computeOrientation(cols: number, rows: number): TerminalOrientation {
    if (cols > rows) return 'landscape';
    if (rows > cols) return 'portrait';
    return 'square';
  }

  // -----------------------------------------------------------------------
  // Context-aware accessors (read from MediaQuery)
  // -----------------------------------------------------------------------

  /**
   * Compute breakpoints from the nearest MediaQuery ancestor.
   * Registers a dependency so the calling widget rebuilds when size changes.
   *
   * Throws if no MediaQuery is found in the ancestor chain.
   *
   * @param context - BuildContext from which to read MediaQuery.
   * @param config - Optional custom breakpoint thresholds.
   */
  static of(
    context: BuildContext,
    config?: BreakpointConfig,
  ): BreakpointState {
    const size = MediaQuery.sizeOf(context);
    return Breakpoints.compute(size.width, size.height, config);
  }

  /**
   * Like `of()` but returns undefined if no MediaQuery is found.
   */
  static maybeOf(
    context: BuildContext,
    config?: BreakpointConfig,
  ): BreakpointState | undefined {
    const data = MediaQuery.maybeOf(context);
    if (!data) return undefined;
    return Breakpoints.compute(data.size.width, data.size.height, config);
  }

  /**
   * Returns the current width breakpoint name from the nearest MediaQuery.
   */
  static widthOf(
    context: BuildContext,
    config?: WidthBreakpointConfig,
  ): WidthBreakpoint {
    const size = MediaQuery.sizeOf(context);
    return Breakpoints.computeWidth(size.width, config);
  }

  /**
   * Returns the current height breakpoint name from the nearest MediaQuery.
   */
  static heightOf(
    context: BuildContext,
    config?: HeightBreakpointConfig,
  ): HeightBreakpoint {
    const size = MediaQuery.sizeOf(context);
    return Breakpoints.computeHeight(size.height, config);
  }

  /**
   * Returns the current terminal orientation from the nearest MediaQuery.
   */
  static orientationOf(context: BuildContext): TerminalOrientation {
    const size = MediaQuery.sizeOf(context);
    return Breakpoints.computeOrientation(size.width, size.height);
  }

  // -----------------------------------------------------------------------
  // Comparison utilities
  // -----------------------------------------------------------------------

  /**
   * Returns the ordinal index of a width breakpoint (0=compact, 3=wide).
   */
  static widthIndex(bp: WidthBreakpoint): number {
    return Breakpoints.WIDTH_ORDER.indexOf(bp);
  }

  /**
   * Returns the ordinal index of a height breakpoint (0=short, 2=tall).
   */
  static heightIndex(bp: HeightBreakpoint): number {
    return Breakpoints.HEIGHT_ORDER.indexOf(bp);
  }

  /**
   * Returns true if the current width breakpoint is at least `minBreakpoint`.
   *
   * Example: `Breakpoints.isWidthAtLeast(context, 'expanded')` returns true
   * when the terminal is 120+ columns wide.
   */
  static isWidthAtLeast(
    context: BuildContext,
    minBreakpoint: WidthBreakpoint,
    config?: BreakpointConfig,
  ): boolean {
    const current = Breakpoints.of(context, config);
    return Breakpoints.widthIndex(current.width) >= Breakpoints.widthIndex(minBreakpoint);
  }

  /**
   * Returns true if the current height breakpoint is at least `minBreakpoint`.
   */
  static isHeightAtLeast(
    context: BuildContext,
    minBreakpoint: HeightBreakpoint,
    config?: BreakpointConfig,
  ): boolean {
    const current = Breakpoints.of(context, config);
    return Breakpoints.heightIndex(current.height) >= Breakpoints.heightIndex(minBreakpoint);
  }

  /**
   * Compare two width breakpoints.
   * Returns negative if a < b, zero if equal, positive if a > b.
   */
  static compareWidth(a: WidthBreakpoint, b: WidthBreakpoint): number {
    return Breakpoints.widthIndex(a) - Breakpoints.widthIndex(b);
  }

  /**
   * Compare two height breakpoints.
   * Returns negative if a < b, zero if equal, positive if a > b.
   */
  static compareHeight(a: HeightBreakpoint, b: HeightBreakpoint): number {
    return Breakpoints.heightIndex(a) - Breakpoints.heightIndex(b);
  }

  // Prevent instantiation -- all methods are static.
  private constructor() {}
}

// ---------------------------------------------------------------------------
// BreakpointTheme InheritedWidget
// ---------------------------------------------------------------------------

/**
 * InheritedWidget that provides custom BreakpointConfig to descendants.
 *
 * Place at the root of your app to override default breakpoint thresholds:
 *
 *   new BreakpointTheme({
 *     config: {
 *       width: { compact: 0, standard: 60, expanded: 100, wide: 140 },
 *       height: { short: 0, medium: 20, tall: 35 },
 *     },
 *     child: appRoot,
 *   })
 *
 * Widgets then read the config via:
 *   BreakpointTheme.of(context) // returns BreakpointConfig
 *
 * If no BreakpointTheme ancestor exists, Breakpoints.defaultConfig is used.
 */
export class BreakpointTheme extends InheritedWidget {
  readonly config: BreakpointConfig;

  constructor(opts: {
    config: BreakpointConfig;
    child: Widget;
    key?: Key;
  }) {
    super({ key: opts.key, child: opts.child });
    this.config = opts.config;
  }

  updateShouldNotify(oldWidget: InheritedWidget): boolean {
    const old = oldWidget as BreakpointTheme;
    return (
      this.config.width.standard !== old.config.width.standard ||
      this.config.width.expanded !== old.config.width.expanded ||
      this.config.width.wide !== old.config.width.wide ||
      this.config.height.medium !== old.config.height.medium ||
      this.config.height.tall !== old.config.height.tall
    );
  }

  /**
   * Returns the BreakpointConfig from the nearest BreakpointTheme ancestor,
   * or Breakpoints.defaultConfig if none is found.
   */
  static of(context: BuildContext): BreakpointConfig {
    const ctx = context as unknown as { dependOnInheritedWidgetOfExactType?: (widgetType: Function) => { widget: Widget } | null };
    if (typeof ctx.dependOnInheritedWidgetOfExactType === 'function') {
      const element = ctx.dependOnInheritedWidgetOfExactType(BreakpointTheme);
      if (element) {
        return (element.widget as BreakpointTheme).config;
      }
    }
    return Breakpoints.defaultConfig;
  }
}

// ---------------------------------------------------------------------------
// ResponsiveBuilder Widget
// ---------------------------------------------------------------------------

/**
 * A StatelessWidget that rebuilds its subtree with the current BreakpointState.
 *
 * This is the primary building block for responsive TUI layouts. It reads
 * the terminal size from MediaQuery, computes the active breakpoint, and
 * passes it to the builder callback.
 *
 * Usage:
 *   new ResponsiveBuilder({
 *     builder: (context, breakpoint) => {
 *       if (breakpoint.width === 'compact') {
 *         return buildCompactLayout();
 *       } else {
 *         return buildFullLayout();
 *       }
 *     },
 *   })
 *
 * For custom thresholds, either wrap with BreakpointTheme or pass a config:
 *   new ResponsiveBuilder({
 *     config: customConfig,
 *     builder: (context, breakpoint) => { ... },
 *   })
 */
export class ResponsiveBuilder extends StatelessWidget {
  readonly builder: (context: BuildContext, breakpoint: BreakpointState) => Widget;
  readonly config?: BreakpointConfig;

  constructor(opts: {
    key?: Key;
    builder: (context: BuildContext, breakpoint: BreakpointState) => Widget;
    config?: BreakpointConfig;
  }) {
    super(opts.key !== undefined ? { key: opts.key } : undefined);
    this.builder = opts.builder;
    this.config = opts.config;
  }

  build(context: BuildContext): Widget {
    // Use provided config, or read from BreakpointTheme ancestor, or use defaults
    const config = this.config ?? BreakpointTheme.of(context);
    const breakpoint = Breakpoints.of(context, config);
    return this.builder(context, breakpoint);
  }
}

// ---------------------------------------------------------------------------
// ResponsiveSwitch Widget
// ---------------------------------------------------------------------------

/**
 * Selects among child widgets based on the current width breakpoint.
 *
 * Follows a "mobile-first" approach: if a breakpoint-specific child is not
 * provided, falls back to the next smaller breakpoint that has one.
 *
 * Usage:
 *   new ResponsiveSwitch({
 *     compact: buildCompactView(),
 *     standard: buildStandardView(),
 *     expanded: buildExpandedView(),
 *     // 'wide' not specified, so 'expanded' is used for wide terminals too
 *   })
 */
export class ResponsiveSwitch extends StatelessWidget {
  readonly compact: Widget;
  readonly standard?: Widget;
  readonly expanded?: Widget;
  readonly wide?: Widget;
  readonly config?: BreakpointConfig;

  constructor(opts: {
    key?: Key;
    compact: Widget;
    standard?: Widget;
    expanded?: Widget;
    wide?: Widget;
    config?: BreakpointConfig;
  }) {
    super(opts.key !== undefined ? { key: opts.key } : undefined);
    this.compact = opts.compact;
    this.standard = opts.standard;
    this.expanded = opts.expanded;
    this.wide = opts.wide;
    this.config = opts.config;
  }

  build(context: BuildContext): Widget {
    const config = this.config ?? BreakpointTheme.of(context);
    const bp = Breakpoints.widthOf(context, config.width);

    // Fall back to the next smaller breakpoint if the current one is not defined.
    switch (bp) {
      case 'wide':
        if (this.wide) return this.wide;
        // fallthrough
      case 'expanded':
        if (this.expanded) return this.expanded;
        // fallthrough
      case 'standard':
        if (this.standard) return this.standard;
        // fallthrough
      case 'compact':
      default:
        return this.compact;
    }
  }
}

// ---------------------------------------------------------------------------
// responsiveValue Helper
// ---------------------------------------------------------------------------

/**
 * Select a value based on the current width breakpoint.
 * Uses the same mobile-first fallback as ResponsiveSwitch.
 *
 * Usage:
 *   const padding = responsiveValue(context, {
 *     compact: 1,
 *     standard: 2,
 *     expanded: 4,
 *   });
 *
 *   const columns = responsiveValue(context, {
 *     compact: 1,
 *     expanded: 2,
 *     wide: 3,
 *   });
 */
export function responsiveValue<T>(
  context: BuildContext,
  values: {
    compact: T;
    standard?: T;
    expanded?: T;
    wide?: T;
  },
  config?: BreakpointConfig,
): T {
  const resolvedConfig = config ?? BreakpointTheme.of(context);
  const bp = Breakpoints.widthOf(context, resolvedConfig.width);

  switch (bp) {
    case 'wide':
      if (values.wide !== undefined) return values.wide;
      // fallthrough
    case 'expanded':
      if (values.expanded !== undefined) return values.expanded;
      // fallthrough
    case 'standard':
      if (values.standard !== undefined) return values.standard;
      // fallthrough
    case 'compact':
    default:
      return values.compact;
  }
}
