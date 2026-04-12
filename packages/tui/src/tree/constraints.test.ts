/**
 * BoxConstraints 单元测试。
 *
 * 使用 node:test + node:assert/strict，覆盖构造函数、静态工厂、计算属性和全部方法。
 *
 * 运行方式：
 * ```bash
 * npx tsx --test packages/tui/src/tree/constraints.test.ts
 * ```
 *
 * @module
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";

import { BoxConstraints } from "./constraints.js";
import type { Size } from "./constraints.js";

// ════════════════════════════════════════════════════
//  构造函数测试
// ════════════════════════════════════════════════════

describe("BoxConstraints 构造函数", () => {
  // ── 1. 默认值 ──────────────────────────────────────
  it("默认值: minWidth=0, maxWidth=Infinity, minHeight=0, maxHeight=Infinity", () => {
    const c = new BoxConstraints();
    assert.equal(c.minWidth, 0);
    assert.equal(c.maxWidth, Infinity);
    assert.equal(c.minHeight, 0);
    assert.equal(c.maxHeight, Infinity);
  });

  // ── 2. 自定义值正确赋值 ────────────────────────────
  it("自定义值正确赋值", () => {
    const c = new BoxConstraints({
      minWidth: 10,
      maxWidth: 80,
      minHeight: 5,
      maxHeight: 24,
    });
    assert.equal(c.minWidth, 10);
    assert.equal(c.maxWidth, 80);
    assert.equal(c.minHeight, 5);
    assert.equal(c.maxHeight, 24);
  });

  // ── 3. 部分自定义值，其余为默认 ────────────────────
  it("部分自定义值时未指定字段取默认", () => {
    const c = new BoxConstraints({ minWidth: 5, maxHeight: 100 });
    assert.equal(c.minWidth, 5);
    assert.equal(c.maxWidth, Infinity);
    assert.equal(c.minHeight, 0);
    assert.equal(c.maxHeight, 100);
  });

  // ── 4. minWidth > maxWidth 抛出错误 ────────────────
  it("minWidth > maxWidth 抛出错误", () => {
    assert.throws(() => new BoxConstraints({ minWidth: 100, maxWidth: 50 }));
  });

  // ── 5. minHeight > maxHeight 抛出错误 ──────────────
  it("minHeight > maxHeight 抛出错误", () => {
    assert.throws(() => new BoxConstraints({ minHeight: 30, maxHeight: 10 }));
  });

  // ── 6. 负的 minWidth 抛出错误 ─────────────────────
  it("负的 minWidth 抛出错误", () => {
    assert.throws(() => new BoxConstraints({ minWidth: -1 }));
  });

  // ── 7. 负的 maxWidth 抛出错误 ─────────────────────
  it("负的 maxWidth 抛出错误", () => {
    assert.throws(() => new BoxConstraints({ maxWidth: -5 }));
  });

  // ── 8. 负的 minHeight 抛出错误 ────────────────────
  it("负的 minHeight 抛出错误", () => {
    assert.throws(() => new BoxConstraints({ minHeight: -1 }));
  });

  // ── 9. 负的 maxHeight 抛出错误 ────────────────────
  it("负的 maxHeight 抛出错误", () => {
    assert.throws(() => new BoxConstraints({ maxHeight: -10 }));
  });

  // ── 10. min === max 合法（tight 约束） ─────────────
  it("min === max 不抛出错误（tight 约束）", () => {
    const c = new BoxConstraints({
      minWidth: 50,
      maxWidth: 50,
      minHeight: 20,
      maxHeight: 20,
    });
    assert.equal(c.minWidth, 50);
    assert.equal(c.maxWidth, 50);
  });

  // ── 11. 字段为 readonly ───────────────────────────
  it("字段为 readonly，不可修改", () => {
    const c = new BoxConstraints({ minWidth: 10, maxWidth: 80 });
    // TypeScript 类型层面已阻止，但运行时也应确保不可写
    assert.throws(() => {
      (c as any).minWidth = 999;
    });
  });
});

// ════════════════════════════════════════════════════
//  静态工厂测试
// ════════════════════════════════════════════════════

describe("BoxConstraints 静态工厂", () => {
  // ── 12. tight(80, 24) ──────────────────────────────
  it("tight(80, 24): min===max===给定值", () => {
    const c = BoxConstraints.tight(80, 24);
    assert.equal(c.minWidth, 80);
    assert.equal(c.maxWidth, 80);
    assert.equal(c.minHeight, 24);
    assert.equal(c.maxHeight, 24);
  });

  // ── 13. tight(0, 0) 边界值 ────────────────────────
  it("tight(0, 0): 零尺寸 tight 约束", () => {
    const c = BoxConstraints.tight(0, 0);
    assert.equal(c.minWidth, 0);
    assert.equal(c.maxWidth, 0);
    assert.equal(c.minHeight, 0);
    assert.equal(c.maxHeight, 0);
  });

  // ── 14. loose(80, 24) ─────────────────────────────
  it("loose(80, 24): min=0, max=给定值", () => {
    const c = BoxConstraints.loose(80, 24);
    assert.equal(c.minWidth, 0);
    assert.equal(c.maxWidth, 80);
    assert.equal(c.minHeight, 0);
    assert.equal(c.maxHeight, 24);
  });

  // ── 15. tightFor 仅 width ─────────────────────────
  it("tightFor({ width: 80 }): 仅 width tight, height 为 0..Infinity", () => {
    const c = BoxConstraints.tightFor({ width: 80 });
    assert.equal(c.minWidth, 80);
    assert.equal(c.maxWidth, 80);
    assert.equal(c.minHeight, 0);
    assert.equal(c.maxHeight, Infinity);
  });

  // ── 16. tightFor 仅 height ────────────────────────
  it("tightFor({ height: 24 }): 仅 height tight, width 为 0..Infinity", () => {
    const c = BoxConstraints.tightFor({ height: 24 });
    assert.equal(c.minWidth, 0);
    assert.equal(c.maxWidth, Infinity);
    assert.equal(c.minHeight, 24);
    assert.equal(c.maxHeight, 24);
  });

  // ── 17. tightFor 两个维度都指定 ────────────────────
  it("tightFor({ width: 80, height: 24 }): 等同 tight(80, 24)", () => {
    const c = BoxConstraints.tightFor({ width: 80, height: 24 });
    assert.equal(c.minWidth, 80);
    assert.equal(c.maxWidth, 80);
    assert.equal(c.minHeight, 24);
    assert.equal(c.maxHeight, 24);
  });

  // ── 18. tightFor 空对象 ───────────────────────────
  it("tightFor({}): 等同默认约束 (0..Infinity)", () => {
    const c = BoxConstraints.tightFor({});
    assert.equal(c.minWidth, 0);
    assert.equal(c.maxWidth, Infinity);
    assert.equal(c.minHeight, 0);
    assert.equal(c.maxHeight, Infinity);
  });
});

// ════════════════════════════════════════════════════
//  计算属性测试
// ════════════════════════════════════════════════════

describe("BoxConstraints 计算属性", () => {
  // ── 19. hasBoundedWidth ────────────────────────────
  it("hasBoundedWidth: 有限 maxWidth 返回 true", () => {
    const c = new BoxConstraints({ maxWidth: 100 });
    assert.equal(c.hasBoundedWidth, true);
  });

  it("hasBoundedWidth: maxWidth 为 Infinity 返回 false", () => {
    const c = new BoxConstraints();
    assert.equal(c.hasBoundedWidth, false);
  });

  // ── 20. hasBoundedHeight ──────────────────────────
  it("hasBoundedHeight: 有限 maxHeight 返回 true", () => {
    const c = new BoxConstraints({ maxHeight: 50 });
    assert.equal(c.hasBoundedHeight, true);
  });

  it("hasBoundedHeight: maxHeight 为 Infinity 返回 false", () => {
    const c = new BoxConstraints();
    assert.equal(c.hasBoundedHeight, false);
  });

  // ── 21. hasTightWidth ─────────────────────────────
  it("hasTightWidth: minWidth === maxWidth 返回 true", () => {
    const c = BoxConstraints.tight(40, 20);
    assert.equal(c.hasTightWidth, true);
  });

  it("hasTightWidth: minWidth < maxWidth 返回 false", () => {
    const c = new BoxConstraints({ minWidth: 10, maxWidth: 80 });
    assert.equal(c.hasTightWidth, false);
  });

  // ── 22. hasTightHeight ────────────────────────────
  it("hasTightHeight: minHeight === maxHeight 返回 true", () => {
    const c = BoxConstraints.tight(40, 20);
    assert.equal(c.hasTightHeight, true);
  });

  it("hasTightHeight: minHeight < maxHeight 返回 false", () => {
    const c = new BoxConstraints({ minHeight: 5, maxHeight: 50 });
    assert.equal(c.hasTightHeight, false);
  });

  // ── 23. isTight ───────────────────────────────────
  it("isTight: 两个维度都 tight 时返回 true", () => {
    const c = BoxConstraints.tight(80, 24);
    assert.equal(c.isTight, true);
  });

  it("isTight: 仅一个维度 tight 时返回 false", () => {
    const c = BoxConstraints.tightFor({ width: 80 });
    assert.equal(c.isTight, false);
  });

  it("isTight: 两个维度都非 tight 时返回 false", () => {
    const c = new BoxConstraints();
    assert.equal(c.isTight, false);
  });

  // ── 24. biggest ───────────────────────────────────
  it("biggest: 返回 { width: maxWidth, height: maxHeight }", () => {
    const c = new BoxConstraints({ minWidth: 10, maxWidth: 80, minHeight: 5, maxHeight: 24 });
    const b: Size = c.biggest;
    assert.equal(b.width, 80);
    assert.equal(b.height, 24);
  });

  // ── 25. smallest ──────────────────────────────────
  it("smallest: 返回 { width: minWidth, height: minHeight }", () => {
    const c = new BoxConstraints({ minWidth: 10, maxWidth: 80, minHeight: 5, maxHeight: 24 });
    const s: Size = c.smallest;
    assert.equal(s.width, 10);
    assert.equal(s.height, 5);
  });

  // ── 额外：tight 约束的 biggest 和 smallest 相同 ───
  it("tight 约束的 biggest 和 smallest 相等", () => {
    const c = BoxConstraints.tight(60, 30);
    assert.deepEqual(c.biggest, c.smallest);
  });
});

// ════════════════════════════════════════════════════
//  方法测试
// ════════════════════════════════════════════════════

describe("BoxConstraints 方法", () => {
  // ── constrain ─────────────────────────────────────

  // ── 26. constrain: 值在范围内不变 ──────────────────
  it("constrain: 值在范围内不变", () => {
    const c = new BoxConstraints({ minWidth: 10, maxWidth: 80, minHeight: 5, maxHeight: 24 });
    const s: Size = c.constrain(40, 12);
    assert.equal(s.width, 40);
    assert.equal(s.height, 12);
  });

  // ── 27. constrain: 值小于 min 提升到 min ──────────
  it("constrain: 值小于 min 提升到 min", () => {
    const c = new BoxConstraints({ minWidth: 10, maxWidth: 80, minHeight: 5, maxHeight: 24 });
    const s: Size = c.constrain(2, 1);
    assert.equal(s.width, 10);
    assert.equal(s.height, 5);
  });

  // ── 28. constrain: 值大于 max 降到 max ────────────
  it("constrain: 值大于 max 降到 max", () => {
    const c = new BoxConstraints({ minWidth: 10, maxWidth: 80, minHeight: 5, maxHeight: 24 });
    const s: Size = c.constrain(200, 100);
    assert.equal(s.width, 80);
    assert.equal(s.height, 24);
  });

  // ── 29. constrain: 恰好等于边界值 ─────────────────
  it("constrain: 恰好等于边界值时不变", () => {
    const c = new BoxConstraints({ minWidth: 10, maxWidth: 80, minHeight: 5, maxHeight: 24 });
    const atMin: Size = c.constrain(10, 5);
    assert.equal(atMin.width, 10);
    assert.equal(atMin.height, 5);

    const atMax: Size = c.constrain(80, 24);
    assert.equal(atMax.width, 80);
    assert.equal(atMax.height, 24);
  });

  // ── 30. constrain: tight 约束始终返回固定值 ────────
  it("constrain: tight 约束始终返回固定尺寸", () => {
    const c = BoxConstraints.tight(60, 20);
    const s: Size = c.constrain(999, 999);
    assert.equal(s.width, 60);
    assert.equal(s.height, 20);
  });

  // ── enforce ───────────────────────────────────────

  // ── 31. enforce: 交集计算正确 ─────────────────────
  it("enforce: 交集计算正确", () => {
    const outer = new BoxConstraints({ minWidth: 0, maxWidth: 100, minHeight: 0, maxHeight: 50 });
    const inner = new BoxConstraints({ minWidth: 20, maxWidth: 200, minHeight: 10, maxHeight: 80 });
    const result = inner.enforce(outer);

    // inner.min 被 clamp 到 outer 的 [min, max]
    // inner.max 被 clamp 到 outer 的 [min, max]
    assert.equal(result.minWidth, 20);   // clamp(20, 0, 100) = 20
    assert.equal(result.maxWidth, 100);  // clamp(200, 0, 100) = 100
    assert.equal(result.minHeight, 10);  // clamp(10, 0, 50) = 10
    assert.equal(result.maxHeight, 50);  // clamp(80, 0, 50) = 50
  });

  // ── 32. enforce: 结果满足 min <= max 不变式 ────────
  it("enforce: 结果满足 min <= max 不变式", () => {
    const outer = BoxConstraints.tight(40, 20);
    const inner = new BoxConstraints({ minWidth: 50, maxWidth: 100, minHeight: 25, maxHeight: 50 });
    const result = inner.enforce(outer);

    assert.ok(result.minWidth <= result.maxWidth, "minWidth <= maxWidth");
    assert.ok(result.minHeight <= result.maxHeight, "minHeight <= maxHeight");
  });

  // ── loosen ────────────────────────────────────────

  // ── 33. loosen: min 归零, max 不变 ────────────────
  it("loosen: min 归零, max 不变", () => {
    const c = new BoxConstraints({ minWidth: 20, maxWidth: 80, minHeight: 10, maxHeight: 40 });
    const loosened = c.loosen();
    assert.equal(loosened.minWidth, 0);
    assert.equal(loosened.maxWidth, 80);
    assert.equal(loosened.minHeight, 0);
    assert.equal(loosened.maxHeight, 40);
  });

  // ── 34. loosen: 已经 loose 的约束不变 ─────────────
  it("loosen: 已经 loose 的约束不变", () => {
    const c = BoxConstraints.loose(80, 24);
    const loosened = c.loosen();
    assert.equal(loosened.minWidth, 0);
    assert.equal(loosened.maxWidth, 80);
    assert.equal(loosened.minHeight, 0);
    assert.equal(loosened.maxHeight, 24);
  });

  // ── tighten ───────────────────────────────────────

  // ── 35. tighten({ width: 40 }): width 变 tight ───
  it("tighten({ width: 40 }): width 变 tight, height 不变", () => {
    const c = new BoxConstraints({ minWidth: 0, maxWidth: 80, minHeight: 0, maxHeight: 24 });
    const t = c.tighten({ width: 40 });
    assert.equal(t.minWidth, 40);
    assert.equal(t.maxWidth, 40);
    assert.equal(t.minHeight, 0);
    assert.equal(t.maxHeight, 24);
  });

  // ── 36. tighten({ height: 12 }): height 变 tight ──
  it("tighten({ height: 12 }): height 变 tight, width 不变", () => {
    const c = new BoxConstraints({ minWidth: 10, maxWidth: 80, minHeight: 0, maxHeight: 24 });
    const t = c.tighten({ height: 12 });
    assert.equal(t.minWidth, 10);
    assert.equal(t.maxWidth, 80);
    assert.equal(t.minHeight, 12);
    assert.equal(t.maxHeight, 12);
  });

  // ── 37. tighten: 给定值被 clamp 到当前范围 ────────
  it("tighten: 给定值超出范围时被 clamp", () => {
    const c = new BoxConstraints({ minWidth: 10, maxWidth: 80, minHeight: 5, maxHeight: 24 });
    // width=200 超出 maxWidth=80，应 clamp 到 80
    const t = c.tighten({ width: 200 });
    assert.equal(t.minWidth, 80);
    assert.equal(t.maxWidth, 80);
  });

  // ── 38. tighten: 给定值小于 min 时 clamp 到 min ───
  it("tighten: 给定值小于 min 时被 clamp 到 min", () => {
    const c = new BoxConstraints({ minWidth: 20, maxWidth: 80, minHeight: 10, maxHeight: 40 });
    const t = c.tighten({ width: 5, height: 2 });
    assert.equal(t.minWidth, 20);
    assert.equal(t.maxWidth, 20);
    assert.equal(t.minHeight, 10);
    assert.equal(t.maxHeight, 10);
  });

  // ── equals ────────────────────────────────────────

  // ── 39. equals: 四字段相同 → true ─────────────────
  it("equals: 四字段相同返回 true", () => {
    const a = new BoxConstraints({ minWidth: 10, maxWidth: 80, minHeight: 5, maxHeight: 24 });
    const b = new BoxConstraints({ minWidth: 10, maxWidth: 80, minHeight: 5, maxHeight: 24 });
    assert.equal(a.equals(b), true);
  });

  // ── 40. equals: 任一字段不同 → false ──────────────
  it("equals: minWidth 不同返回 false", () => {
    const a = new BoxConstraints({ minWidth: 10, maxWidth: 80, minHeight: 5, maxHeight: 24 });
    const b = new BoxConstraints({ minWidth: 11, maxWidth: 80, minHeight: 5, maxHeight: 24 });
    assert.equal(a.equals(b), false);
  });

  it("equals: maxWidth 不同返回 false", () => {
    const a = new BoxConstraints({ minWidth: 10, maxWidth: 80 });
    const b = new BoxConstraints({ minWidth: 10, maxWidth: 81 });
    assert.equal(a.equals(b), false);
  });

  it("equals: minHeight 不同返回 false", () => {
    const a = new BoxConstraints({ minHeight: 5, maxHeight: 24 });
    const b = new BoxConstraints({ minHeight: 6, maxHeight: 24 });
    assert.equal(a.equals(b), false);
  });

  it("equals: maxHeight 不同返回 false", () => {
    const a = new BoxConstraints({ maxHeight: 24 });
    const b = new BoxConstraints({ maxHeight: 25 });
    assert.equal(a.equals(b), false);
  });

  // ── 41. equals: 默认约束与默认约束相等 ─────────────
  it("equals: 两个默认约束相等", () => {
    const a = new BoxConstraints();
    const b = new BoxConstraints();
    assert.equal(a.equals(b), true);
  });

  // ── 42. equals: tight 与 loose 不等 ───────────────
  it("equals: tight 与 loose 不等", () => {
    const a = BoxConstraints.tight(80, 24);
    const b = BoxConstraints.loose(80, 24);
    assert.equal(a.equals(b), false);
  });

  // ── toString ──────────────────────────────────────

  // ── 43. toString: 返回可读的调试字符串 ─────────────
  it("toString: 返回包含四个字段信息的字符串", () => {
    const c = new BoxConstraints({ minWidth: 10, maxWidth: 80, minHeight: 5, maxHeight: 24 });
    const str = c.toString();
    assert.equal(typeof str, "string");
    assert.ok(str.length > 0, "toString 不应返回空字符串");
    // 至少应包含各字段的数值信息
    assert.ok(str.includes("10"), "应包含 minWidth 值");
    assert.ok(str.includes("80"), "应包含 maxWidth 值");
    assert.ok(str.includes("5"), "应包含 minHeight 值");
    assert.ok(str.includes("24"), "应包含 maxHeight 值");
  });

  // ── 44. toString: Infinity 在输出中可辨识 ─────────
  it("toString: 默认约束输出中包含 Infinity 标识", () => {
    const c = new BoxConstraints();
    const str = c.toString();
    // maxWidth 和 maxHeight 是 Infinity，应在输出中体现
    assert.ok(
      str.includes("Infinity") || str.includes("Inf") || str.includes("inf"),
      "默认约束的 toString 应包含 Infinity 标识"
    );
  });
});

// ════════════════════════════════════════════════════
//  不可变性测试
// ════════════════════════════════════════════════════

describe("BoxConstraints 不可变性", () => {
  // ── 45. loosen 不修改原实例 ────────────────────────
  it("loosen 不修改原实例", () => {
    const original = new BoxConstraints({ minWidth: 20, maxWidth: 80, minHeight: 10, maxHeight: 40 });
    const loosened = original.loosen();
    // 原实例不受影响
    assert.equal(original.minWidth, 20);
    assert.equal(original.minHeight, 10);
    // 返回的是新实例
    assert.notEqual(original, loosened);
  });

  // ── 46. tighten 不修改原实例 ───────────────────────
  it("tighten 不修改原实例", () => {
    const original = new BoxConstraints({ minWidth: 0, maxWidth: 80, minHeight: 0, maxHeight: 24 });
    const tightened = original.tighten({ width: 40, height: 12 });
    // 原实例不受影响
    assert.equal(original.minWidth, 0);
    assert.equal(original.minHeight, 0);
    // 返回的是新实例
    assert.notEqual(original, tightened);
  });

  // ── 47. enforce 不修改原实例 ───────────────────────
  it("enforce 不修改原实例", () => {
    const outer = new BoxConstraints({ minWidth: 0, maxWidth: 100, minHeight: 0, maxHeight: 50 });
    const inner = new BoxConstraints({ minWidth: 20, maxWidth: 200, minHeight: 10, maxHeight: 80 });
    const result = inner.enforce(outer);
    // inner 不受影响
    assert.equal(inner.maxWidth, 200);
    assert.equal(inner.maxHeight, 80);
    // 返回的是新实例
    assert.notEqual(inner, result);
  });
});
