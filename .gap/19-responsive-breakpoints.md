# Gap R09: Responsive Breakpoint Utilities -- Layout Breakpoints Based on Terminal Size

## Status: Proposal
## Affected packages: `flitter-core`
## Depends on: Gap R08 (LayoutBuilder -- for container-query-based breakpoints)

---

## 1. Problem Statement

### 1.1 What Is Missing

Flitter has a `MediaQuery` InheritedWidget
(`/home/gem/workspace/flitter/packages/flitter-core/src/widgets/media-query.ts`)
that provides raw terminal dimensions (`size.width`, `size.height`) and
`TerminalCapabilities` to the widget tree. However, there are **no higher-level
utilities** for defining, querying, or reacting to layout breakpoints based on
terminal size. Every widget that needs to adapt its layout must:

1. Call `MediaQuery.of(context)` or `MediaQuery.sizeOf(context)` to get raw
   dimensions.
2. Write ad-hoc conditional logic (`if (size.width >= 120) ... else if ...`).
3. Duplicate breakpoint threshold constants across every widget that adapts.
4. Manually handle edge cases (width exactly on a boundary, orientation, etc.).

This leads to scattered, inconsistent breakpoint definitions, duplicated
threshold constants, and no centralized way for an application to define its own
breakpoint scheme. Applications cannot swap between breakpoint strategies
(e.g., compact/standard/expanded) without modifying every responsive widget.

### 1.2 Why It Matters for TUI Applications

Terminal emulators vary enormously in size:

| Terminal Context       | Typical Width | Typical Height |
|------------------------|---------------|----------------|
| Minimal (tmux split)   | 40-60 cols    | 10-20 rows     |
| Standard terminal      | 80 cols       | 24 rows        |
| Wide terminal          | 120-160 cols  | 40-50 rows     |
| Ultra-wide / tiling WM | 200+ cols     | 50+ rows       |
| VS Code integrated     | 80-120 cols   | 15-30 rows     |

A TUI framework needs first-class support for breakpoint-driven layout
adaptation so that:

- **Panels collapse** when the terminal is too narrow (e.g., hiding a sidebar).
- **Content density changes** (compact single-column vs. multi-column layouts).
- **Navigation adapts** (inline tabs vs. collapsible menu).
- **Information hierarchy shifts** (summary view vs. detail view).

### 1.3 What Peer Frameworks Offer

- **Flutter**: `MediaQuery.sizeOf()` plus community packages like
  `responsive_framework`, `responsive_builder`, and Material 3's adaptive
  layout with `WindowSizeClass`.
- **CSS/Web**: `@media` queries with `min-width`/`max-width` breakpoints, plus
  CSS Container Queries for element-level responsiveness.
- **Material 3**: Defines canonical window size classes: Compact (<600dp),
  Medium (600-840dp), Expanded (840-1200dp), Large (1200-1600dp),
  Extra-Large (>1600dp).

Flitter should provide an analogous system adapted for terminal column/row
dimensions.

---

## 2. Design Goals

1. **Named breakpoints**: A standard set of terminal-size breakpoints with
   semantic names (`compact`, `standard`, `expanded`, `wide`).
2. **Customizable thresholds**: Applications can define their own breakpoint
   scheme, overriding the defaults via an InheritedWidget.
3. **Builder widget**: A `ResponsiveBuilder` widget that rebuilds its subtree
   when the active breakpoint changes, providing the current breakpoint to its
   builder callback.
4. **Static query utilities**: Convenience methods like
   `Breakpoints.of(context)` and `Breakpoints.isAtLeast(context, 'expanded')`.
5. **Both viewport and container breakpoints**: Viewport breakpoints via
   `MediaQuery`, and container breakpoints via `LayoutBuilder` (Gap R08) for
   element-level responsiveness.
6. **Minimal API surface**: Utility classes, not framework extensions. No new
   InheritedWidget primitives beyond what already exists.
7. **Orientation awareness**: Breakpoints can consider both width and height,
   plus a derived `orientation` concept (`landscape` / `portrait` / `square`).

---

## 3. Terminal Breakpoint Definitions

### 3.1 Default Width Breakpoints

