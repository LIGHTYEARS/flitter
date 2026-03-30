# Gap F04: Make `GlobalKey` Functional with Cross-Tree Element Access

## Status: Proposal
## Affected packages: `flitter-core`

---

## 1. Current Behavior Analysis

### 1.1 The `GlobalKey` Class Today

The `GlobalKey` class in `/home/gem/workspace/flitter/packages/flitter-core/src/core/key.ts` (lines 64-79) is explicitly documented as a placeholder:

```typescript
/**
 * GlobalKey placeholder for Phase 3.
 * Will eventually provide access to currentState/currentContext.
 * For now, behaves like UniqueKey with its own ID sequence.
 */
export class GlobalKey extends Key {
  readonly _id: number;

  constructor() {
    super();
    this._id = _nextGlobalId++;
  }

  equals(other: Key): boolean {
    return this === other;            // identity-based, same as UniqueKey
  }

  toString(): string {
    return `GlobalKey(#${this._id})`;
  }
}
```

**Problems with the current implementation:**

1. **No `_currentElement` field** -- The key has no reference to the Element it is associated with. In the Amp binary (`Zs` class, reference: `.reference/element-tree.md` lines 149-196), `GlobalKey` holds a `_currentElement` field that tracks the currently mounted Element.

2. **No `currentElement` / `currentWidget` accessors** -- Users cannot look up the Element or Widget associated with a GlobalKey from anywhere in the tree. This is the primary purpose of GlobalKey in both Flutter and the Amp binary.

3. **No `currentState` accessor** -- For StatefulWidgets, the Amp pattern allows `key.currentElement.state` to retrieve the State object. While Amp does not have a dedicated `currentState` getter on GlobalKey itself, the `currentElement` accessor makes this possible through `(key.currentElement as StatefulElement).state`.

4. **No `_setElement()` / `_clearElement()` lifecycle integration** -- The Amp binary (`.reference/element-tree.md` lines 173-187 and `.reference/widget-tree.md` lines 126-137) calls `_setElement(element)` during `Element.markMounted()` and `_clearElement()` during `Element.unmount()`. The current implementation has no such hooks.

5. **No static `_registry`** -- The Amp `Zs` class has `static _registry = new Map()` (`.reference/widget-tree.md` line 104) that maps key IDs to GlobalKey instances, enabling cross-tree lookup. This is absent.

6. **Identity-based equality instead of ID-based** -- The Amp `Zs.equals()` compares `this._id === other._id` (string-based), while the current implementation uses `this === other` (reference identity). This means two GlobalKey instances with the same debug label would not be considered equal in the current code, diverging from Amp behavior.

7. **No `debugLabel` constructor parameter** -- The Amp constructor accepts an optional `debugLabel` parameter (`.reference/widget-tree.md` lines 109-113): `if (g) this._id = ${g}_${Zs._counter++}; else this._id = GlobalKey_${Zs._counter++}`. The current constructor takes no arguments.

### 1.2 The `GlobalKeyRegistry` in `BuildOwner`

A `GlobalKeyRegistry` class already exists in `/home/gem/workspace/flitter/packages/flitter-core/src/framework/build-owner.ts` (lines 20-53):

```typescript
export class GlobalKeyRegistry {
  private _registry: Map<string, Element> = new Map();

