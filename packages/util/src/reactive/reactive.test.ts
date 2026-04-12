import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  Observable,
  Subject,
  BehaviorSubject,
  DisposableCollection,
  ObservableSet,
  ObservableMap,
  map,
  filter,
  distinctUntilChanged,
} from "./index";

// ─── DisposableCollection ──────────────────────────────────────────────────

describe("DisposableCollection", () => {
  it("should call dispose on IDisposable items", () => {
    const collection = new DisposableCollection();
    let disposed = false;
    collection.add({ dispose: () => { disposed = true; } });
    assert.equal(disposed, false);
    collection.dispose();
    assert.equal(disposed, true);
  });

  it("should call function disposables", () => {
    const collection = new DisposableCollection();
    let called = false;
    collection.add(() => { called = true; });
    collection.dispose();
    assert.equal(called, true);
  });

  it("should set disposed flag after dispose", () => {
    const collection = new DisposableCollection();
    assert.equal(collection.disposed, false);
    collection.dispose();
    assert.equal(collection.disposed, true);
  });

  it("should be idempotent — second dispose is a no-op", () => {
    const collection = new DisposableCollection();
    let count = 0;
    collection.add(() => { count++; });
    collection.dispose();
    collection.dispose();
    assert.equal(count, 1);
  });

  it("should immediately dispose items added after disposal", () => {
    const collection = new DisposableCollection();
    collection.dispose();
    let called = false;
    collection.add(() => { called = true; });
    assert.equal(called, true);
  });

  it("should immediately dispose IDisposable items added after disposal", () => {
    const collection = new DisposableCollection();
    collection.dispose();
    let disposed = false;
    collection.add({ dispose: () => { disposed = true; } });
    assert.equal(disposed, true);
  });

  it("should dispose multiple items of mixed types", () => {
    const collection = new DisposableCollection();
    const log: string[] = [];
    collection.add({ dispose: () => log.push("A") });
    collection.add(() => log.push("B"));
    collection.add({ dispose: () => log.push("C") });
    collection.dispose();
    assert.equal(log.length, 3);
    assert.ok(log.includes("A"));
    assert.ok(log.includes("B"));
    assert.ok(log.includes("C"));
  });
});

// ─── Observable ────────────────────────────────────────────────────────────

describe("Observable", () => {
  it("should deliver values to subscriber", () => {
    const values: number[] = [];
    const obs = new Observable<number>((observer) => {
      observer.next(1);
      observer.next(2);
      observer.next(3);
      observer.complete();
    });
    obs.subscribe({ next: (v) => values.push(v) });
    assert.deepEqual(values, [1, 2, 3]);
  });

  it("should call complete callback", () => {
    let completed = false;
    const obs = new Observable<number>((observer) => {
      observer.complete();
    });
    obs.subscribe({ complete: () => { completed = true; } });
    assert.equal(completed, true);
  });

  it("should stop delivering values after unsubscribe", () => {
    const values: number[] = [];
    const obs = new Observable<number>((observer) => {
      observer.next(1);
      observer.next(2);
      // We'll unsubscribe after first value via external control
      return () => {};
    });
    // Use a subject-like pattern to test unsubscribe
    let emitter: ((v: number) => void) | undefined;
    const obs2 = new Observable<number>((observer) => {
      emitter = (v) => observer.next(v);
      return () => { emitter = undefined; };
    });
    const sub = obs2.subscribe((v) => values.push(v));
    emitter!(10);
    sub.unsubscribe();
    emitter?.(20);
    assert.deepEqual(values, [10]);
  });

  it("should set closed flag after unsubscribe", () => {
    const obs = new Observable<number>(() => {});
    const sub = obs.subscribe(() => {});
    assert.equal(sub.closed, false);
    sub.unsubscribe();
    assert.equal(sub.closed, true);
  });

  it("should set closed flag after complete", () => {
    let sub: any;
    const obs = new Observable<number>((observer) => {
      observer.complete();
    });
    sub = obs.subscribe({ complete: () => {} });
    assert.equal(sub.closed, true);
  });

  it("should set closed flag after error", () => {
    let sub: any;
    const obs = new Observable<number>((observer) => {
      observer.error(new Error("test"));
    });
    sub = obs.subscribe({ error: () => {} });
    assert.equal(sub.closed, true);
  });

  it("should not deliver after complete", () => {
    const values: number[] = [];
    const obs = new Observable<number>((observer) => {
      observer.next(1);
      observer.complete();
      observer.next(2); // should be ignored
    });
    obs.subscribe({ next: (v) => values.push(v) });
    assert.deepEqual(values, [1]);
  });

  it("should handle empty observable", () => {
    let completed = false;
    const obs = new Observable<never>((observer) => {
      observer.complete();
    });
    obs.subscribe({ complete: () => { completed = true; } });
    assert.equal(completed, true);
  });
});

