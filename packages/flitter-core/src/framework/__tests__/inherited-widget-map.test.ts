// Tests for _inheritedWidgets map: O(1) inherited widget lookup
// Extension: .gap/07-inherited-widget-map.md
//
// Verifies:
//   - O(1) lookup works for nested inherited widgets
//   - Multiple different InheritedWidget types at different levels are all accessible
//   - Lookup returns null when the type is not in the tree
//   - Map is properly propagated to children during addChild / mount
//   - Map is cleared on removeChild / unmount
//   - InheritedElement extends the map with itself

import { describe, test, expect } from 'bun:test';
import {
  Widget,
  StatelessWidget,
  InheritedWidget,
  type BuildContext,
} from '../widget';
import {
  Element,
  StatelessElement,
  InheritedElement,
} from '../element';
import { Key } from '../../core/key';

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

/** Absolute leaf element -- no children, minimal lifecycle. */
class LeafElement extends Element {
  constructor(widget: Widget) {
    super(widget);
  }

  mount(): void {
    this.markMounted();
  }

  override unmount(): void {
    super.unmount();
  }
}

/** Leaf widget for creating LeafElements. */
class TestTerminalLeaf extends Widget {
  constructor(opts?: { key?: Key }) {
    super({ key: opts?.key });
  }

  createElement(): Element {
    return new LeafElement(this);
  }
}

/** Stateless widget used to build a child tree. */
class TestStatelessWidget extends StatelessWidget {
  readonly buildFn: (ctx: BuildContext) => Widget;

  constructor(opts: { key?: Key; build: (ctx: BuildContext) => Widget }) {
    super({ key: opts.key });
    this.buildFn = opts.build;
  }

  build(context: BuildContext): Widget {
    return this.buildFn(context);
  }
}

// --- InheritedWidget types for testing ---

class ThemeWidget extends InheritedWidget {
  readonly theme: string;

  constructor(opts: { key?: Key; child: Widget; theme: string }) {
    super({ key: opts.key, child: opts.child });
    this.theme = opts.theme;
  }

  updateShouldNotify(oldWidget: InheritedWidget): boolean {
    return this.theme !== (oldWidget as ThemeWidget).theme;
  }
}

class LocaleWidget extends InheritedWidget {
  readonly locale: string;

  constructor(opts: { key?: Key; child: Widget; locale: string }) {
    super({ key: opts.key, child: opts.child });
    this.locale = opts.locale;
  }

  updateShouldNotify(oldWidget: InheritedWidget): boolean {
    return this.locale !== (oldWidget as LocaleWidget).locale;
  }
}

class DirectionWidget extends InheritedWidget {
  readonly direction: string;

  constructor(opts: { key?: Key; child: Widget; direction: string }) {
    super({ key: opts.key, child: opts.child });
    this.direction = opts.direction;
  }

