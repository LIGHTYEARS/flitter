# Gap F07: Add `_inheritedWidgets` Hash Map for O(1) Inherited Lookup

## Status: Proposal
## Affected packages: `flitter-core`

---

## 1. Current Behavior Analysis

### 1.1 The `dependOnInheritedWidgetOfExactType` Method Today

In `/home/gem/workspace/flitter/packages/flitter-core/src/framework/element.ts`, the `Element` base class (line 38) provides `dependOnInheritedWidgetOfExactType()` at lines 164-177:

```typescript
// element.ts lines 164-177
dependOnInheritedWidgetOfExactType(widgetType: Function): InheritedElement | null {
    let ancestor = this.parent;
    while (ancestor) {
        if (ancestor.widget.constructor === widgetType) {
            if (ancestor instanceof InheritedElement) {
                ancestor.addDependent(this);
                this._inheritedDependencies.add(ancestor);
            }
            return ancestor as InheritedElement;
        }
        ancestor = ancestor.parent;
    }
    return null;
}
```

This method performs a **linear walk** up the parent chain from the calling element until it finds an ancestor whose widget constructor matches `widgetType`. Every call traverses O(d) elements, where d is the depth of the calling element in the tree.

### 1.2 Where This Method Is Called

The primary call site is `BuildContextImpl.dependOnInheritedWidgetOfExactType()` at line 1010-1012 of element.ts:

```typescript
// element.ts lines 1010-1012
dependOnInheritedWidgetOfExactType(widgetType: Function): InheritedElement | null {
    return this.element.dependOnInheritedWidgetOfExactType(widgetType);
}
```

This is invoked from widget `build()` methods whenever a widget needs to access inherited data. Common patterns include:

- `context.dependOnInheritedWidgetOfExactType(MediaQuery)` (line 973 of element.ts, inside `BuildContextImpl.mediaQuery` getter)
- Theme lookups: `context.dependOnInheritedWidgetOfExactType(ThemeData)`
- Any custom `InheritedWidget.of(context)` static method

### 1.3 The Amp Reference Behavior

The Amp reverse-engineered reference at `/home/gem/workspace/flitter/packages/flitter-core/.reference/element-tree.md` (lines 295-307) shows the identical O(d) walk:

```js
// Amp ref: T$.dependOnInheritedWidgetOfExactType(widgetType)
dependOnInheritedWidgetOfExactType(widgetType) {
    let ancestor = this.parent;
    while (ancestor) {
        if (ancestor.widget.constructor === widgetType) {
            if ("addDependent" in ancestor && "removeDependent" in ancestor) {
                ancestor.addDependent(this);
                this._inheritedDependencies.add(ancestor);
            }
            return ancestor;
        }
        ancestor = ancestor.parent;
    }
    return null;
}
```

The current flitter-core implementation faithfully reproduces this Amp pattern. **Amp does not have an `_inheritedWidgets` hash map.**

### 1.4 How Flutter Solves This

In Flutter's production framework (`packages/flutter/lib/src/widgets/framework.dart`), each `Element` maintains:

```dart
// Flutter's Element class
PersistentHashMap<Type, InheritedElement>? _inheritedWidgets;
```

This is a `Map<Type, InheritedElement>` that maps each `InheritedWidget` subclass type to the nearest ancestor `InheritedElement` of that type. The map is:

1. **Inherited from parent during mount**: When an element mounts, it copies its parent's `_inheritedWidgets` reference.
2. **Extended by InheritedElement**: When an `InheritedElement` mounts, it copies the parent map and adds itself under its widget type key.
3. **Looked up in O(1)**: `dependOnInheritedWidgetOfExactType(T)` simply does `_inheritedWidgets[T]` -- a hash map lookup.

This transforms the O(d) ancestor walk into an O(1) hash map lookup for every `dependOnInheritedWidgetOfExactType` call.

### 1.5 The Problem

The current O(d) linear walk is problematic in several scenarios:

1. **Deep widget trees**: A TUI application with nested containers, scrollable regions, padding, and flex layouts can easily reach depths of 30-50+ elements. Each `build()` method that accesses an inherited widget pays this O(d) cost.