describe("Observable.of", () => {
  it("should emit all values synchronously then complete", () => {
    const values: number[] = [];
    let completed = false;
    Observable.of(1, 2, 3).subscribe({
      next: (v) => values.push(v),
      complete: () => { completed = true; },
    });
    assert.deepEqual(values, [1, 2, 3]);
    assert.equal(completed, true);
  });

  it("should work with zero values", () => {
    let completed = false;
    Observable.of().subscribe({
      complete: () => { completed = true; },
    });
    assert.equal(completed, true);
  });
});

describe("Observable.from", () => {
  it("should create from an array (Iterable)", () => {
    const values: number[] = [];
    let completed = false;
    Observable.from([10, 20, 30]).subscribe({
      next: (v) => values.push(v),
      complete: () => { completed = true; },
    });
    assert.deepEqual(values, [10, 20, 30]);
    assert.equal(completed, true);
  });

  it("should create from a Set (Iterable)", () => {
    const values: string[] = [];
    Observable.from(new Set(["a", "b"])).subscribe({
      next: (v) => values.push(v),
    });
    assert.deepEqual(values, ["a", "b"]);
  });

  it("should create from a Promise", async () => {
    const values: number[] = [];
    let completed = false;
    Observable.from(Promise.resolve(42)).subscribe({
      next: (v) => values.push(v),
      complete: () => { completed = true; },
    });
    // Wait for promise microtask
    await new Promise((r) => setTimeout(r, 10));
    assert.deepEqual(values, [42]);
    assert.equal(completed, true);
  });

  it("should return same Observable if given an Observable", () => {
    const obs = Observable.of(1);
    const result = Observable.from(obs);
    assert.equal(result, obs);
  });

  it("should throw on unsupported input", () => {
    assert.throws(() => {
      Observable.from(42 as any);
    }, /unsupported input type/);
  });
});

describe("Observable.pipe", () => {
  it("should return same observable with no operators", () => {
    const obs = Observable.of(1, 2, 3);
    const piped = obs.pipe();
    // Different reference is fine, just verify it works
    const values: number[] = [];
    piped.subscribe((v) => values.push(v));
    assert.deepEqual(values, [1, 2, 3]);
  });

  it("should apply a single operator", () => {
    const values: number[] = [];
    Observable.of(1, 2, 3)
      .pipe(map((x: number) => x * 10))
      .subscribe((v) => values.push(v));
    assert.deepEqual(values, [10, 20, 30]);
  });

  it("should chain multiple operators", () => {
    const values: number[] = [];
    Observable.of(1, 2, 3, 4, 5, 6)
      .pipe(
        filter((x: number) => x % 2 === 0),
        map((x: number) => x * 100),
      )
      .subscribe((v) => values.push(v));
    assert.deepEqual(values, [200, 400, 600]);
  });
});

// ─── Subject ───────────────────────────────────────────────────────────────

