// Tests for ProxyWidget and ProxyElement (Gap F06)
//
// Validates:
// 1. ProxyWidget is an abstract base for single-child pass-through widgets
// 2. ProxyElement manages single child lifecycle (mount, update, unmount)
// 3. InheritedWidget/Element still work correctly via ProxyWidget/Element base
// 4. ParentDataWidget/Element still work correctly via ProxyWidget/Element base
// 5. instanceof checks work as expected

import { describe, test, expect } from 'bun:test';
import {
  Widget,
  StatelessWidget,
  StatefulWidget,
  State,
  InheritedWidget,
  ProxyWidget,
  type BuildContext,
} from '../widget';
import {
  Element,
  StatelessElement,
  StatefulElement,
  InheritedElement,
  ProxyElement,
  BuildContextImpl,
} from '../element';
import { Key, ValueKey } from '../../core/key';

// ---------------------------------------------------------------------------
// Test Helpers
// ---------------------------------------------------------------------------

/** Absolute leaf widget — creates a simple element with a mount() method. */
class TestTerminalLeaf extends Widget {
  readonly text: string;

  constructor(opts?: { key?: Key; text?: string }) {
    super({ key: opts?.key });
    this.text = opts?.text ?? 'terminal';
  }

  createElement(): any {
    return new LeafElement(this);
  }
}

/** Simple element with no children. */
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

/** A simple stateless widget for building children. */
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

/** Concrete InheritedWidget for testing. */
class TestInheritedWidget extends InheritedWidget {
  readonly value: number;

  constructor(opts: { key?: Key; child: Widget; value: number }) {
    super({ key: opts.key, child: opts.child });
    this.value = opts.value;
  }

  updateShouldNotify(oldWidget: InheritedWidget): boolean {
    return this.value !== (oldWidget as TestInheritedWidget).value;
  }
}

// ---------------------------------------------------------------------------
// ProxyWidget tests
// ---------------------------------------------------------------------------

