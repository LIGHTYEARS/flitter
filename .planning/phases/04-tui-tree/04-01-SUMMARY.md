---
phase: 4
plan: 01
status: complete
---

# BoxConstraints Constraint Model -- Summary

## One-Liner
Implemented the BoxConstraints immutable constraint model with four readonly fields, three static factories, six computed properties, and four transformation methods.

## What Was Built
- `Size` interface with readonly `width` and `height`
- `BoxConstraints` class with `minWidth`, `maxWidth`, `minHeight`, `maxHeight` (all readonly, Object.freeze applied)
- Static factories: `tight()`, `loose()`, `tightFor()`
- Computed properties: `hasBoundedWidth`, `hasBoundedHeight`, `hasTightWidth`, `hasTightHeight`, `isTight`, `biggest`, `smallest`
- Transformation methods: `constrain()`, `enforce()`, `loosen()`, `tighten()`
- Equality: `equals()` four-field comparison
- Debug: `toString()` with all field values
- Private `clamp()` utility function

## Key Decisions
- Constructor validates min <= max and all values >= 0, throwing descriptive Chinese error messages
- Instances are frozen via `Object.freeze(this)` ensuring runtime immutability beyond TypeScript's `readonly`
- `enforce()` clamps both min and max of `this` into the range of `other`, maintaining the min <= max invariant
- `tighten()` clamps the provided value into the current [min, max] range before setting min = max = clamped value
- All methods return new instances rather than mutating, consistent with immutable value semantics

## Test Coverage
47 tests across 5 describe blocks covering constructor defaults, custom values, min>max errors, negative value errors, readonly enforcement, static factories (tight/loose/tightFor with edge cases), computed properties (bounded/tight/isTight/biggest/smallest), methods (constrain/enforce/loosen/tighten/equals/toString), and immutability guarantees (loosen/tighten/enforce do not modify original).

## Artifacts
- `packages/tui/src/tree/constraints.ts`
- `packages/tui/src/tree/constraints.test.ts`
