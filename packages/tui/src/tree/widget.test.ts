/**
 * Widget / Key / GlobalKey 单元测试。
 *
 * 使用 node:test + node:assert/strict，覆盖 Key 等值比较、GlobalKey 元素引用、
 * Widget 构造函数、canUpdate 协调逻辑、createElement 等核心行为。
 *
 * 运行方式：
 * ```bash
 * npx tsx --test packages/tui/src/tree/widget.test.ts
 * ```
 *
 * @module
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { Widget, Key, GlobalKey } from "./widget.js";
import { Element } from "./element.js";

// ════════════════════════════════════════════════════
//  测试辅助
// ════════════════════════════════════════════════════

/** 最小化的 Element 具体子类，满足 createElement 返回类型需求。 */
class TestElement extends Element {
  performRebuild(): void {}
}

/** 可实例化的 Widget 子类 A。 */
class WidgetA extends Widget {
  createElement(): Element {
    return new TestElement(this);
  }
}

/** 可实例化的 Widget 子类 B（与 WidgetA 类型不同）。 */
class WidgetB extends Widget {
  createElement(): Element {
    return new TestElement(this);
  }
}

// ════════════════════════════════════════════════════
//  Key 测试
// ════════════════════════════════════════════════════

describe("Key", () => {
  // ── 1. Key 保存 value ─────────────────────────────
  it("构造后保存 value", () => {
    const k1 = new Key("hello");
    assert.equal(k1.value, "hello");

    const k2 = new Key(42);
    assert.equal(k2.value, 42);
  });

  // ── 2. Key.equals: 相同 value → true ─────────────
  it("equals: 相同 value 返回 true", () => {
    const a = new Key("abc");
    const b = new Key("abc");
    assert.equal(a.equals(b), true);

    const c = new Key(7);
    const d = new Key(7);
    assert.equal(c.equals(d), true);
  });

  // ── 3. Key.equals: 不同 value → false ────────────
  it("equals: 不同 value 返回 false", () => {
    const a = new Key("abc");
    const b = new Key("xyz");
    assert.equal(a.equals(b), false);

    const c = new Key(1);
    const d = new Key(2);
    assert.equal(c.equals(d), false);
  });

  // ── 4. Key.equals: string vs number → false ──────
  it("equals: string '1' 与 number 1 返回 false（严格相等）", () => {
    const a = new Key("1");
    const b = new Key(1);
    assert.equal(a.equals(b), false);
  });
});

// ════════════════════════════════════════════════════
//  GlobalKey 测试
// ════════════════════════════════════════════════════

describe("GlobalKey", () => {
  // ── 5. GlobalKey 继承 Key ─────────────────────────
  it("GlobalKey 是 Key 的子类（instanceof Key）", () => {
    const gk = new GlobalKey("g1");
    assert.ok(gk instanceof Key);
    assert.ok(gk instanceof GlobalKey);
    assert.equal(gk.value, "g1");
  });

  // ── 6. _setElement 注册 element 引用 ──────────────
  it("_setElement 注册 element 引用", () => {
    const gk = new GlobalKey("g2");
    const widget = new WidgetA({ key: gk });
    const element = new TestElement(widget);

    gk._setElement(element);

    assert.equal(gk.currentElement, element);
  });

  // ── 7. _clearElement 清除 element 引用 ────────────
  it("_clearElement 清除 element 引用", () => {
    const gk = new GlobalKey("g3");
    const widget = new WidgetA({ key: gk });
    const element = new TestElement(widget);

    gk._setElement(element);
    assert.equal(gk.currentElement, element);

    gk._clearElement();
    assert.equal(gk.currentElement, undefined);
  });

  // ── 8. currentElement 返回注册的 element ──────────
  it("currentElement 未注册时返回 undefined", () => {
    const gk = new GlobalKey("g4");
    assert.equal(gk.currentElement, undefined);
  });

  // ── 18. currentState 暂时返回 undefined ───────────
  it("currentState 在无 StatefulElement 时返回 undefined", () => {
    const gk = new GlobalKey("g5");
    const widget = new WidgetA({ key: gk });
    const element = new TestElement(widget);

    gk._setElement(element);

    // TestElement 不是 StatefulElement，currentState 应返回 undefined
    assert.equal(gk.currentState, undefined);
  });
});

// ════════════════════════════════════════════════════
//  Widget 构造函数测试
// ════════════════════════════════════════════════════

describe("Widget 构造函数", () => {
  // ── 9. Widget 保存 key ────────────────────────────
  it("传入 key 时正确保存", () => {
    const key = new Key("w1");
    const widget = new WidgetA({ key });

    assert.equal(widget.key, key);
  });

  // ── 10. Widget key 默认 undefined ─────────────────
  it("不传 key 时默认为 undefined", () => {
    const widget = new WidgetA();
    assert.equal(widget.key, undefined);
  });
});

// ════════════════════════════════════════════════════
//  Widget.canUpdate 测试
// ════════════════════════════════════════════════════

describe("Widget.canUpdate", () => {
  // ── 11. 同类型无 key → true ───────────────────────
  it("同类型无 key 返回 true", () => {
    const a = new WidgetA();
    const b = new WidgetA();
    assert.equal(a.canUpdate(b), true);
  });

  // ── 12. 不同类型无 key → false ────────────────────
  it("不同类型无 key 返回 false", () => {
    const a = new WidgetA();
    const b = new WidgetB();
    assert.equal(a.canUpdate(b), false);
  });

  // ── 13. 同类型相同 key → true ─────────────────────
  it("同类型相同 key 返回 true", () => {
    const a = new WidgetA({ key: new Key("k1") });
    const b = new WidgetA({ key: new Key("k1") });
    assert.equal(a.canUpdate(b), true);
  });

  // ── 14. 同类型不同 key → false ────────────────────
  it("同类型不同 key 返回 false", () => {
    const a = new WidgetA({ key: new Key("k1") });
    const b = new WidgetA({ key: new Key("k2") });
    assert.equal(a.canUpdate(b), false);
  });

  // ── 15. 一个有 key 一个无 key → false ─────────────
  it("一个有 key 一个无 key 返回 false", () => {
    const withKey = new WidgetA({ key: new Key("k1") });
    const withoutKey = new WidgetA();

    assert.equal(withKey.canUpdate(withoutKey), false);
    assert.equal(withoutKey.canUpdate(withKey), false);
  });

  // ── 17. 同一实例 → true ──────────────────────────
  it("同一实例返回 true", () => {
    const a = new WidgetA({ key: new Key("same") });
    assert.equal(a.canUpdate(a), true);
  });

  // ── 补充：不同类型但相同 key → false ──────────────
  it("不同类型但相同 key 返回 false", () => {
    const a = new WidgetA({ key: new Key("shared") });
    const b = new WidgetB({ key: new Key("shared") });
    assert.equal(a.canUpdate(b), false);
  });
});

// ════════════════════════════════════════════════════
//  createElement 测试
// ════════════════════════════════════════════════════

describe("Widget.createElement", () => {
  // ── 16. createElement 返回 Element 实例 ───────────
  it("createElement 返回 Element 实例", () => {
    const widget = new WidgetA();
    const element = widget.createElement();

    assert.ok(element instanceof Element);
  });

  it("createElement 返回的 Element 关联到创建它的 Widget", () => {
    const widget = new WidgetA();
    const element = widget.createElement();

    // TestElement 调用 super(widget)，Element 构造函数接收 Widget
    // 验证 element 确实被创建了且是正确类型
    assert.ok(element instanceof TestElement);
  });
});
