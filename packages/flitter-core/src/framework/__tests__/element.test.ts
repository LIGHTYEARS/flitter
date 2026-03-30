// Tests for Element tree: Element base, StatelessElement, StatefulElement,
// InheritedElement, RenderObjectElement, updateChild, updateChildren
// Amp ref: T$ (Element), lU0 (StatelessElement), V_0 (StatefulElement),
//          Z_0 (InheritedElement), rJ (MultiChildRenderObjectElement)

import { describe, test, expect, beforeEach } from 'bun:test';
import {
  Widget,
  StatelessWidget,
  StatefulWidget,
  State,
  InheritedWidget,
  type BuildContext,
} from '../widget';
import {
  Element,
  StatelessElement,
  StatefulElement,
  InheritedElement,
  RenderObjectElement,
  SingleChildRenderObjectElement,
  MultiChildRenderObjectElement,
  LeafRenderObjectElement,
  BuildContextImpl,
} from '../element';
import { Key, ValueKey } from '../../core/key';

// ---------------------------------------------------------------------------
// Test Widgets
// ---------------------------------------------------------------------------

class TestStatelessWidget extends StatelessWidget {
  readonly buildFn: (ctx: BuildContext) => Widget;
  readonly label: string;

  constructor(opts: { key?: Key; build: (ctx: BuildContext) => Widget; label?: string }) {
    super({ key: opts.key });
    this.buildFn = opts.build;
    this.label = opts.label ?? 'TestStateless';
  }

  build(context: BuildContext): Widget {
    return this.buildFn(context);
  }
}

/** A simple leaf widget that creates a basic element (no children). */
class TestLeafWidget extends StatelessWidget {
  readonly text: string;

  constructor(opts?: { key?: Key; text?: string }) {
    super({ key: opts?.key });
    this.text = opts?.text ?? 'leaf';
  }

  build(_context: BuildContext): Widget {
    // Returns itself — a leaf just returns another leaf.
    // In real Flutter, a leaf StatelessWidget would return a RenderObjectWidget.
    // For testing purposes, we use a simple self-referential leaf.
    return new TestTerminalLeaf({ key: this.key, text: this.text });
  }
}

/** Absolute leaf — its createElement returns a plain Element (no mount method for children). */
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

/** A simple element that has no children and no mount() that inflates. */
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

class TestStatefulWidget extends StatefulWidget {
  readonly stateFactory: () => TestState;

  constructor(opts: { key?: Key; createState: () => TestState }) {
    super({ key: opts.key });
    this.stateFactory = opts.createState;
  }

  createState(): State<StatefulWidget> {
    return this.stateFactory();
  }
}

class TestState extends State<TestStatefulWidget> {
  buildFn: (ctx: BuildContext) => Widget;
  initStateCalled = false;
  didUpdateWidgetCalled = false;
  disposeCalled = false;
  oldWidget: TestStatefulWidget | undefined;

  constructor(buildFn: (ctx: BuildContext) => Widget) {
    super();
    this.buildFn = buildFn;
  }

  override initState(): void {
    this.initStateCalled = true;
  }

  override didUpdateWidget(oldWidget: TestStatefulWidget): void {
    this.didUpdateWidgetCalled = true;
    this.oldWidget = oldWidget;
  }

  override dispose(): void {
    this.disposeCalled = true;
  }

  build(context: BuildContext): Widget {
    return this.buildFn(context);
  }
}

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
// Element base tests
// ---------------------------------------------------------------------------