describe("Subject", () => {
  it("should broadcast values to all observers", () => {
    const subject = new Subject<number>();
    const a: number[] = [];
    const b: number[] = [];
    subject.subscribe((v) => a.push(v));
    subject.subscribe((v) => b.push(v));
    subject.next(1);
    subject.next(2);
    assert.deepEqual(a, [1, 2]);
    assert.deepEqual(b, [1, 2]);
  });

  it("should terminate observers on error", () => {
    const subject = new Subject<number>();
    let receivedError: unknown;
    subject.subscribe({ error: (e) => { receivedError = e; } });
    subject.error("boom");
    assert.equal(receivedError, "boom");
  });

  it("should not emit after error", () => {
    const subject = new Subject<number>();
    const values: number[] = [];
    subject.subscribe({ next: (v) => values.push(v), error: () => {} });
    subject.next(1);
    subject.error("boom");
    subject.next(2);
    assert.deepEqual(values, [1]);
  });

  it("should complete all observers", () => {
    const subject = new Subject<number>();
    let completedCount = 0;
    subject.subscribe({ complete: () => completedCount++ });
    subject.subscribe({ complete: () => completedCount++ });
    subject.complete();
    assert.equal(completedCount, 2);
  });

  it("should not emit after complete", () => {
    const subject = new Subject<number>();
    const values: number[] = [];
    subject.subscribe((v) => values.push(v));
    subject.next(1);
    subject.complete();
    subject.next(2);
    assert.deepEqual(values, [1]);
  });

  it("should deliver complete to late subscribers after completion", () => {
    const subject = new Subject<number>();
    subject.complete();
    let completed = false;
    subject.subscribe({ complete: () => { completed = true; } });
    assert.equal(completed, true);
  });

  it("should deliver error to late subscribers after error", () => {
    const subject = new Subject<number>();
    subject.error("boom");
    let receivedError: unknown;
    subject.subscribe({ error: (e) => { receivedError = e; } });
    assert.equal(receivedError, "boom");
  });

  it("should remove observer on unsubscribe", () => {
    const subject = new Subject<number>();
    const values: number[] = [];
    const sub = subject.subscribe((v) => values.push(v));
    subject.next(1);
    sub.unsubscribe();
    subject.next(2);
    assert.deepEqual(values, [1]);
  });
});

// ─── BehaviorSubject ───────────────────────────────────────────────────────

describe("BehaviorSubject", () => {
  it("should emit current value to new subscriber immediately", () => {
    const subject = new BehaviorSubject<number>(42);
    const values: number[] = [];
    subject.subscribe((v) => values.push(v));
    assert.deepEqual(values, [42]);
  });

  it("should have getValue/value returning current value", () => {
    const subject = new BehaviorSubject<string>("hello");
    assert.equal(subject.getValue(), "hello");
    assert.equal(subject.value, "hello");
  });

  it("should update current value on next", () => {
    const subject = new BehaviorSubject<number>(0);
    subject.next(10);
    assert.equal(subject.value, 10);
    const values: number[] = [];
    subject.subscribe((v) => values.push(v));
    // Should receive current value (10)
    assert.deepEqual(values, [10]);
  });

  it("should emit updated values to existing subscribers", () => {
    const subject = new BehaviorSubject<number>(0);
    const values: number[] = [];
    subject.subscribe((v) => values.push(v));
    subject.next(1);
    subject.next(2);
    // Initial (0) + next(1) + next(2)
    assert.deepEqual(values, [0, 1, 2]);
  });

  it("should complete and not emit current value to late subscriber", () => {
    const subject = new BehaviorSubject<number>(42);
    subject.complete();
    const values: number[] = [];
    let completed = false;
    subject.subscribe({
      next: (v) => values.push(v),
      complete: () => { completed = true; },
    });
    // Should not receive the value since subject is completed
    assert.deepEqual(values, []);
    assert.equal(completed, true);
  });

  it("should work with observer object", () => {
    const subject = new BehaviorSubject<number>(5);
    const values: number[] = [];
    subject.subscribe({ next: (v) => values.push(v) });
    assert.deepEqual(values, [5]);
    subject.next(10);
    assert.deepEqual(values, [5, 10]);
  });
});