These defaults are designed for typical terminal usage patterns:

| Name       | Min Width (cols) | Typical Use Case                            |
|------------|------------------|---------------------------------------------|
| `compact`  | 0                | Narrow splits, minimal terminal, mobile SSH |
| `standard` | 80               | Default terminal, most CLI tools target this|
| `expanded` | 120              | Wide terminal, multi-pane layouts feasible  |
| `wide`     | 160              | Ultra-wide, tiling WMs, side-by-side panes  |

### 3.2 Default Height Breakpoints

| Name    | Min Height (rows) | Typical Use Case                     |
|---------|--------------------|--------------------------------------|
| `short` | 0                  | Tiny split panes, minimal height     |
| `medium`| 24                 | Standard terminal height              |
| `tall`  | 40                 | Large terminal, room for detail views |

### 3.3 Orientation

Derived from width and height comparison:

- `landscape`: width > height (typical for most terminals)
- `portrait`: height > width (rare, but possible in vertical splits)
- `square`: width === height

---

## 4. Proposed API

### 4.1 Breakpoint Data Types

```typescript
// File: packages/flitter-core/src/widgets/breakpoints.ts

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
```

### 4.2 Breakpoints Utility Class

```typescript
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
```

### 4.3 BreakpointConfig InheritedWidget

For applications that want to override the default breakpoint thresholds
globally, a `BreakpointTheme` InheritedWidget propagates a custom
`BreakpointConfig` down the tree:

```typescript
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
    const ctx = context as any;
    if (typeof ctx.dependOnInheritedWidgetOfExactType === 'function') {
      const element = ctx.dependOnInheritedWidgetOfExactType(BreakpointTheme);
      if (element) {
        return (element.widget as BreakpointTheme).config;
      }
    }
    return Breakpoints.defaultConfig;
  }
}
```

### 4.4 ResponsiveBuilder Widget

A convenience widget that rebuilds when the active breakpoint changes:

```typescript
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
```

### 4.5 ResponsiveSwitch Widget

A declarative widget that selects among pre-built children by breakpoint,
avoiding the need for a builder callback:

```typescript
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
```

### 4.6 ResponsiveValue Helper

A lightweight function for selecting a value (not a widget) by breakpoint:

```typescript
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
```

### 4.7 Container-Level Responsive Builder (Depends on Gap R08)

Once `LayoutBuilder` is correctly implemented (Gap R08), a
`ContainerResponsiveBuilder` can provide breakpoints based on the actual
constraints of a widget's container, not just the viewport:

```typescript
/**
 * Like ResponsiveBuilder, but derives breakpoints from the parent's
 * BoxConstraints (via LayoutBuilder) rather than from the viewport's
 * MediaQuery. This enables "container query" behavior where a component
 * adapts based on the space allocated to it, not the whole terminal.
 *
 * Requires a correct LayoutBuilder implementation (Gap R08).
 *
 * Usage:
 *   new ContainerResponsiveBuilder({
 *     builder: (context, breakpoint, constraints) => {
 *       if (breakpoint.width === 'compact') {
 *         return buildCollapsed();
 *       }
 *       return buildFull();
 *     },
 *   })
 */
export class ContainerResponsiveBuilder extends StatelessWidget {
  readonly builder: (
    context: BuildContext,
    breakpoint: BreakpointState,
    constraints: BoxConstraints,
  ) => Widget;
  readonly config?: BreakpointConfig;

  constructor(opts: {
    key?: Key;
    builder: (
      context: BuildContext,
      breakpoint: BreakpointState,
      constraints: BoxConstraints,
    ) => Widget;
    config?: BreakpointConfig;
  }) {
    super(opts.key !== undefined ? { key: opts.key } : undefined);
    this.builder = opts.builder;
    this.config = opts.config;
  }

  build(context: BuildContext): Widget {
    const config = this.config ?? BreakpointTheme.of(context);

    return new LayoutBuilder({
      builder: (ctx: BuildContext, constraints: BoxConstraints) => {
        // Use maxWidth/maxHeight as the "container size" for breakpoint computation.
        // If unbounded, fall back to the viewport size from MediaQuery.
        const mediaSize = MediaQuery.maybeOf(ctx)?.size;

        const effectiveWidth = isFinite(constraints.maxWidth)
          ? constraints.maxWidth
          : (mediaSize?.width ?? 80);
        const effectiveHeight = isFinite(constraints.maxHeight)
          ? constraints.maxHeight
          : (mediaSize?.height ?? 24);

        const breakpoint = Breakpoints.compute(
          effectiveWidth,
          effectiveHeight,
          config,
        );

        return this.builder(ctx, breakpoint, constraints);
      },
    });
  }
}
```

