// Tests for AppTheme InheritedWidget and AppThemeData
// Covers: AppThemeData interface, defaultTheme, of/maybeOf, updateShouldNotify,
// coexistence with Theme

import { describe, it, expect } from 'bun:test';
import { AppTheme } from '../app-theme';
import type { AppThemeData, SyntaxHighlightConfig } from '../app-theme';
import { Theme } from '../theme';
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

function buildTree(data: AppThemeData) {
  const leaf = new DummyLeaf();
  const appTheme = new AppTheme({ data, child: leaf });

  const appThemeElement = appTheme.createElement() as InheritedElement;
  appThemeElement.mount();

  const leafElement = appThemeElement.child!;
  const context = new BuildContextImpl(leafElement, leafElement.widget);
  return { context, appThemeElement, leafElement };
}

// ---------------------------------------------------------------------------
// AppTheme.defaultTheme()
// ---------------------------------------------------------------------------

describe('AppTheme.defaultTheme', () => {
  it('returns an AppThemeData with all required fields', () => {
    const td = AppTheme.defaultTheme();
    // syntaxHighlight config
    const shFields: (keyof SyntaxHighlightConfig)[] = [
      'keyword', 'string', 'comment', 'number', 'type', 'function',
      'operator', 'punctuation', 'variable', 'property', 'tag',
      'attribute', 'default',
    ];
    for (const f of shFields) {
      expect(td.syntaxHighlight[f]).toBeInstanceOf(Color);
    }
    // colors
    expect(td.colors.background).toBeInstanceOf(Color);
    expect(td.colors.foreground).toBeInstanceOf(Color);
    expect(td.colors.accent).toBeInstanceOf(Color);
    expect(td.colors.muted).toBeInstanceOf(Color);
    expect(td.colors.border).toBeInstanceOf(Color);
  });

  it('returns a fresh object each call', () => {
    const a = AppTheme.defaultTheme();
    const b = AppTheme.defaultTheme();
    expect(a).not.toBe(b);
    expect(a.syntaxHighlight.keyword.equals(b.syntaxHighlight.keyword)).toBe(true);
    expect(a.colors.accent.equals(b.colors.accent)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// AppTheme construction
// ---------------------------------------------------------------------------

describe('AppTheme', () => {
  describe('construction', () => {
    it('stores data and child', () => {
      const data = AppTheme.defaultTheme();
      const child = new DummyLeaf();
      const appTheme = new AppTheme({ data, child });
      expect(appTheme.data).toBe(data);
      expect(appTheme.child).toBe(child);
    });

    it('accepts an optional key', () => {
      const { ValueKey } = require('../../core/key');
      const data = AppTheme.defaultTheme();
      const child = new DummyLeaf();
      const appTheme = new AppTheme({ data, child, key: new ValueKey('app-theme') });
      expect(appTheme.key).toBeDefined();
    });
  });

  // ---------------------------------------------------------------------------
  // updateShouldNotify
  // ---------------------------------------------------------------------------

  describe('updateShouldNotify', () => {
    it('returns false when data is identical', () => {
      const data = AppTheme.defaultTheme();
      const child = new DummyLeaf();
      const a = new AppTheme({ data, child });
      const b = new AppTheme({ data, child });
      expect(b.updateShouldNotify(a)).toBe(false);
    });

    it('returns false when data has equal colors', () => {
      const child = new DummyLeaf();
      const a = new AppTheme({ data: AppTheme.defaultTheme(), child });
      const b = new AppTheme({ data: AppTheme.defaultTheme(), child });
      expect(b.updateShouldNotify(a)).toBe(false);
    });

    it('returns true when a syntaxHighlight color changes', () => {
      const child = new DummyLeaf();
      const dataA = AppTheme.defaultTheme();
      const dataB: AppThemeData = {
        ...AppTheme.defaultTheme(),
        syntaxHighlight: {
          ...AppTheme.defaultTheme().syntaxHighlight,
          keyword: Color.rgb(255, 0, 0),
        },
      };
      const a = new AppTheme({ data: dataA, child });
      const b = new AppTheme({ data: dataB, child });
      expect(b.updateShouldNotify(a)).toBe(true);
    });

    it('returns true when an app color changes', () => {
      const child = new DummyLeaf();
      const dataA = AppTheme.defaultTheme();
      const dataB: AppThemeData = {
        ...AppTheme.defaultTheme(),
        colors: {
          ...AppTheme.defaultTheme().colors,
          accent: Color.rgb(255, 0, 0),
        },
      };
      const a = new AppTheme({ data: dataA, child });
      const b = new AppTheme({ data: dataB, child });
      expect(b.updateShouldNotify(a)).toBe(true);
    });
  });

  // ---------------------------------------------------------------------------
  // createElement
  // ---------------------------------------------------------------------------

  describe('createElement', () => {
    it('creates an InheritedElement', () => {
      const data = AppTheme.defaultTheme();
      const child = new DummyLeaf();
      const appTheme = new AppTheme({ data, child });
      const element = appTheme.createElement();
      expect(element).toBeInstanceOf(InheritedElement);
      expect(element.widget).toBe(appTheme);
    });
  });

  // ---------------------------------------------------------------------------
  // static of / maybeOf
  // ---------------------------------------------------------------------------

  describe('static accessors (of, maybeOf)', () => {
    it('AppTheme.of() returns the AppThemeData', () => {
      const data = AppTheme.defaultTheme();
      const { context } = buildTree(data);
      const result = AppTheme.of(context);
      expect(result).toBe(data);
    });

    it('AppTheme.of() throws when no AppTheme ancestor exists', () => {
      const leaf = new DummyLeaf();
      const leafElement = leaf.createElement() as StatelessElement;
      const context = new BuildContextImpl(leafElement, leaf);
      expect(() => AppTheme.of(context)).toThrow('AppTheme.of()');
    });

    it('AppTheme.maybeOf() returns undefined when no AppTheme ancestor exists', () => {
      const leaf = new DummyLeaf();
      const leafElement = leaf.createElement() as StatelessElement;
      const context = new BuildContextImpl(leafElement, leaf);
      expect(AppTheme.maybeOf(context)).toBeUndefined();
    });

    it('registers dependency on the InheritedElement', () => {
      const data = AppTheme.defaultTheme();
      const { context, appThemeElement } = buildTree(data);
      const dependents = (appThemeElement as any)._dependents as Set<any>;

      // Trigger dependency
      AppTheme.of(context);

      expect(dependents.size).toBeGreaterThan(0);
    });
  });

  // ---------------------------------------------------------------------------
  // Coexistence with Theme
  // ---------------------------------------------------------------------------

  describe('coexistence with Theme', () => {
    it('AppTheme and Theme can both be ancestors', () => {
      const themeData = Theme.defaultTheme();
      const appThemeData = AppTheme.defaultTheme();
      const leaf = new DummyLeaf();

      // Build: Theme -> AppTheme -> leaf
      const appTheme = new AppTheme({ data: appThemeData, child: leaf });
      const theme = new Theme({ data: themeData, child: appTheme });

      const themeElement = theme.createElement() as InheritedElement;
      themeElement.mount();

      const appThemeElement = themeElement.child! as InheritedElement;
      const leafElement = appThemeElement.child!;

      const context = new BuildContextImpl(leafElement, leafElement.widget);

      // Both should be accessible
      const resultTheme = Theme.of(context);
      const resultAppTheme = AppTheme.of(context);

      expect(resultTheme).toBe(themeData);
      expect(resultAppTheme).toBe(appThemeData);
    });

    it('AppTheme.maybeOf returns undefined when only Theme is ancestor', () => {
      const themeData = Theme.defaultTheme();
      const leaf = new DummyLeaf();
      const theme = new Theme({ data: themeData, child: leaf });

      const themeElement = theme.createElement() as InheritedElement;
      themeElement.mount();

      const leafElement = themeElement.child!;
      const context = new BuildContextImpl(leafElement, leafElement.widget);

      expect(Theme.of(context)).toBe(themeData);
      expect(AppTheme.maybeOf(context)).toBeUndefined();
    });

    it('Theme.maybeOf returns undefined when only AppTheme is ancestor', () => {
      const appThemeData = AppTheme.defaultTheme();
      const leaf = new DummyLeaf();
      const appTheme = new AppTheme({ data: appThemeData, child: leaf });

      const appThemeElement = appTheme.createElement() as InheritedElement;
      appThemeElement.mount();

      const leafElement = appThemeElement.child!;
      const context = new BuildContextImpl(leafElement, leafElement.widget);

      expect(AppTheme.of(context)).toBe(appThemeData);
      expect(Theme.maybeOf(context)).toBeUndefined();
    });
  });

  // ---------------------------------------------------------------------------
  // Nested override
  // ---------------------------------------------------------------------------

  describe('nested AppTheme override', () => {
    it('inner AppTheme overrides outer', () => {
      const outerData = AppTheme.defaultTheme();
      const innerData: AppThemeData = {
        ...AppTheme.defaultTheme(),
        colors: {
          ...AppTheme.defaultTheme().colors,
          accent: Color.rgb(255, 0, 0),
        },
      };
      const leaf = new DummyLeaf();

      const inner = new AppTheme({ data: innerData, child: leaf });
      const outer = new AppTheme({ data: outerData, child: inner });

      const outerElement = outer.createElement() as InheritedElement;
      outerElement.mount();

      const innerElement = outerElement.child! as InheritedElement;
      const leafElement = innerElement.child!;

      const context = new BuildContextImpl(leafElement, leafElement.widget);
      const result = AppTheme.of(context);
      expect(result.colors.accent.equals(Color.rgb(255, 0, 0))).toBe(true);
    });
  });
});
