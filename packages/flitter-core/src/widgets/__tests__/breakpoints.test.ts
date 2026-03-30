// Tests for Responsive Breakpoint Utilities (Gap R09)
// Covers: Breakpoints computation, comparison, context-aware accessors,
//         BreakpointTheme, ResponsiveBuilder, ResponsiveSwitch, responsiveValue

import { describe, it, expect } from 'bun:test';
import {
  Breakpoints,
  BreakpointTheme,
  ResponsiveBuilder,
  ResponsiveSwitch,
  responsiveValue,
} from '../breakpoints';
import type {
  BreakpointConfig,
  BreakpointState,
  WidthBreakpoint,
  HeightBreakpoint,
} from '../breakpoints';
import { MediaQueryData, MediaQuery } from '../media-query';
import { StatelessWidget, Widget, BuildContext } from '../../framework/widget';
import { InheritedElement, BuildContextImpl } from '../../framework/element';
import { Text, RenderText } from '../text';
import { TextSpan } from '../../core/text-span';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

class DummyLeaf extends StatelessWidget {
  build(_context: BuildContext): Widget {
    return this; // self-referential leaf
  }
}

/**
 * Build a minimal element tree: MediaQuery -> child
 * Returns the child's BuildContext for testing.
 */
function buildWithMediaQuery(cols: number, rows: number, child: Widget) {
  const data = MediaQueryData.fromTerminal(cols, rows);
  const mq = new MediaQuery({ data, child });
  const mqElement = mq.createElement() as InheritedElement;
  mqElement.mount();
  const childElement = mqElement.child!;
  const context = new BuildContextImpl(childElement, childElement.widget);
  return { context, mqElement, childElement };
}

/**
 * Build a tree: MediaQuery -> BreakpointTheme -> child
 */
function buildWithBreakpointTheme(
  cols: number,
  rows: number,
  config: BreakpointConfig,
  child: Widget,
) {
  const data = MediaQueryData.fromTerminal(cols, rows);
  const theme = new BreakpointTheme({ config, child });
  const mq = new MediaQuery({ data, child: theme });

  const mqElement = mq.createElement() as InheritedElement;
  mqElement.mount();

  // Walk: mq -> theme (InheritedElement) -> child
  const themeElement = mqElement.child! as InheritedElement;
  const childElement = themeElement.child!;
  const context = new BuildContextImpl(childElement, childElement.widget);
  return { context, mqElement, themeElement, childElement };
}

// ---------------------------------------------------------------------------
// Breakpoints utility class
// ---------------------------------------------------------------------------