// ─── ObservableSet ─────────────────────────────────────────────────────────

describe("ObservableSet", () => {
  it("should emit current set to new subscriber", () => {
    const set = new ObservableSet([1, 2, 3]);
    let received: ReadonlySet<number> | undefined;
    set.observable.subscribe((v) => { received = v; });
    assert.ok(received);
    assert.deepEqual([...received!], [1, 2, 3]);
  });

  it("should emit on add", () => {
    const set = new ObservableSet<number>();
    const snapshots: number[][] = [];
    set.observable.subscribe((v) => snapshots.push([...v]));
    set.add(1);
    set.add(2);
    // Initial empty + add(1) + add(2)
    assert.deepEqual(snapshots, [[], [1], [1, 2]]);
  });

  it("should not emit on duplicate add", () => {
    const set = new ObservableSet([1]);
    let emitCount = 0;
    set.observable.subscribe(() => emitCount++);
    // Initial emit = 1
    set.add(1); // duplicate, no emit
    assert.equal(emitCount, 1);
  });

  it("should emit on delete", () => {
    const set = new ObservableSet([1, 2]);
    const snapshots: number[][] = [];
    set.observable.subscribe((v) => snapshots.push([...v]));
    set.delete(1);
    assert.deepEqual(snapshots, [[1, 2], [2]]);
  });

  it("should not emit on delete of non-existent item", () => {
    const set = new ObservableSet([1]);
    let emitCount = 0;
    set.observable.subscribe(() => emitCount++);
    set.delete(99);
    assert.equal(emitCount, 1); // Only initial
  });

  it("should emit on clear when non-empty", () => {
    const set = new ObservableSet([1, 2]);
    const snapshots: number[][] = [];
    set.observable.subscribe((v) => snapshots.push([...v]));
    set.clear();
    assert.deepEqual(snapshots, [[1, 2], []]);
  });

  it("should not emit on clear when empty", () => {
    const set = new ObservableSet<number>();
    let emitCount = 0;
    set.observable.subscribe(() => emitCount++);
    set.clear();
    assert.equal(emitCount, 1); // Only initial
  });

  it("should complete observable on dispose", () => {
    const set = new ObservableSet([1]);
    let completed = false;
    set.observable.subscribe({ complete: () => { completed = true; } });
    set.dispose();
    assert.equal(completed, true);
  });
});

// ─── ObservableMap ─────────────────────────────────────────────────────────

