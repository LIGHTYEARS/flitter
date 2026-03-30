// Tests for State.didChangeDependencies() lifecycle method
// Extension: added for Flutter API parity (not in Amp).
// See .gap/01-did-change-dependencies.md

import { describe, test, expect } from 'bun:test';
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
  StatefulElement,
  InheritedElement,
  BuildContextImpl,
} from '../element';
import { Key } from '../../core/key';

// ---------------------------------------------------------------------------
// Test Widgets
// ---------------------------------------------------------------------------

/** Absolute leaf -- its createElement returns a plain Element (no children). */
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
  didChangeDependenciesCallCount = 0;
  oldWidget: TestStatefulWidget | undefined;

  constructor(buildFn: (ctx: BuildContext) => Widget) {
    super();
    this.buildFn = buildFn;
  }

  override initState(): void {
    this.initStateCalled = true;
  }

  override didChangeDependencies(): void {
    this.didChangeDependenciesCallCount++;
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
// Tests
// ---------------------------------------------------------------------------

describe('State.didChangeDependencies', () => {
  test('is called during first mount after initState', () => {
    const callOrder: string[] = [];
    const leaf = new TestTerminalLeaf();

    const widget = new TestStatefulWidget({
      createState: () => {
        const state = new TestState(() => leaf);
        // Override to track call order
        const origInitState = state.initState.bind(state);
        state.initState = () => {
          origInitState();
          callOrder.push('initState');
        };
        const origDidChangeDeps = state.didChangeDependencies.bind(state);
        state.didChangeDependencies = () => {
          origDidChangeDeps();
          callOrder.push('didChangeDependencies');
        };
        return state;
      },
    });

    const element = widget.createElement() as StatefulElement;
    element.mount();

    expect(callOrder).toEqual(['initState', 'didChangeDependencies']);
  });

  test('is called on first mount even with no inherited dependencies', () => {
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
    expect(state!.didChangeDependenciesCallCount).toBe(1);
  });

  test('is NOT called on normal setState rebuild', () => {
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

    // didChangeDependencies should have been called once (from mount)
    expect(state!.didChangeDependenciesCallCount).toBe(1);

    // setState and rebuild should NOT trigger didChangeDependencies
    state!.setState(() => {});
    element.rebuild();

    expect(state!.didChangeDependenciesCallCount).toBe(1);
  });

  test('is NOT called on widget update rebuild (didUpdateWidget)', () => {
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

    expect(state!.didChangeDependenciesCallCount).toBe(1);

    // Update with new widget of same type
    const widget2 = new TestStatefulWidget({
      createState: () => new TestState(() => leaf),
    });

    element.update(widget2);

    // didUpdateWidget was called but NOT didChangeDependencies
    expect(state!.didUpdateWidgetCalled).toBe(true);
    expect(state!.didChangeDependenciesCallCount).toBe(1);
  });

  test('is called when an InheritedWidget dependency changes', () => {
    const leaf = new TestTerminalLeaf();
    let state: TestState | undefined;

    // Create a StatefulWidget whose state will depend on the InheritedWidget
    const statefulWidget = new TestStatefulWidget({
      createState: () => {
        state = new TestState(() => leaf);
        return state;
      },
    });

    // Build: InheritedWidget -> StatefulWidget -> leaf
    const inherited1 = new TestInheritedWidget({
      child: statefulWidget,
      value: 1,
    });

    const inheritedElement = inherited1.createElement() as InheritedElement;
    inheritedElement.mount();

    // The child of inheritedElement is the StatefulElement
    const statefulElement = inheritedElement.child as StatefulElement;
    expect(statefulElement).toBeInstanceOf(StatefulElement);

    // Register as dependent by looking up the inherited widget
    statefulElement.dependOnInheritedWidgetOfExactType(TestInheritedWidget);
    expect(inheritedElement._dependents.has(statefulElement)).toBe(true);

    // After mount, didChangeDependencies should have been called once
    expect(state!.didChangeDependenciesCallCount).toBe(1);

    // Update the InheritedWidget with a new value (triggers notifyDependents)
    const inherited2 = new TestInheritedWidget({
      child: statefulWidget,
      value: 2,
    });

    inheritedElement.update(inherited2);

    // The statefulElement should now have the dependency-changed flag set.
    // On the next rebuild, didChangeDependencies should fire.
    statefulElement.rebuild();

    expect(state!.didChangeDependenciesCallCount).toBe(2);
  });

  test('fires before build when dependency changes', () => {
    const callOrder: string[] = [];
    const leaf = new TestTerminalLeaf();
    let state: TestState | undefined;

    const statefulWidget = new TestStatefulWidget({
      createState: () => {
        state = new TestState((_ctx) => {
          callOrder.push('build');
          return leaf;
        });
        state.didChangeDependencies = () => {
          state!.didChangeDependenciesCallCount++;
          callOrder.push('didChangeDependencies');
        };
        return state;
      },
    });

    const inherited1 = new TestInheritedWidget({
      child: statefulWidget,
      value: 1,
    });

    const inheritedElement = inherited1.createElement() as InheritedElement;
    inheritedElement.mount();

    const statefulElement = inheritedElement.child as StatefulElement;
    statefulElement.dependOnInheritedWidgetOfExactType(TestInheritedWidget);

    // Clear the call order after mount
    callOrder.length = 0;

    // Update the inherited widget
    const inherited2 = new TestInheritedWidget({
      child: statefulWidget,
      value: 2,
    });

    inheritedElement.update(inherited2);

    // Manually trigger rebuild (simulating BuildOwner processing dirty elements)
    statefulElement.rebuild();

    // didChangeDependencies should fire BEFORE build
    expect(callOrder).toEqual(['didChangeDependencies', 'build']);
  });

  test('does not fire didChangeDependencies when updateShouldNotify returns false', () => {
    const leaf = new TestTerminalLeaf();
    let state: TestState | undefined;

    const statefulWidget = new TestStatefulWidget({
      createState: () => {
        state = new TestState(() => leaf);
        return state;
      },
    });

    const inherited1 = new TestInheritedWidget({
      child: statefulWidget,
      value: 1,
    });

    const inheritedElement = inherited1.createElement() as InheritedElement;
    inheritedElement.mount();

    const statefulElement = inheritedElement.child as StatefulElement;
    statefulElement.dependOnInheritedWidgetOfExactType(TestInheritedWidget);

    expect(state!.didChangeDependenciesCallCount).toBe(1);

    // Update with SAME value (updateShouldNotify returns false)
    const inherited2 = new TestInheritedWidget({
      child: statefulWidget,
      value: 1, // same value
    });

    inheritedElement.update(inherited2);
    statefulElement.rebuild();

    // didChangeDependencies should NOT have been called again
    expect(state!.didChangeDependenciesCallCount).toBe(1);
  });

  test('multiple dependency notifications coalesce into one call', () => {
    const leaf = new TestTerminalLeaf();
    let state: TestState | undefined;

    const statefulWidget = new TestStatefulWidget({
      createState: () => {
        state = new TestState(() => leaf);
        return state;
      },
    });

    const inherited1 = new TestInheritedWidget({
      child: statefulWidget,
      value: 1,
    });

    const inheritedElement = inherited1.createElement() as InheritedElement;
    inheritedElement.mount();

    const statefulElement = inheritedElement.child as StatefulElement;
    statefulElement.dependOnInheritedWidgetOfExactType(TestInheritedWidget);

    expect(state!.didChangeDependenciesCallCount).toBe(1);

    // Simulate multiple dependency notifications (e.g., from two different InheritedWidgets)
    // by calling didChangeDependencies on the element directly twice
    statefulElement.didChangeDependencies();
    statefulElement.didChangeDependencies();

    // Now rebuild -- should only fire didChangeDependencies once
    statefulElement.rebuild();

    // One from mount + one from the rebuild = 2 total
    expect(state!.didChangeDependenciesCallCount).toBe(2);
  });

  test('setState inside didChangeDependencies does not cause infinite loop', () => {
    const leaf = new TestTerminalLeaf();
    let rebuildCount = 0;

    const widget = new TestStatefulWidget({
      createState: () => {
        const state = new TestState((_ctx) => {
          rebuildCount++;
          return leaf;
        });
        let setStateCalled = false;
        state.didChangeDependencies = () => {
          state.didChangeDependenciesCallCount++;
          // Calling setState inside didChangeDependencies should not
          // cause infinite loop since _dependenciesChanged is already reset
          if (!setStateCalled) {
            setStateCalled = true;
            state.setState(() => {});
          }
        };
        return state;
      },
    });

    const element = widget.createElement() as StatefulElement;
    // mount should not throw or loop infinitely
    element.mount();

    // The mount sequence: _mount -> initState + didChangeDependencies -> rebuild -> build
    // didChangeDependencies called setState which marks dirty, but doesn't re-trigger
    // didChangeDependencies in the current rebuild since the flag was already cleared.
    expect(rebuildCount).toBeGreaterThanOrEqual(1);
  });

  test('complete lifecycle: mount -> dependency change -> unmount', () => {
    const events: string[] = [];
    const leaf = new TestTerminalLeaf();

    const statefulWidget = new TestStatefulWidget({
      createState: () => {
        const state = new TestState((_ctx) => {
          events.push('build');
          return leaf;
        });
        state.initState = () => {
          state.initStateCalled = true;
          events.push('initState');
        };
        state.didChangeDependencies = () => {
          state.didChangeDependenciesCallCount++;
          events.push('didChangeDependencies');
        };
        state.dispose = () => {
          state.disposeCalled = true;
          events.push('dispose');
        };
        return state;
      },
    });

    const inherited1 = new TestInheritedWidget({
      child: statefulWidget,
      value: 1,
    });

    const inheritedElement = inherited1.createElement() as InheritedElement;
    inheritedElement.mount();

    const statefulElement = inheritedElement.child as StatefulElement;
    statefulElement.dependOnInheritedWidgetOfExactType(TestInheritedWidget);

    events.length = 0; // Clear mount-time events

    // Trigger dependency change
    const inherited2 = new TestInheritedWidget({
      child: statefulWidget,
      value: 2,
    });

    inheritedElement.update(inherited2);
    statefulElement.rebuild();

    // At this point events should have didChangeDependencies then build
    expect(events).toContain('didChangeDependencies');
    expect(events).toContain('build');
    const dcdIdx = events.indexOf('didChangeDependencies');
    const buildIdx = events.indexOf('build');
    expect(dcdIdx).toBeLessThan(buildIdx);

    // Unmount
    events.length = 0;
    inheritedElement.unmount();

    expect(events).toContain('dispose');
  });

  test('Element base class didChangeDependencies delegates to markNeedsRebuild', () => {
    const leafWidget = new TestTerminalLeaf();
    const leafElement = new LeafElement(leafWidget);
    leafElement.mount();

    expect(leafElement.dirty).toBe(false);

    // Calling didChangeDependencies on base Element should mark dirty
    leafElement.didChangeDependencies();

    expect(leafElement.dirty).toBe(true);
  });
});