2. **Multiple inherited lookups per build**: A single widget's `build()` method may look up multiple inherited widgets (theme, media query, locale, directionality). Each is an independent O(d) walk. If a widget at depth 40 looks up 3 inherited widgets, that is 120 parent pointer traversals per rebuild.

3. **Rebuild cascades**: When an `InheritedWidget` changes, all dependents rebuild. If 20 widgets depend on the same inherited widget, each performing 2 inherited lookups in their `build()` method at an average depth of 30, that is 20 * 2 * 30 = 1,200 parent pointer traversals in a single frame. With an `_inheritedWidgets` map, this drops to 20 * 2 = 40 hash lookups.

4. **The `BuildContextImpl.mediaQuery` getter** (lines 970-982) is a particularly hot path because `MediaQuery` data is accessed by many layout widgets. Every access walks the entire ancestor chain.

### 1.6 Relevant Data Structures on Element

The `Element` base class (lines 38-206) currently has these fields:

| Field | Line | Type | Purpose |
|-------|------|------|---------|
| `widget` | 39 | `Widget` | Current widget configuration |
| `parent` | 40 | `Element \| undefined` | Parent element (for ancestor walks) |
| `_children` | 41 | `Element[]` | Child elements |
| `_inheritedDependencies` | 42 | `Set<InheritedElement>` | InheritedElements this element depends on |
| `_dirty` | 43 | `boolean` | Dirty flag for rebuild scheduling |
| `_cachedDepth` | 44 | `number \| undefined` | Lazy-computed depth cache |
| `_mounted` | 45 | `boolean` | Lifecycle flag |

There is no `_inheritedWidgets` map. The `_inheritedDependencies` set (line 42) tracks which inherited elements the *current* element has registered as a dependent of (for cleanup during unmount, lines 135-138), but it does not serve as a lookup cache.

---

## 2. Proposed Changes

### 2.1 Design Overview

Add a `_inheritedWidgets` map to `Element` that provides O(1) lookup of the nearest ancestor `InheritedElement` for any given widget type. The map is:

- **Propagated top-down**: Each element receives its parent's map reference during `addChild()`.
- **Extended by InheritedElement**: When an `InheritedElement` is added to the tree, it creates a new map (shallow copy of parent's map + itself).
- **Used for lookup**: `dependOnInheritedWidgetOfExactType()` consults the map instead of walking the parent chain.

This matches Flutter's design exactly.

### 2.2 Changes to `Element` Base Class

**File**: `/home/gem/workspace/flitter/packages/flitter-core/src/framework/element.ts`

#### 2.2.1 Add `_inheritedWidgets` field

After line 42, add the inherited widgets map:

```typescript
export class Element {
  widget: Widget;
  parent: Element | undefined = undefined;
  _children: Element[] = [];
  _inheritedDependencies: Set<InheritedElement> = new Set();
  _inheritedWidgets: Map<Function, InheritedElement> | null = null;  // NEW
  _dirty: boolean = false;
  _cachedDepth: number | undefined = undefined;
  _mounted: boolean = false;

  // ...
```

The type is `Map<Function, InheritedElement> | null` where:
- `Function` is the widget constructor (e.g., `MediaQuery`, `ThemeData`), used as the map key.
- `InheritedElement` is the nearest ancestor `InheritedElement` for that type.
- `null` is the initial state before the element is mounted into the tree.

#### 2.2.2 Propagate the map in `addChild()`

Modify `addChild()` (lines 97-101) to propagate the inherited widgets map to the child:

```typescript
// element.ts -- modified addChild()
addChild(child: Element): void {
    child.parent = this;
    child._invalidateDepth();
    // Propagate inherited widgets map to child.
    // Non-InheritedElement children share their parent's map reference.
    // InheritedElement overrides _updateInheritedWidgets() to extend the map.
    child._updateInheritedWidgets(this._inheritedWidgets);
    this._children.push(child);
}
```

#### 2.2.3 Add `_updateInheritedWidgets()` method to Element

This method receives the parent's map and stores it. Non-inherited elements simply adopt the parent's map reference (no copy needed):

```typescript
// element.ts -- new method on Element base class
/**
 * Receive the inherited widgets map from the parent.
 * Base implementation shares the parent's map reference directly.
 * InheritedElement overrides to extend the map with itself.
 *
 * Extension: _inheritedWidgets map for O(1) inherited lookup.
 * Not present in Amp (T$ class). See .gap/07-inherited-widget-map.md
 */
_updateInheritedWidgets(parentMap: Map<Function, InheritedElement> | null): void {
    this._inheritedWidgets = parentMap;
}
```

#### 2.2.4 Rewrite `dependOnInheritedWidgetOfExactType()` for O(1) lookup

Replace lines 164-177 with:

```typescript
// element.ts -- rewritten dependOnInheritedWidgetOfExactType()
// Amp ref: T$.dependOnInheritedWidgetOfExactType(widgetType)
// Extension: Uses _inheritedWidgets map for O(1) lookup instead of O(d) parent walk.
// See .gap/07-inherited-widget-map.md
dependOnInheritedWidgetOfExactType(widgetType: Function): InheritedElement | null {
    const ancestor = this._inheritedWidgets?.get(widgetType) ?? null;
    if (ancestor !== null) {
        ancestor.addDependent(this);
        this._inheritedDependencies.add(ancestor);
        return ancestor;
    }
    return null;
}
```

This replaces the O(d) while loop with a single `Map.get()` call -- O(1) amortized.

#### 2.2.5 Clear the map on unmount

Modify `unmount()` (lines 130-139) to clear the map reference:

```typescript
// element.ts -- modified unmount()
unmount(): void {
    this._mounted = false;
    this._dirty = false;
    this._cachedDepth = undefined;
    this._inheritedWidgets = null;  // NEW: release map reference
    // Unsubscribe from all inherited dependencies
    for (const dep of this._inheritedDependencies) {
        dep.removeDependent(this);
    }
    this._inheritedDependencies.clear();
}
```

### 2.3 Changes to `InheritedElement`

**File**: `/home/gem/workspace/flitter/packages/flitter-core/src/framework/element.ts`

#### 2.3.1 Override `_updateInheritedWidgets()` to extend the map

`InheritedElement` (lines 411-498) must override `_updateInheritedWidgets()` to add itself to the map under its widget's constructor type:

```typescript
// element.ts -- new override on InheritedElement
/**
 * Extend the inherited widgets map with this InheritedElement.
 * Creates a new Map that includes all entries from the parent map
 * plus this element keyed by its widget's constructor.
 *
 * Extension: _inheritedWidgets map for O(1) inherited lookup.
 * Not present in Amp (Z_0 class). See .gap/07-inherited-widget-map.md
 */
override _updateInheritedWidgets(
    parentMap: Map<Function, InheritedElement> | null
): void {
    const newMap = new Map(parentMap ?? undefined);
    newMap.set(this.widget.constructor, this);
    this._inheritedWidgets = newMap;
}
```

This creates a **new** `Map` instance for the `InheritedElement`, rather than sharing the parent's reference. All non-inherited descendants of this element will share this new map reference (via the base `_updateInheritedWidgets()`), ensuring they see this inherited element in their lookups. When there are multiple `InheritedElement` ancestors of different types, each creates a new map that includes all previously-registered inherited types plus itself.

#### 2.3.2 Propagate the map to child during mount

The `InheritedElement.mount()` method (lines 432-437) already calls `this.addChild(this._child)`, which (after the changes in 2.2.2) will call `_updateInheritedWidgets()` on the child. However, `this._inheritedWidgets` must be set on the `InheritedElement` **before** `addChild()` is called, because `addChild()` propagates `this._inheritedWidgets` to the child.

The flow is:
1. InheritedElement is created.
2. Its parent calls `addChild(inheritedElement)` -- this triggers `inheritedElement._updateInheritedWidgets(parent._inheritedWidgets)`, which creates the extended map.
3. InheritedElement.mount() calls `this.addChild(this._child)` -- this propagates the extended map to the child.

This ordering works correctly because `addChild()` on the parent happens before `mount()` on the child. Looking at the call sites:

- `StatelessElement.rebuild()` (line 284-285): `this.addChild(this._child)` then `this._mountChild(this._child)`
- `StatefulElement.rebuild()` (line 389-390): same pattern
- `InheritedElement.mount()` (line 434-435): same pattern
- `SingleChildRenderObjectElement.mount()` (line 585-586): same pattern
- `MultiChildRenderObjectElement.mount()` (line 697-698): same pattern

In all cases, `addChild()` is called before `mount()`, so the inherited widgets map will always be propagated before the child's `mount()` triggers its own child inflation. This is correct.

### 2.4 Changes to `removeChild()`

When a child is removed from the tree, its `_inheritedWidgets` reference should be cleared to avoid stale data. The existing `removeChild()` (lines 103-110) already sets `child.parent = undefined`. We add map cleanup:

```typescript
// element.ts -- modified removeChild()
removeChild(child: Element): void {
    const idx = this._children.indexOf(child);
    if (idx !== -1) {
        this._children.splice(idx, 1);
        child.parent = undefined;
        child._invalidateDepth();
        child._inheritedWidgets = null;  // NEW: clear stale map reference
    }
}
```

Similarly, `removeAllChildren()` (lines 112-118):

```typescript
// element.ts -- modified removeAllChildren()
removeAllChildren(): void {
    for (const child of this._children) {
        child.parent = undefined;
        child._invalidateDepth();
        child._inheritedWidgets = null;  // NEW
    }
    this._children.length = 0;
}
```

### 2.5 No Changes to `InheritedElement.update()`

When an `InheritedElement` is updated with a new widget (same type, canUpdate is true), the map does not need to be rebuilt. The map entry for this type still points to this same `InheritedElement` instance. The element's `widget` property is updated in place, and dependents are notified via `notifyDependents()`. The map remains valid.

### 2.6 Handling Element Reparenting

If an element is moved in the tree (removed from one parent and added to another), the `removeChild()` + `addChild()` sequence handles map propagation correctly:

1. `removeChild()` sets `_inheritedWidgets = null`
2. `addChild()` calls `_updateInheritedWidgets(newParent._inheritedWidgets)`, re-establishing the correct map

However, the element's **descendants** also need their maps updated if the set of available inherited widgets changed. This is handled naturally because a reparented element typically goes through unmount + mount, which rebuilds the entire subtree and re-propagates the map through `addChild()` calls during child inflation.

### 2.7 Complete Diff Summary

| File | Change | Lines Affected |
|------|--------|---------------|
| `element.ts` | Add `_inheritedWidgets` field to `Element` | After line 42 |
| `element.ts` | Add `_updateInheritedWidgets()` method to `Element` | After line 206 (or near lifecycle methods) |
| `element.ts` | Modify `addChild()` to propagate map | Lines 97-101 |
| `element.ts` | Modify `removeChild()` to clear map | Lines 103-110 |
| `element.ts` | Modify `removeAllChildren()` to clear map | Lines 112-118 |
| `element.ts` | Rewrite `dependOnInheritedWidgetOfExactType()` to use map | Lines 164-177 |
| `element.ts` | Modify `unmount()` to clear map | Lines 130-139 |
| `element.ts` | Override `_updateInheritedWidgets()` on `InheritedElement` | After line 498 (or within InheritedElement class) |

---

## 3. Performance Analysis

### 3.1 Lookup Complexity

| Operation | Before | After |
|-----------|--------|-------|
| `dependOnInheritedWidgetOfExactType()` | O(d) per call | O(1) per call |
| `addChild()` | O(1) | O(1) (map reference assignment) |
| `InheritedElement._updateInheritedWidgets()` | N/A | O(k) (copy parent map of k inherited types) |
| `removeChild()` | O(n) (indexOf) | O(n) (indexOf) + O(1) (null assignment) |
| `unmount()` | O(m) (clear dependencies) | O(m) + O(1) (null assignment) |

Where:
- **d** = depth of the element in the tree (typically 10-50 in a TUI app)
- **k** = number of distinct inherited widget types in the ancestor chain (typically 3-10: Theme, MediaQuery, Directionality, DefaultTextStyle, etc.)
- **n** = number of children in the parent
- **m** = number of inherited dependencies of the element

### 3.2 Memory Overhead

**Map instances**: Only `InheritedElement` nodes create new `Map` instances. All other elements share a reference to their nearest ancestor InheritedElement's map. In a typical tree:

- If there are **I** `InheritedElement` nodes, there are **I** `Map` instances.
- Each map contains at most **I** entries (one per distinct inherited widget type).
- In practice, I is small (3-10 for a typical TUI application).

**Per-element overhead**: Each `Element` gains one pointer-sized field (`_inheritedWidgets`). For a tree of N elements, this is N * 8 bytes (on a 64-bit system). For a TUI tree of 500 elements, this is approximately 4KB -- negligible.

**Map copy cost**: When an `InheritedElement` mounts, it copies the parent map. With k entries, this is O(k) per `InheritedElement` mount. Since I and k are both small, this is negligible compared to the savings from O(1) lookup.

### 3.3 Real-World Impact Estimate

Consider a typical flitter TUI application with:
- Tree depth: 40 elements
- 5 inherited widget types (Theme, MediaQuery, Locale, Directionality, FocusScope)
- 30 widgets that perform inherited lookups in their `build()` methods
- Average 2 inherited lookups per `build()` method
- A frame with 10 dirty widgets being rebuilt

**Before (O(d) walks)**:
- Each inherited lookup: average 20 parent traversals (inherited widgets near the root)
- Per frame: 10 widgets * 2 lookups * 20 traversals = **400 parent pointer dereferences**
- Per inherited widget change (e.g., MediaQuery on resize): 30 dependents * 2 lookups * 20 traversals = **1,200 parent pointer dereferences**

**After (O(1) map lookup)**:
- Each inherited lookup: 1 map get
- Per frame: 10 widgets * 2 lookups * 1 = **20 map lookups**
- Per inherited widget change: 30 dependents * 2 lookups * 1 = **60 map lookups**

This is a **20x reduction** in ancestor traversal operations during normal frames, and a **20x reduction** during inherited widget change cascades.

### 3.4 Map Construction Amortization

The cost of constructing the `Map` instances is paid once during mount, not during every `build()` call. In Flutter's architecture, widget trees are long-lived -- elements are created once and updated in place. The map is constructed during the initial mount pass and only reconstructed when elements are actually reparented (which is rare). This means the O(k) map copy cost per `InheritedElement` mount is amortized over potentially thousands of `build()` calls that benefit from O(1) lookup.

---

## 4. Correctness Invariants

The following invariants must hold at all times:

### Invariant 1: Map Consistency

For any mounted element `e`, `e._inheritedWidgets` must contain an entry `(T, ie)` if and only if `ie` is the nearest ancestor `InheritedElement` whose widget's constructor is `T`.

### Invariant 2: Map Sharing

For any non-`InheritedElement` element `e` with parent `p`, `e._inheritedWidgets === p._inheritedWidgets` (reference equality). They share the same map object.

### Invariant 3: InheritedElement Extension

For any `InheritedElement` `ie` with parent `p`, `ie._inheritedWidgets` is a new `Map` containing all entries from `p._inheritedWidgets` plus `(ie.widget.constructor, ie)`.

### Invariant 4: Null on Detach

For any unmounted or parentless element `e`, `e._inheritedWidgets === null`.

### Invariant 5: Lookup Equivalence

The result of the new O(1) `dependOnInheritedWidgetOfExactType(T)` must be identical to the result of the old O(d) ancestor walk for all inputs. The only behavioral difference is performance.

---

## 5. Fallback Behavior

If `_inheritedWidgets` is `null` (e.g., the element has not been added to a tree, or is at the root with no inherited ancestors), the `Map.get()` call will not be reached due to the `?.` optional chaining:

```typescript
const ancestor = this._inheritedWidgets?.get(widgetType) ?? null;
```

This returns `null`, which is the correct result -- there is no ancestor `InheritedElement` of this type.

For the root element of the tree, `_inheritedWidgets` will be `null` unless its parent explicitly sets a map. The root element should have an empty map or `null`. If the root's first child is an `InheritedElement`, it will create a new map from `null` via `new Map(undefined)`, which produces an empty map, then add itself. This is correct.

---

## 6. Amp Fidelity Deviation

This change is an **acknowledged extension** beyond the Amp reference implementation. The Amp binary (class `T$`) uses the O(d) parent walk approach, and the current flitter-core code faithfully reproduces that.

This optimization should be:

1. **Clearly annotated** in code:
   ```typescript
   // Extension: _inheritedWidgets map for O(1) inherited lookup.
   // Amp uses O(d) parent walk (T$.dependOnInheritedWidgetOfExactType).
   // Flutter uses Map<Type, InheritedElement> on each Element.
   // See .gap/07-inherited-widget-map.md
   ```

2. **Preserving semantic equivalence**: The external behavior (return values, dependency registration, notification) is identical. Only the internal lookup mechanism changes. No public API surface is modified.

3. **Gated behind approval**: The CLAUDE.md project instructions enforce strict Amp fidelity. This performance optimization should be explicitly approved as a justified deviation, since it matches Flutter's production implementation and provides significant performance benefits for deeper widget trees.

---

## 7. Testing Strategy

### 7.1 Unit Tests -- New Map Propagation

**File**: `/home/gem/workspace/flitter/packages/flitter-core/src/framework/__tests__/element.test.ts`

Add a new `describe('_inheritedWidgets map', ...)` block:

#### Test 1: Map is null before element is added to a tree

```typescript
test('_inheritedWidgets is null for unparented element', () => {
    const widget = new TestTerminalLeaf();
    const element = new LeafElement(widget);
    expect(element._inheritedWidgets).toBeNull();
});
```

#### Test 2: Map is propagated from parent to child via addChild

```typescript
test('child inherits parent _inheritedWidgets map reference via addChild', () => {
    const parent = new LeafElement(new TestTerminalLeaf());
    const child = new LeafElement(new TestTerminalLeaf());

    // Give parent a map (simulating it being in a tree)
    parent._inheritedWidgets = new Map();
    parent.addChild(child);

    expect(child._inheritedWidgets).toBe(parent._inheritedWidgets);
});
```

#### Test 3: InheritedElement creates a new extended map

```typescript
test('InheritedElement creates extended map with itself included', () => {
    const childWidget = new TestTerminalLeaf();
    const inherited = new TestInheritedWidget({ child: childWidget, value: 42 });
    const inheritedElement = inherited.createElement() as InheritedElement;

    // Simulate being added to a parent that has an empty map
    const parentMap = new Map<Function, InheritedElement>();
    inheritedElement._updateInheritedWidgets(parentMap);

    // InheritedElement should have a NEW map (not the parent's)
    expect(inheritedElement._inheritedWidgets).not.toBe(parentMap);
    // The new map should contain this InheritedElement
    expect(inheritedElement._inheritedWidgets!.get(TestInheritedWidget))
        .toBe(inheritedElement);
});
```

#### Test 4: Descendant of InheritedElement sees it in the map

```typescript
test('descendant element sees InheritedElement in its inherited map', () => {
    const leaf = new TestTerminalLeaf();
    const childWidget = new TestStatelessWidget({ build: () => leaf });
    const inherited = new TestInheritedWidget({ child: childWidget, value: 42 });
    const inheritedElement = inherited.createElement() as InheritedElement;

    // Set up a parent map for the InheritedElement
    inheritedElement._updateInheritedWidgets(new Map());
    inheritedElement.mount();

    // The child of the InheritedElement should share its map
    const child = inheritedElement.child!;
    expect(child._inheritedWidgets).toBe(inheritedElement._inheritedWidgets);
    expect(child._inheritedWidgets!.has(TestInheritedWidget)).toBe(true);
});
```

#### Test 5: Map is cleared on removeChild

```typescript
test('_inheritedWidgets is cleared when child is removed', () => {
    const parent = new LeafElement(new TestTerminalLeaf());
    const child = new LeafElement(new TestTerminalLeaf());
    parent._inheritedWidgets = new Map();
    parent.addChild(child);

    expect(child._inheritedWidgets).not.toBeNull();

    parent.removeChild(child);
    expect(child._inheritedWidgets).toBeNull();
});
```

#### Test 6: Map is cleared on unmount

```typescript
test('_inheritedWidgets is set to null on unmount', () => {
    const element = new LeafElement(new TestTerminalLeaf());
    element._inheritedWidgets = new Map();
    element.mount();
    element.unmount();
    expect(element._inheritedWidgets).toBeNull();
});
```

### 7.2 Regression Tests -- Existing Inherited Behavior

The existing test suite in element.test.ts already covers inherited widget behavior (lines 872-1001). These tests must continue to pass unchanged:

- `'notifies dependents when updateShouldNotify returns true'` (line 873)
- `'does NOT notify when updateShouldNotify returns false'` (line 905)
- `'dependOnInheritedWidgetOfExactType finds ancestor InheritedWidget'` (line 933)
- `'unmount clears dependents'` (line 964)
- `'mounts child from InheritedWidget.child'` (line 986)

These tests exercise the end-to-end behavior of `dependOnInheritedWidgetOfExactType()` and its interaction with `InheritedElement`. Switching the lookup from O(d) walk to O(1) map should not change any of these behaviors.

### 7.3 Integration Tests -- O(1) Lookup Correctness

#### Test 7: Multiple InheritedWidget types in ancestor chain

```typescript
test('multiple InheritedWidget types are all accessible via map lookup', () => {
    // Create: InheritedA -> InheritedB -> StatelessWidget -> leaf
    // Verify that the leaf can find both InheritedA and InheritedB via
    // dependOnInheritedWidgetOfExactType
    class InheritedA extends InheritedWidget {
        constructor(opts: { child: Widget }) { super(opts); }
        updateShouldNotify() { return true; }
    }
    class InheritedB extends InheritedWidget {
        constructor(opts: { child: Widget }) { super(opts); }
        updateShouldNotify() { return true; }
    }

    // Build tree and verify both are found
    // ... (setup and assertions)
});
```

#### Test 8: Shadowing -- inner InheritedWidget of same type shadows outer

```typescript
test('inner InheritedWidget of same type shadows outer in map', () => {
    // Create: TestInheritedWidget(value=1) -> TestInheritedWidget(value=2) -> leaf
    // Verify that leaf finds the inner (value=2) InheritedElement, not the outer
    // ... (setup and assertions)
});
```

This test is critical because the `Map` uses the widget constructor as the key. When an inner `InheritedElement` with the same widget type extends the map, it overwrites the outer entry. This is correct -- the inner one is the "nearest ancestor" and should shadow the outer one.

#### Test 9: dependOnInheritedWidgetOfExactType returns null when not found

```typescript
test('returns null when no InheritedWidget of the type exists', () => {
    const leaf = new TestTerminalLeaf();
    const element = new LeafElement(leaf);
    element._inheritedWidgets = new Map();
    element.mount();

    const result = element.dependOnInheritedWidgetOfExactType(TestInheritedWidget);
    expect(result).toBeNull();
});
```

### 7.4 Edge Case Tests

#### Test 10: Root element with no parent map

```typescript
test('element at root with null _inheritedWidgets returns null for all lookups', () => {
    const element = new LeafElement(new TestTerminalLeaf());
    element.mount();
    // _inheritedWidgets is null (no parent set a map)
    const result = element.dependOnInheritedWidgetOfExactType(TestInheritedWidget);
    expect(result).toBeNull();
});
```

#### Test 11: Map after removeAllChildren

```typescript
test('removeAllChildren clears _inheritedWidgets on all children', () => {
    const parent = new LeafElement(new TestTerminalLeaf());
    parent._inheritedWidgets = new Map();
    const c1 = new LeafElement(new TestTerminalLeaf());
    const c2 = new LeafElement(new TestTerminalLeaf());
    parent.addChild(c1);
    parent.addChild(c2);

    parent.removeAllChildren();
    expect(c1._inheritedWidgets).toBeNull();
    expect(c2._inheritedWidgets).toBeNull();
});
```

#### Test 12: BuildContextImpl.dependOnInheritedWidgetOfExactType uses the map

```typescript
test('BuildContextImpl.dependOnInheritedWidgetOfExactType uses O(1) map lookup', () => {
    // Set up an InheritedWidget tree and verify that BuildContextImpl
    // delegates to element.dependOnInheritedWidgetOfExactType which uses the map
    // (this is already covered by existing BuildContextImpl test at line 1021,
    //  but verify it still works after the change)
});
```

### 7.5 Performance Validation (optional, manual)

While not part of the automated test suite, a manual benchmark can validate the performance improvement:

```typescript
// Benchmark: Create a deep tree with InheritedWidgets near the root,
// then measure time for 10,000 dependOnInheritedWidgetOfExactType calls
// at the deepest element. Compare before and after.
```

---

## 8. Implementation Order

1. **Phase A -- Add the field and propagation**:
   - Add `_inheritedWidgets` field to `Element`
   - Add `_updateInheritedWidgets()` to `Element`
   - Modify `addChild()` to call `_updateInheritedWidgets()`
   - Modify `removeChild()` and `removeAllChildren()` to clear the map
   - Modify `unmount()` to null out the map

2. **Phase B -- InheritedElement override**:
   - Override `_updateInheritedWidgets()` on `InheritedElement`

3. **Phase C -- Rewrite the lookup**:
   - Replace `dependOnInheritedWidgetOfExactType()` with map-based O(1) lookup
   - This is the step that changes observable behavior (though semantics are preserved)

4. **Phase D -- Tests**:
   - Add all unit tests from Section 7.1
   - Run existing test suite to verify regression-free
   - Add integration and edge case tests from Sections 7.3-7.4

5. **Phase E -- Documentation**:
   - Add Amp deviation annotation comments in source code
   - Update any architecture documentation referencing the inherited widget lookup mechanism

---

## 9. Alternative Designs Considered

### 9.1 Lazy Map Construction (rejected)

Instead of propagating the map eagerly during `addChild()`, we could build it lazily on the first `dependOnInheritedWidgetOfExactType()` call. This was rejected because:
- It adds complexity (checking if the map is stale, invalidating it on reparent)
- The eager approach is simpler and matches Flutter's implementation
- The cost of propagating a map reference (one pointer assignment) is negligible

### 9.2 WeakRef-based Map (rejected)

Using `WeakRef<InheritedElement>` as map values to avoid holding strong references to unmounted elements. This was rejected because:
- The map reference itself is set to `null` on unmount/remove, so there is no risk of dangling references
- `WeakRef` adds overhead and complexity for no benefit
- Flutter does not use weak references for this map

### 9.3 Immutable/Copy-on-Write Map (considered, partially adopted)

Flutter's implementation creates a new `Map` only at `InheritedElement` boundaries, and all non-inherited descendants share the reference. This is the approach adopted in this proposal. A full immutable persistent hash map (like Flutter's `PersistentHashMap`) was considered but rejected because:
- The number of inherited widget types is small (typically <10)
- `new Map(existingMap)` copy cost is O(k) where k is small
- A persistent hash map adds implementation complexity for marginal benefit in a TUI context