---

## 5. Usage Examples

### 5.1 Adaptive Sidebar Layout

```typescript
class AppLayout extends StatelessWidget {
  build(context: BuildContext): Widget {
    return new ResponsiveBuilder({
      builder: (ctx, bp) => {
        if (bp.width === 'compact') {
          // No sidebar at all in compact mode
          return new MainContent();
        }

        const sidebarWidth = responsiveValue(ctx, {
          compact: 0,
          standard: 20,
          expanded: 30,
          wide: 40,
        });

        return new Row({
          children: [
            new SizedBox({ width: sidebarWidth, child: new Sidebar() }),
            new Expanded({ child: new MainContent() }),
          ],
        });
      },
    });
  }
}
```

### 5.2 Declarative Content Switching

```typescript
class StatusPanel extends StatelessWidget {
  build(context: BuildContext): Widget {
    return new ResponsiveSwitch({
      compact: new Text({ text: new TextSpan({ text: 'OK' }) }),
      standard: new Text({ text: new TextSpan({ text: 'Status: OK' }) }),
      expanded: new StatusDetailView(),
    });
  }
}
```

### 5.3 Responsive Table Columns

```typescript
class DataView extends StatelessWidget {
  build(context: BuildContext): Widget {
    const columnCount = responsiveValue(context, {
      compact: 2,
      standard: 4,
      expanded: 6,
      wide: 8,
    });

    return new DataTable({
      columns: allColumns.slice(0, columnCount),
      rows: data,
    });
  }
}
```

### 5.4 Container-Level Adaptation

```typescript
// A reusable panel that adapts based on the space it is given,
// not the overall terminal size. If placed in a narrow sidebar,
// it shows compact mode even on a wide terminal.
class AdaptivePanel extends StatelessWidget {
  build(context: BuildContext): Widget {
    return new ContainerResponsiveBuilder({
      builder: (ctx, bp, constraints) => {
        if (bp.width === 'compact') {
          return new CompactPanelView();
        }
        return new FullPanelView();
      },
    });
  }
}
```

### 5.5 Custom Breakpoint Thresholds

```typescript
// Application root with custom breakpoints tailored for a specific TUI
const appRoot = new BreakpointTheme({
  config: {
    width: { compact: 0, standard: 60, expanded: 100, wide: 140 },
    height: { short: 0, medium: 20, tall: 35 },
  },
  child: new MyApp(),
});

// All descendants using Breakpoints.of(context) or ResponsiveBuilder
// will now use these custom thresholds.
```

---

## 6. File Layout and Exports

### 6.1 New File

| File | Contents |
|------|----------|
| `packages/flitter-core/src/widgets/breakpoints.ts` | All types, `Breakpoints`, `BreakpointTheme`, `ResponsiveBuilder`, `ResponsiveSwitch`, `ContainerResponsiveBuilder`, `responsiveValue` |

### 6.2 Export Updates

Add to `packages/flitter-core/src/index.ts`:

```typescript
// Responsive Breakpoints
export {
  Breakpoints,
  BreakpointTheme,
  ResponsiveBuilder,
  ResponsiveSwitch,
  ContainerResponsiveBuilder,
  responsiveValue,
} from './widgets/breakpoints';
export type {
  WidthBreakpoint,
  HeightBreakpoint,
  TerminalOrientation,
  BreakpointState,
  WidthBreakpointConfig,
  HeightBreakpointConfig,
  BreakpointConfig,
} from './widgets/breakpoints';
```

---

## 7. Testing Strategy

### 7.1 Unit Tests for Breakpoints Utility

