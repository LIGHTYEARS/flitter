// Tests for deactivate()/activate() lifecycle phase on Element and State.
// This lifecycle phase is NOT present in the original Amp binary.
// It is a deliberate extension to support GlobalKey reparenting,
// matching Flutter's Element lifecycle.
// Amp ref deviation: See .gap/02-deactivate-lifecycle.md

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
  MultiChildRenderObjectElement,
  _ElementLifecycleState,
} from '../element';
import { Key, ValueKey, GlobalKey } from '../../core/key';
import { BuildOwner } from '../build-owner';

// ---------------------------------------------------------------------------
// Test helpers (similar to element.test.ts)
// ---------------------------------------------------------------------------

/** Absolute leaf widget — createElement returns a plain Element. */
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

/** A simple element that has no children. */
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
  deactivateCalled = false;
  activateCalled = false;
  deactivateCallOrder: string[] = [];
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
    this.deactivateCallOrder.push('dispose');
  }

  override deactivate(): void {
    this.deactivateCalled = true;
    this.deactivateCallOrder.push('deactivate');
  }

  override activate(): void {
    this.activateCalled = true;
    this.deactivateCallOrder.push('activate');
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
// _ElementLifecycleState enum tests
// ---------------------------------------------------------------------------

describe('_ElementLifecycleState enum', () => {
  test('has four states: initial, active, inactive, defunct', () => {
    expect(_ElementLifecycleState.initial).toBe('initial');
    expect(_ElementLifecycleState.active).toBe('active');
    expect(_ElementLifecycleState.inactive).toBe('inactive');
    expect(_ElementLifecycleState.defunct).toBe('defunct');
  });
});

// ---------------------------------------------------------------------------
// Element lifecycle state transitions
// ---------------------------------------------------------------------------

describe('Element lifecycle state transitions', () => {
  test('initial state is initial', () => {
    const widget = new TestTerminalLeaf();
    const element = new LeafElement(widget);
    expect(element._lifecycleState).toBe(_ElementLifecycleState.initial);
    expect(element.mounted).toBe(false);
  });

  test('markMounted transitions initial -> active', () => {
    const widget = new TestTerminalLeaf();
    const element = new LeafElement(widget);
    element.mount(); // calls markMounted()
    expect(element._lifecycleState).toBe(_ElementLifecycleState.active);
    expect(element.mounted).toBe(true);
  });

  test('deactivate transitions active -> inactive', () => {
    const widget = new TestTerminalLeaf();
    const element = new LeafElement(widget);
    element.mount();
    expect(element._lifecycleState).toBe(_ElementLifecycleState.active);

    element.deactivate();
    expect(element._lifecycleState).toBe(_ElementLifecycleState.inactive);
    expect(element.mounted).toBe(false);
  });

  test('activate transitions inactive -> active', () => {
    const widget = new TestTerminalLeaf();
    const element = new LeafElement(widget);
    element.mount();
    element.deactivate();
    expect(element._lifecycleState).toBe(_ElementLifecycleState.inactive);

    element.activate();
    expect(element._lifecycleState).toBe(_ElementLifecycleState.active);
    expect(element.mounted).toBe(true);
  });

  test('unmount transitions to defunct', () => {
    const widget = new TestTerminalLeaf();
    const element = new LeafElement(widget);
    element.mount();
    element.deactivate();
    element.unmount();
    expect(element._lifecycleState).toBe(_ElementLifecycleState.defunct);
    expect(element.mounted).toBe(false);
  });

  test('full lifecycle: initial -> active -> inactive -> defunct', () => {
    const widget = new TestTerminalLeaf();
    const element = new LeafElement(widget);

    // initial
    expect(element._lifecycleState).toBe(_ElementLifecycleState.initial);
    expect(element.mounted).toBe(false);

    // mount -> active
    element.mount();
    expect(element._lifecycleState).toBe(_ElementLifecycleState.active);
    expect(element.mounted).toBe(true);

    // deactivate -> inactive
    element.deactivate();
    expect(element._lifecycleState).toBe(_ElementLifecycleState.inactive);
    expect(element.mounted).toBe(false);

    // unmount -> defunct
    element.unmount();
    expect(element._lifecycleState).toBe(_ElementLifecycleState.defunct);
    expect(element.mounted).toBe(false);
  });

  test('full lifecycle with reactivation: initial -> active -> inactive -> active -> inactive -> defunct', () => {
    const widget = new TestTerminalLeaf();
    const element = new LeafElement(widget);

    element.mount();
    expect(element._lifecycleState).toBe(_ElementLifecycleState.active);

    // First deactivation
    element.deactivate();
    expect(element._lifecycleState).toBe(_ElementLifecycleState.inactive);

    // Reactivation
    element.activate();
    expect(element._lifecycleState).toBe(_ElementLifecycleState.active);
    expect(element.mounted).toBe(true);

    // Second deactivation
    element.deactivate();
    expect(element._lifecycleState).toBe(_ElementLifecycleState.inactive);

    // Final unmount
    element.unmount();
    expect(element._lifecycleState).toBe(_ElementLifecycleState.defunct);
  });

  test('activate sets dirty flag to force rebuild', () => {
    const widget = new TestTerminalLeaf();
    const element = new LeafElement(widget);
    element.mount();
    element._dirty = false;

    element.deactivate();
    element.activate();
    expect(element._dirty).toBe(true);
  });

  test('activate invalidates depth cache', () => {
    const widget = new TestTerminalLeaf();
    const element = new LeafElement(widget);
    element.mount();
    // Force a depth computation
    const _d = element.depth;

    element.deactivate();
    element.activate();
    // Depth cache should be cleared
    expect(element._cachedDepth).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// StatelessElement deactivate tests
// ---------------------------------------------------------------------------

describe('StatelessElement deactivate', () => {
  test('deactivate recurses to child', () => {
    const leaf = new TestTerminalLeaf({ text: 'child' });
    const widget = new TestStatelessWidget({ build: () => leaf });
    const element = widget.createElement() as StatelessElement;
    element.mount();

    const child = element.child!;
    expect(child.mounted).toBe(true);

    element.deactivate();
    expect(element._lifecycleState).toBe(_ElementLifecycleState.inactive);
    // Child should also be deactivated
    expect((child as any)._lifecycleState).toBe(_ElementLifecycleState.inactive);
  });
});

// ---------------------------------------------------------------------------
// StatefulElement deactivate/activate tests
// ---------------------------------------------------------------------------

describe('StatefulElement deactivate/activate', () => {
  test('deactivate calls State.deactivate()', () => {
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

    expect(state!.deactivateCalled).toBe(false);

    element.deactivate();
    expect(state!.deactivateCalled).toBe(true);
    expect(element._lifecycleState).toBe(_ElementLifecycleState.inactive);
  });

  test('activate calls State.activate()', () => {
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

    element.deactivate();
    expect(state!.activateCalled).toBe(false);

    element.activate();
    expect(state!.activateCalled).toBe(true);
    expect(element._lifecycleState).toBe(_ElementLifecycleState.active);
  });

  test('deactivate recurses to child element', () => {
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

    const child = element.child!;
    expect(child.mounted).toBe(true);

    element.deactivate();
    // Both element and child should be inactive
    expect(element._lifecycleState).toBe(_ElementLifecycleState.inactive);
    expect((child as any)._lifecycleState).toBe(_ElementLifecycleState.inactive);
  });

  test('lifecycle order: deactivate before dispose', () => {
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

    element.deactivate();
    element.unmount();

    expect(state!.deactivateCallOrder).toEqual(['deactivate', 'dispose']);
  });

  test('lifecycle order with reactivation: deactivate -> activate -> deactivate -> dispose', () => {
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

    element.deactivate();
    element.activate();
    element.deactivate();
    element.unmount();

    expect(state!.deactivateCallOrder).toEqual([
      'deactivate',
      'activate',
      'deactivate',
      'dispose',
    ]);
  });
});

// ---------------------------------------------------------------------------
// InheritedElement deactivate tests
// ---------------------------------------------------------------------------

describe('InheritedElement deactivate', () => {
  test('deactivate recurses to child', () => {
    const leaf = new TestTerminalLeaf();
    const childWidget = new TestStatelessWidget({ build: () => leaf });
    const inherited = new TestInheritedWidget({
      child: childWidget,
      value: 42,
    });

    const element = inherited.createElement() as InheritedElement;
    element.mount();

    const child = element.child!;
    expect(child.mounted).toBe(true);

    element.deactivate();
    expect(element._lifecycleState).toBe(_ElementLifecycleState.inactive);
    expect((child as any)._lifecycleState).toBe(_ElementLifecycleState.inactive);
  });
});

// ---------------------------------------------------------------------------
// Element.deactivate() inherited dependency cleanup
// ---------------------------------------------------------------------------

describe('Element.deactivate() inherited dependency cleanup', () => {
  test('deactivate clears inherited dependencies', () => {
    const leafWidget = new TestTerminalLeaf();
    const childWidget = new TestTerminalLeaf();
    const inheritedWidget = new TestInheritedWidget({ child: childWidget, value: 42 });
    const inheritedElement = new InheritedElement(inheritedWidget);
    const leafElement = new LeafElement(leafWidget);

    // Simulate dependency
    inheritedElement.addDependent(leafElement);
    leafElement._inheritedDependencies.add(inheritedElement);

    leafElement.mount();
    expect(inheritedElement._dependents.has(leafElement)).toBe(true);

    // Deactivate should clear dependencies
    leafElement.deactivate();
    expect(inheritedElement._dependents.has(leafElement)).toBe(false);
    expect(leafElement._inheritedDependencies.size).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// BuildOwner._inactiveElements and finalizeTree() tests
// ---------------------------------------------------------------------------

describe('BuildOwner inactive elements', () => {
  let buildOwner: BuildOwner;

  beforeEach(() => {
    buildOwner = new BuildOwner();
  });

  test('_addToInactiveElements adds element to set', () => {
    const element = new LeafElement(new TestTerminalLeaf());
    element.mount();
    element.deactivate();

    buildOwner._addToInactiveElements(element);
    expect(buildOwner._inactiveElements.has(element)).toBe(true);
  });

  test('_removeFromInactiveElements removes element from set', () => {
    const element = new LeafElement(new TestTerminalLeaf());
    element.mount();
    element.deactivate();

    buildOwner._addToInactiveElements(element);
    buildOwner._removeFromInactiveElements(element);
    expect(buildOwner._inactiveElements.has(element)).toBe(false);
  });

  test('finalizeTree() unmounts all inactive elements', () => {
    const element1 = new LeafElement(new TestTerminalLeaf());
    const element2 = new LeafElement(new TestTerminalLeaf());
    element1.mount();
    element2.mount();
    element1.deactivate();
    element2.deactivate();

    buildOwner._addToInactiveElements(element1);
    buildOwner._addToInactiveElements(element2);

    buildOwner.finalizeTree();

    expect(element1._lifecycleState).toBe(_ElementLifecycleState.defunct);
    expect(element2._lifecycleState).toBe(_ElementLifecycleState.defunct);
    expect(element1.mounted).toBe(false);
    expect(element2.mounted).toBe(false);
    expect(buildOwner._inactiveElements.size).toBe(0);
  });

  test('finalizeTree() does not affect elements removed from inactive set', () => {
    const element1 = new LeafElement(new TestTerminalLeaf());
    const element2 = new LeafElement(new TestTerminalLeaf());
    element1.mount();
    element2.mount();
    element1.deactivate();
    element2.deactivate();

    buildOwner._addToInactiveElements(element1);
    buildOwner._addToInactiveElements(element2);

    // Simulate reactivation of element2
    buildOwner._removeFromInactiveElements(element2);
    element2.activate();

    buildOwner.finalizeTree();

    expect(element1._lifecycleState).toBe(_ElementLifecycleState.defunct);
    expect(element2._lifecycleState).toBe(_ElementLifecycleState.active);
    expect(element2.mounted).toBe(true);
  });

  test('finalizeTree() clears the inactive set', () => {
    const element = new LeafElement(new TestTerminalLeaf());
    element.mount();
    element.deactivate();
    buildOwner._addToInactiveElements(element);

    buildOwner.finalizeTree();

    expect(buildOwner._inactiveElements.size).toBe(0);
  });

  test('dispose() unmounts inactive elements', () => {
    const element = new LeafElement(new TestTerminalLeaf());
    element.mount();
    element.deactivate();
    buildOwner._addToInactiveElements(element);

    buildOwner.dispose();

    expect(element._lifecycleState).toBe(_ElementLifecycleState.defunct);
    expect(buildOwner._inactiveElements.size).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// GlobalKey interaction with deactivate lifecycle
// ---------------------------------------------------------------------------

describe('GlobalKey with deactivate lifecycle', () => {
  beforeEach(() => {
    GlobalKey._clearRegistry();
  });

  test('markMounted registers GlobalKey association', () => {
    const key = new GlobalKey('test');
    const widget = new TestTerminalLeaf({ key });
    const element = new LeafElement(widget);

    element.mount();
    expect(key.currentElement).toBe(element);
  });

  test('unmount clears GlobalKey association', () => {
    const key = new GlobalKey('test');
    const widget = new TestTerminalLeaf({ key });
    const element = new LeafElement(widget);

    element.mount();
    expect(key.currentElement).toBe(element);

    element.deactivate();
    element.unmount();
    expect(key.currentElement).toBeUndefined();
  });

  test('deactivate does NOT clear GlobalKey association', () => {
    const key = new GlobalKey('test');
    const widget = new TestTerminalLeaf({ key });
    const element = new LeafElement(widget);

    element.mount();
    element.deactivate();
    // After deactivation, key should still reference the element
    // so it can be found for reparenting
    expect(key.currentElement).toBe(element);
  });

  test('_setElement allows re-setting same element after reactivation', () => {
    const key = new GlobalKey('test');
    const widget = new TestTerminalLeaf({ key });
    const element = new LeafElement(widget);

    element.mount();
    element.deactivate();
    // Simulate reactivation — markMounted calls _setElement again
    expect(() => {
      element.activate();
      element.markMounted();
    }).not.toThrow();
    expect(key.currentElement).toBe(element);
  });
});

// ---------------------------------------------------------------------------
// markNeedsRebuild respects lifecycle state
// ---------------------------------------------------------------------------

describe('markNeedsRebuild lifecycle awareness', () => {
  test('markNeedsRebuild does nothing in initial state', () => {
    const widget = new TestTerminalLeaf();
    const element = new LeafElement(widget);
    element.markNeedsRebuild();
    expect(element.dirty).toBe(false);
  });

  test('markNeedsRebuild sets dirty when active', () => {
    const widget = new TestTerminalLeaf();
    const element = new LeafElement(widget);
    element.mount();
    element.markNeedsRebuild();
    expect(element.dirty).toBe(true);
  });

  test('markNeedsRebuild does nothing when inactive', () => {
    const widget = new TestTerminalLeaf();
    const element = new LeafElement(widget);
    element.mount();
    element.deactivate();
    element._dirty = false;
    element.markNeedsRebuild();
    expect(element.dirty).toBe(false);
  });

  test('markNeedsRebuild does nothing when defunct', () => {
    const widget = new TestTerminalLeaf();
    const element = new LeafElement(widget);
    element.mount();
    element.deactivate();
    element.unmount();
    element.markNeedsRebuild();
    expect(element.dirty).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// RenderObjectElement deactivate/activate
// ---------------------------------------------------------------------------

describe('RenderObjectElement deactivate/activate', () => {
  test('deactivate detaches render object', () => {
    const widget = new TestTerminalLeaf();
    const element = new RenderObjectElement(widget);

    // Mock render object with detach/attach
    let detachCalled = false;
    let attachCalled = false;
    element._renderObject = {
      detach: () => { detachCalled = true; },
      attach: () => { attachCalled = true; },
    };

    // Manually mark as mounted (bypassing mount() which tries createRenderObject)
    element.markMounted();
    expect(element.mounted).toBe(true);

    element.deactivate();
    expect(detachCalled).toBe(true);
    expect(element._lifecycleState).toBe(_ElementLifecycleState.inactive);
  });

  test('activate re-attaches render object', () => {
    const widget = new TestTerminalLeaf();
    const element = new RenderObjectElement(widget);

    let attachCalled = false;
    const mockOwner = {};
    element._renderObject = {
      detach: () => {},
      attach: () => { attachCalled = true; },
      owner: mockOwner,
    };

    element.markMounted();

    element.deactivate();
    attachCalled = false; // Reset
    element.activate();
    expect(attachCalled).toBe(true);
    expect(element._lifecycleState).toBe(_ElementLifecycleState.active);
  });
});