describe("ObservableMap", () => {
  it("should emit current map to new subscriber", () => {
    const m = new ObservableMap<string, number>([["a", 1], ["b", 2]]);
    let received: ReadonlyMap<string, number> | undefined;
    m.observable.subscribe((v) => { received = v; });
    assert.ok(received);
    assert.equal(received!.get("a"), 1);
    assert.equal(received!.get("b"), 2);
  });

  it("should emit on set", () => {
    const m = new ObservableMap<string, number>();
    const snapshots: [string, number][][] = [];
    m.observable.subscribe((v) => snapshots.push([...v]));
    m.set("x", 10);
    assert.deepEqual(snapshots, [[], [["x", 10]]]);
  });

  it("should emit on set even when overwriting", () => {
    const m = new ObservableMap<string, number>([["x", 1]]);
    let emitCount = 0;
    m.observable.subscribe(() => emitCount++);
    m.set("x", 2); // overwrite
    assert.equal(emitCount, 2); // Initial + overwrite
    assert.equal(m.get("x"), 2);
  });

  it("should emit on delete", () => {
    const m = new ObservableMap<string, number>([["a", 1], ["b", 2]]);
    const snapshots: [string, number][][] = [];
    m.observable.subscribe((v) => snapshots.push([...v]));
    m.delete("a");
    assert.equal(snapshots.length, 2);
    assert.deepEqual(snapshots[1], [["b", 2]]);
  });

  it("should not emit on delete of non-existent key", () => {
    const m = new ObservableMap<string, number>([["a", 1]]);
    let emitCount = 0;
    m.observable.subscribe(() => emitCount++);
    m.delete("z");
    assert.equal(emitCount, 1); // Only initial
  });

  it("should emit on clear when non-empty", () => {
    const m = new ObservableMap<string, number>([["a", 1]]);
    const snapshots: [string, number][][] = [];
    m.observable.subscribe((v) => snapshots.push([...v]));
    m.clear();
    assert.deepEqual(snapshots, [[["a", 1]], []]);
  });

  it("should not emit on clear when empty", () => {
    const m = new ObservableMap<string, number>();
    let emitCount = 0;
    m.observable.subscribe(() => emitCount++);
    m.clear();
    assert.equal(emitCount, 1); // Only initial
  });

  it("should complete observable on dispose", () => {
    const m = new ObservableMap<string, number>();
    let completed = false;
    m.observable.subscribe({ complete: () => { completed = true; } });
    m.dispose();
    assert.equal(completed, true);
  });
});

// ─── map operator ──────────────────────────────────────────────────────────

describe("map operator", () => {
  it("should transform values", () => {
    const values: string[] = [];
    Observable.of(1, 2, 3)
      .pipe(map((x) => `v${x}`))
      .subscribe((v) => values.push(v));
    assert.deepEqual(values, ["v1", "v2", "v3"]);
  });

  it("should propagate complete", () => {
    let completed = false;
    Observable.of(1)
      .pipe(map((x) => x))
      .subscribe({ complete: () => { completed = true; } });
    assert.equal(completed, true);
  });

  it("should propagate error", () => {
    let receivedError: unknown;
    const obs = new Observable<number>((observer) => {
      observer.error("fail");
    });
    obs.pipe(map((x) => x)).subscribe({ error: (e) => { receivedError = e; } });
    assert.equal(receivedError, "fail");
  });
});

// ─── filter operator ──────────────────────────────────────────────────────

describe("filter operator", () => {
  it("should filter values by predicate", () => {
    const values: number[] = [];
    Observable.of(1, 2, 3, 4, 5)
      .pipe(filter((x) => x > 3))
      .subscribe((v) => values.push(v));
    assert.deepEqual(values, [4, 5]);
  });

  it("should pass through nothing if predicate always false", () => {
    const values: number[] = [];
    Observable.of(1, 2, 3)
      .pipe(filter(() => false))
      .subscribe((v) => values.push(v));
    assert.deepEqual(values, []);
  });

  it("should propagate complete", () => {
    let completed = false;
    Observable.of(1)
      .pipe(filter(() => false))
      .subscribe({ complete: () => { completed = true; } });
    assert.equal(completed, true);
  });
});

// ─── distinctUntilChanged operator ─────────────────────────────────────────

describe("distinctUntilChanged operator", () => {
  it("should suppress consecutive duplicates with default ===", () => {
    const values: number[] = [];
    Observable.of(1, 1, 2, 2, 3, 1)
      .pipe(distinctUntilChanged())
      .subscribe((v) => values.push(v));
    assert.deepEqual(values, [1, 2, 3, 1]);
  });

  it("should use custom compare function", () => {
    const values: { id: number }[] = [];
    Observable.of({ id: 1 }, { id: 1 }, { id: 2 })
      .pipe(distinctUntilChanged((a, b) => a.id === b.id))
      .subscribe((v) => values.push(v));
    assert.equal(values.length, 2);
    assert.equal(values[0].id, 1);
    assert.equal(values[1].id, 2);
  });

  it("should pass all values when all are different", () => {
    const values: number[] = [];
    Observable.of(1, 2, 3)
      .pipe(distinctUntilChanged())
      .subscribe((v) => values.push(v));
    assert.deepEqual(values, [1, 2, 3]);
  });
});

