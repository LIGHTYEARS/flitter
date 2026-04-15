---
phase: 4
plan: 05
status: complete
---

# Widget, Key, and GlobalKey -- Summary

## One-Liner
Implemented the Widget abstract base class with Key-based identity, GlobalKey for cross-tree Element references, and the canUpdate reconciliation logic that drives incremental updates.

## What Was Built
- `Key` class: holds `readonly value: string | number`, `equals()` via strict `===` comparison
- `GlobalKey extends Key`: manages `_element` reference via `_setElement()` / `_clearElement()`, `currentElement` getter, `currentState` getter (returns State from StatefulElement if applicable)
- Abstract `Widget` class:
  - `readonly key: Key | undefined`, set via optional constructor `{ key? }` parameter
  - `canUpdate(other)`: four-path reconciliation logic -- same constructor required, then both-key uses `key.equals()`, both-no-key returns true, mixed returns false
  - Abstract `createElement(): Element`

## Key Decisions
- `canUpdate()` uses `this.constructor === other.constructor` for type comparison rather than checking a separate `type` string
- `Key.equals()` uses strict `===` so string "1" and number 1 are not equal
- `GlobalKey.currentState` uses duck-typing (`"state" in this._element`) to avoid importing StatefulElement, preventing circular dependencies
- Widget is a concrete class (not an interface) so `canUpdate` has a default implementation that subclasses inherit without needing to re-implement
- The `element.ts` forward-declared `Widget`/`Key` interfaces remain for now; the concrete classes in `widget.ts` satisfy those interfaces

## Test Coverage
20 tests across 5 describe blocks covering Key (saves value, equals same/different/string-vs-number), GlobalKey (inherits Key, _setElement registers, _clearElement clears, currentElement undefined initially, currentState undefined for non-StatefulElement), Widget constructor (saves key, default undefined), Widget.canUpdate (same-type-no-key true, different-type false, same-type-same-key true, same-type-different-key false, mixed-key false, same-instance true, different-type-same-key false), and createElement (returns Element instance, associates correct Widget).

## Artifacts
- `packages/tui/src/tree/widget.ts`
- `packages/tui/src/tree/widget.test.ts`