  updateShouldNotify(oldWidget: InheritedWidget): boolean {
    return this.direction !== (oldWidget as DirectionWidget).direction;
  }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('_inheritedWidgets map (gap #07)', () => {
  describe('O(1) lookup via dependOnInheritedWidgetOfExactType', () => {
    test('finds inherited widget at immediate parent level', () => {
      const leaf = new TestTerminalLeaf();
      const childWidget = new TestStatelessWidget({ build: () => leaf });
      const theme = new ThemeWidget({ child: childWidget, theme: 'dark' });

      const themeElement = theme.createElement() as InheritedElement;
      themeElement.mount();

      // Navigate to the leaf element
      const statelessElement = themeElement.child as StatelessElement;
      const leafElement = statelessElement.child!;

      // O(1) lookup via the map
      const found = leafElement.dependOnInheritedWidgetOfExactType(ThemeWidget);
      expect(found).toBe(themeElement);
      expect(found!.inheritedWidget).toBeInstanceOf(ThemeWidget);
      expect((found!.inheritedWidget as ThemeWidget).theme).toBe('dark');
    });

    test('finds inherited widget several levels above', () => {
      // ThemeWidget -> StatelessWidget -> StatelessWidget -> StatelessWidget -> Leaf
      const leaf = new TestTerminalLeaf();
      const inner = new TestStatelessWidget({ build: () => leaf });
      const middle = new TestStatelessWidget({ build: () => inner });
      const outer = new TestStatelessWidget({ build: () => middle });
      const theme = new ThemeWidget({ child: outer, theme: 'light' });

      const themeElement = theme.createElement() as InheritedElement;
      themeElement.mount();

      // Walk down to the deepest leaf element
      const outerEl = themeElement.child as StatelessElement;
      const middleEl = outerEl.child as StatelessElement;
      const innerEl = middleEl.child as StatelessElement;
      const leafEl = innerEl.child!;

      // O(1) lookup -- does NOT walk up the tree, uses the map
      const found = leafEl.dependOnInheritedWidgetOfExactType(ThemeWidget);
      expect(found).toBe(themeElement);
    });

    test('returns null when the inherited type is not in the tree', () => {
      const leaf = new TestTerminalLeaf();
      const childWidget = new TestStatelessWidget({ build: () => leaf });
      const theme = new ThemeWidget({ child: childWidget, theme: 'dark' });

      const themeElement = theme.createElement() as InheritedElement;
      themeElement.mount();

      const statelessElement = themeElement.child as StatelessElement;
      const leafElement = statelessElement.child!;

      // Look for a type that's not in the tree
      const found = leafElement.dependOnInheritedWidgetOfExactType(LocaleWidget);
      expect(found).toBeNull();
    });

    test('returns null when _inheritedWidgets is null (detached element)', () => {
      const leaf = new TestTerminalLeaf();
      const element = new LeafElement(leaf);
      element.mount();

      // Element is not in any InheritedWidget tree, _inheritedWidgets is null
      expect(element._inheritedWidgets).toBeNull();

      const found = element.dependOnInheritedWidgetOfExactType(ThemeWidget);
      expect(found).toBeNull();
    });
  });

  describe('multiple InheritedWidget types at different levels', () => {
    test('all inherited types are accessible from deep descendant', () => {
      // Tree: ThemeWidget -> LocaleWidget -> DirectionWidget -> StatelessWidget -> Leaf
      const leaf = new TestTerminalLeaf();
      const childWidget = new TestStatelessWidget({ build: () => leaf });
      const directionWidget = new DirectionWidget({ child: childWidget, direction: 'ltr' });
      const localeWidget = new LocaleWidget({ child: directionWidget, locale: 'en-US' });
      const themeWidget = new ThemeWidget({ child: localeWidget, theme: 'dark' });

      const themeElement = themeWidget.createElement() as InheritedElement;
      themeElement.mount();

      // Walk to the leaf
      const localeElement = themeElement.child as InheritedElement;
      const directionElement = localeElement.child as InheritedElement;
      const statelessElement = directionElement.child as StatelessElement;
      const leafElement = statelessElement.child!;

      // All three types should be accessible via O(1) lookup
      const foundTheme = leafElement.dependOnInheritedWidgetOfExactType(ThemeWidget);
      expect(foundTheme).toBe(themeElement);
      expect((foundTheme!.inheritedWidget as ThemeWidget).theme).toBe('dark');

      const foundLocale = leafElement.dependOnInheritedWidgetOfExactType(LocaleWidget);
      expect(foundLocale).toBe(localeElement);
      expect((foundLocale!.inheritedWidget as LocaleWidget).locale).toBe('en-US');

      const foundDirection = leafElement.dependOnInheritedWidgetOfExactType(DirectionWidget);
      expect(foundDirection).toBe(directionElement);
      expect((foundDirection!.inheritedWidget as DirectionWidget).direction).toBe('ltr');
    });

    test('closer InheritedWidget of same type shadows outer one', () => {
      // Tree: ThemeWidget(dark) -> ThemeWidget(light) -> StatelessWidget -> Leaf
      const leaf = new TestTerminalLeaf();
      const childWidget = new TestStatelessWidget({ build: () => leaf });
      const innerTheme = new ThemeWidget({ child: childWidget, theme: 'light' });
      const outerTheme = new ThemeWidget({ child: innerTheme, theme: 'dark' });

      const outerElement = outerTheme.createElement() as InheritedElement;
      outerElement.mount();

      const innerElement = outerElement.child as InheritedElement;
      const statelessElement = innerElement.child as StatelessElement;
      const leafElement = statelessElement.child!;

      // The inner (closer) ThemeWidget should shadow the outer one
      const found = leafElement.dependOnInheritedWidgetOfExactType(ThemeWidget);
      expect(found).toBe(innerElement);
      expect((found!.inheritedWidget as ThemeWidget).theme).toBe('light');
    });

    test('elements at different levels see different subsets of inherited widgets', () => {
      // Tree: ThemeWidget -> LocaleWidget -> StatelessWidget -> Leaf
      const leaf = new TestTerminalLeaf();
      const childWidget = new TestStatelessWidget({ build: () => leaf });
      const localeWidget = new LocaleWidget({ child: childWidget, locale: 'fr-FR' });
      const themeWidget = new ThemeWidget({ child: localeWidget, theme: 'dark' });

      const themeElement = themeWidget.createElement() as InheritedElement;
      themeElement.mount();

      const localeElement = themeElement.child as InheritedElement;
      const statelessElement = localeElement.child as StatelessElement;
      const leafElement = statelessElement.child!;

      // The leaf sees both Theme and Locale
      expect(leafElement.dependOnInheritedWidgetOfExactType(ThemeWidget)).toBe(themeElement);
      expect(leafElement.dependOnInheritedWidgetOfExactType(LocaleWidget)).toBe(localeElement);

      // The LocaleElement itself should see Theme but NOT Locale (it IS the locale)
      // Actually, InheritedElement's own map includes itself, but the lookup
      // from its perspective finds itself, which is correct in Flutter semantics
      // (an InheritedElement can depend on itself if needed).
      // But LocaleElement's _child should NOT see Locale's own children's perspective.
      // Let's check the stateless element which sits BETWEEN locale and leaf:
      expect(statelessElement.dependOnInheritedWidgetOfExactType(ThemeWidget)).toBe(themeElement);
      expect(statelessElement.dependOnInheritedWidgetOfExactType(LocaleWidget)).toBe(localeElement);
    });
  });

  describe('map propagation and lifecycle', () => {
    test('_inheritedWidgets is set on children during addChild', () => {
      const leaf = new TestTerminalLeaf();
      const childWidget = new TestStatelessWidget({ build: () => leaf });
      const theme = new ThemeWidget({ child: childWidget, theme: 'dark' });

      const themeElement = theme.createElement() as InheritedElement;
      themeElement.mount();

      // The InheritedElement itself should have a map containing itself
      expect(themeElement._inheritedWidgets).not.toBeNull();
      expect(themeElement._inheritedWidgets!.get(ThemeWidget)).toBe(themeElement);
      expect(themeElement._inheritedWidgets!.size).toBe(1);

      // Its child should share the same map reference (since it's not an InheritedElement)
      const childEl = themeElement.child;
      expect(childEl).toBeDefined();
      expect(childEl!._inheritedWidgets).toBe(themeElement._inheritedWidgets);
    });

    test('InheritedElement creates a new map (does not mutate parent map)', () => {
      const leaf = new TestTerminalLeaf();
      const childWidget = new TestStatelessWidget({ build: () => leaf });
      const localeWidget = new LocaleWidget({ child: childWidget, locale: 'en' });
      const themeWidget = new ThemeWidget({ child: localeWidget, theme: 'dark' });

      const themeElement = themeWidget.createElement() as InheritedElement;
      themeElement.mount();

      const localeElement = themeElement.child as InheritedElement;

      // Theme element's map should only contain ThemeWidget
      expect(themeElement._inheritedWidgets!.size).toBe(1);
      expect(themeElement._inheritedWidgets!.has(ThemeWidget)).toBe(true);

      // Locale element's map should contain both ThemeWidget and LocaleWidget
      expect(localeElement._inheritedWidgets!.size).toBe(2);
      expect(localeElement._inheritedWidgets!.has(ThemeWidget)).toBe(true);
      expect(localeElement._inheritedWidgets!.has(LocaleWidget)).toBe(true);

      // They should NOT be the same Map object (InheritedElement creates a new one)
      expect(localeElement._inheritedWidgets).not.toBe(themeElement._inheritedWidgets);
    });

    test('_inheritedWidgets is cleared on removeChild', () => {
      const leaf = new TestTerminalLeaf();
      const childWidget = new TestStatelessWidget({ build: () => leaf });
      const theme = new ThemeWidget({ child: childWidget, theme: 'dark' });

      const themeElement = theme.createElement() as InheritedElement;
      themeElement.mount();

      const childEl = themeElement.child!;
      expect(childEl._inheritedWidgets).not.toBeNull();

      themeElement.removeChild(childEl);
      expect(childEl._inheritedWidgets).toBeNull();
    });

    test('_inheritedWidgets is cleared on unmount', () => {
      const leaf = new TestTerminalLeaf();
      const childWidget = new TestStatelessWidget({ build: () => leaf });
      const theme = new ThemeWidget({ child: childWidget, theme: 'dark' });

      const themeElement = theme.createElement() as InheritedElement;
      themeElement.mount();

      expect(themeElement._inheritedWidgets).not.toBeNull();

      themeElement.unmount();
      expect(themeElement._inheritedWidgets).toBeNull();
    });

    test('root InheritedElement initializes map even without parent', () => {
      const leaf = new TestTerminalLeaf();
      const childWidget = new TestStatelessWidget({ build: () => leaf });
      const theme = new ThemeWidget({ child: childWidget, theme: 'dark' });

      // Create and mount without a parent calling addChild first
      const themeElement = theme.createElement() as InheritedElement;
      themeElement.mount();

      // Map should be initialized with itself
      expect(themeElement._inheritedWidgets).not.toBeNull();
      expect(themeElement._inheritedWidgets!.has(ThemeWidget)).toBe(true);
    });

    test('removeAllChildren clears _inheritedWidgets on all children', () => {
      const leaf1 = new TestTerminalLeaf();
      const leaf2 = new TestTerminalLeaf();
      const el1 = new LeafElement(leaf1);
      const el2 = new LeafElement(leaf2);

      const parentWidget = new TestTerminalLeaf();
      const parentElement = new LeafElement(parentWidget);

      // Set up a non-null map on the parent
      const dummyMap = new Map<Function, InheritedElement>();
      parentElement._inheritedWidgets = dummyMap;

      parentElement.addChild(el1);
      parentElement.addChild(el2);
      el1.mount();
      el2.mount();

      // Both children should have the parent's map
      expect(el1._inheritedWidgets).toBe(dummyMap);
      expect(el2._inheritedWidgets).toBe(dummyMap);

      parentElement.removeAllChildren();

      expect(el1._inheritedWidgets).toBeNull();
      expect(el2._inheritedWidgets).toBeNull();
    });
  });

  describe('dependency registration', () => {
    test('dependOnInheritedWidgetOfExactType registers the element as a dependent', () => {
      const leaf = new TestTerminalLeaf();
      const childWidget = new TestStatelessWidget({ build: () => leaf });
      const theme = new ThemeWidget({ child: childWidget, theme: 'dark' });

      const themeElement = theme.createElement() as InheritedElement;
      themeElement.mount();

      const statelessElement = themeElement.child as StatelessElement;
      const leafElement = statelessElement.child!;

      // Before lookup, no dependents
      expect(themeElement._dependents.has(leafElement)).toBe(false);

      leafElement.dependOnInheritedWidgetOfExactType(ThemeWidget);

      // After lookup, the leaf should be registered as a dependent
      expect(themeElement._dependents.has(leafElement)).toBe(true);
      // And the leaf should track the dependency
      expect(leafElement._inheritedDependencies.has(themeElement)).toBe(true);
    });

    test('dependency registration works with multiple inherited types', () => {
      const leaf = new TestTerminalLeaf();
      const childWidget = new TestStatelessWidget({ build: () => leaf });
      const localeWidget = new LocaleWidget({ child: childWidget, locale: 'en' });
      const themeWidget = new ThemeWidget({ child: localeWidget, theme: 'dark' });

      const themeElement = themeWidget.createElement() as InheritedElement;
      themeElement.mount();

      const localeElement = themeElement.child as InheritedElement;
      const statelessElement = localeElement.child as StatelessElement;
      const leafElement = statelessElement.child!;

      leafElement.dependOnInheritedWidgetOfExactType(ThemeWidget);
      leafElement.dependOnInheritedWidgetOfExactType(LocaleWidget);

      expect(themeElement._dependents.has(leafElement)).toBe(true);
      expect(localeElement._dependents.has(leafElement)).toBe(true);
      expect(leafElement._inheritedDependencies.size).toBe(2);
    });
  });
});
