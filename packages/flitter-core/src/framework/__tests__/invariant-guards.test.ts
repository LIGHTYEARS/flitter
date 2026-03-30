// Framework Invariant Guards — structural tests that prevent regressions
// in the core Widget -> Element -> RenderObject lifecycle.
//
// These tests verify fundamental framework invariants that MUST hold:
// 1. Widget creates an Element, Element mounts and creates RenderObject
// 2. StatefulWidget preserves State across rebuilds
// 3. InheritedWidget notifies dependents on change
// 4. Deactivate/activate lifecycle works (GlobalKey reparenting)
// 5. GlobalKey provides cross-tree access
// 6. ErrorWidget catches build errors
//
// Gap #71: Comprehensive test coverage plan — test guardrails

import { describe, it, expect, afterEach } from 'bun:test';
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
  SingleChildRenderObjectElement,
  LeafRenderObjectElement,
  _ElementLifecycleState,
} from '../element';
import {
  RenderBox,
  RenderObject,
  LeafRenderObjectWidget,
  SingleChildRenderObjectWidget,
  type PaintContext,
} from '../render-object';
import { ErrorWidget, RenderErrorBox } from '../error-widget';
import { GlobalKey, ValueKey } from '../../core/key';
import { BoxConstraints } from '../../core/box-constraints';
import { Offset, Size } from '../../core/types';

// ---------------------------------------------------------------------------
// Test Helpers
// ---------------------------------------------------------------------------

/** A minimal render box for testing. */
class TestRenderBox extends RenderBox {
  layoutCount = 0;
  performLayout(): void {
    this.layoutCount++;
    if (this.constraints) {
      this.size = this.constraints.constrain(
        new Size(this.constraints.maxWidth, this.constraints.maxHeight),
      );
    }
  }
  paint(_context: PaintContext, _offset: Offset): void {}
}

/** A leaf widget that terminates the tree with a RenderObject. */
class TestLeafWidget extends LeafRenderObjectWidget {
  readonly label: string;
  constructor(opts?: { key?: any; label?: string }) {
    super(opts?.key ? { key: opts.key } : undefined);
    this.label = opts?.label ?? 'leaf';
  }
  createRenderObject(): RenderObject {
    return new TestRenderBox();
  }
}

/** A single-child render object widget for testing. */
class TestSingleChildWidget extends SingleChildRenderObjectWidget {
  createRenderObject(): RenderObject {
    return new TestSingleChildRenderBox();
  }
}

class TestSingleChildRenderBox extends RenderBox {
  private _child: RenderBox | null = null;
  set child(value: RenderObject | null) {
    this._child = value as RenderBox | null;
  }
  get child(): RenderBox | null {
    return this._child;
  }
  performLayout(): void {
    if (this.constraints) {
      this.size = this.constraints.constrain(
        new Size(this.constraints.maxWidth, this.constraints.maxHeight),
      );
    }
  }
  paint(): void {}
}

/** A minimal StatelessWidget for testing. */
class SimpleStateless extends StatelessWidget {
  build(_context: BuildContext): Widget {
    return new TestLeafWidget();
  }
}

/** Self-referential leaf StatelessWidget (returns itself from build). */
class SelfLeaf extends StatelessWidget {
  build(_context: BuildContext): Widget {
    return this;
  }
}

// ---------------------------------------------------------------------------
// 1. Widget -> Element -> RenderObject lifecycle
// ---------------------------------------------------------------------------