```typescript
describe('Breakpoints', () => {
  describe('computeWidth', () => {
    it('returns compact for width < 80', () => {
      expect(Breakpoints.computeWidth(40)).toBe('compact');
      expect(Breakpoints.computeWidth(79)).toBe('compact');
    });

    it('returns standard for width 80-119', () => {
      expect(Breakpoints.computeWidth(80)).toBe('standard');
      expect(Breakpoints.computeWidth(119)).toBe('standard');
    });

    it('returns expanded for width 120-159', () => {
      expect(Breakpoints.computeWidth(120)).toBe('expanded');
      expect(Breakpoints.computeWidth(159)).toBe('expanded');
    });

    it('returns wide for width >= 160', () => {
      expect(Breakpoints.computeWidth(160)).toBe('wide');
      expect(Breakpoints.computeWidth(250)).toBe('wide');
    });

    it('handles boundary values exactly', () => {
      expect(Breakpoints.computeWidth(0)).toBe('compact');
      expect(Breakpoints.computeWidth(80)).toBe('standard');
      expect(Breakpoints.computeWidth(120)).toBe('expanded');
      expect(Breakpoints.computeWidth(160)).toBe('wide');
    });
  });

  describe('computeHeight', () => {
    it('returns short for height < 24', () => {
      expect(Breakpoints.computeHeight(10)).toBe('short');
      expect(Breakpoints.computeHeight(23)).toBe('short');
    });

    it('returns medium for height 24-39', () => {
      expect(Breakpoints.computeHeight(24)).toBe('medium');
      expect(Breakpoints.computeHeight(39)).toBe('medium');
    });

    it('returns tall for height >= 40', () => {
      expect(Breakpoints.computeHeight(40)).toBe('tall');
      expect(Breakpoints.computeHeight(60)).toBe('tall');
    });
  });

  describe('computeOrientation', () => {
    it('returns landscape when width > height', () => {
      expect(Breakpoints.computeOrientation(80, 24)).toBe('landscape');
    });

    it('returns portrait when height > width', () => {
      expect(Breakpoints.computeOrientation(20, 40)).toBe('portrait');
    });

    it('returns square when equal', () => {
      expect(Breakpoints.computeOrientation(30, 30)).toBe('square');
    });
  });

  describe('compute', () => {
    it('returns complete BreakpointState', () => {
      const state = Breakpoints.compute(120, 24);
      expect(state.width).toBe('expanded');
      expect(state.height).toBe('medium');
      expect(state.orientation).toBe('landscape');
      expect(state.size.width).toBe(120);
      expect(state.size.height).toBe(24);
    });

    it('accepts custom config', () => {
      const config: BreakpointConfig = {
        width: { compact: 0, standard: 60, expanded: 100, wide: 140 },
        height: { short: 0, medium: 20, tall: 35 },
      };
      const state = Breakpoints.compute(80, 24, config);
      expect(state.width).toBe('standard'); // 80 >= 60 but < 100
      expect(state.height).toBe('medium');  // 24 >= 20 but < 35
    });
  });

  describe('comparison utilities', () => {
    it('widthIndex returns correct ordinals', () => {
      expect(Breakpoints.widthIndex('compact')).toBe(0);
      expect(Breakpoints.widthIndex('standard')).toBe(1);
      expect(Breakpoints.widthIndex('expanded')).toBe(2);
      expect(Breakpoints.widthIndex('wide')).toBe(3);
    });

    it('compareWidth returns correct ordering', () => {
      expect(Breakpoints.compareWidth('compact', 'wide')).toBeLessThan(0);
      expect(Breakpoints.compareWidth('wide', 'compact')).toBeGreaterThan(0);
      expect(Breakpoints.compareWidth('standard', 'standard')).toBe(0);
    });
  });
});
```

### 7.2 Unit Tests for ResponsiveSwitch Fallback Logic

