// Tests for Element.reassemble(), State.reassemble(), and WidgetsBinding.reassemble()
// Gap ref: .gap/03-hot-reload-reassemble.md

import { describe, test, expect, beforeEach, afterEach } from 'bun:test';
import {
  Widget,
  StatelessWidget,
  StatefulWidget,
  State,
  type BuildContext,
} from '../widget';
import {
  Element,
  StatefulElement,
  StatelessElement,
} from '../element';
import { WidgetsBinding } from '../binding';
import {
  LeafRenderObjectWidget,
  RenderBox,
  RenderObject,
} from '../render-object';
import { Size } from '../../core/types';

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

/** A minimal render box for testing. */
class TestRenderBox extends RenderBox {
  performLayout(): void {
    if (this.constraints) {
      this.size = this.constraints.constrain(
        new Size(this.constraints.maxWidth, this.constraints.maxHeight),
      );
    }
  }
  paint(): void {}
}

/** A leaf widget that creates a render object -- terminates the tree. */
class LeafTestWidget extends LeafRenderObjectWidget {
  createRenderObject(): RenderObject {
    return new TestRenderBox();
  }
}

/** A StatelessWidget that builds a LeafTestWidget -- proper tree termination. */
class SimpleStatelessWidget extends StatelessWidget {
  build(_context: BuildContext): Widget {
    return new LeafTestWidget();
  }

  override createElement(): StatelessElement {
    return new StatelessElement(this);
  }
}

/** Helper: walk element tree collecting all elements. */
function collectAllElements(root: Element): Element[] {
  const elements: Element[] = [];
  function walk(el: Element) {
    elements.push(el);
    el.visitChildren(walk);
  }
  walk(root);
  return elements;
}

/** Helper: find the first StatefulElement in the tree. */
function findStatefulElement(root: Element): StatefulElement | null {
  let found: StatefulElement | null = null;
  function walk(el: Element) {
    if (el instanceof StatefulElement && !found) {
      found = el;
      return;
    }
    el.visitChildren(walk);
  }
  walk(root);
  return found;
}

// ---------------------------------------------------------------------------
// Element.reassemble() tests
// ---------------------------------------------------------------------------

describe('Element.reassemble()', () => {
  beforeEach(() => {
    WidgetsBinding.reset();
  });

  afterEach(() => {
    WidgetsBinding.reset();
  });

  test('marks the element as dirty', () => {
    const binding = WidgetsBinding.instance;
    const widget = new SimpleStatelessWidget();
    binding.attachRootWidget(widget);
    binding.drawFrameSync();

    const root = binding.rootElement!;
    // Clear dirty flag after initial build
    root._dirty = false;

    root.reassemble();

    expect(root.dirty).toBe(true);
  });

  test('recursively marks all descendants dirty', () => {
    // Build a tree: _RootWidget -> SimpleStatelessWidget -> LeafTestWidget
    const binding = WidgetsBinding.instance;
    binding.attachRootWidget(new SimpleStatelessWidget());
    binding.drawFrameSync();

    // Collect all elements
    const elements = collectAllElements(binding.rootElement!);
    expect(elements.length).toBeGreaterThan(1);

    // Clear all dirty flags
    for (const el of elements) {
      el._dirty = false;
    }

    // Reassemble from root
    binding.rootElement!.reassemble();

    // ALL elements should be dirty
    for (const el of elements) {
      expect(el.dirty).toBe(true);
    }
  });

  test('works on a single element with no children', () => {
    const widget = new SimpleStatelessWidget();
    const element = new Element(widget);
    element.markMounted();

    // Should not throw
    element.reassemble();
    // Note: markNeedsRebuild() does nothing for base Element not in a tree with binding
    // but the method should not crash
  });
});

// ---------------------------------------------------------------------------
// StatefulElement.reassemble() tests
// ---------------------------------------------------------------------------