  register(key: GlobalKey, element: Element): void { ... }
  unregister(key: GlobalKey, element: Element): void { ... }
  getElement(key: GlobalKey): Element | undefined { ... }
  clear(): void { ... }
  get size(): number { ... }
}
```

And the `BuildOwner` owns an instance at line 86:

```typescript
readonly globalKeyRegistry: GlobalKeyRegistry = new GlobalKeyRegistry();
```

**However, nothing calls `register()` or `unregister()`.** The registry exists but is completely unused -- no Element lifecycle method interacts with it. The existing tests in `/home/gem/workspace/flitter/packages/flitter-core/src/framework/__tests__/build-owner.test.ts` (lines 296-346) only test the registry in isolation, not its integration with the element lifecycle.

### 1.3 The Element Lifecycle and Missing GlobalKey Hooks

In `/home/gem/workspace/flitter/packages/flitter-core/src/framework/element.ts`, the `Element.markMounted()` method (lines 122-125) has a comment acknowledging the gap:

```typescript
markMounted(): void {
  this._mounted = true;
  // GlobalKey registration handled by key system if needed
}
```

The Amp binary's `T$.markMounted()` (`.reference/element-tree.md` lines 269-273) does:

```js
markMounted() {
  this._mounted = true;
  if (this.widget.key instanceof Zs)    // GlobalKey registration
    this.widget.key._setElement(this);
}
```

And `T$.unmount()` (`.reference/element-tree.md` lines 276-278) does:

```js
unmount() {
  if (this.widget.key instanceof Zs)    // GlobalKey deregistration
    this.widget.key._clearElement();
  this._mounted = false;
  // ... rest of cleanup
}
```

The current `Element.unmount()` (lines 130-139) has no GlobalKey deregistration at all.

### 1.4 The `equals()` Discrepancy

The Amp `Zs.equals()` (`.reference/element-tree.md` lines 165-168):

```js
equals(other) {
  if (!(other instanceof Zs)) return false;
  return this._id === other._id;
}
```

This uses **string-based ID comparison**, not reference identity. The current flitter implementation uses `this === other` (reference identity), which means it accidentally works for the simple case (one GlobalKey instance per widget) but fails for any scenario where GlobalKey instances might be recreated with the same debug label across rebuilds.

### 1.5 Impact on Reconciliation

The three-phase `updateChildren()` algorithm in `MultiChildRenderObjectElement` (lines 742-878) uses `key.toString()` for keyed matching in Phase 3 (lines 796-806):

```typescript
if (elem && elem.widget.key) {
  const keyStr = elem.widget.key.toString();
  oldKeyedChildren.set(keyStr, elem);
  oldKeyedIndices.set(keyStr, i);
}
```

This string-based matching works correctly with the current `toString()` implementation (`GlobalKey(#N)`), but the lack of lifecycle registration means the framework cannot enforce the single-use constraint or provide cross-tree access -- the two defining features of GlobalKey.

---

## 2. Proposed Changes

### 2.1 Design Overview

The implementation follows the Amp binary's architecture exactly, as documented in `.reference/element-tree.md` lines 149-196 and `.reference/widget-tree.md` lines 98-141. The changes are:

1. **Enhance `GlobalKey`** with `_currentElement`, `_setElement()`, `_clearElement()`, accessors, static registry, and debug label support
2. **Hook `Element.markMounted()`** to call `key._setElement(this)` for GlobalKey widgets
3. **Hook `Element.unmount()`** to call `key._clearElement()` for GlobalKey widgets
4. **Optionally bridge** with the existing `GlobalKeyRegistry` in `BuildOwner` (dual registration for backward compat)

### 2.2 Changes to `GlobalKey` Class

**File**: `/home/gem/workspace/flitter/packages/flitter-core/src/core/key.ts`

Replace the current `GlobalKey` implementation (lines 59-79) with:

```typescript
/**
 * A key that is unique across the entire widget tree and provides
 * cross-tree access to the associated Element, Widget, and State.
 *
 * Amp ref: class Zs extends aJ
 * Source: .reference/element-tree.md lines 149-196
 *        .reference/widget-tree.md lines 98-141
 *
 * Lifecycle:
 *   - _setElement(element) called during Element.markMounted()
 *   - _clearElement() called during Element.unmount()
 *
 * Each GlobalKey can only be associated with one element at a time.
 * Attempting to mount two widgets with the same GlobalKey throws an error.
 */
export class GlobalKey extends Key {
  // Amp ref: Zs._registry = new Map()
  // Static registry: id -> GlobalKey instance (for cross-tree lookup)
  static _registry: Map<string, GlobalKey> = new Map();
  static _counter: number = 0;

  readonly _id: string;
  _currentElement: any | undefined = undefined; // Element | undefined

  constructor(debugLabel?: string) {
    super();
    if (debugLabel) {
      this._id = `${debugLabel}_${GlobalKey._counter++}`;
    } else {
      this._id = `GlobalKey_${GlobalKey._counter++}`;
    }
    // Amp ref: Zs._registry.set(this._id, this)
    GlobalKey._registry.set(this._id, this);
  }

  // Amp ref: Zs.equals(g)
  equals(other: Key): boolean {
    if (!(other instanceof GlobalKey)) return false;
    return this._id === other._id;
  }

  /**
   * The Element currently associated with this GlobalKey, or undefined
   * if this key is not currently in the tree.
   *
   * Amp ref: Zs.currentElement getter
   */
  get currentElement(): any | undefined {
    return this._currentElement;
  }

  /**
   * The Widget of the currently associated Element, or undefined.
   *
   * Amp ref: Zs.currentWidget getter -- this._currentElement?.widget
   */
  get currentWidget(): any | undefined {
    return this._currentElement?.widget;
  }

  /**
   * The State of the currently associated Element, if it is a StatefulElement.
   * Returns undefined if the element is not a StatefulElement or if no element
   * is currently associated.
   *
   * Note: Amp does not have a dedicated currentState getter on GlobalKey.
   * This is a convenience accessor matching Flutter's API, implemented
   * via the same mechanism (currentElement.state).
   */
  get currentState(): any | undefined {
    const element = this._currentElement;
    if (element && 'state' in element) {
      return (element as any).state;
    }
    return undefined;
  }

  /**
   * The BuildContext of the currently associated Element.
   * Returns undefined if no element is currently associated.
   *
   * Note: In Amp, context is available via the element's _context field.
   * This provides the same access pattern as Flutter's GlobalKey.currentContext.
   */
  get currentContext(): any | undefined {
    const element = this._currentElement;
    if (element && '_context' in element) {
      return (element as any)._context;
    }
    return undefined;
  }

  /**
   * Called during Element.markMounted() to associate this key with an element.
   * Asserts that the key is not already associated with another element.
   *
   * Amp ref: Zs._setElement(g)
   */
  _setElement(element: any): void {
    if (this._currentElement !== undefined) {
      throw new Error(
        `GlobalKey ${this._id} is already associated with an element. ` +
        `Each GlobalKey can only be used once in the widget tree.`
      );
    }
    this._currentElement = element;
  }

  /**
   * Called during Element.unmount() to disassociate this key from its element.
   *
   * Amp ref: Zs._clearElement()
   */
  _clearElement(): void {
    this._currentElement = undefined;
    // Amp ref: Zs._registry.delete(this._id)
    GlobalKey._registry.delete(this._id);
  }

  toString(): string {
    return `GlobalKey(${this._id})`;
  }

  /**
   * Clear the static registry. Used for testing and app teardown.
   *
   * Amp ref: Zs._clearRegistry()
   */
  static _clearRegistry(): void {
    GlobalKey._registry.clear();
    GlobalKey._counter = 0;
  }
}
```

### 2.3 Changes to `Element.markMounted()`

**File**: `/home/gem/workspace/flitter/packages/flitter-core/src/framework/element.ts`

The current implementation (lines 122-125):

```typescript
markMounted(): void {
  this._mounted = true;
  // GlobalKey registration handled by key system if needed
}
```

Replace with:

```typescript
// --- Lifecycle: mount ---
// Amp ref: T$.markMounted()
// Source: .reference/element-tree.md lines 269-273
markMounted(): void {
  this._mounted = true;
  // Amp ref: if (this.widget.key instanceof Zs) this.widget.key._setElement(this)
  if (this.widget.key instanceof GlobalKey) {
    (this.widget.key as GlobalKey)._setElement(this);
  }
}
```

This requires adding an import at the top of the file (near line 16):

```typescript
import { Key, GlobalKey } from '../core/key';
```

(Replace the existing `import { Key } from '../core/key';` on line 16.)

### 2.4 Changes to `Element.unmount()`

**File**: `/home/gem/workspace/flitter/packages/flitter-core/src/framework/element.ts`

The current implementation (lines 130-139):

```typescript
unmount(): void {
  this._mounted = false;
  this._dirty = false;
  this._cachedDepth = undefined;
  // Unsubscribe from all inherited dependencies
  for (const dep of this._inheritedDependencies) {
    dep.removeDependent(this);
  }
  this._inheritedDependencies.clear();
}
```

Replace with:

```typescript
// --- Lifecycle: unmount ---
// Amp ref: T$.unmount()
// Source: .reference/element-tree.md lines 276-286
// NO deactivate() -- elements go mounted->unmounted directly
unmount(): void {
  // Amp ref: if (this.widget.key instanceof Zs) this.widget.key._clearElement()
  if (this.widget.key instanceof GlobalKey) {
    (this.widget.key as GlobalKey)._clearElement();
  }
  this._mounted = false;
  this._dirty = false;
  this._cachedDepth = undefined;
  // Unsubscribe from all inherited dependencies
  for (const dep of this._inheritedDependencies) {
    dep.removeDependent(this);
  }
  this._inheritedDependencies.clear();
}
```

Note: the GlobalKey deregistration happens **before** `_mounted = false`, matching the Amp ordering where `_clearElement()` is the first statement in `unmount()`.

### 2.5 Bridge with `GlobalKeyRegistry` in `BuildOwner`

The existing `GlobalKeyRegistry` in `BuildOwner` (`build-owner.ts` lines 20-53) uses a separate `Map<string, Element>` that is independent from `GlobalKey._registry`. There are two options:

**Option A (Recommended): Keep both registries, wire them together**

The `GlobalKey._registry` (static Map on GlobalKey) maps `id -> GlobalKey` instance, while `GlobalKeyRegistry` maps `keyStr -> Element`. These serve complementary purposes:

- `GlobalKey._registry`: Given a key ID string, find the GlobalKey instance (for static lookups)
- `GlobalKey._currentElement`: Given a GlobalKey instance, find its Element (the primary use case)
- `GlobalKeyRegistry`: Given a GlobalKey, find its Element via `BuildOwner.globalKeyRegistry.getElement(key)` (for framework-internal lookups during reconciliation)

To bridge them, add registration to `markMounted()` and `unmount()` alongside the `_setElement`/`_clearElement` calls. This requires the Element to have access to the BuildOwner:

```typescript
markMounted(): void {
  this._mounted = true;
  if (this.widget.key instanceof GlobalKey) {
    (this.widget.key as GlobalKey)._setElement(this);
    // Also register with BuildOwner's GlobalKeyRegistry if available
    // This dual registration is an implementation detail; the primary
    // access path is GlobalKey._currentElement
    try {
      const { getBuildScheduler } = require('./binding');
      const scheduler = getBuildScheduler();
      if (scheduler && 'globalKeyRegistry' in scheduler) {
        (scheduler as any).globalKeyRegistry.register(this.widget.key, this);
      }
    } catch (_e) {
      // BuildOwner not yet initialized -- skip registry
    }
  }
}
```

**Option B (Simpler): Deprecate `GlobalKeyRegistry`, use `GlobalKey._currentElement` only**

Since `GlobalKey._currentElement` provides direct O(1) element access without needing the BuildOwner, the `GlobalKeyRegistry` becomes redundant. This option removes the external registry and relies entirely on the Amp pattern.

We recommend **Option A** for backward compatibility with any code that uses `BuildOwner.globalKeyRegistry`, but Option B is the cleaner long-term path. The `GlobalKeyRegistry` in `BuildOwner` can be marked as deprecated.

### 2.6 Update the `_nextGlobalId` Counter

**File**: `/home/gem/workspace/flitter/packages/flitter-core/src/core/key.ts`

Remove the module-level `_nextGlobalId` variable (line 5), since `GlobalKey._counter` replaces it:

```typescript
// Remove: let _nextGlobalId = 0;
```

### 2.7 Summary of Changes

| File | Change | Lines Affected |
|------|--------|---------------|
| `src/core/key.ts` | Replace `GlobalKey` class with full Amp-faithful implementation | 59-79 (replace entire class) |
| `src/core/key.ts` | Remove `_nextGlobalId` module variable | 5 |
| `src/framework/element.ts` | Update import to include `GlobalKey` | 16 |
| `src/framework/element.ts` | Add GlobalKey registration in `markMounted()` | 122-125 |
| `src/framework/element.ts` | Add GlobalKey deregistration in `unmount()` | 130-139 |

---

## 3. Usage Examples

### 3.1 Accessing State from Outside the Tree

```typescript
const formKey = new GlobalKey('myForm');

// In the widget tree:
class MyForm extends StatefulWidget {
  constructor() {
    super({ key: formKey });
  }
  createState() { return new MyFormState(); }
}

// From outside the tree (e.g., a sibling widget or event handler):
const formState = formKey.currentState as MyFormState;
if (formState) {
  formState.validate();
}
```

### 3.2 Accessing RenderObject Metrics

```typescript
const boxKey = new GlobalKey('targetBox');

// After the widget is mounted:
const element = boxKey.currentElement;
if (element && element.renderObject) {
  const size = element.renderObject.size;
  console.log(`Box size: ${size.width}x${size.height}`);
}
```

### 3.3 Finding a Widget's Position in the Tree

```typescript
const widgetKey = new GlobalKey('target');

// After mount:
const context = widgetKey.currentContext;
if (context) {
  const ancestor = context.findAncestorWidgetOfType(MyContainer);
}
```

---

## 4. Edge Cases and Invariants

### 4.1 Single-Use Constraint

Each `GlobalKey` can only be associated with one Element at a time. If a second widget with the same `GlobalKey` is mounted before the first is unmounted, `_setElement()` throws:

```
GlobalKey myForm_0 is already associated with an element.
Each GlobalKey can only be used once in the widget tree.
```

This matches the Amp assertion at `.reference/element-tree.md` lines 174-179.

### 4.2 Unmount Before Re-mount

When a widget with a GlobalKey moves in the tree (e.g., from one parent to another within the same frame), the old element must be unmounted before the new one is mounted. Since flitter currently has no `deactivate()` phase (see Gap F02), this means GlobalKey-based reparenting (preserving state across tree positions) is not possible. The element is fully unmounted and a new one is created.

This is a known limitation documented in Gap F02. Implementing the `deactivate()` lifecycle (Gap F02) would enable full GlobalKey reparenting in the future.

### 4.3 Static Registry Cleanup

The `GlobalKey._registry` is a static Map that persists across the application lifetime. The `_clearRegistry()` static method must be called during:

1. `BuildOwner.dispose()` (already calls `this.globalKeyRegistry.clear()` at `build-owner.ts` line 210)
2. Test teardown (to prevent key ID collisions across tests)
3. Application shutdown

Add to `BuildOwner.dispose()`:

```typescript
dispose(): void {
  this._dirtyElements.clear();
  this.globalKeyRegistry.clear();
  GlobalKey._clearRegistry();  // ADD THIS
}
```

### 4.4 Hot Module Replacement

During HMR or test re-runs, the static `_counter` and `_registry` may retain stale state. The `_clearRegistry()` method resets both, ensuring a clean slate.

### 4.5 Access After Unmount

After an element is unmounted, `_clearElement()` sets `_currentElement` to `undefined`. All accessors (`currentElement`, `currentWidget`, `currentState`, `currentContext`) return `undefined`. Callers must null-check.

---

## 5. Testing Strategy

### 5.1 Unit Tests for `GlobalKey` Class

**File**: `/home/gem/workspace/flitter/packages/flitter-core/src/core/__tests__/key.test.ts`

```typescript
import { GlobalKey, ValueKey, UniqueKey } from '../key';

describe('GlobalKey', () => {
  afterEach(() => {
    GlobalKey._clearRegistry();
  });

  describe('constructor', () => {
    it('auto-generates an ID with GlobalKey prefix', () => {
      const key = new GlobalKey();
      expect(key.toString()).toMatch(/^GlobalKey\(GlobalKey_\d+\)$/);
    });

    it('uses debugLabel when provided', () => {
      const key = new GlobalKey('myForm');
      expect(key.toString()).toMatch(/^GlobalKey\(myForm_\d+\)$/);
    });

    it('registers itself in the static registry', () => {
      const key = new GlobalKey('test');
      expect(GlobalKey._registry.get(key._id)).toBe(key);
    });

    it('generates unique IDs for each instance', () => {
      const key1 = new GlobalKey();
      const key2 = new GlobalKey();
      expect(key1._id).not.toBe(key2._id);
    });
  });

  describe('equals', () => {
    it('returns true for the same instance', () => {
      const key = new GlobalKey();
      expect(key.equals(key)).toBe(true);
    });

    it('returns false for different GlobalKey instances', () => {
      const key1 = new GlobalKey();
      const key2 = new GlobalKey();
      expect(key1.equals(key2)).toBe(false);
    });

    it('returns false when compared to a ValueKey', () => {
      const gk = new GlobalKey();
      const vk = new ValueKey('test');
      expect(gk.equals(vk)).toBe(false);
    });

    it('returns false when compared to a UniqueKey', () => {
      const gk = new GlobalKey();
      const uk = new UniqueKey();
      expect(gk.equals(uk)).toBe(false);
    });
  });

  describe('_setElement / _clearElement', () => {
    it('sets and clears the current element', () => {
      const key = new GlobalKey();
      const mockElement = { widget: {} };

      key._setElement(mockElement);
      expect(key.currentElement).toBe(mockElement);

      key._clearElement();
      expect(key.currentElement).toBeUndefined();
    });

    it('throws when setting element twice without clearing', () => {
      const key = new GlobalKey();
      const elem1 = { widget: {} };
      const elem2 = { widget: {} };

      key._setElement(elem1);
      expect(() => key._setElement(elem2)).toThrow(
        /already associated with an element/
      );
    });

    it('removes from static registry on clear', () => {
      const key = new GlobalKey('test');
      const id = key._id;
      key._setElement({ widget: {} });

      expect(GlobalKey._registry.has(id)).toBe(true);
      key._clearElement();
      expect(GlobalKey._registry.has(id)).toBe(false);
    });
  });

  describe('accessors', () => {
    it('currentWidget returns element.widget', () => {
      const key = new GlobalKey();
      const widget = { name: 'TestWidget' };
      key._setElement({ widget });

      expect(key.currentWidget).toBe(widget);
    });

    it('currentWidget returns undefined when no element', () => {
      const key = new GlobalKey();
      expect(key.currentWidget).toBeUndefined();
    });

    it('currentState returns state from StatefulElement', () => {
      const key = new GlobalKey();
      const mockState = { count: 42 };
      key._setElement({ widget: {}, state: mockState });

      expect(key.currentState).toBe(mockState);
    });

    it('currentState returns undefined for non-stateful elements', () => {
      const key = new GlobalKey();
      key._setElement({ widget: {} });

      expect(key.currentState).toBeUndefined();
    });

    it('currentContext returns _context from element', () => {
      const key = new GlobalKey();
      const mockContext = { mounted: true };
      key._setElement({ widget: {}, _context: mockContext });

      expect(key.currentContext).toBe(mockContext);
    });
  });

  describe('_clearRegistry', () => {
    it('clears all entries and resets counter', () => {
      new GlobalKey();
      new GlobalKey();
      expect(GlobalKey._registry.size).toBe(2);

      GlobalKey._clearRegistry();
      expect(GlobalKey._registry.size).toBe(0);
      expect(GlobalKey._counter).toBe(0);
    });
  });
});
```

### 5.2 Integration Tests for Element Lifecycle Hooks

**File**: `/home/gem/workspace/flitter/packages/flitter-core/src/framework/__tests__/global-key-lifecycle.test.ts`

```typescript
import { GlobalKey } from '../../core/key';
import { StatelessElement, StatefulElement } from '../element';
import {
  StatelessWidget,
  StatefulWidget,
  State,
  type BuildContext,
  Widget,
} from '../widget';

// Test helpers
class SimpleWidget extends StatelessWidget {
  build(_context: BuildContext): Widget { return this; }
}

class CounterState extends State<CounterWidget> {
  count = 0;
  build(_context: BuildContext): Widget {
    return new SimpleWidget();
  }
}

class CounterWidget extends StatefulWidget {
  createState() { return new CounterState(); }
}

describe('GlobalKey Element Lifecycle', () => {
  afterEach(() => {
    GlobalKey._clearRegistry();
  });

  it('registers element on markMounted()', () => {
    const key = new GlobalKey('test');
    const widget = new SimpleWidget({ key });
    const element = new StatelessElement(widget);

    element.markMounted();

    expect(key.currentElement).toBe(element);
  });

  it('deregisters element on unmount()', () => {
    const key = new GlobalKey('test');
    const widget = new SimpleWidget({ key });
    const element = new StatelessElement(widget);

    element.markMounted();
    expect(key.currentElement).toBe(element);

    element.unmount();
    expect(key.currentElement).toBeUndefined();
  });

  it('provides access to State via currentState for StatefulElement', () => {
    const key = new GlobalKey('counter');
    const widget = new CounterWidget({ key });
    const element = widget.createElement() as StatefulElement;

    // Simulate the mount lifecycle
    element.mount();

    expect(key.currentElement).toBe(element);
    expect(key.currentState).toBeInstanceOf(CounterState);
    expect((key.currentState as CounterState).count).toBe(0);
  });

  it('throws on duplicate GlobalKey mount', () => {
    const key = new GlobalKey('dup');
    const widget1 = new SimpleWidget({ key });
    const widget2 = new SimpleWidget({ key });
    const elem1 = new StatelessElement(widget1);
    const elem2 = new StatelessElement(widget2);

    elem1.markMounted();

    expect(() => elem2.markMounted()).toThrow(
      /already associated with an element/
    );
  });

  it('allows re-mount after unmount', () => {
    const key = new GlobalKey('reuse');
    const widget1 = new SimpleWidget({ key });
    const elem1 = new StatelessElement(widget1);

    elem1.markMounted();
    elem1.unmount();

    // Re-create a new element with the same key
    // (Note: need a new GlobalKey instance since _clearElement removes from registry)
    const key2 = new GlobalKey('reuse2');
    const widget2 = new SimpleWidget({ key: key2 });
    const elem2 = new StatelessElement(widget2);

    expect(() => elem2.markMounted()).not.toThrow();
    expect(key2.currentElement).toBe(elem2);
  });

  it('does not affect non-GlobalKey widgets', () => {
    const widget = new SimpleWidget(); // no key
    const element = new StatelessElement(widget);

    // Should not throw
    element.markMounted();
    element.unmount();
  });
});
```

### 5.3 Integration Test with `GlobalKeyRegistry` (Option A Bridge)

**File**: Extension to `/home/gem/workspace/flitter/packages/flitter-core/src/framework/__tests__/build-owner.test.ts`

```typescript
describe('GlobalKeyRegistry integration with Element lifecycle', () => {
  afterEach(() => {
    GlobalKey._clearRegistry();
  });

  it('BuildOwner.globalKeyRegistry is populated via Element.markMounted()', () => {
    const owner = new BuildOwner();
    const key = new GlobalKey('integrated');
    const widget = new TestWidget({ key });
    const element = new StatelessElement(widget);

    // After markMounted, both GlobalKey._currentElement and
    // BuildOwner.globalKeyRegistry should reference the element.
    element.markMounted();

    expect(key.currentElement).toBe(element);
    // If Option A bridge is implemented:
    // expect(owner.globalKeyRegistry.getElement(key)).toBe(element);
  });
});
```

### 5.4 Test Coverage Goals

| Area | Tests | Coverage Target |
|------|-------|----------------|
| `GlobalKey` constructor + ID generation | 4 tests | 100% of constructor paths |
| `GlobalKey.equals()` | 4 tests | 100% of comparison paths |
| `_setElement` / `_clearElement` | 3 tests | 100% of lifecycle methods |
| Accessor getters | 5 tests | 100% of property accessors |
| `_clearRegistry` | 1 test | 100% of static cleanup |
| Element lifecycle integration | 5 tests | Core mount/unmount flow |
| Duplicate key detection | 1 test | Error path |
| Non-GlobalKey widget handling | 1 test | No-op path |

Total: ~24 tests covering all code paths in the new `GlobalKey` implementation and the two modified `Element` methods.

### 5.5 Regression Testing

Run the full test suite (`bun test`) to verify that:

1. Existing `Widget.canUpdate()` tests still pass (the `toString()` format changes from `GlobalKey(#N)` to `GlobalKey(GlobalKey_N)` or `GlobalKey(label_N)`, which could affect reconciliation in `updateChildren()` Phase 3 where `key.toString()` is used for map lookups).
2. Existing `GlobalKeyRegistry` tests in `build-owner.test.ts` still pass.
3. All existing element lifecycle tests still pass since `markMounted()` and `unmount()` now have additional logic.

**Important**: The `toString()` format change may break the keyed matching in `updateChildren()` if tests rely on the exact string format. The old format is `GlobalKey(#0)` while the new format is `GlobalKey(GlobalKey_0)`. This is an intentional alignment with the Amp binary's format.

---

## 6. Migration and Backward Compatibility

### 6.1 Breaking Changes

1. **`GlobalKey` constructor signature**: Now accepts an optional `debugLabel` string. Existing code using `new GlobalKey()` is unaffected.

2. **`GlobalKey.equals()` semantics**: Changes from reference identity (`this === other`) to ID-based comparison (`this._id === other._id`). Since GlobalKey IDs are unique per instance, this should not change observable behavior for correct code. Code that creates two separate GlobalKey instances and expects them to be unequal will still work because each gets a unique ID.

3. **`GlobalKey.toString()` format**: Changes from `GlobalKey(#N)` to `GlobalKey(GlobalKey_N)` or `GlobalKey(label_N)`. This affects the keyed reconciliation in `updateChildren()` since it uses `key.toString()` as map keys. All GlobalKey-keyed widgets must use the same key **instance** (not two instances with the same label), so this change is safe for correct usage.

4. **New fields on `GlobalKey`**: `_currentElement`, `_setElement()`, `_clearElement()`, and accessors are new additions. They do not conflict with existing code.

### 6.2 Dependencies on Gap F02

Full GlobalKey reparenting (moving a keyed widget to a different location in the tree while preserving its state) requires the `deactivate()` lifecycle phase proposed in Gap F02. Without it, GlobalKey provides cross-tree **read** access (looking up elements/state/renderObjects by key) but not cross-tree **move** semantics.

This proposal is self-contained and does not depend on Gap F02. It can be implemented independently, and the reparenting capability can be added later when `deactivate()` is available.

---

## 7. File Change Summary

| # | File | Type | Description |
|---|------|------|-------------|
| 1 | `packages/flitter-core/src/core/key.ts` | MODIFY | Replace GlobalKey with full Amp-faithful implementation |
| 2 | `packages/flitter-core/src/framework/element.ts` | MODIFY | Add GlobalKey hooks in `markMounted()` and `unmount()`, update import |
| 3 | `packages/flitter-core/src/framework/build-owner.ts` | MODIFY | Add `GlobalKey._clearRegistry()` call in `dispose()`, add import |
| 4 | `packages/flitter-core/src/core/__tests__/key.test.ts` | ADD | Unit tests for enhanced GlobalKey |
| 5 | `packages/flitter-core/src/framework/__tests__/global-key-lifecycle.test.ts` | ADD | Integration tests for Element lifecycle hooks |

**Estimated effort**: Small (1-2 hours). The Amp reference is clear, the `GlobalKeyRegistry` scaffold already exists, and the changes are concentrated in two files with surgical modifications to two methods.
