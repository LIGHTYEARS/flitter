// Tests for Theme InheritedWidget and ThemeData
// Covers: ThemeData interface, defaultTheme, of/maybeOf, updateShouldNotify, nested override

import { describe, it, expect } from 'bun:test';
import { Theme } from '../theme';
import type { ThemeData } from '../theme';
import { Color } from '../../core/color';
import { StatelessWidget, Widget, BuildContext } from '../../framework/widget';
import { StatelessElement, InheritedElement, BuildContextImpl } from '../../framework/element';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

class DummyLeaf extends StatelessWidget {
  build(_context: BuildContext): Widget {
    return this; // self-referential leaf
  }
}

function buildTree(data: ThemeData) {
  const leaf = new DummyLeaf();
  const theme = new Theme({ data, child: leaf });

  const themeElement = theme.createElement() as InheritedElement;
  themeElement.mount();

  const leafElement = themeElement.child!;
  const context = new BuildContextImpl(leafElement, leafElement.widget);
  return { context, themeElement, leafElement };
}

// ---------------------------------------------------------------------------
// Theme.defaultTheme()
// ---------------------------------------------------------------------------

describe('Theme.defaultTheme', () => {
  it('returns a ThemeData with all required color fields', () => {
    const td = Theme.defaultTheme();
    const fields: (keyof ThemeData)[] = [
      'primary',
      'background',
      'surface',
      'text',
      'textSecondary',
      'success',
      'error',
      'warning',
      'info',
      'border',
      'scrollbarThumb',
      'scrollbarTrack',
      'diffAdded',
      'diffRemoved',
      'selectionBackground',
    ];
    for (const f of fields) {
      expect(td[f]).toBeInstanceOf(Color);
    }
  });

  it('returns a fresh object each call', () => {
    const a = Theme.defaultTheme();
    const b = Theme.defaultTheme();
    // Should be equal but distinct objects
    expect(a).not.toBe(b);
    expect(a.primary.equals(b.primary)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Theme construction
// ---------------------------------------------------------------------------

describe('Theme', () => {
  describe('construction', () => {
    it('stores data and child', () => {
      const data = Theme.defaultTheme();
      const child = new DummyLeaf();
      const theme = new Theme({ data, child });
      expect(theme.data).toBe(data);
      expect(theme.child).toBe(child);
    });

    it('accepts an optional key', () => {
      const { ValueKey } = require('../../core/key');
      const data = Theme.defaultTheme();
      const child = new DummyLeaf();
      const theme = new Theme({ data, child, key: new ValueKey('theme') });
      expect(theme.key).toBeDefined();
    });
  });

  // ---------------------------------------------------------------------------
  // updateShouldNotify
  // ---------------------------------------------------------------------------

  describe('updateShouldNotify', () => {
    it('returns false when data is identical', () => {
      const data = Theme.defaultTheme();
      const child = new DummyLeaf();
      const a = new Theme({ data, child });
      const b = new Theme({ data, child });
      expect(b.updateShouldNotify(a)).toBe(false);
    });

    it('returns false when data has equal colors', () => {
      const child = new DummyLeaf();
      const a = new Theme({ data: Theme.defaultTheme(), child });
      const b = new Theme({ data: Theme.defaultTheme(), child });
      expect(b.updateShouldNotify(a)).toBe(false);
    });

    it('returns true when a color field changes', () => {
      const child = new DummyLeaf();
      const dataA = Theme.defaultTheme();
      const dataB = { ...Theme.defaultTheme(), primary: Color.rgb(255, 0, 0) };
      const a = new Theme({ data: dataA, child });
      const b = new Theme({ data: dataB, child });
      expect(b.updateShouldNotify(a)).toBe(true);
    });

    it('returns true when error color changes', () => {
      const child = new DummyLeaf();
      const dataA = Theme.defaultTheme();
      const dataB = { ...Theme.defaultTheme(), error: Color.rgb(0, 0, 0) };
      const a = new Theme({ data: dataA, child });
      const b = new Theme({ data: dataB, child });
      expect(b.updateShouldNotify(a)).toBe(true);
    });

    it('returns true when selectionBackground changes', () => {
      const child = new DummyLeaf();
      const dataA = Theme.defaultTheme();
      const dataB = {
        ...Theme.defaultTheme(),
        selectionBackground: Color.rgb(255, 255, 255),
      };
      const a = new Theme({ data: dataA, child });
      const b = new Theme({ data: dataB, child });
      expect(b.updateShouldNotify(a)).toBe(true);
    });
  });

  // ---------------------------------------------------------------------------
  // createElement
  // ---------------------------------------------------------------------------

  describe('createElement', () => {
    it('creates an InheritedElement', () => {
      const data = Theme.defaultTheme();
      const child = new DummyLeaf();
      const theme = new Theme({ data, child });
      const element = theme.createElement();
      expect(element).toBeInstanceOf(InheritedElement);
      expect(element.widget).toBe(theme);
    });
  });

  // ---------------------------------------------------------------------------
  // static of / maybeOf
  // ---------------------------------------------------------------------------

  describe('static accessors (of, maybeOf)', () => {
    it('Theme.of() returns the ThemeData', () => {
      const data = Theme.defaultTheme();
      const { context } = buildTree(data);
      const result = Theme.of(context);
      expect(result).toBe(data);
    });

    it('Theme.of() throws when no Theme ancestor exists', () => {
      const leaf = new DummyLeaf();
      const leafElement = leaf.createElement() as StatelessElement;
      const context = new BuildContextImpl(leafElement, leaf);
      expect(() => Theme.of(context)).toThrow('Theme.of()');
    });

    it('Theme.maybeOf() returns undefined when no Theme ancestor exists', () => {
      const leaf = new DummyLeaf();
      const leafElement = leaf.createElement() as StatelessElement;
      const context = new BuildContextImpl(leafElement, leaf);
      expect(Theme.maybeOf(context)).toBeUndefined();
    });

    it('registers dependency on the InheritedElement', () => {
      const data = Theme.defaultTheme();
      const { context, themeElement } = buildTree(data);
      const dependents = (themeElement as any)._dependents as Set<any>;

      // Trigger dependency
      Theme.of(context);

      expect(dependents.size).toBeGreaterThan(0);
    });
  });

  // ---------------------------------------------------------------------------
  // Nested override
  // ---------------------------------------------------------------------------

  describe('nested Theme override', () => {
    it('inner Theme overrides outer', () => {
      const outerData = Theme.defaultTheme();
      const innerData = { ...Theme.defaultTheme(), primary: Color.rgb(255, 0, 0) };
      const leaf = new DummyLeaf();

      const inner = new Theme({ data: innerData, child: leaf });
      const outer = new Theme({ data: outerData, child: inner });

      const outerElement = outer.createElement() as InheritedElement;
      outerElement.mount();

      const innerElement = outerElement.child! as InheritedElement;
      const leafElement = innerElement.child!;

      const context = new BuildContextImpl(leafElement, leafElement.widget);
      const result = Theme.of(context);
      expect(result.primary.equals(Color.rgb(255, 0, 0))).toBe(true);
    });
  });

  // ---------------------------------------------------------------------------
  // Custom ThemeData
  // ---------------------------------------------------------------------------

  describe('custom ThemeData', () => {
    it('supports fully custom color scheme', () => {
      const custom: ThemeData = {
        primary: Color.cyan,
        background: Color.black,
        surface: Color.brightBlack,
        text: Color.white,
        textSecondary: Color.brightBlack,
        success: Color.green,
        error: Color.red,
        warning: Color.yellow,
        info: Color.cyan,
        border: Color.brightBlack,
        scrollbarThumb: Color.white,
        scrollbarTrack: Color.black,
        diffAdded: Color.green,
        diffRemoved: Color.red,
        selectionBackground: Color.blue,
      };

      const { context } = buildTree(custom);
      const result = Theme.of(context);
      expect(result.primary.equals(Color.cyan)).toBe(true);
      expect(result.background.equals(Color.black)).toBe(true);
      expect(result.error.equals(Color.red)).toBe(true);
    });
  });
});
