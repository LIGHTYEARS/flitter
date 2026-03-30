// Tests for InheritedModel<T> and InheritedModelElement<T>
// Aspect-based dependency tracking for fine-grained rebuild notifications.
// Gap ref: .gap/08-inherited-model.md

import { describe, test, expect } from 'bun:test';
import {
  Widget,
  StatelessWidget,
  InheritedWidget,
  InheritedModel,
  type BuildContext,
} from '../widget';
import {
  Element,
  InheritedElement,
  InheritedModelElement,
  StatelessElement,
  BuildContextImpl,
} from '../element';
import { Key } from '../../core/key';

// ---------------------------------------------------------------------------
// Test Helpers
// ---------------------------------------------------------------------------

type TestAspect = 'a' | 'b' | 'c';

class TestInheritedModel extends InheritedModel<TestAspect> {
  readonly values: Record<TestAspect, number>;

  constructor(opts: {
    values: Record<TestAspect, number>;
    child: Widget;
    key?: Key;
  }) {
    super({ key: opts.key, child: opts.child });
    this.values = opts.values;
  }

  updateShouldNotify(oldWidget: InheritedWidget): boolean {
    const old = oldWidget as TestInheritedModel;
    return (
      this.values.a !== old.values.a ||
      this.values.b !== old.values.b ||
      this.values.c !== old.values.c
    );
  }

  updateShouldNotifyDependent(
    oldWidget: InheritedModel<TestAspect>,
    dependencies: Set<TestAspect>,
  ): boolean {
    const old = oldWidget as TestInheritedModel;
    for (const aspect of dependencies) {
      if (this.values[aspect] !== old.values[aspect]) {
        return true;
      }
    }
    return false;
  }
}

/** Absolute leaf -- its createElement returns a plain Element. */
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

// ---------------------------------------------------------------------------
// InheritedModel widget tests
// ---------------------------------------------------------------------------

describe('InheritedModel widget', () => {
  test('createElement returns InheritedModelElement', () => {
    const model = new TestInheritedModel({
      values: { a: 1, b: 2, c: 3 },
      child: new TestTerminalLeaf(),
    });
    const element = model.createElement();
    expect(element).toBeInstanceOf(InheritedModelElement);
  });

  test('InheritedModel extends InheritedWidget', () => {
    const model = new TestInheritedModel({
      values: { a: 1, b: 2, c: 3 },
      child: new TestTerminalLeaf(),
    });
    expect(model).toBeInstanceOf(InheritedWidget);
  });
});

// ---------------------------------------------------------------------------
// InheritedModelElement tests
// ---------------------------------------------------------------------------