```typescript
describe('ResponsiveSwitch', () => {
  it('uses compact widget when terminal is narrow', () => {
    // Mount with MediaQuery providing 40x24
    const tree = buildWithMediaQuery(40, 24,
      new ResponsiveSwitch({
        compact: new Text({ text: new TextSpan({ text: 'COMPACT' }) }),
        expanded: new Text({ text: new TextSpan({ text: 'EXPANDED' }) }),
      }),
    );
    expect(findTextContent(tree)).toBe('COMPACT');
  });

  it('falls back to compact when standard is not provided', () => {
    // Mount with MediaQuery providing 80x24 (standard breakpoint)
    const tree = buildWithMediaQuery(80, 24,
      new ResponsiveSwitch({
        compact: new Text({ text: new TextSpan({ text: 'COMPACT' }) }),
        // standard not provided, should fall back to compact
        expanded: new Text({ text: new TextSpan({ text: 'EXPANDED' }) }),
      }),
    );
    expect(findTextContent(tree)).toBe('COMPACT');
  });

  it('uses expanded widget when terminal is wide enough', () => {
    const tree = buildWithMediaQuery(120, 24,
      new ResponsiveSwitch({
        compact: new Text({ text: new TextSpan({ text: 'COMPACT' }) }),
        expanded: new Text({ text: new TextSpan({ text: 'EXPANDED' }) }),
      }),
    );
    expect(findTextContent(tree)).toBe('EXPANDED');
  });

  it('falls back to expanded when wide is not provided', () => {
    const tree = buildWithMediaQuery(200, 50,
      new ResponsiveSwitch({
        compact: new Text({ text: new TextSpan({ text: 'COMPACT' }) }),
        expanded: new Text({ text: new TextSpan({ text: 'EXPANDED' }) }),
        // wide not provided, should fall back to expanded
      }),
    );
    expect(findTextContent(tree)).toBe('EXPANDED');
  });
});
```

### 7.3 Unit Tests for responsiveValue

```typescript
describe('responsiveValue', () => {
  it('selects correct value for each breakpoint', () => {
    // Simulate context with 80-column terminal
    const ctx80 = mockContextWithSize(80, 24);
    expect(responsiveValue(ctx80, {
      compact: 1,
      standard: 2,
      expanded: 4,
    })).toBe(2);

    // Simulate context with 120-column terminal
    const ctx120 = mockContextWithSize(120, 40);
    expect(responsiveValue(ctx120, {
      compact: 1,
      standard: 2,
      expanded: 4,
    })).toBe(4);
  });

  it('falls back to next smaller defined breakpoint', () => {
    const ctx160 = mockContextWithSize(160, 24);
    expect(responsiveValue(ctx160, {
      compact: 'A',
      expanded: 'C',
      // wide not defined, falls back to expanded
    })).toBe('C');
  });
});
```

### 7.4 Integration Tests for BreakpointTheme

```typescript
describe('BreakpointTheme', () => {
  it('provides custom config to descendants', () => {
    const customConfig: BreakpointConfig = {
      width: { compact: 0, standard: 60, expanded: 100, wide: 140 },
      height: { short: 0, medium: 20, tall: 35 },
    };

    // 80 cols with default config = standard
    // 80 cols with custom config (standard=60, expanded=100) = standard
    // But 70 cols with default config = compact, with custom config = standard
    const tree = buildWithMediaQueryAndBreakpointTheme(
      70, 24,
      customConfig,
      new ResponsiveBuilder({
        builder: (ctx, bp) => {
          return new Text({ text: new TextSpan({ text: bp.width }) });
        },
      }),
    );

    // With custom config, 70 cols >= 60 (standard threshold) = 'standard'
    // With default config, 70 cols < 80 = 'compact'
    expect(findTextContent(tree)).toBe('standard');
  });

  it('updateShouldNotify returns true when thresholds change', () => {
    const child = new DummyLeaf();
    const config1: BreakpointConfig = {
      width: { compact: 0, standard: 80, expanded: 120, wide: 160 },
      height: { short: 0, medium: 24, tall: 40 },
    };
    const config2: BreakpointConfig = {
      width: { compact: 0, standard: 60, expanded: 100, wide: 140 },
      height: { short: 0, medium: 20, tall: 35 },
    };

    const a = new BreakpointTheme({ config: config1, child });
    const b = new BreakpointTheme({ config: config2, child });
    expect(b.updateShouldNotify(a)).toBe(true);
  });

  it('updateShouldNotify returns false when thresholds are identical', () => {
    const child = new DummyLeaf();
    const config: BreakpointConfig = {
      width: { compact: 0, standard: 80, expanded: 120, wide: 160 },
      height: { short: 0, medium: 24, tall: 40 },
    };

    const a = new BreakpointTheme({ config, child });
    const b = new BreakpointTheme({ config, child });
    expect(b.updateShouldNotify(a)).toBe(false);
  });
});
```

