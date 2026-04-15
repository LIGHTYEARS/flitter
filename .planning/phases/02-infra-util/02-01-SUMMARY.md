---
phase: 2
plan: 01
status: complete
---

# Reactive Primitives Library -- Summary

## One-Liner
Implemented a lightweight reactive primitives library providing Observable, Subject, BehaviorSubject, DisposableCollection, ObservableSet, ObservableMap, and core pipe operators (map, filter, distinctUntilChanged).

## What Was Built
- `IDisposable` interface and `DisposableCollection` class with add/dispose lifecycle and post-disposal immediate cleanup
- `Observable<T>` class with subscribe (two overloads), pipe, `static from` (Iterable/Promise/Observable), `static of`, and `[Symbol.observable]`
- `Observer<T>`, `Subscription`, `OperatorFunction<T,R>`, `ObservableInput<T>` type definitions
- `Subject<T>` extending Observable with multicast next/error/complete; late subscriber notification for completed/errored subjects
- `BehaviorSubject<T>` extending Subject with current value semantics, `getValue()`/`value` accessor, and immediate emission on subscribe
- `ObservableSet<T>` extending `Set<T>` with reactive observable that emits snapshots on add/delete/clear (deduplicating no-op adds)
- `ObservableMap<K,V>` extending `Map<K,V>` with reactive observable that emits snapshots on set/delete/clear
- `map`, `filter`, `distinctUntilChanged` operator functions compatible with `pipe()`
- Barrel export at `packages/util/src/reactive/index.ts` re-exporting all public types and classes

## Key Decisions
- Used a safe observer wrapper that prevents delivery after complete/error/unsubscribe, ensuring correct lifecycle semantics
- Subject spreads observers into a snapshot array before broadcasting (`[...this._observers]`) to handle re-entrant calls safely
- ObservableSet/ObservableMap emit `ReadonlySet`/`ReadonlyMap` snapshots (new copies) rather than references to the mutable collection
- ObservableSet guards against emissions during `super()` construction since `_subject` is not yet initialized
- BehaviorSubject emits current value synchronously after parent subscribe completes, not inside the subscriber function
- `distinctUntilChanged` defaults to `===` comparison with support for custom comparator

## Test Coverage
74 test cases in `packages/util/src/reactive/reactive.test.ts` covering:
- DisposableCollection (7 tests): add, dispose, idempotency, post-disposal immediate cleanup, mixed types
- Observable (8 tests): value delivery, complete, unsubscribe, closed flag, post-complete silence, empty observable
- Observable.of (2 tests): synchronous emission, zero values
- Observable.from (5 tests): Array, Set, Promise, Observable pass-through, unsupported input error
- Observable.pipe (3 tests): identity, single operator, chained operators
- Subject (8 tests): multicast, error propagation, post-error silence, complete, post-complete silence, late subscriber notification, unsubscribe removal
- BehaviorSubject (6 tests): immediate current value, getValue/value, next updates, existing subscriber emissions, post-complete behavior, observer object overload
- ObservableSet (8 tests): initial snapshot, add/delete/clear emissions, duplicate/no-op guards, dispose completes observable
- ObservableMap (8 tests): initial snapshot, set/delete/clear emissions, overwrite, no-op guards, dispose completes observable
- Operators (9 tests): map transform/complete/error, filter predicate/empty/complete, distinctUntilChanged default/custom/all-different
- Composed integration (2 tests): BehaviorSubject + pipe(filter, map) end-to-end, Subject + distinctUntilChanged
- Edge cases (8 tests): repeated unsubscribe, dispose idempotency, subscriber error forwarding, re-entrant Subject.next, post-dispose ObservableSet/Map, no-arg subscribe, teardown on unsubscribe

## Artifacts
- `packages/util/src/reactive/disposable.ts`
- `packages/util/src/reactive/observable.ts`
- `packages/util/src/reactive/subject.ts`
- `packages/util/src/reactive/operators.ts`
- `packages/util/src/reactive/observable-set.ts`
- `packages/util/src/reactive/observable-map.ts`
- `packages/util/src/reactive/index.ts`
- `packages/util/src/reactive/reactive.test.ts`
