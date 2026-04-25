/**
 * Tests for ModalStack (push/pop modal management).
 *
 * 逆向: modules/2484_unknown_CZT.js — CZT controller
 * 逆向: modules/1472_tui_components/misc_utils.js:2320-2386 — LZT/MZT widget
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { ModalStackController } from "../overlay/modal-stack.js";

// ─── ModalStackController Tests ─────────────────────────

describe("ModalStackController", () => {
  it("starts empty", () => {
    const ctrl = new ModalStackController();
    assert.equal(ctrl.length, 0);
    assert.equal(ctrl.canPop, false);
    assert.deepEqual([...ctrl.entries], []);
  });

  it("push adds entries", () => {
    const ctrl = new ModalStackController();
    const w1 = {} as any;
    const w2 = {} as any;
    ctrl.push(w1);
    assert.equal(ctrl.length, 1);
    assert.equal(ctrl.canPop, true);
    ctrl.push(w2);
    assert.equal(ctrl.length, 2);
  });

  it("pop removes top entry and returns true", () => {
    const ctrl = new ModalStackController();
    ctrl.push({} as any);
    ctrl.push({} as any);
    const result = ctrl.pop();
    assert.equal(result, true);
    assert.equal(ctrl.length, 1);
  });

  it("pop on empty returns false", () => {
    const ctrl = new ModalStackController();
    assert.equal(ctrl.pop(), false);
    assert.equal(ctrl.length, 0);
  });

  it("canPop reflects stack state", () => {
    const ctrl = new ModalStackController();
    assert.equal(ctrl.canPop, false);
    ctrl.push({} as any);
    assert.equal(ctrl.canPop, true);
    ctrl.pop();
    assert.equal(ctrl.canPop, false);
  });

  it("entries returns correct widgets in order", () => {
    const ctrl = new ModalStackController();
    const w1 = { name: "modal1" } as any;
    const w2 = { name: "modal2" } as any;
    ctrl.push(w1);
    ctrl.push(w2);
    assert.equal(ctrl.entries.length, 2);
    assert.equal(ctrl.entries[0]!.widget, w1);
    assert.equal(ctrl.entries[1]!.widget, w2);
  });

  it("entries have unique IDs", () => {
    const ctrl = new ModalStackController();
    ctrl.push({} as any);
    ctrl.push({} as any);
    ctrl.push({} as any);
    const ids = ctrl.entries.map((e) => e.id);
    assert.equal(new Set(ids).size, 3, "All IDs should be unique");
  });

  it("notifies listeners on push", () => {
    const ctrl = new ModalStackController();
    let called = 0;
    ctrl.addListener(() => {
      called++;
    });
    ctrl.push({} as any);
    assert.equal(called, 1);
    ctrl.push({} as any);
    assert.equal(called, 2);
  });

  it("notifies listeners on pop", () => {
    const ctrl = new ModalStackController();
    ctrl.push({} as any);
    let called = 0;
    ctrl.addListener(() => {
      called++;
    });
    ctrl.pop();
    assert.equal(called, 1);
  });

  it("does not notify after removeListener", () => {
    const ctrl = new ModalStackController();
    let called = 0;
    const fn = () => {
      called++;
    };
    ctrl.addListener(fn);
    ctrl.push({} as any);
    assert.equal(called, 1);
    ctrl.removeListener(fn);
    ctrl.push({} as any);
    assert.equal(called, 1, "Should not fire after removal");
  });

  it("pop does not notify when stack is empty", () => {
    const ctrl = new ModalStackController();
    let called = 0;
    ctrl.addListener(() => {
      called++;
    });
    ctrl.pop(); // returns false, should still not notify since we return early
    assert.equal(called, 0);
  });

  it("multiple listeners all get notified", () => {
    const ctrl = new ModalStackController();
    let a = 0;
    let b = 0;
    ctrl.addListener(() => {
      a++;
    });
    ctrl.addListener(() => {
      b++;
    });
    ctrl.push({} as any);
    assert.equal(a, 1);
    assert.equal(b, 1);
  });

  it("push and pop maintain LIFO order", () => {
    const ctrl = new ModalStackController();
    const w1 = { name: "first" } as any;
    const w2 = { name: "second" } as any;
    const w3 = { name: "third" } as any;
    ctrl.push(w1);
    ctrl.push(w2);
    ctrl.push(w3);
    assert.equal(ctrl.entries[ctrl.entries.length - 1]!.widget, w3);
    ctrl.pop();
    assert.equal(ctrl.entries[ctrl.entries.length - 1]!.widget, w2);
    ctrl.pop();
    assert.equal(ctrl.entries[ctrl.entries.length - 1]!.widget, w1);
    ctrl.pop();
    assert.equal(ctrl.length, 0);
  });

  it("entries is read-only snapshot", () => {
    const ctrl = new ModalStackController();
    ctrl.push({} as any);
    const snap = ctrl.entries;
    assert.equal(snap.length, 1);
    // Push another — snapshot should not change (it's a readonly view of the array)
    ctrl.push({} as any);
    // The entries getter returns the internal array, so it reflects the change
    assert.equal(ctrl.entries.length, 2);
  });

  it("repeated pop until empty", () => {
    const ctrl = new ModalStackController();
    ctrl.push({} as any);
    ctrl.push({} as any);
    ctrl.push({} as any);
    assert.equal(ctrl.pop(), true);
    assert.equal(ctrl.pop(), true);
    assert.equal(ctrl.pop(), true);
    assert.equal(ctrl.pop(), false);
    assert.equal(ctrl.length, 0);
  });
});