---

## 8. Design Decisions

### 8.1 Static Utility Class vs. InheritedWidget-Based State

The `Breakpoints` class uses static methods that read from `MediaQuery` on
every call, rather than maintaining its own InheritedWidget with cached
`BreakpointState`. Rationale:

- **No new state to synchronize**: Breakpoints are a pure function of terminal
  dimensions. There is no mutable state to manage.
- **Automatic rebuild granularity**: When `MediaQuery.sizeOf(context)` is
  called, the calling widget registers a dependency on `MediaQuery`. When the
  terminal resizes, `MediaQuery` notifies dependents, which rebuild and
  recompute their breakpoints. No additional notification layer is needed.
- **Custom configs per subtree**: Different subtrees can use different
  breakpoint configurations without conflicting InheritedWidget scopes.

The `BreakpointTheme` InheritedWidget is provided for global threshold
customization, but the computation itself is always done by `Breakpoints`.

### 8.2 Mobile-First Fallback in ResponsiveSwitch

`ResponsiveSwitch` uses a mobile-first (narrow-first) fallback strategy:
if a widget for the current breakpoint is not provided, it falls through to
the next smaller breakpoint. This matches CSS responsive design conventions
and reduces boilerplate -- developers only need to define the compact base
and the breakpoints where the layout actually changes.

### 8.3 Separate Width and Height Breakpoints

Unlike CSS media queries which primarily use width, TUI layouts often need
height-based decisions (e.g., showing/hiding a status bar, switching between
scrollable and paginated views). The design provides independent width and
height breakpoint systems, plus an orientation derivation. `ResponsiveSwitch`
and `responsiveValue` are width-based by default (the most common case), but
the full `BreakpointState` is available through `ResponsiveBuilder` for
height-aware logic.

### 8.4 Container Breakpoints via LayoutBuilder Composition

Rather than building container query support directly into the breakpoint
system, `ContainerResponsiveBuilder` composes `LayoutBuilder` with the
`Breakpoints` computation. This keeps the concerns separated:

- `LayoutBuilder` handles the element/render phase bridge (Gap R08).
- `Breakpoints` handles threshold classification.
- `ContainerResponsiveBuilder` combines them.

This also means container breakpoints only become available after Gap R08 is
implemented. The viewport-based utilities (`Breakpoints.of`, `ResponsiveBuilder`,
`ResponsiveSwitch`, `responsiveValue`) work immediately with the existing
`MediaQuery` implementation.

### 8.5 No Widget-Level Caching or Memoization

The breakpoint computation (`computeWidth`, `computeHeight`, etc.) is trivial:
a handful of comparisons against integer thresholds. There is no benefit to
caching the result. Widgets that call `Breakpoints.of(context)` in their
`build()` method perform the computation fresh each time, which is fine for
3-4 integer comparisons.

---

## 9. Performance Considerations

### 9.1 Rebuild Scope

When the terminal is resized:

1. `MediaQuery.data` is updated at the root (by `WidgetsBinding`).
2. All widgets that called `MediaQuery.of(context)` or `MediaQuery.sizeOf(context)`
   are notified as dependents of the `MediaQuery` InheritedWidget.
3. Those widgets rebuild, recompute their breakpoints, and produce new subtrees.

This is identical to the current behavior for any widget that reads
`MediaQuery.sizeOf(context)`. The breakpoint utilities add no additional
rebuild notifications.

**Important**: A resize that does not cross a breakpoint boundary (e.g., 85
cols to 90 cols, both in "standard") still triggers a rebuild of widgets that
depend on `MediaQuery`. The rebuild is cheap (a few integer comparisons + the
builder callback which produces the same widget tree), and the framework's
element reconciliation will detect that the widget tree is unchanged and skip
further work. For truly selective rebuilds, see Section 9.2.