describe('Framework Invariant Guards', () => {

  afterEach(() => {
    GlobalKey._clearRegistry();
  });

  describe('Widget -> Element -> RenderObject lifecycle', () => {
    it('StatelessWidget.createElement() produces a StatelessElement', () => {
      const widget = new SimpleStateless();
      const element = widget.createElement();
      expect(element).toBeInstanceOf(StatelessElement);
    });

    it('StatefulWidget.createElement() produces a StatefulElement', () => {
      class TestStateful extends StatefulWidget {
        createState() {
          return new (class extends State<TestStateful> {
            build(_ctx: BuildContext): Widget {
              return new TestLeafWidget();
            }
          })();
        }
      }
      const widget = new TestStateful();
      const element = widget.createElement();
      expect(element).toBeInstanceOf(StatefulElement);
    });

    it('LeafRenderObjectWidget.createElement() produces LeafRenderObjectElement', () => {
      const widget = new TestLeafWidget();
      const element = widget.createElement();
      expect(element).toBeInstanceOf(LeafRenderObjectElement);
    });

    it('SingleChildRenderObjectWidget.createElement() produces SingleChildRenderObjectElement', () => {
      const widget = new TestSingleChildWidget({ child: new TestLeafWidget() });
      const element = widget.createElement();
      expect(element).toBeInstanceOf(SingleChildRenderObjectElement);
    });

    it('LeafRenderObjectElement.mount() creates a RenderObject', () => {
      const widget = new TestLeafWidget();
      const element = widget.createElement() as LeafRenderObjectElement;
      element.mount();
      expect(element.renderObject).toBeDefined();
      expect(element.renderObject).toBeInstanceOf(TestRenderBox);
    });

    it('StatelessElement.mount() builds child and mounts it', () => {
      const widget = new SimpleStateless();
      const element = widget.createElement() as StatelessElement;
      element.mount();
      expect(element.mounted).toBe(true);
      expect(element.child).toBeDefined();
    });

    it('StatefulElement.mount() creates State, calls initState, then builds', () => {
      let initStateCalled = false;
      let buildCalled = false;

      class TrackingState extends State<TrackingWidget> {
        initState(): void {
          initStateCalled = true;
        }
        build(_ctx: BuildContext): Widget {
          buildCalled = true;
          return new TestLeafWidget();
        }
      }

      class TrackingWidget extends StatefulWidget {
        createState() { return new TrackingState(); }
      }

      const widget = new TrackingWidget();
      const element = widget.createElement() as StatefulElement;
      element.mount();

      expect(initStateCalled).toBe(true);
      expect(buildCalled).toBe(true);
      expect(element.state).toBeDefined();
      expect(element.state).toBeInstanceOf(TrackingState);
      expect(element.mounted).toBe(true);
    });

    it('full lifecycle: mount -> unmount calls dispose on State', () => {
      let disposeCalled = false;

      class DisposableState extends State<DisposableWidget> {
        dispose(): void {
          disposeCalled = true;
        }
        build(_ctx: BuildContext): Widget {
          return new TestLeafWidget();
        }
      }

      class DisposableWidget extends StatefulWidget {
        createState() { return new DisposableState(); }
      }

      const element = new DisposableWidget().createElement() as StatefulElement;
      element.mount();
      expect(disposeCalled).toBe(false);

      element.unmount();
      expect(disposeCalled).toBe(true);
    });
  });

  // -------------------------------------------------------------------------
  // 2. StatefulWidget preserves State across rebuilds
  // -------------------------------------------------------------------------

  describe('StatefulWidget preserves State across rebuilds', () => {
    it('rebuild preserves the same State instance', () => {
      class CounterState extends State<CounterWidget> {
        count = 0;
        build(_ctx: BuildContext): Widget {
          return new TestLeafWidget({ label: `count-${this.count}` });
        }
      }

      class CounterWidget extends StatefulWidget {
        createState() { return new CounterState(); }
      }

      const widget1 = new CounterWidget();
      const element = widget1.createElement() as StatefulElement;
      element.mount();

      const stateRef = element.state as CounterState;
      expect(stateRef).toBeInstanceOf(CounterState);

      // Mutate state
      stateRef.count = 42;

      // Update with a new widget of the same type (simulates parent rebuild)
      const widget2 = new CounterWidget();
      element.update(widget2);

      // State instance is preserved
      expect(element.state).toBe(stateRef);
      expect((element.state as CounterState).count).toBe(42);
    });

    it('didUpdateWidget is called with the old widget on update', () => {
      let capturedOld: Widget | undefined;

      class CapturingState extends State<LabeledWidget> {
        didUpdateWidget(oldWidget: LabeledWidget): void {
          capturedOld = oldWidget;
        }
        build(_ctx: BuildContext): Widget {
          return new TestLeafWidget({ label: this.widget.label });
        }
      }

      class LabeledWidget extends StatefulWidget {
        readonly label: string;
        constructor(label: string) {
          super();
          this.label = label;
        }
        createState() { return new CapturingState(); }
      }

      const widget1 = new LabeledWidget('first');
      const element = widget1.createElement() as StatefulElement;
      element.mount();

      const widget2 = new LabeledWidget('second');
      element.update(widget2);

      expect(capturedOld).toBe(widget1);
      expect((element.state as CapturingState).widget.label).toBe('second');
    });

    it('setState throws after dispose', () => {
      class TestState extends State<TestStatefulWidget> {
        build(_ctx: BuildContext): Widget {
          return new TestLeafWidget();
        }
      }

      class TestStatefulWidget extends StatefulWidget {
        createState() { return new TestState(); }
      }

      const element = new TestStatefulWidget().createElement() as StatefulElement;
      element.mount();
      const state = element.state as TestState;

      element.unmount();

      expect(() => state.setState(() => {})).toThrow('setState() called after dispose()');
    });
  });

  // -------------------------------------------------------------------------
  // 3. InheritedWidget notifies dependents on change
  // -------------------------------------------------------------------------

  describe('InheritedWidget notifies dependents on change', () => {
    it('dependOnInheritedWidgetOfExactType registers dependency', () => {
      class TestInherited extends InheritedWidget {
        readonly data: number;
        constructor(opts: { data: number; child: Widget }) {
          super({ child: opts.child });
          this.data = opts.data;
        }
        updateShouldNotify(oldWidget: TestInherited): boolean {
          return this.data !== oldWidget.data;
        }
      }

      const childWidget = new SelfLeaf();
      const inherited = new TestInherited({ data: 42, child: childWidget });
      const inheritedElement = inherited.createElement() as InheritedElement;
      inheritedElement.mount();

      // The child element should be mounted
      expect(inheritedElement.child).toBeDefined();

      // Simulate dependent registration
      const dependentElement = new Element(new SelfLeaf());
      dependentElement._updateInheritedWidgets(inheritedElement._inheritedWidgets);
      const found = dependentElement.dependOnInheritedWidgetOfExactType(TestInherited);

      expect(found).toBe(inheritedElement);
    });

    it('notifyDependents triggers didChangeDependencies on dependents', () => {
      let dependencyChanged = false;

      class TestInherited extends InheritedWidget {
        readonly value: number;
        constructor(opts: { value: number; child: Widget }) {
          super({ child: opts.child });
          this.value = opts.value;
        }
        updateShouldNotify(old: TestInherited): boolean {
          return this.value !== old.value;
        }
      }

      // Create a dependent element that tracks didChangeDependencies
      const dependentElement = new Element(new SelfLeaf());
      dependentElement.markMounted();
      const originalDidChange = dependentElement.didChangeDependencies.bind(dependentElement);
      dependentElement.didChangeDependencies = () => {
        dependencyChanged = true;
        // Don't call the original since it requires binding setup
      };

      const child = new SelfLeaf();
      const inherited1 = new TestInherited({ value: 1, child });
      const inheritedElement = inherited1.createElement() as InheritedElement;
      inheritedElement.mount();

      // Register dependency
      inheritedElement.addDependent(dependentElement);

      // Notify
      inheritedElement.notifyDependents();

      expect(dependencyChanged).toBe(true);
    });

    it('update with changed data calls notifyDependents', () => {
      let dependencyNotified = false;

      class DataInherited extends InheritedWidget {
        readonly data: string;
        constructor(opts: { data: string; child: Widget }) {
          super({ child: opts.child });
          this.data = opts.data;
        }
        updateShouldNotify(old: DataInherited): boolean {
          return this.data !== old.data;
        }
      }

      const child = new SelfLeaf();
      const widget1 = new DataInherited({ data: 'old', child });
      const element = widget1.createElement() as InheritedElement;
      element.mount();

      // Add a dependent that tracks notifications
      const depElement = new Element(new SelfLeaf());
      depElement.markMounted();
      depElement.didChangeDependencies = () => { dependencyNotified = true; };
      element.addDependent(depElement);

      // Update with changed data
      const widget2 = new DataInherited({ data: 'new', child });
      element.update(widget2);

      expect(dependencyNotified).toBe(true);
    });

    it('update with same data does NOT notify dependents', () => {
      let dependencyNotified = false;

      class SameDataInherited extends InheritedWidget {
        readonly data: number;
        constructor(opts: { data: number; child: Widget }) {
          super({ child: opts.child });
          this.data = opts.data;
        }
        updateShouldNotify(old: SameDataInherited): boolean {
          return this.data !== old.data;
        }
      }

      const child = new SelfLeaf();
      const widget1 = new SameDataInherited({ data: 42, child });
      const element = widget1.createElement() as InheritedElement;
      element.mount();

      const depElement = new Element(new SelfLeaf());
      depElement.markMounted();
      depElement.didChangeDependencies = () => { dependencyNotified = true; };
      element.addDependent(depElement);

      // Update with same data value
      const widget2 = new SameDataInherited({ data: 42, child });
      element.update(widget2);

      expect(dependencyNotified).toBe(false);
    });
  });

  // -------------------------------------------------------------------------
  // 4. Deactivate/activate lifecycle
  // -------------------------------------------------------------------------

  describe('deactivate/activate lifecycle', () => {
    it('deactivate transitions element to inactive state', () => {
      const widget = new SimpleStateless();
      const element = widget.createElement() as StatelessElement;
      element.mount();
      expect(element.mounted).toBe(true);

      element.deactivate();
      expect(element.mounted).toBe(false);
      expect(element._lifecycleState).toBe(_ElementLifecycleState.inactive);
    });

    it('activate transitions element back to active state', () => {
      const widget = new SimpleStateless();
      const element = widget.createElement() as StatelessElement;
      element.mount();

      element.deactivate();
      expect(element.mounted).toBe(false);

      element.activate();
      expect(element.mounted).toBe(true);
      expect(element._lifecycleState).toBe(_ElementLifecycleState.active);
    });

    it('deactivate calls State.deactivate() on StatefulElement', () => {
      let deactivateCalled = false;

      class LifecycleState extends State<LifecycleWidget> {
        deactivate(): void {
          deactivateCalled = true;
        }
        build(_ctx: BuildContext): Widget {
          return new TestLeafWidget();
        }
      }

      class LifecycleWidget extends StatefulWidget {
        createState() { return new LifecycleState(); }
      }

      const element = new LifecycleWidget().createElement() as StatefulElement;
      element.mount();

      element.deactivate();
      expect(deactivateCalled).toBe(true);
    });

    it('activate calls State.activate() on StatefulElement', () => {
      let activateCalled = false;

      class ActivateState extends State<ActivateWidget> {
        activate(): void {
          activateCalled = true;
        }
        build(_ctx: BuildContext): Widget {
          return new TestLeafWidget();
        }
      }

      class ActivateWidget extends StatefulWidget {
        createState() { return new ActivateState(); }
      }

      const element = new ActivateWidget().createElement() as StatefulElement;
      element.mount();

      element.deactivate();
      element.activate();
      expect(activateCalled).toBe(true);
    });

    it('unmount after deactivate transitions to defunct', () => {
      const element = new SimpleStateless().createElement() as StatelessElement;
      element.mount();

      element.deactivate();
      expect(element._lifecycleState).toBe(_ElementLifecycleState.inactive);

      element.unmount();
      expect(element._lifecycleState).toBe(_ElementLifecycleState.defunct);
    });
  });

  // -------------------------------------------------------------------------
  // 5. GlobalKey provides cross-tree access
  // -------------------------------------------------------------------------

  describe('GlobalKey cross-tree access', () => {
    it('GlobalKey.currentElement returns the mounted element', () => {
      const key = new GlobalKey('test');
      const widget = new SelfLeaf({ key });
      const element = new StatelessElement(widget);
      element.markMounted();

      expect(key.currentElement).toBe(element);
    });

    it('GlobalKey.currentWidget returns the widget of the mounted element', () => {
      const key = new GlobalKey('test');
      const widget = new SelfLeaf({ key });
      const element = new StatelessElement(widget);
      element.markMounted();

      expect(key.currentWidget).toBe(widget);
    });

    it('GlobalKey.currentState returns the State for StatefulElements', () => {
      const key = new GlobalKey('stateful');

      class TestState extends State<KeyedStateful> {
        build(_ctx: BuildContext): Widget {
          return new TestLeafWidget();
        }
      }

      class KeyedStateful extends StatefulWidget {
        createState() { return new TestState(); }
      }

      const widget = new KeyedStateful({ key });
      const element = widget.createElement() as StatefulElement;
      element.mount();

      expect(key.currentState).toBeInstanceOf(TestState);
    });

    it('GlobalKey clears references on unmount', () => {
      const key = new GlobalKey('cleanup');
      const widget = new SelfLeaf({ key });
      const element = new StatelessElement(widget);
      element.markMounted();

      expect(key.currentElement).toBe(element);

      element.unmount();
      expect(key.currentElement).toBeUndefined();
      expect(key.currentWidget).toBeUndefined();
    });

    it('GlobalKey rejects duplicate mounts', () => {
      const key = new GlobalKey('dup');
      const w1 = new SelfLeaf({ key });
      const e1 = new StatelessElement(w1);
      e1.markMounted();

      const w2 = new SelfLeaf({ key });
      const e2 = new StatelessElement(w2);

      expect(() => e2.markMounted()).toThrow();
    });
  });

  // -------------------------------------------------------------------------
  // 6. ErrorWidget catches build errors
  // -------------------------------------------------------------------------

  describe('ErrorWidget catches build errors', () => {
    const originalBuilder = ErrorWidget.builder;
    afterEach(() => {
      ErrorWidget.builder = originalBuilder;
    });

    it('StatelessElement catches build error and substitutes ErrorWidget', () => {
      class FailingWidget extends StatelessWidget {
        build(_ctx: BuildContext): Widget {
          throw new Error('build exploded');
        }
      }

      const element = new FailingWidget().createElement() as StatelessElement;
      // Should NOT throw
      expect(() => element.mount()).not.toThrow();

      expect(element.child).toBeDefined();
      expect(element.child!.widget).toBeInstanceOf(ErrorWidget);
      expect((element.child!.widget as ErrorWidget).message).toBe('build exploded');
    });

    it('StatefulElement catches build error and substitutes ErrorWidget', () => {
      class FailState extends State<FailStateful> {
        build(_ctx: BuildContext): Widget {
          throw new Error('state build exploded');
        }
      }
      class FailStateful extends StatefulWidget {
        createState() { return new FailState(); }
      }

      const element = new FailStateful().createElement() as StatefulElement;
      expect(() => element.mount()).not.toThrow();

      expect(element.child).toBeDefined();
      expect(element.child!.widget).toBeInstanceOf(ErrorWidget);
    });

    it('ErrorWidget creates a RenderErrorBox with the message', () => {
      const widget = new ErrorWidget({ message: 'test error' });
      const renderObj = widget.createRenderObject();
      expect(renderObj).toBeInstanceOf(RenderErrorBox);
      expect(renderObj.message).toBe('test error');
    });

    it('ErrorWidget.fromError factory preserves the error', () => {
      const err = new Error('something broke');
      const widget = ErrorWidget.fromError(err);
      expect(widget.message).toBe('something broke');
      expect(widget.error).toBe(err);
    });

    it('build error recovery: fix error and rebuild succeeds', () => {
      let shouldFail = true;
      const leaf = new SelfLeaf();

      class ConditionalWidget extends StatelessWidget {
        build(_ctx: BuildContext): Widget {
          if (shouldFail) throw new Error('conditional error');
          return leaf;
        }
      }

      const element = new ConditionalWidget().createElement() as StatelessElement;
      element.mount();
      expect(element.child!.widget).toBeInstanceOf(ErrorWidget);

      shouldFail = false;
      element.rebuild();
      expect(element.child!.widget).toBe(leaf);
      expect(element.child!.widget).not.toBeInstanceOf(ErrorWidget);
    });
  });
});