describe('Breakpoints', () => {
  describe('computeWidth', () => {
    it('returns compact for width < 80', () => {
      expect(Breakpoints.computeWidth(0)).toBe('compact');
      expect(Breakpoints.computeWidth(40)).toBe('compact');
      expect(Breakpoints.computeWidth(79)).toBe('compact');
    });

    it('returns standard for width 80-119', () => {
      expect(Breakpoints.computeWidth(80)).toBe('standard');
      expect(Breakpoints.computeWidth(100)).toBe('standard');
      expect(Breakpoints.computeWidth(119)).toBe('standard');
    });

    it('returns expanded for width 120-159', () => {
      expect(Breakpoints.computeWidth(120)).toBe('expanded');
      expect(Breakpoints.computeWidth(140)).toBe('expanded');
      expect(Breakpoints.computeWidth(159)).toBe('expanded');
    });

    it('returns wide for width >= 160', () => {
      expect(Breakpoints.computeWidth(160)).toBe('wide');
      expect(Breakpoints.computeWidth(200)).toBe('wide');
      expect(Breakpoints.computeWidth(250)).toBe('wide');
    });

    it('handles boundary values exactly', () => {
      expect(Breakpoints.computeWidth(0)).toBe('compact');
      expect(Breakpoints.computeWidth(80)).toBe('standard');
      expect(Breakpoints.computeWidth(120)).toBe('expanded');
      expect(Breakpoints.computeWidth(160)).toBe('wide');
    });

    it('accepts custom config', () => {
      const config = { compact: 0, standard: 60, expanded: 100, wide: 140 };
      expect(Breakpoints.computeWidth(59, config)).toBe('compact');
      expect(Breakpoints.computeWidth(60, config)).toBe('standard');
      expect(Breakpoints.computeWidth(100, config)).toBe('expanded');
      expect(Breakpoints.computeWidth(140, config)).toBe('wide');
    });
  });

  describe('computeHeight', () => {
    it('returns short for height < 24', () => {
      expect(Breakpoints.computeHeight(0)).toBe('short');
      expect(Breakpoints.computeHeight(10)).toBe('short');
      expect(Breakpoints.computeHeight(23)).toBe('short');
    });

    it('returns medium for height 24-39', () => {
      expect(Breakpoints.computeHeight(24)).toBe('medium');
      expect(Breakpoints.computeHeight(30)).toBe('medium');
      expect(Breakpoints.computeHeight(39)).toBe('medium');
    });

    it('returns tall for height >= 40', () => {
      expect(Breakpoints.computeHeight(40)).toBe('tall');
      expect(Breakpoints.computeHeight(50)).toBe('tall');
      expect(Breakpoints.computeHeight(60)).toBe('tall');
    });

    it('accepts custom config', () => {
      const config = { short: 0, medium: 20, tall: 35 };
      expect(Breakpoints.computeHeight(19, config)).toBe('short');
      expect(Breakpoints.computeHeight(20, config)).toBe('medium');
      expect(Breakpoints.computeHeight(35, config)).toBe('tall');
    });
  });

  describe('computeOrientation', () => {
    it('returns landscape when width > height', () => {
      expect(Breakpoints.computeOrientation(80, 24)).toBe('landscape');
      expect(Breakpoints.computeOrientation(120, 40)).toBe('landscape');
    });

    it('returns portrait when height > width', () => {
      expect(Breakpoints.computeOrientation(20, 40)).toBe('portrait');
      expect(Breakpoints.computeOrientation(10, 11)).toBe('portrait');
    });

    it('returns square when equal', () => {
      expect(Breakpoints.computeOrientation(30, 30)).toBe('square');
      expect(Breakpoints.computeOrientation(0, 0)).toBe('square');
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

    it('returns complete state for compact/short terminal', () => {
      const state = Breakpoints.compute(40, 10);
      expect(state.width).toBe('compact');
      expect(state.height).toBe('short');
      expect(state.orientation).toBe('landscape');
    });

    it('returns complete state for wide/tall terminal', () => {
      const state = Breakpoints.compute(200, 50);
      expect(state.width).toBe('wide');
      expect(state.height).toBe('tall');
      expect(state.orientation).toBe('landscape');
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

    it('heightIndex returns correct ordinals', () => {
      expect(Breakpoints.heightIndex('short')).toBe(0);
      expect(Breakpoints.heightIndex('medium')).toBe(1);
      expect(Breakpoints.heightIndex('tall')).toBe(2);
    });

    it('compareWidth returns correct ordering', () => {
      expect(Breakpoints.compareWidth('compact', 'wide')).toBeLessThan(0);
      expect(Breakpoints.compareWidth('wide', 'compact')).toBeGreaterThan(0);
      expect(Breakpoints.compareWidth('standard', 'standard')).toBe(0);
      expect(Breakpoints.compareWidth('expanded', 'standard')).toBeGreaterThan(0);
    });

    it('compareHeight returns correct ordering', () => {
      expect(Breakpoints.compareHeight('short', 'tall')).toBeLessThan(0);
      expect(Breakpoints.compareHeight('tall', 'short')).toBeGreaterThan(0);
      expect(Breakpoints.compareHeight('medium', 'medium')).toBe(0);
    });
  });

  describe('default config', () => {
    it('has correct default width thresholds', () => {
      expect(Breakpoints.defaultWidthConfig.compact).toBe(0);
      expect(Breakpoints.defaultWidthConfig.standard).toBe(80);
      expect(Breakpoints.defaultWidthConfig.expanded).toBe(120);
      expect(Breakpoints.defaultWidthConfig.wide).toBe(160);
    });

    it('has correct default height thresholds', () => {
      expect(Breakpoints.defaultHeightConfig.short).toBe(0);
      expect(Breakpoints.defaultHeightConfig.medium).toBe(24);
      expect(Breakpoints.defaultHeightConfig.tall).toBe(40);
    });

    it('defaultConfig references the individual configs', () => {
      expect(Breakpoints.defaultConfig.width).toBe(Breakpoints.defaultWidthConfig);
      expect(Breakpoints.defaultConfig.height).toBe(Breakpoints.defaultHeightConfig);
    });
  });

  describe('context-aware accessors', () => {
    it('of() returns BreakpointState from MediaQuery', () => {
      const leaf = new DummyLeaf();
      const { context } = buildWithMediaQuery(120, 40, leaf);
      const state = Breakpoints.of(context);
      expect(state.width).toBe('expanded');
      expect(state.height).toBe('tall');
      expect(state.orientation).toBe('landscape');
    });

    it('maybeOf() returns BreakpointState from MediaQuery', () => {
      const leaf = new DummyLeaf();
      const { context } = buildWithMediaQuery(80, 24, leaf);
      const state = Breakpoints.maybeOf(context);
      expect(state).toBeDefined();
      expect(state!.width).toBe('standard');
      expect(state!.height).toBe('medium');
    });

    it('maybeOf() returns undefined when no MediaQuery', () => {
      const leaf = new DummyLeaf();
      const leafElement = leaf.createElement();
      const context = new BuildContextImpl(leafElement as any, leaf);
      const state = Breakpoints.maybeOf(context);
      expect(state).toBeUndefined();
    });

    it('widthOf() returns width breakpoint', () => {
      const leaf = new DummyLeaf();
      const { context } = buildWithMediaQuery(160, 24, leaf);
      expect(Breakpoints.widthOf(context)).toBe('wide');
    });

    it('heightOf() returns height breakpoint', () => {
      const leaf = new DummyLeaf();
      const { context } = buildWithMediaQuery(80, 50, leaf);
      expect(Breakpoints.heightOf(context)).toBe('tall');
    });

    it('orientationOf() returns orientation', () => {
      const leaf = new DummyLeaf();
      const { context } = buildWithMediaQuery(80, 24, leaf);
      expect(Breakpoints.orientationOf(context)).toBe('landscape');
    });

    it('isWidthAtLeast() returns correct boolean', () => {
      const leaf = new DummyLeaf();
      const { context } = buildWithMediaQuery(120, 24, leaf);
      expect(Breakpoints.isWidthAtLeast(context, 'compact')).toBe(true);
      expect(Breakpoints.isWidthAtLeast(context, 'standard')).toBe(true);
      expect(Breakpoints.isWidthAtLeast(context, 'expanded')).toBe(true);
      expect(Breakpoints.isWidthAtLeast(context, 'wide')).toBe(false);
    });

    it('isHeightAtLeast() returns correct boolean', () => {
      const leaf = new DummyLeaf();
      const { context } = buildWithMediaQuery(80, 24, leaf);
      expect(Breakpoints.isHeightAtLeast(context, 'short')).toBe(true);
      expect(Breakpoints.isHeightAtLeast(context, 'medium')).toBe(true);
      expect(Breakpoints.isHeightAtLeast(context, 'tall')).toBe(false);
    });
  });
});

// ---------------------------------------------------------------------------
// BreakpointTheme
// ---------------------------------------------------------------------------

describe('BreakpointTheme', () => {
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

  it('of() returns custom config from ancestor', () => {
    const customConfig: BreakpointConfig = {
      width: { compact: 0, standard: 60, expanded: 100, wide: 140 },
      height: { short: 0, medium: 20, tall: 35 },
    };
    const leaf = new DummyLeaf();
    const { context } = buildWithBreakpointTheme(80, 24, customConfig, leaf);
    const config = BreakpointTheme.of(context);
    expect(config.width.standard).toBe(60);
    expect(config.width.expanded).toBe(100);
    expect(config.height.medium).toBe(20);
  });

  it('of() returns defaultConfig when no ancestor', () => {
    const leaf = new DummyLeaf();
    const { context } = buildWithMediaQuery(80, 24, leaf);
    const config = BreakpointTheme.of(context);
    expect(config).toBe(Breakpoints.defaultConfig);
  });

  it('custom config affects breakpoint computation', () => {
    const customConfig: BreakpointConfig = {
      width: { compact: 0, standard: 60, expanded: 100, wide: 140 },
      height: { short: 0, medium: 20, tall: 35 },
    };

    // 70 cols: with default config = compact (< 80), with custom = standard (>= 60)
    const leaf = new DummyLeaf();
    const { context } = buildWithBreakpointTheme(70, 24, customConfig, leaf);

    // Use the context's BreakpointTheme config for computation
    const config = BreakpointTheme.of(context);
    const state = Breakpoints.of(context, config);
    expect(state.width).toBe('standard');
  });
});

// ---------------------------------------------------------------------------
// responsiveValue
// ---------------------------------------------------------------------------

describe('responsiveValue', () => {
  it('selects correct value for compact breakpoint', () => {
    const leaf = new DummyLeaf();
    const { context } = buildWithMediaQuery(40, 24, leaf);
    const value = responsiveValue(context, {
      compact: 1,
      standard: 2,
      expanded: 4,
    });
    expect(value).toBe(1);
  });

  it('selects correct value for standard breakpoint', () => {
    const leaf = new DummyLeaf();
    const { context } = buildWithMediaQuery(80, 24, leaf);
    const value = responsiveValue(context, {
      compact: 1,
      standard: 2,
      expanded: 4,
    });
    expect(value).toBe(2);
  });

  it('selects correct value for expanded breakpoint', () => {
    const leaf = new DummyLeaf();
    const { context } = buildWithMediaQuery(120, 24, leaf);
    const value = responsiveValue(context, {
      compact: 1,
      standard: 2,
      expanded: 4,
    });
    expect(value).toBe(4);
  });

  it('falls back to next smaller defined breakpoint', () => {
    const leaf = new DummyLeaf();
    // wide breakpoint (160+), but wide not defined -- falls to expanded
    const { context } = buildWithMediaQuery(160, 24, leaf);
    const value = responsiveValue(context, {
      compact: 'A',
      expanded: 'C',
    });
    expect(value).toBe('C');
  });

  it('falls back to compact when intermediate breakpoints are not defined', () => {
    const leaf = new DummyLeaf();
    // standard breakpoint (80+), but standard not defined -- falls to compact
    const { context } = buildWithMediaQuery(80, 24, leaf);
    const value = responsiveValue(context, {
      compact: 'fallback',
      expanded: 'expanded',
    });
    expect(value).toBe('fallback');
  });

  it('selects wide value when at wide breakpoint', () => {
    const leaf = new DummyLeaf();
    const { context } = buildWithMediaQuery(200, 24, leaf);
    const value = responsiveValue(context, {
      compact: 1,
      standard: 2,
      expanded: 3,
      wide: 4,
    });
    expect(value).toBe(4);
  });

  it('works with non-numeric types', () => {
    const leaf = new DummyLeaf();
    const { context } = buildWithMediaQuery(120, 24, leaf);
    const value = responsiveValue(context, {
      compact: { cols: 1 },
      expanded: { cols: 3 },
    });
    expect(value).toEqual({ cols: 3 });
  });
});

// ---------------------------------------------------------------------------
// ResponsiveBuilder (basic test -- verifies it calls builder with breakpoint)
// ---------------------------------------------------------------------------

describe('ResponsiveBuilder', () => {
  it('creates a StatelessWidget', () => {
    const rb = new ResponsiveBuilder({
      builder: (_ctx, _bp) => new DummyLeaf(),
    });
    expect(rb).toBeDefined();
    expect(rb.builder).toBeInstanceOf(Function);
  });

  it('stores optional config', () => {
    const config: BreakpointConfig = {
      width: { compact: 0, standard: 60, expanded: 100, wide: 140 },
      height: { short: 0, medium: 20, tall: 35 },
    };
    const rb = new ResponsiveBuilder({
      config,
      builder: (_ctx, _bp) => new DummyLeaf(),
    });
    expect(rb.config).toBe(config);
  });

  it('stores optional key', () => {
    const { ValueKey } = require('../../core/key');
    const rb = new ResponsiveBuilder({
      key: new ValueKey('test'),
      builder: (_ctx, _bp) => new DummyLeaf(),
    });
    expect(rb.key).toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// ResponsiveSwitch (basic test)
// ---------------------------------------------------------------------------

describe('ResponsiveSwitch', () => {
  it('creates a StatelessWidget with compact child', () => {
    const compact = new DummyLeaf();
    const rs = new ResponsiveSwitch({ compact });
    expect(rs.compact).toBe(compact);
    expect(rs.standard).toBeUndefined();
    expect(rs.expanded).toBeUndefined();
    expect(rs.wide).toBeUndefined();
  });

  it('stores all provided children', () => {
    const compact = new DummyLeaf();
    const standard = new DummyLeaf();
    const expanded = new DummyLeaf();
    const wide = new DummyLeaf();
    const rs = new ResponsiveSwitch({ compact, standard, expanded, wide });
    expect(rs.compact).toBe(compact);
    expect(rs.standard).toBe(standard);
    expect(rs.expanded).toBe(expanded);
    expect(rs.wide).toBe(wide);
  });

  it('stores optional config', () => {
    const config: BreakpointConfig = {
      width: { compact: 0, standard: 60, expanded: 100, wide: 140 },
      height: { short: 0, medium: 20, tall: 35 },
    };
    const rs = new ResponsiveSwitch({ compact: new DummyLeaf(), config });
    expect(rs.config).toBe(config);
  });
});