### 9.2 Future: Selective MediaQuery Dependencies (Out of Scope)

Flutter's `MediaQuery.sizeOf(context)` registers a dependency only on the size
aspect of `MediaQueryData`, avoiding rebuilds when only capabilities change.
Flitter's current `MediaQuery` always notifies on any data change. Adding
aspect-based notification (analogous to Flutter's `_MediaQueryAspect`) would
further reduce unnecessary rebuilds but is out of scope for this gap.

### 9.3 Rebuild Cost

The `ResponsiveBuilder` and `ResponsiveSwitch` widgets are `StatelessWidget`
subclasses. Their `build()` method performs:

1. One `dependOnInheritedWidgetOfExactType` lookup for `BreakpointTheme`
   (fast O(1) map lookup in the InheritedWidget map).
2. One `MediaQuery.sizeOf(context)` call (same fast lookup).
3. 3-4 integer comparisons for breakpoint classification.
4. One builder callback invocation or one switch-case to select a child.

Total overhead: negligible compared to the cost of building the actual child
widget tree.

---

## 10. Migration Path

### 10.1 Phase 1 -- Viewport Breakpoints (No Dependencies)

Implement `Breakpoints`, `BreakpointTheme`, `ResponsiveBuilder`,
`ResponsiveSwitch`, and `responsiveValue`. These only depend on the existing
`MediaQuery` widget and can be implemented immediately.

### 10.2 Phase 2 -- Container Breakpoints (Depends on Gap R08)

Implement `ContainerResponsiveBuilder` after `LayoutBuilder` is correctly
implemented per Gap R08. This is a pure composition and does not require any
changes to the Phase 1 code.

### 10.3 Phase 3 -- Aspect-Based MediaQuery (Future)

Add aspect-based notification to `MediaQuery` so that breakpoint widgets only
rebuild when the terminal size actually changes, not when capabilities change.
This is an optimization and does not change the public API.

---

## 11. Open Questions

1. **Should we include a `ResponsiveVisibility` widget?** A convenience widget
   that shows/hides its child based on the breakpoint (e.g., "only visible at
   `expanded` or wider"). This is trivially composable from `ResponsiveSwitch`
   with `SizedBox.shrink()`, but a dedicated widget improves readability.

2. **Should breakpoint names be extensible?** The current design uses fixed
   union types (`'compact' | 'standard' | 'expanded' | 'wide'`). If
   applications need additional breakpoints (e.g., `'ultraWide'`), they would
   need to use `responsiveValue` with custom logic. Should we support
   user-defined breakpoint names via generics?

3. **Should the height breakpoints be integrated into `ResponsiveSwitch`?**
   Currently `ResponsiveSwitch` only switches on width. A
   `ResponsiveHeightSwitch` or a two-dimensional `ResponsiveGrid` selector
   could be added but increases API surface.

4. **Integer vs. fractional thresholds?** Terminal dimensions are always
   integers, so integer thresholds are natural. But should the API accept
   fractional thresholds for edge cases (e.g., percentage-based container
   breakpoints)?

---

## 12. Summary

This proposal adds a complete responsive breakpoint utility layer to Flitter:

| Component                    | Purpose                                                   |
|------------------------------|-----------------------------------------------------------|
| `BreakpointState`            | Immutable snapshot: width/height breakpoint + orientation |
| `BreakpointConfig`           | Customizable threshold definitions                       |
| `Breakpoints`                | Static utility: compute breakpoints from dims or context  |
| `BreakpointTheme`            | InheritedWidget: global threshold customization          |
| `ResponsiveBuilder`          | Builder widget: rebuild on breakpoint change              |
| `ResponsiveSwitch`           | Declarative widget: select child by breakpoint            |
| `responsiveValue<T>`         | Function: select any value by breakpoint                  |
| `ContainerResponsiveBuilder` | Container-query-style responsive builder (needs Gap R08)  |

The design is layered: core computation is pure and stateless, context-aware
accessors compose with the existing `MediaQuery` InheritedWidget, and
convenience widgets build on both. Custom breakpoint schemes are supported via
`BreakpointTheme` without modifying any framework internals.