describe('StatefulElement.reassemble()', () => {
  beforeEach(() => {
    WidgetsBinding.reset();
  });

  afterEach(() => {
    WidgetsBinding.reset();
  });

  test('calls State.reassemble()', () => {
    let reassembleCalled = false;

    class TestState extends State<TestStatefulWidget> {
      reassemble(): void {
        reassembleCalled = true;
      }
      build(_context: BuildContext): Widget {
        return new LeafTestWidget();
      }
    }

    class TestStatefulWidget extends StatefulWidget {
      createState() {
        return new TestState();
      }
    }

    const binding = WidgetsBinding.instance;
    binding.attachRootWidget(new TestStatefulWidget());
    binding.drawFrameSync();

    // Find the StatefulElement
    const statefulEl = findStatefulElement(binding.rootElement!);
    expect(statefulEl).not.toBeNull();

    statefulEl!.reassemble();

    expect(reassembleCalled).toBe(true);
  });

  test('does not call State.initState() again', () => {
    let initCount = 0;

    class TestState extends State<TestStatefulWidget2> {
      initState(): void {
        initCount++;
      }
      build(_context: BuildContext): Widget {
        return new LeafTestWidget();
      }
    }

    class TestStatefulWidget2 extends StatefulWidget {
      createState() {
        return new TestState();
      }
    }

    // Mount
    const binding = WidgetsBinding.instance;
    binding.attachRootWidget(new TestStatefulWidget2());
    binding.drawFrameSync();
    expect(initCount).toBe(1);

    // Reassemble
    binding.rootElement!.reassemble();
    binding.drawFrameSync();
    expect(initCount).toBe(1); // still 1, not 2
  });

  test('marks StatefulElement and descendants dirty after reassemble', () => {
    class TestState extends State<TestStatefulWidget3> {
      build(_context: BuildContext): Widget {
        return new LeafTestWidget();
      }
    }

    class TestStatefulWidget3 extends StatefulWidget {
      createState() {
        return new TestState();
      }
    }

    const binding = WidgetsBinding.instance;
    binding.attachRootWidget(new TestStatefulWidget3());
    binding.drawFrameSync();

    const elements = collectAllElements(binding.rootElement!);
    for (const el of elements) {
      el._dirty = false;
    }

    binding.rootElement!.reassemble();

    for (const el of elements) {
      expect(el.dirty).toBe(true);
    }
  });
});

// ---------------------------------------------------------------------------
// WidgetsBinding.reassemble() tests
// ---------------------------------------------------------------------------

describe('WidgetsBinding.reassemble()', () => {
  beforeEach(() => {
    WidgetsBinding.reset();
  });

  afterEach(() => {
    WidgetsBinding.reset();
  });

  test('throws when app is not running', () => {
    const binding = WidgetsBinding.instance;

    expect(() => {
      binding.reassemble(new SimpleStatelessWidget());
    }).toThrow('Cannot reassemble: app is not running');
  });

  test('preserves existing State instances', () => {
    class CounterState extends State<CounterWidget> {
      count = 42;
      build(_context: BuildContext): Widget {
        return new LeafTestWidget();
      }
    }

    class CounterWidget extends StatefulWidget {
      createState() {
        return new CounterState();
      }
    }

    const binding = WidgetsBinding.instance;
    binding.attachRootWidget(new CounterWidget());
    binding.drawFrameSync();

    // Find the state and verify initial value
    const statefulEl = findStatefulElement(binding.rootElement!);
    expect(statefulEl).not.toBeNull();
    const state = statefulEl!.state as CounterState;
    expect(state.count).toBe(42);

    // Reassemble with a new widget instance (same type)
    binding.reassemble(new CounterWidget());
    binding.drawFrameSync();

    // State should be preserved -- same object reference
    const stateAfter = findStatefulElement(binding.rootElement!)!.state as CounterState;
    expect(stateAfter).toBe(state);
    expect(stateAfter.count).toBe(42);
  });

  test('preserves root element identity', () => {
    const binding = WidgetsBinding.instance;
    binding.attachRootWidget(new SimpleStatelessWidget());
    binding.drawFrameSync();

    const oldRoot = binding.rootElement;

    binding.reassemble(new SimpleStatelessWidget());
    binding.drawFrameSync();

    // Root element (_RootWidget element) is preserved
    expect(binding.rootElement).toBe(oldRoot);
  });

  test('requests forced paint frame', () => {
    const binding = WidgetsBinding.instance;
    binding.attachRootWidget(new SimpleStatelessWidget());
    binding.drawFrameSync();

    binding.reassemble(new SimpleStatelessWidget());

    expect(binding.forcePaintOnNextFrame).toBe(true);
  });

  test('end-to-end: hot reload preserves counter state through multiple reassembles', () => {
    class CounterState extends State<CounterWidget2> {
      count = 0;
      build(_context: BuildContext): Widget {
        return new LeafTestWidget();
      }
    }

    class CounterWidget2 extends StatefulWidget {
      createState() {
        return new CounterState();
      }
    }

    const binding = WidgetsBinding.instance;
    binding.attachRootWidget(new CounterWidget2());
    binding.drawFrameSync();

    // Simulate user incrementing to 5
    const statefulEl = findStatefulElement(binding.rootElement!);
    const state = statefulEl!.state as CounterState;
    state.setState(() => {
      state.count = 5;
    });
    binding.drawFrameSync();
    expect(state.count).toBe(5);

    // Simulate hot reload (new CounterWidget2 instance, same class)
    binding.reassemble(new CounterWidget2());
    binding.drawFrameSync();

    // State should be preserved
    const stateAfter = findStatefulElement(binding.rootElement!)!.state as CounterState;
    expect(stateAfter).toBe(state); // same State object
    expect(stateAfter.count).toBe(5); // count preserved

    // Second reassemble -- still preserved
    binding.reassemble(new CounterWidget2());
    binding.drawFrameSync();

    const stateAfter2 = findStatefulElement(binding.rootElement!)!.state as CounterState;
    expect(stateAfter2).toBe(state);
    expect(stateAfter2.count).toBe(5);
  });
});