### 9.4 Prototype Chain Map (rejected)

Using JavaScript's prototype chain (`Object.create(parentMap)`) instead of `new Map()` for O(1) extension. This was rejected because:
- `Map` objects do not support prototype-based inheritance
- Using plain objects as maps has worse type safety
- The `new Map(existingMap)` approach is clear and efficient for small maps

---

## 10. Open Questions

1. **Amp fidelity approval**: This is a performance optimization that deviates from the Amp reference (which uses O(d) walks). The deviation is purely internal -- no public API changes. Is this acceptable under the project's Amp fidelity rules?

2. **Should `getElementForInheritedWidgetOfExactType()` also use the map?** Flutter has a separate method that looks up an `InheritedElement` without registering a dependency. If this method is added in the future (or exists elsewhere), it should also use the `_inheritedWidgets` map.

3. **Should the map be typed more strictly?** The current proposal uses `Map<Function, InheritedElement>`. A stricter type like `Map<new (...args: any[]) => InheritedWidget, InheritedElement>` would enforce that only widget constructors are used as keys, but this adds type complexity for no runtime benefit.

4. **Map capacity hint**: Should the `new Map()` constructor receive a size hint? JavaScript `Map` does not support this, so this is a non-issue, but worth noting that in other languages (Java, etc.) pre-sizing the map could further reduce allocation overhead.