describe('InheritedModelElement', () => {
  function createTestSetup(values: Record<TestAspect, number>) {
    const childWidget = new TestStatelessWidget({
      build: () => new TestTerminalLeaf(),
    });
    const model = new TestInheritedModel({
      values,
      child: childWidget,
    });
    const element = model.createElement() as InheritedModelElement<TestAspect>;
    element.mount();
    return { model, element, childWidget };
  }

  function createDependentElement(): LeafElement {
    const dep = new LeafElement(new TestTerminalLeaf());
    dep.mount();
    return dep;
  }

  test('aspect-aware notification: only matching dependents rebuild', () => {
    const { element } = createTestSetup({ a: 1, b: 2, c: 3 });

    const depA = createDependentElement();
    const depB = createDependentElement();

    // Register depA with aspect 'a', depB with aspect 'b'
    element.addDependentWithAspect(depA, 'a');
    element.addDependentWithAspect(depB, 'b');

    // Update the model such that only aspect 'a' changes
    const newModel = new TestInheritedModel({
      values: { a: 100, b: 2, c: 3 },
      child: new TestStatelessWidget({ build: () => new TestTerminalLeaf() }),
    });

    element.update(newModel);

    // depA should be dirty (aspect 'a' changed), depB should NOT be dirty
    expect(depA.dirty).toBe(true);
    expect(depB.dirty).toBe(false);
  });

  test('unconditional dependent always rebuilds', () => {
    const { element } = createTestSetup({ a: 1, b: 2, c: 3 });

    const depUnconditional = createDependentElement();
    const depB = createDependentElement();

    // Register unconditional (no aspect)
    element.addDependentWithAspect(depUnconditional, undefined);
    // Register with aspect 'b'
    element.addDependentWithAspect(depB, 'b');

    // Update: only aspect 'a' changes
    const newModel = new TestInheritedModel({
      values: { a: 100, b: 2, c: 3 },
      child: new TestStatelessWidget({ build: () => new TestTerminalLeaf() }),
    });

    element.update(newModel);

    // Unconditional should always be dirty, depB should NOT
    expect(depUnconditional.dirty).toBe(true);
    expect(depB.dirty).toBe(false);
  });

  test('multiple aspects accumulated per dependent', () => {
    const { element } = createTestSetup({ a: 1, b: 2, c: 3 });

    const dep = createDependentElement();

    // Register with aspect 'a', then again with aspect 'b'
    element.addDependentWithAspect(dep, 'a');
    element.addDependentWithAspect(dep, 'b');

    // Verify both aspects are tracked
    const aspects = element._aspectDependents.get(dep);
    expect(aspects).toBeDefined();
    expect(aspects).not.toBeNull();
    expect(aspects!.has('a')).toBe(true);
    expect(aspects!.has('b')).toBe(true);

    // Update: only aspect 'b' changes
    const newModel = new TestInheritedModel({
      values: { a: 1, b: 200, c: 3 },
      child: new TestStatelessWidget({ build: () => new TestTerminalLeaf() }),
    });

    element.update(newModel);

    // Should be dirty because aspect 'b' changed and dep tracks 'b'
    expect(dep.dirty).toBe(true);
  });

  test('unconditional dependency overrides previous aspect registrations', () => {
    const { element } = createTestSetup({ a: 1, b: 2, c: 3 });

    const dep = createDependentElement();

    // Register with aspect 'a' first
    element.addDependentWithAspect(dep, 'a');

    // Then register with no aspect (unconditional)
    element.addDependentWithAspect(dep, undefined);

    // Verify it's now unconditional
    const aspects = element._aspectDependents.get(dep);
    expect(aspects).toBeNull();

    // Update: only aspect 'b' changes (dep had 'a', but now unconditional)
    const newModel = new TestInheritedModel({
      values: { a: 1, b: 200, c: 3 },
      child: new TestStatelessWidget({ build: () => new TestTerminalLeaf() }),
    });

    element.update(newModel);

    // Should be dirty because it's now unconditional
    expect(dep.dirty).toBe(true);
  });

  test('adding aspect to unconditional dependent does not narrow dependency', () => {
    const { element } = createTestSetup({ a: 1, b: 2, c: 3 });

    const dep = createDependentElement();

    // Register unconditional first
    element.addDependentWithAspect(dep, undefined);

    // Then try to add aspect 'a' (should not narrow)
    element.addDependentWithAspect(dep, 'a');

    // Should still be unconditional
    const aspects = element._aspectDependents.get(dep);
    expect(aspects).toBeNull();

    // Update: only aspect 'b' changes
    const newModel = new TestInheritedModel({
      values: { a: 1, b: 200, c: 3 },
      child: new TestStatelessWidget({ build: () => new TestTerminalLeaf() }),
    });

    element.update(newModel);

    // Should be dirty (still unconditional)
    expect(dep.dirty).toBe(true);
  });

  test('removeDependent clears aspect tracking for that element', () => {
    const { element } = createTestSetup({ a: 1, b: 2, c: 3 });

    const dep = createDependentElement();

    // Register with aspect 'a'
    element.addDependentWithAspect(dep, 'a');

    expect(element._aspectDependents.has(dep)).toBe(true);
    expect(element._dependents.has(dep)).toBe(true);

    // Remove dependent
    element.removeDependent(dep);

    expect(element._aspectDependents.has(dep)).toBe(false);
    expect(element._dependents.has(dep)).toBe(false);

    // Update: aspect 'a' changes
    const newModel = new TestInheritedModel({
      values: { a: 100, b: 2, c: 3 },
      child: new TestStatelessWidget({ build: () => new TestTerminalLeaf() }),
    });

    element.update(newModel);

    // dep should NOT be dirty (was removed)
    expect(dep.dirty).toBe(false);
  });

  test('unmount clears all aspect dependents', () => {
    const { element } = createTestSetup({ a: 1, b: 2, c: 3 });

    const dep1 = createDependentElement();
    const dep2 = createDependentElement();
    const dep3 = createDependentElement();

    element.addDependentWithAspect(dep1, 'a');
    element.addDependentWithAspect(dep2, 'b');
    element.addDependentWithAspect(dep3, undefined);

    expect(element._aspectDependents.size).toBe(3);
    expect(element._dependents.size).toBe(3);

    element.unmount();

    expect(element._aspectDependents.size).toBe(0);
    expect(element._dependents.size).toBe(0);
  });

  test('notifies all dependents when no previous widget exists', () => {
    const { element } = createTestSetup({ a: 1, b: 2, c: 3 });

    const dep1 = createDependentElement();
    const dep2 = createDependentElement();

    element.addDependentWithAspect(dep1, 'a');
    element.addDependentWithAspect(dep2, 'b');

    // Directly call notifyDependents without a prior update
    // (so _previousWidget is undefined)
    element.notifyDependents();

    // Both should be notified since there's no old widget to compare
    expect(dep1.dirty).toBe(true);
    expect(dep2.dirty).toBe(true);
  });

  test('addDependent (base method) registers as unconditional in aspect map', () => {
    const { element } = createTestSetup({ a: 1, b: 2, c: 3 });

    const dep = createDependentElement();

    // Use the base addDependent (simulating old API usage)
    element.addDependent(dep);

    // Should be tracked as unconditional
    expect(element._aspectDependents.has(dep)).toBe(true);
    expect(element._aspectDependents.get(dep)).toBeNull();

    // Update: only aspect 'b' changes
    const newModel = new TestInheritedModel({
      values: { a: 1, b: 200, c: 3 },
      child: new TestStatelessWidget({ build: () => new TestTerminalLeaf() }),
    });

    element.update(newModel);

    // Should be dirty (unconditional)
    expect(dep.dirty).toBe(true);
  });

  test('aspect-filtered dependent is NOT notified when unrelated aspect changes', () => {
    const { element } = createTestSetup({ a: 1, b: 2, c: 3 });

    const dep = createDependentElement();

    // Register with aspect 'c'
    element.addDependentWithAspect(dep, 'c');

    // Update: only aspect 'a' changes
    const newModel = new TestInheritedModel({
      values: { a: 100, b: 2, c: 3 },
      child: new TestStatelessWidget({ build: () => new TestTerminalLeaf() }),
    });

    element.update(newModel);

    // Should NOT be dirty -- aspect 'c' didn't change
    expect(dep.dirty).toBe(false);
  });

  test('no notification when updateShouldNotify returns false', () => {
    const { element } = createTestSetup({ a: 1, b: 2, c: 3 });

    const depA = createDependentElement();
    const depUnconditional = createDependentElement();

    element.addDependentWithAspect(depA, 'a');
    element.addDependentWithAspect(depUnconditional, undefined);

    // Update with same values (updateShouldNotify returns false)
    const newModel = new TestInheritedModel({
      values: { a: 1, b: 2, c: 3 },
      child: new TestStatelessWidget({ build: () => new TestTerminalLeaf() }),
    });

    element.update(newModel);

    // Neither should be dirty since updateShouldNotify returns false
    expect(depA.dirty).toBe(false);
    expect(depUnconditional.dirty).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// InheritedModel.inheritFrom tests
// ---------------------------------------------------------------------------

describe('InheritedModel.inheritFrom', () => {
  test('registers aspect dependency via inheritFrom', () => {
    const childWidget = new TestStatelessWidget({
      build: () => new TestTerminalLeaf(),
    });
    const model = new TestInheritedModel({
      values: { a: 1, b: 2, c: 3 },
      child: childWidget,
    });

    const modelElement = model.createElement() as InheritedModelElement<TestAspect>;
    modelElement.mount();

    // Create a descendant element and context
    const descendantElement = new LeafElement(new TestTerminalLeaf());
    descendantElement.parent = modelElement;
    // Set up the inherited widgets map for the descendant
    const map = new Map<Function, InheritedElement>();
    map.set(TestInheritedModel, modelElement);
    descendantElement._inheritedWidgets = map;
    descendantElement.mount();

    const ctx = new BuildContextImpl(descendantElement, descendantElement.widget);

    // Call inheritFrom with aspect
    const result = InheritedModel.inheritFrom<TestInheritedModel, TestAspect>(ctx, {
      widgetType: TestInheritedModel,
      aspect: 'a',
    });

    // Should return the model widget
    expect(result).toBe(model);

    // Should be registered with aspect 'a'
    const aspects = modelElement._aspectDependents.get(descendantElement);
    expect(aspects).toBeDefined();
    expect(aspects).not.toBeNull();
    expect(aspects!.has('a')).toBe(true);
  });

  test('registers unconditional dependency via inheritFrom without aspect', () => {
    const childWidget = new TestStatelessWidget({
      build: () => new TestTerminalLeaf(),
    });
    const model = new TestInheritedModel({
      values: { a: 1, b: 2, c: 3 },
      child: childWidget,
    });

    const modelElement = model.createElement() as InheritedModelElement<TestAspect>;
    modelElement.mount();

    const descendantElement = new LeafElement(new TestTerminalLeaf());
    descendantElement.parent = modelElement;
    const map = new Map<Function, InheritedElement>();
    map.set(TestInheritedModel, modelElement);
    descendantElement._inheritedWidgets = map;
    descendantElement.mount();

    const ctx = new BuildContextImpl(descendantElement, descendantElement.widget);

    // Call inheritFrom without aspect
    const result = InheritedModel.inheritFrom<TestInheritedModel, TestAspect>(ctx, {
      widgetType: TestInheritedModel,
    });

    expect(result).toBe(model);

    // Should be registered as unconditional
    const aspects = modelElement._aspectDependents.get(descendantElement);
    expect(aspects).toBeNull();
  });

  test('inheritFrom returns null when no ancestor exists', () => {
    const descendantElement = new LeafElement(new TestTerminalLeaf());
    descendantElement._inheritedWidgets = new Map();
    descendantElement.mount();

    const ctx = new BuildContextImpl(descendantElement, descendantElement.widget);

    const result = InheritedModel.inheritFrom<TestInheritedModel, TestAspect>(ctx, {
      widgetType: TestInheritedModel,
      aspect: 'a',
    });

    expect(result).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// dependOnInheritedModel tests (Element and BuildContextImpl)
// ---------------------------------------------------------------------------

describe('dependOnInheritedModel', () => {
  test('Element.dependOnInheritedModel registers aspect on InheritedModelElement', () => {
    const model = new TestInheritedModel({
      values: { a: 1, b: 2, c: 3 },
      child: new TestTerminalLeaf(),
    });
    const modelElement = model.createElement() as InheritedModelElement<TestAspect>;
    modelElement.mount();

    const dep = new LeafElement(new TestTerminalLeaf());
    dep.parent = modelElement;
    const map = new Map<Function, InheritedElement>();
    map.set(TestInheritedModel, modelElement);
    dep._inheritedWidgets = map;
    dep.mount();

    dep.dependOnInheritedModel<TestAspect>(TestInheritedModel, 'b');

    // Should be tracked with aspect 'b'
    const aspects = modelElement._aspectDependents.get(dep);
    expect(aspects).toBeDefined();
    expect(aspects).not.toBeNull();
    expect(aspects!.has('b')).toBe(true);

    // Should also be in _inheritedDependencies
    expect(dep._inheritedDependencies.has(modelElement)).toBe(true);
  });

  test('BuildContextImpl.dependOnInheritedModel delegates to element', () => {
    const model = new TestInheritedModel({
      values: { a: 1, b: 2, c: 3 },
      child: new TestTerminalLeaf(),
    });
    const modelElement = model.createElement() as InheritedModelElement<TestAspect>;
    modelElement.mount();

    const dep = new LeafElement(new TestTerminalLeaf());
    dep.parent = modelElement;
    const map = new Map<Function, InheritedElement>();
    map.set(TestInheritedModel, modelElement);
    dep._inheritedWidgets = map;
    dep.mount();

    const ctx = new BuildContextImpl(dep, dep.widget);
    ctx.dependOnInheritedModel<TestAspect>(TestInheritedModel, 'c');

    const aspects = modelElement._aspectDependents.get(dep);
    expect(aspects).toBeDefined();
    expect(aspects).not.toBeNull();
    expect(aspects!.has('c')).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Performance test: aspect-aware notification avoids unnecessary rebuilds
// ---------------------------------------------------------------------------

describe('InheritedModel performance', () => {
  test('aspect-aware notification avoids unnecessary rebuilds', () => {
    const childWidget = new TestStatelessWidget({
      build: () => new TestTerminalLeaf(),
    });
    const model = new TestInheritedModel({
      values: { a: 1, b: 2, c: 3 },
      child: childWidget,
    });
    const element = model.createElement() as InheritedModelElement<TestAspect>;
    element.mount();

    // Create 50 dependents on aspect 'a' and 50 on aspect 'b'
    const depsA: LeafElement[] = [];
    const depsB: LeafElement[] = [];
    for (let i = 0; i < 50; i++) {
      const depA = new LeafElement(new TestTerminalLeaf());
      depA.mount();
      element.addDependentWithAspect(depA, 'a');
      depsA.push(depA);

      const depB = new LeafElement(new TestTerminalLeaf());
      depB.mount();
      element.addDependentWithAspect(depB, 'b');
      depsB.push(depB);
    }

    // Update only aspect 'a'
    const newModel = new TestInheritedModel({
      values: { a: 100, b: 2, c: 3 },
      child: childWidget,
    });

    element.update(newModel);

    // Count dirty elements
    let dirtyCountA = 0;
    let dirtyCountB = 0;
    for (const dep of depsA) {
      if (dep.dirty) dirtyCountA++;
    }
    for (const dep of depsB) {
      if (dep.dirty) dirtyCountB++;
    }

    // All 50 'a' dependents should be dirty
    expect(dirtyCountA).toBe(50);
    // All 50 'b' dependents should NOT be dirty
    expect(dirtyCountB).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// Backward compatibility: InheritedModel used via old API
// ---------------------------------------------------------------------------

describe('InheritedModel backward compatibility', () => {
  test('InheritedModel works with dependOnInheritedWidgetOfExactType', () => {
    const model = new TestInheritedModel({
      values: { a: 1, b: 2, c: 3 },
      child: new TestTerminalLeaf(),
    });
    const modelElement = model.createElement() as InheritedModelElement<TestAspect>;
    modelElement.mount();

    // Use old API (no aspect)
    const dep = new LeafElement(new TestTerminalLeaf());
    dep.parent = modelElement;
    const map = new Map<Function, InheritedElement>();
    map.set(TestInheritedModel, modelElement);
    dep._inheritedWidgets = map;
    dep.mount();

    dep.dependOnInheritedWidgetOfExactType(TestInheritedModel);

    // Should be registered as unconditional
    expect(modelElement._aspectDependents.has(dep)).toBe(true);
    expect(modelElement._aspectDependents.get(dep)).toBeNull();

    // Update: only aspect 'b' changes
    const newModel = new TestInheritedModel({
      values: { a: 1, b: 200, c: 3 },
      child: new TestTerminalLeaf(),
    });

    modelElement.update(newModel);

    // Should be dirty (unconditional -- always rebuilds)
    expect(dep.dirty).toBe(true);
  });
});