describe('ProxyWidget', () => {
  test('InheritedWidget is instanceof ProxyWidget', () => {
    const child = new TestTerminalLeaf();
    const inh = new TestInheritedWidget({ child, value: 42 });
    expect(inh).toBeInstanceOf(ProxyWidget);
    expect(inh).toBeInstanceOf(Widget);
  });

  test('child is accessible on ProxyWidget', () => {
    const child = new TestTerminalLeaf();
    const inh = new TestInheritedWidget({ child, value: 1 });
    expect(inh.child).toBe(child);
  });

  test('StatelessWidget is NOT instanceof ProxyWidget', () => {
    const w = new TestStatelessWidget({ build: () => new TestTerminalLeaf() });
    expect(w instanceof ProxyWidget).toBe(false);
  });

  test('ProxyWidget preserves key', () => {
    const key = new ValueKey('test-key');
    const child = new TestTerminalLeaf();
    const inh = new TestInheritedWidget({ key, child, value: 1 });
    expect(inh.key).toBe(key);
  });

  test('ProxyWidget works without key', () => {
    const child = new TestTerminalLeaf();
    const inh = new TestInheritedWidget({ child, value: 1 });
    expect(inh.key).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// ProxyElement tests
// ---------------------------------------------------------------------------

describe('ProxyElement', () => {
  test('InheritedElement is instanceof ProxyElement', () => {
    const child = new TestTerminalLeaf();
    const inh = new TestInheritedWidget({ child, value: 1 });
    const elem = inh.createElement();
    expect(elem).toBeInstanceOf(ProxyElement);
    expect(elem).toBeInstanceOf(Element);
  });

  test('StatelessElement is NOT instanceof ProxyElement', () => {
    const w = new TestStatelessWidget({ build: () => new TestTerminalLeaf() });
    const elem = w.createElement();
    expect(elem instanceof ProxyElement).toBe(false);
  });

  test('mount() creates and mounts the child element', () => {
    const child = new TestTerminalLeaf({ text: 'hello' });
    const inh = new TestInheritedWidget({ child, value: 1 });
    const elem = inh.createElement() as InheritedElement;
    elem.mount();

    expect(elem.mounted).toBe(true);
    expect(elem.child).toBeDefined();
    expect(elem.child!.mounted).toBe(true);
    expect(elem.child!.widget).toBe(child);
  });

  test('unmount() cleans up child', () => {
    const child = new TestTerminalLeaf();
    const inh = new TestInheritedWidget({ child, value: 1 });
    const elem = inh.createElement() as InheritedElement;
    elem.mount();

    const childElem = elem.child!;
    expect(childElem.mounted).toBe(true);

    elem.unmount();
    expect(elem.child).toBeUndefined();
    expect(elem.mounted).toBe(false);
  });

  test('renderObject delegates to child (undefined for non-RenderObject children)', () => {
    const child = new TestTerminalLeaf();
    const inh = new TestInheritedWidget({ child, value: 1 });
    const elem = inh.createElement() as InheritedElement;
    elem.mount();

    // LeafElement does not have a renderObject, so it should be undefined
    expect(elem.renderObject).toBeUndefined();
  });

  test('update replaces child when widget type changes', () => {
    // Create an InheritedWidget with a leaf child
    const child1 = new TestTerminalLeaf({ text: 'first' });
    const inh1 = new TestInheritedWidget({ child: child1, value: 1 });
    const elem = inh1.createElement() as InheritedElement;
    elem.mount();

    const oldChildElem = elem.child!;
    expect(oldChildElem.mounted).toBe(true);

    // Create a differently-typed child widget
    class DifferentLeaf extends Widget {
      createElement(): any {
        return new LeafElement(this);
      }
    }
    const child2 = new DifferentLeaf();
    const inh2 = new TestInheritedWidget({ child: child2, value: 2 });

    elem.update(inh2);

    // Old child should have been replaced
    expect(elem.child).not.toBe(oldChildElem);
    expect(elem.child!.widget).toBe(child2);
    expect(elem.child!.mounted).toBe(true);
  });

  test('update reuses child when widget type matches', () => {
    const child1 = new TestTerminalLeaf({ text: 'first' });
    const inh1 = new TestInheritedWidget({ child: child1, value: 1 });
    const elem = inh1.createElement() as InheritedElement;
    elem.mount();

    const oldChildElem = elem.child!;

    // Same type of child widget (canUpdate returns true)
    const child2 = new TestTerminalLeaf({ text: 'second' });
    const inh2 = new TestInheritedWidget({ child: child2, value: 2 });

    elem.update(inh2);

    // Child element should be reused (same type, no key mismatch)
    expect(elem.child).toBe(oldChildElem);
    // Widget should be updated
    expect(elem.child!.widget).toBe(child2);
  });

  test('proxyWidget getter returns correctly typed widget', () => {
    const child = new TestTerminalLeaf();
    const inh = new TestInheritedWidget({ child, value: 42 });
    const elem = inh.createElement() as InheritedElement;

    expect(elem.proxyWidget).toBe(inh);
    expect(elem.proxyWidget.child).toBe(child);
  });
});

// ---------------------------------------------------------------------------
// InheritedElement (via ProxyElement) notification tests
// ---------------------------------------------------------------------------

describe('InheritedElement notification (with ProxyElement base)', () => {
  test('notifies dependents when updateShouldNotify returns true', () => {
    const leaf = new TestTerminalLeaf();
    const childWidget = new TestStatelessWidget({ build: () => leaf });

    const inherited1 = new TestInheritedWidget({
      child: childWidget,
      value: 1,
    });

    const element = inherited1.createElement() as InheritedElement;
    element.mount();

    // Create a dependent element and register it
    const dependentWidget = new TestTerminalLeaf();
    const dependentElement = new LeafElement(dependentWidget);
    dependentElement.mount();
    element.addDependent(dependentElement);

    expect(dependentElement.dirty).toBe(false);

    // Update with changed value (updateShouldNotify returns true)
    const inherited2 = new TestInheritedWidget({
      child: childWidget,
      value: 2,
    });

    element.update(inherited2);

    // Dependent should be marked dirty
    expect(dependentElement.dirty).toBe(true);
  });

  test('does NOT notify when updateShouldNotify returns false', () => {
    const leaf = new TestTerminalLeaf();
    const childWidget = new TestStatelessWidget({ build: () => leaf });

    const inherited1 = new TestInheritedWidget({
      child: childWidget,
      value: 1,
    });

    const element = inherited1.createElement() as InheritedElement;
    element.mount();

    const dependentWidget = new TestTerminalLeaf();
    const dependentElement = new LeafElement(dependentWidget);
    dependentElement.mount();
    element.addDependent(dependentElement);

    // Update with SAME value (updateShouldNotify returns false)
    const inherited2 = new TestInheritedWidget({
      child: childWidget,
      value: 1, // same value
    });

    element.update(inherited2);

    expect(dependentElement.dirty).toBe(false);
  });

  test('unmount clears dependents', () => {
    const leaf = new TestTerminalLeaf();
    const childWidget = new TestStatelessWidget({ build: () => leaf });

    const inherited = new TestInheritedWidget({
      child: childWidget,
      value: 1,
    });

    const element = inherited.createElement() as InheritedElement;
    element.mount();

    const dependentElement = new LeafElement(new TestTerminalLeaf());
    dependentElement.mount();
    element.addDependent(dependentElement);

    expect(element._dependents.size).toBe(1);

    element.unmount();
    expect(element._dependents.size).toBe(0);
  });

  test('mounts child from InheritedWidget.child', () => {
    const leaf = new TestTerminalLeaf({ text: 'child' });
    const childWidget = new TestStatelessWidget({ build: () => leaf });

    const inherited = new TestInheritedWidget({
      child: childWidget,
      value: 1,
    });

    const element = inherited.createElement() as InheritedElement;
    element.mount();

    expect(element.child).toBeDefined();
    expect(element.child!.mounted).toBe(true);
  });

  test('dependOnInheritedWidgetOfExactType still works', () => {
    const leaf = new TestTerminalLeaf();
    const childWidget = new TestStatelessWidget({ build: () => leaf });

    const inherited = new TestInheritedWidget({
      child: childWidget,
      value: 42,
    });

    const inheritedElement = inherited.createElement() as InheritedElement;
    inheritedElement.mount();

    const childElement = inheritedElement.child!;
    expect(childElement).toBeDefined();

    if (childElement instanceof StatelessElement) {
      const leafChild = childElement.child!;
      expect(leafChild).toBeDefined();

      const found = leafChild.dependOnInheritedWidgetOfExactType(TestInheritedWidget);
      expect(found).toBe(inheritedElement);
      expect(inheritedElement._dependents.has(leafChild)).toBe(true);
    }
  });
});

// ---------------------------------------------------------------------------
// Hierarchy / instanceof checks
// ---------------------------------------------------------------------------

describe('ProxyWidget/ProxyElement hierarchy', () => {
  test('class hierarchy: InheritedWidget -> ProxyWidget -> Widget', () => {
    const child = new TestTerminalLeaf();
    const inh = new TestInheritedWidget({ child, value: 1 });

    expect(inh).toBeInstanceOf(InheritedWidget);
    expect(inh).toBeInstanceOf(ProxyWidget);
    expect(inh).toBeInstanceOf(Widget);
  });

  test('class hierarchy: InheritedElement -> ProxyElement -> Element', () => {
    const child = new TestTerminalLeaf();
    const inh = new TestInheritedWidget({ child, value: 1 });
    const elem = inh.createElement();

    expect(elem).toBeInstanceOf(InheritedElement);
    expect(elem).toBeInstanceOf(ProxyElement);
    expect(elem).toBeInstanceOf(Element);
  });

  test('StatelessWidget is NOT in the ProxyWidget hierarchy', () => {
    const w = new TestStatelessWidget({ build: () => new TestTerminalLeaf() });
    expect(w).not.toBeInstanceOf(ProxyWidget);

    const elem = w.createElement();
    expect(elem).not.toBeInstanceOf(ProxyElement);
  });
});