// ─── Composed / Integration ────────────────────────────────────────────────

describe("Composed: BehaviorSubject + pipe", () => {
  it("should work end-to-end with map and filter", () => {
    const subject = new BehaviorSubject<number>(0);
    const values: number[] = [];
    subject
      .pipe(
        filter((x: number) => x > 0),
        map((x: number) => x * 2),
      )
      .subscribe((v) => values.push(v));
    // Initial value 0 is filtered out
    subject.next(1);
    subject.next(2);
    subject.next(0); // filtered
    subject.next(3);
    assert.deepEqual(values, [2, 4, 6]);
  });

  it("should work with distinctUntilChanged on Subject", () => {
    const subject = new Subject<string>();
    const values: string[] = [];
    subject
      .pipe(distinctUntilChanged())
      .subscribe((v) => values.push(v));
    subject.next("a");
    subject.next("a");
    subject.next("b");
    subject.next("b");
    subject.next("a");
    assert.deepEqual(values, ["a", "b", "a"]);
  });
});

// ─── Edge Cases ────────────────────────────────────────────────────────────

describe("Edge cases", () => {
  it("repeated unsubscribe should be safe", () => {
    const obs = new Observable<number>(() => {});
    const sub = obs.subscribe(() => {});
    sub.unsubscribe();
    sub.unsubscribe(); // should not throw
    assert.equal(sub.closed, true);
  });

  it("DisposableCollection dispose is idempotent", () => {
    const collection = new DisposableCollection();
    let count = 0;
    collection.add(() => count++);
    collection.dispose();
    collection.dispose();
    collection.dispose();
    assert.equal(count, 1);
  });

  it("Observable subscriber error is caught and forwarded", () => {
    let receivedError: unknown;
    const obs = new Observable<number>(() => {
      throw new Error("subscriber exploded");
    });
    obs.subscribe({ error: (e) => { receivedError = e; } });
    assert.ok(receivedError instanceof Error);
    assert.equal((receivedError as Error).message, "subscriber exploded");
  });

  it("Subject next during iteration is safe (snapshot)", () => {
    const subject = new Subject<number>();
    const values: number[] = [];
    subject.subscribe((v) => {
      values.push(v);
      if (v === 1) subject.next(2); // re-entrant
    });
    subject.next(1);
    assert.deepEqual(values, [1, 2]);
  });

  it("ObservableSet dispose prevents further emissions", () => {
    const set = new ObservableSet<number>();
    let emitCount = 0;
    set.observable.subscribe({ next: () => emitCount++ });
    set.dispose();
    const emitCountAfterDispose = emitCount;
    set.add(1); // should not emit
    assert.equal(emitCount, emitCountAfterDispose);
  });

  it("ObservableMap dispose prevents further emissions", () => {
    const m = new ObservableMap<string, number>();
    let emitCount = 0;
    m.observable.subscribe({ next: () => emitCount++ });
    m.dispose();
    const emitCountAfterDispose = emitCount;
    m.set("a", 1); // should not emit
    assert.equal(emitCount, emitCountAfterDispose);
  });

  it("subscribe with no arguments should not throw", () => {
    const obs = Observable.of(1, 2, 3);
    const sub = obs.subscribe();
    assert.equal(sub.closed, true); // completed
  });

  it("Observable teardown is called on unsubscribe", () => {
    let tornDown = false;
    const obs = new Observable<number>(() => {
      return () => { tornDown = true; };
    });
    const sub = obs.subscribe(() => {});
    assert.equal(tornDown, false);
    sub.unsubscribe();
    assert.equal(tornDown, true);
  });
});