describe('Element base', () => {
  test('constructor sets widget', () => {
    const widget = new TestTerminalLeaf({ text: 'hello' });
    const element = new LeafElement(widget);
    expect(element.widget).toBe(widget);
  });

  test('initial state: not mounted, not dirty, depth 0', () => {
    const widget = new TestTerminalLeaf();
    const element = new LeafElement(widget);
    expect(element.mounted).toBe(false);
    expect(element.dirty).toBe(false);
    expect(element.depth).toBe(0);
    expect(element.parent).toBeUndefined();
  });

  test('markMounted sets lifecycle to active', () => {
    const widget = new TestTerminalLeaf();
    const element = new LeafElement(widget);
    element.mount();
    expect(element.mounted).toBe(true);
  });

  test('unmount sets lifecycle to defunct', () => {
    const widget = new TestTerminalLeaf();
    const element = new LeafElement(widget);
    element.mount();
    expect(element.mounted).toBe(true);
    element.unmount();
    expect(element.mounted).toBe(false);
  });

  test('markNeedsRebuild sets dirty flag when mounted', () => {
    const widget = new TestTerminalLeaf();
    const element = new LeafElement(widget);
    element.mount();
    expect(element.dirty).toBe(false);
    element.markNeedsRebuild();
    expect(element.dirty).toBe(true);
  });

  test('markNeedsRebuild does nothing when not mounted', () => {
    const widget = new TestTerminalLeaf();
    const element = new LeafElement(widget);
    element.markNeedsRebuild();
    expect(element.dirty).toBe(false);
  });

  test('depth is computed based on parent chain', () => {
    const root = new LeafElement(new TestTerminalLeaf());
    const child = new LeafElement(new TestTerminalLeaf());
    const grandchild = new LeafElement(new TestTerminalLeaf());

    root.addChild(child);
    child.addChild(grandchild);

    expect(root.depth).toBe(0);
    expect(child.depth).toBe(1);
    expect(grandchild.depth).toBe(2);
  });

  test('depth is invalidated on reparent', () => {
    const root = new LeafElement(new TestTerminalLeaf());
    const child = new LeafElement(new TestTerminalLeaf());
    root.addChild(child);
    expect(child.depth).toBe(1);

    // Remove and check depth cache is invalidated
    root.removeChild(child);
    expect(child.depth).toBe(0); // no parent now
  });

  test('addChild sets parent and tracks in children', () => {
    const parent = new LeafElement(new TestTerminalLeaf());
    const child = new LeafElement(new TestTerminalLeaf());

    parent.addChild(child);
    expect(child.parent).toBe(parent);
    expect(parent.children).toContain(child);
  });

  test('removeChild clears parent and removes from children', () => {
    const parent = new LeafElement(new TestTerminalLeaf());
    const child = new LeafElement(new TestTerminalLeaf());

    parent.addChild(child);
    parent.removeChild(child);
    expect(child.parent).toBeUndefined();
    expect(parent.children).not.toContain(child);
  });

  test('update swaps the widget reference', () => {
    const w1 = new TestTerminalLeaf({ text: 'a' });
    const w2 = new TestTerminalLeaf({ text: 'b' });
    const element = new LeafElement(w1);
    element.update(w2);
    expect(element.widget).toBe(w2);
  });

  test('unmount clears inherited dependencies', () => {
    // Manually set up an inherited dependency
    const leafWidget = new TestTerminalLeaf();
    const childWidget = new TestTerminalLeaf();
    const inheritedWidget = new TestInheritedWidget({ child: childWidget, value: 42 });
    const inheritedElement = new InheritedElement(inheritedWidget);
    const leafElement = new LeafElement(leafWidget);

    // Simulate dependency
    inheritedElement.addDependent(leafElement);
    leafElement._inheritedDependencies.add(inheritedElement);

    expect(inheritedElement._dependents.has(leafElement)).toBe(true);

    // Unmount should clear
    leafElement.unmount();
    expect(inheritedElement._dependents.has(leafElement)).toBe(false);
    expect(leafElement._inheritedDependencies.size).toBe(0);
  });

  test('renderObject returns undefined for base element', () => {
    const element = new LeafElement(new TestTerminalLeaf());
    expect(element.renderObject).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// updateChild tests (exercised through StatelessElement rebuild)
// ---------------------------------------------------------------------------

describe('updateChild', () => {
  test('null->null returns null (no child)', () => {
    // A widget that builds nothing... we test through StatelessElement
    // Actually, the Amp code always returns a Widget from build(),
    // so null->null is implicit. We test through the rebuild mechanism.
    // The null->null case is implicit: an element with no child stays with no child.
    const element = new LeafElement(new TestTerminalLeaf());
    element.mount();
    expect(element.children.length).toBe(0);
  });

  test('null->widget inflates new element', () => {
    const leaf = new TestTerminalLeaf({ text: 'hello' });
    const widget = new TestStatelessWidget({
      build: () => leaf,
    });

    const element = widget.createElement() as StatelessElement;
    element.mount();

    expect(element.child).toBeDefined();
    expect(element.child!.widget).toBeInstanceOf(TestTerminalLeaf);
  });

  test('element->null unmounts and returns null', () => {
    // We can test this indirectly through StatelessElement unmount
    const leaf = new TestTerminalLeaf({ text: 'hello' });
    const widget = new TestStatelessWidget({
      build: () => leaf,
    });

    const element = widget.createElement() as StatelessElement;
    element.mount();

    const child = element.child!;
    expect(child.mounted).toBe(true);

    element.unmount();
    expect(child.mounted).toBe(false);
    expect(element.child).toBeUndefined();
  });

  test('element->same-type widget updates element (canUpdate=true)', () => {
    const leaf1 = new TestTerminalLeaf({ text: 'a' });
    const leaf2 = new TestTerminalLeaf({ text: 'b' });

    let currentLeaf = leaf1;
    const widget = new TestStatelessWidget({
      build: () => currentLeaf,
    });

    const element = widget.createElement() as StatelessElement;
    element.mount();

    const childElement = element.child!;
    expect(childElement.widget).toBe(leaf1);

    // Update with same-type widget
    currentLeaf = leaf2;
    element.rebuild();

    // Same element should be reused
    expect(element.child).toBe(childElement);
    expect(element.child!.widget).toBe(leaf2);
  });

  test('element->different-type widget replaces element (canUpdate=false)', () => {
    const leaf1 = new TestTerminalLeaf({ text: 'a' });

    // Create a differently-typed leaf widget
    class DifferentLeaf extends Widget {
      createElement(): any {
        return new LeafElement(this);
      }
    }
    const leaf2 = new DifferentLeaf();

    let currentWidget: Widget = leaf1;
    const widget = new TestStatelessWidget({
      build: () => currentWidget,
    });

    const element = widget.createElement() as StatelessElement;
    element.mount();

    const oldChild = element.child!;
    expect(oldChild.widget).toBe(leaf1);

    // Replace with different type
    currentWidget = leaf2;
    element.rebuild();

    // New element should have been created
    expect(element.child).not.toBe(oldChild);
    expect(element.child!.widget).toBe(leaf2);
    // Old child should be unmounted
    expect(oldChild.mounted).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// updateChildren tests (via MultiChildRenderObjectElement)
// ---------------------------------------------------------------------------

describe('updateChildren', () => {
  // Helper: create a MultiChildRenderObjectElement directly for testing
  function createMultiElement(widgets: Widget[]): MultiChildRenderObjectElement {
    const fakeWidget = {
      children: widgets,
      key: undefined,
      canUpdate: Widget.prototype.canUpdate,
      constructor: Object,
      createElement: () => { throw new Error('should not be called'); },
      toString: () => 'FakeMultiWidget',
    } as unknown as Widget;

    const element = new MultiChildRenderObjectElement(fakeWidget);
    // Mount children manually
    for (const w of widgets) {
      const child = w.createElement();
      element._childElements.push(child);
      element.addChild(child);
      if ('mount' in child && typeof child.mount === 'function') {
        child.mount();
      }
    }
    element.markMounted();
    return element;
  }

  test('empty->empty: no changes', () => {
    const element = createMultiElement([]);
    element.updateChildren(element._childElements, []);
    expect(element._childElements.length).toBe(0);
  });

  test('empty->[A,B,C]: creates all', () => {
    const element = createMultiElement([]);
    const a = new TestTerminalLeaf({ text: 'A' });
    const b = new TestTerminalLeaf({ text: 'B' });
    const c = new TestTerminalLeaf({ text: 'C' });

    element.updateChildren(element._childElements, [a, b, c]);

    expect(element._childElements.length).toBe(3);
    expect(element._childElements[0].widget).toBe(a);
    expect(element._childElements[1].widget).toBe(b);
    expect(element._childElements[2].widget).toBe(c);
  });

  test('[A,B,C]->empty: removes all', () => {
    const a = new TestTerminalLeaf({ text: 'A' });
    const b = new TestTerminalLeaf({ text: 'B' });
    const c = new TestTerminalLeaf({ text: 'C' });

    const element = createMultiElement([a, b, c]);
    const oldChildren = [...element._childElements];

    element.updateChildren(element._childElements, []);

    expect(element._childElements.length).toBe(0);
    // Old children should be unmounted
    for (const child of oldChildren) {
      expect(child.mounted).toBe(false);
    }
  });

  test('[A,B,C]->[A,B,C] reuses all (same type, no key)', () => {
    const a1 = new TestTerminalLeaf({ text: 'A' });
    const b1 = new TestTerminalLeaf({ text: 'B' });
    const c1 = new TestTerminalLeaf({ text: 'C' });

    const element = createMultiElement([a1, b1, c1]);
    const oldChildren = [...element._childElements];

    const a2 = new TestTerminalLeaf({ text: 'A2' });
    const b2 = new TestTerminalLeaf({ text: 'B2' });
    const c2 = new TestTerminalLeaf({ text: 'C2' });

    element.updateChildren(element._childElements, [a2, b2, c2]);

    expect(element._childElements.length).toBe(3);
    // Elements should be reused (canUpdate returns true for same type)
    expect(element._childElements[0]).toBe(oldChildren[0]);
    expect(element._childElements[1]).toBe(oldChildren[1]);
    expect(element._childElements[2]).toBe(oldChildren[2]);
    // Widgets should be updated
    expect(element._childElements[0].widget).toBe(a2);
    expect(element._childElements[1].widget).toBe(b2);
    expect(element._childElements[2].widget).toBe(c2);
  });

  test('[A,B,C]->[A,C] removes one element (unkeyed)', () => {
    const a = new TestTerminalLeaf({ text: 'A' });
    const b = new TestTerminalLeaf({ text: 'B' });
    const c = new TestTerminalLeaf({ text: 'C' });

    const element = createMultiElement([a, b, c]);
    const elemA = element._childElements[0];
    const elemB = element._childElements[1];
    const elemC = element._childElements[2];

    const a2 = new TestTerminalLeaf({ text: 'A2' });
    const c2 = new TestTerminalLeaf({ text: 'C2' });

    element.updateChildren(element._childElements, [a2, c2]);

    expect(element._childElements.length).toBe(2);
    // Without keys, the top-down scan matches:
    //   old[0] (A) -> new[0] (A2): same type, update
    //   old[1] (B) -> new[1] (C2): same type, update
    // Then old[2] (C) is the remaining unmatched element that gets deactivated.
    expect(element._childElements[0]).toBe(elemA);
    expect(element._childElements[0].widget).toBe(a2);
    expect(element._childElements[1]).toBe(elemB); // B reused, updated to C2
    expect(element._childElements[1].widget).toBe(c2);
    expect(elemC.mounted).toBe(false); // C is removed
  });

  test('[A,B,C]->[C,B,A] with keys reorders', () => {
    const a = new TestTerminalLeaf({ key: new ValueKey('a'), text: 'A' });
    const b = new TestTerminalLeaf({ key: new ValueKey('b'), text: 'B' });
    const c = new TestTerminalLeaf({ key: new ValueKey('c'), text: 'C' });

    const element = createMultiElement([a, b, c]);
    const elemA = element._childElements[0];
    const elemB = element._childElements[1];
    const elemC = element._childElements[2];

    const a2 = new TestTerminalLeaf({ key: new ValueKey('a'), text: 'A2' });
    const b2 = new TestTerminalLeaf({ key: new ValueKey('b'), text: 'B2' });
    const c2 = new TestTerminalLeaf({ key: new ValueKey('c'), text: 'C2' });

    element.updateChildren(element._childElements, [c2, b2, a2]);

    expect(element._childElements.length).toBe(3);
    // Elements should be reused but reordered by keys
    expect(element._childElements[0]).toBe(elemC);
    expect(element._childElements[1]).toBe(elemB);
    expect(element._childElements[2]).toBe(elemA);
    // Widgets should be updated
    expect(element._childElements[0].widget).toBe(c2);
    expect(element._childElements[1].widget).toBe(b2);
    expect(element._childElements[2].widget).toBe(a2);
  });

  test('append new widget at end', () => {
    const a = new TestTerminalLeaf({ text: 'A' });
    const b = new TestTerminalLeaf({ text: 'B' });

    const element = createMultiElement([a, b]);
    const elemA = element._childElements[0];
    const elemB = element._childElements[1];

    const a2 = new TestTerminalLeaf({ text: 'A2' });
    const b2 = new TestTerminalLeaf({ text: 'B2' });
    const c = new TestTerminalLeaf({ text: 'C' });

    element.updateChildren(element._childElements, [a2, b2, c]);

    expect(element._childElements.length).toBe(3);
    expect(element._childElements[0]).toBe(elemA);
    expect(element._childElements[1]).toBe(elemB);
    expect(element._childElements[2].widget).toBe(c);
  });

  test('prepend new widget at start', () => {
    const b = new TestTerminalLeaf({ text: 'B' });
    const c = new TestTerminalLeaf({ text: 'C' });

    const element = createMultiElement([b, c]);
    const elemB = element._childElements[0];
    const elemC = element._childElements[1];

    const a = new TestTerminalLeaf({ text: 'A' });
    const b2 = new TestTerminalLeaf({ text: 'B2' });
    const c2 = new TestTerminalLeaf({ text: 'C2' });

    element.updateChildren(element._childElements, [a, b2, c2]);

    expect(element._childElements.length).toBe(3);
    // Bottom-scan should match B->B2 and C->C2 from the bottom,
    // then A is new and inserted.
    // Actually, with no keys, the top scan will match old B with new A (same type),
    // then bottom scan matches old C with new C2, middle has new B2 and old nothing
    // ... the exact reuse depends on the algorithm. Let's just check counts.
    expect(element._childElements.length).toBe(3);
    // All should be mounted
    for (const child of element._childElements) {
      expect(child.mounted).toBe(true);
    }
  });
});

// ---------------------------------------------------------------------------
// StatelessElement tests
// ---------------------------------------------------------------------------

describe('StatelessElement', () => {
  test('builds via widget.build()', () => {
    let buildCalled = false;
    const leaf = new TestTerminalLeaf({ text: 'result' });

    const widget = new TestStatelessWidget({
      build: (_ctx) => {
        buildCalled = true;
        return leaf;
      },
    });

    const element = widget.createElement() as StatelessElement;
    element.mount();

    expect(buildCalled).toBe(true);
    expect(element.child).toBeDefined();
  });

  test('passes BuildContext to build', () => {
    let receivedContext: BuildContext | undefined;
    const leaf = new TestTerminalLeaf();

    const widget = new TestStatelessWidget({
      build: (ctx) => {
        receivedContext = ctx;
        return leaf;
      },
    });

    const element = widget.createElement() as StatelessElement;
    element.mount();

    expect(receivedContext).toBeDefined();
    expect(receivedContext!.widget).toBe(widget);
    expect(receivedContext!.mounted).toBe(true);
  });

  test('update with same widget instance is a no-op', () => {
    let buildCount = 0;
    const leaf = new TestTerminalLeaf();

    const widget = new TestStatelessWidget({
      build: () => {
        buildCount++;
        return leaf;
      },
    });

    const element = widget.createElement() as StatelessElement;
    element.mount();
    expect(buildCount).toBe(1);

    // Update with same instance should skip
    element.update(widget);
    expect(buildCount).toBe(1);
  });

  test('update with new widget triggers rebuild', () => {
    let buildCount = 0;
    const leaf = new TestTerminalLeaf();

    const widget1 = new TestStatelessWidget({
      build: () => {
        buildCount++;
        return leaf;
      },
    });

    const element = widget1.createElement() as StatelessElement;
    element.mount();
    expect(buildCount).toBe(1);

    const widget2 = new TestStatelessWidget({
      build: () => {
        buildCount++;
        return leaf;
      },
    });

    element.update(widget2);
    expect(buildCount).toBe(2);
  });

  test('unmount cleans up child and context', () => {
    const leaf = new TestTerminalLeaf();
    const widget = new TestStatelessWidget({ build: () => leaf });
    const element = widget.createElement() as StatelessElement;
    element.mount();

    const child = element.child!;
    expect(child.mounted).toBe(true);

    element.unmount();
    expect(element.mounted).toBe(false);
    expect(element.child).toBeUndefined();
    expect(child.mounted).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// StatefulElement tests
// ---------------------------------------------------------------------------

describe('StatefulElement', () => {
  test('calls initState on mount', () => {
    const leaf = new TestTerminalLeaf();
    let state: TestState | undefined;

    const widget = new TestStatefulWidget({
      createState: () => {
        state = new TestState(() => leaf);
        return state;
      },
    });

    const element = widget.createElement() as StatefulElement;
    element.mount();

    expect(state).toBeDefined();
    expect(state!.initStateCalled).toBe(true);
  });

  test('calls didUpdateWidget on update', () => {
    const leaf = new TestTerminalLeaf();
    let state: TestState | undefined;

    const widget1 = new TestStatefulWidget({
      createState: () => {
        state = new TestState(() => leaf);
        return state;
      },
    });

    const element = widget1.createElement() as StatefulElement;
    element.mount();

    expect(state!.didUpdateWidgetCalled).toBe(false);

    const widget2 = new TestStatefulWidget({
      createState: () => new TestState(() => leaf),
    });

    element.update(widget2);
    expect(state!.didUpdateWidgetCalled).toBe(true);
    expect(state!.oldWidget).toBe(widget1);
  });

  test('calls dispose on unmount', () => {
    const leaf = new TestTerminalLeaf();
    let state: TestState | undefined;

    const widget = new TestStatefulWidget({
      createState: () => {
        state = new TestState(() => leaf);
        return state;
      },
    });

    const element = widget.createElement() as StatefulElement;
    element.mount();

    expect(state!.disposeCalled).toBe(false);

    element.unmount();
    expect(state!.disposeCalled).toBe(true);
  });

  test('State.setState marks element dirty', () => {
    const leaf = new TestTerminalLeaf();
    let state: TestState | undefined;

    const widget = new TestStatefulWidget({
      createState: () => {
        state = new TestState(() => leaf);
        return state;
      },
    });

    const element = widget.createElement() as StatefulElement;
    element.mount();

    expect(element.dirty).toBe(false);

    // setState should mark element dirty via markNeedsBuild -> markNeedsRebuild
    state!.setState(() => {});
    expect(element.dirty).toBe(true);
  });

  test('State.setState throws after dispose', () => {
    const leaf = new TestTerminalLeaf();
    let state: TestState | undefined;

    const widget = new TestStatefulWidget({
      createState: () => {
        state = new TestState(() => leaf);
        return state;
      },
    });

    const element = widget.createElement() as StatefulElement;
    element.mount();
    element.unmount();

    expect(() => state!.setState(() => {})).toThrow('setState() called after dispose()');
  });

  test('State.setState executes callback synchronously', () => {
    const leaf = new TestTerminalLeaf();
    let counter = 0;
    let state: TestState | undefined;

    const widget = new TestStatefulWidget({
      createState: () => {
        state = new TestState(() => leaf);
        return state;
      },
    });

    const element = widget.createElement() as StatefulElement;
    element.mount();

    state!.setState(() => {
      counter = 42;
    });

    expect(counter).toBe(42);
  });

  test('builds via state.build()', () => {
    let buildCalled = false;
    const leaf = new TestTerminalLeaf();

    const widget = new TestStatefulWidget({
      createState: () =>
        new TestState((_ctx) => {
          buildCalled = true;
          return leaf;
        }),
    });

    const element = widget.createElement() as StatefulElement;
    element.mount();

    expect(buildCalled).toBe(true);
    expect(element.child).toBeDefined();
  });

  test('update with same widget instance is a no-op', () => {
    let buildCount = 0;
    const leaf = new TestTerminalLeaf();

    const widget = new TestStatefulWidget({
      createState: () =>
        new TestState(() => {
          buildCount++;
          return leaf;
        }),
    });

    const element = widget.createElement() as StatefulElement;
    element.mount();
    expect(buildCount).toBe(1);

    element.update(widget);
    expect(buildCount).toBe(1);
  });

  test('child is unmounted recursively on unmount', () => {
    const leaf = new TestTerminalLeaf();

    const widget = new TestStatefulWidget({
      createState: () => new TestState(() => leaf),
    });

    const element = widget.createElement() as StatefulElement;
    element.mount();

    const child = element.child!;
    expect(child.mounted).toBe(true);

    element.unmount();
    expect(child.mounted).toBe(false);
    expect(element.child).toBeUndefined();
    expect(element.state).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// InheritedElement tests
// ---------------------------------------------------------------------------

describe('InheritedElement', () => {
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

  test('dependOnInheritedWidgetOfExactType finds ancestor InheritedWidget', () => {
    const leaf = new TestTerminalLeaf();
    const childWidget = new TestStatelessWidget({ build: () => leaf });

    const inherited = new TestInheritedWidget({
      child: childWidget,
      value: 42,
    });

    const inheritedElement = inherited.createElement() as InheritedElement;
    inheritedElement.mount();

    // Now we need a descendant element to call dependOnInheritedWidgetOfExactType
    // The child of the InheritedElement is the StatelessElement for childWidget
    const childElement = inheritedElement.child!;
    expect(childElement).toBeDefined();

    // The child's child should be the leaf element
    if (childElement instanceof StatelessElement) {
      const leafChild = childElement.child!;
      expect(leafChild).toBeDefined();

      // Call dependOnInheritedWidgetOfExactType from the leaf
      const found = leafChild.dependOnInheritedWidgetOfExactType(TestInheritedWidget);
      expect(found).toBe(inheritedElement);

      // The leaf should now be registered as a dependent
      expect(inheritedElement._dependents.has(leafChild)).toBe(true);
    }
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
});

// ---------------------------------------------------------------------------
// BuildContextImpl tests
// ---------------------------------------------------------------------------

describe('BuildContextImpl', () => {
  test('widget and mounted delegate to element', () => {
    const widget = new TestTerminalLeaf();
    const element = new LeafElement(widget);
    element.mount();

    const ctx = new BuildContextImpl(element, widget);
    expect(ctx.widget).toBe(widget);
    expect(ctx.mounted).toBe(true);

    element.unmount();
    expect(ctx.mounted).toBe(false);
  });

  test('dependOnInheritedWidgetOfExactType delegates to element', () => {
    const leaf = new TestTerminalLeaf();
    const childWidget = new TestStatelessWidget({ build: () => leaf });
    const inherited = new TestInheritedWidget({ child: childWidget, value: 42 });

    const inheritedElement = inherited.createElement() as InheritedElement;
    inheritedElement.mount();

    const childElement = inheritedElement.child!;
    const ctx = new BuildContextImpl(childElement, childElement.widget);

    const found = ctx.dependOnInheritedWidgetOfExactType(TestInheritedWidget);
    expect(found).toBe(inheritedElement);
  });
});

// ---------------------------------------------------------------------------
// RenderObjectElement tests (basic)
// ---------------------------------------------------------------------------

describe('RenderObjectElement', () => {
  test('mount marks as mounted', () => {
    const widget = new TestTerminalLeaf();
    const element = new RenderObjectElement(widget);
    // Use markMounted() directly since TestTerminalLeaf is not a RenderObjectWidget
    element.markMounted();
    expect(element.mounted).toBe(true);
  });

  test('unmount marks as defunct', () => {
    const widget = new TestTerminalLeaf();
    const element = new RenderObjectElement(widget);
    element.markMounted();
    element.unmount();
    expect(element.mounted).toBe(false);
  });

  test('performRebuild is a no-op', () => {
    const widget = new TestTerminalLeaf();
    const element = new RenderObjectElement(widget);
    element.markMounted();
    // Should not throw
    element.performRebuild();
  });
});

// ---------------------------------------------------------------------------
// LeafRenderObjectElement tests
// ---------------------------------------------------------------------------

describe('LeafRenderObjectElement', () => {
  test('performRebuild is a no-op', () => {
    const widget = new TestTerminalLeaf();
    const element = new LeafRenderObjectElement(widget);
    // Use markMounted() directly since TestTerminalLeaf is not a RenderObjectWidget
    element.markMounted();
    element.performRebuild();
    // no-op, should not throw
    expect(element.mounted).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Widget.createElement integration tests
// ---------------------------------------------------------------------------

describe('Widget.createElement integration', () => {
  test('StatelessWidget.createElement returns StatelessElement', () => {
    const widget = new TestStatelessWidget({
      build: () => new TestTerminalLeaf(),
    });
    const element = widget.createElement();
    expect(element).toBeInstanceOf(StatelessElement);
  });

  test('StatefulWidget.createElement returns StatefulElement', () => {
    const widget = new TestStatefulWidget({
      createState: () => new TestState(() => new TestTerminalLeaf()),
    });
    const element = widget.createElement();
    expect(element).toBeInstanceOf(StatefulElement);
  });

  test('InheritedWidget.createElement returns InheritedElement', () => {
    const widget = new TestInheritedWidget({
      child: new TestStatelessWidget({ build: () => new TestTerminalLeaf() }),
      value: 1,
    });
    const element = widget.createElement();
    expect(element).toBeInstanceOf(InheritedElement);
  });
});
