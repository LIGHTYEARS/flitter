/**
 * Container 及相关组件单元测试。
 *
 * 使用 node:test + node:assert/strict，覆盖 EdgeInsets、RenderPadding、
 * RenderSizedBox、Container 等组件的核心行为。
 *
 * 运行方式：
 * ```bash
 * npx tsx --test packages/tui/src/widgets/container.test.ts
 * ```
 *
 * @module
 */

import * as assert from "node:assert/strict";
import { describe, it } from "node:test";
import { BoxConstraints } from "../tree/constraints.js";
import { RenderBox } from "../tree/render-box.js";
import { Container } from "./container.js";
import { EdgeInsets } from "./edge-insets.js";
import { Padding, RenderPadding } from "./padding.js";
import { RenderSizedBox, SizedBox } from "./sized-box.js";

// ════════════════════════════════════════════════════
//  测试辅助
// ════════════════════════════════════════════════════

/**
 * 可实例化的 RenderBox 测试子类，用于模拟具有固定首选尺寸的子节点。
 *
 * 在 performLayout 中，将尺寸设为首选宽高经约束限定后的结果。
 */
class TestRenderBox extends RenderBox {
  private preferredW: number;
  private preferredH: number;

  constructor(preferredW: number, preferredH: number) {
    super();
    this.preferredW = preferredW;
    this.preferredH = preferredH;
  }

  performLayout(): void {
    this.size = this._constraints!.constrain(this.preferredW, this.preferredH);
  }
}

// ════════════════════════════════════════════════════
//  1. EdgeInsets 工厂方法测试
// ════════════════════════════════════════════════════

describe("EdgeInsets 工厂方法", () => {
  it("all(8) 创建四边相同间距", () => {
    const ei = EdgeInsets.all(8);
    assert.equal(ei.left, 8);
    assert.equal(ei.top, 8);
    assert.equal(ei.right, 8);
    assert.equal(ei.bottom, 8);
  });

  it("symmetric 创建对称间距", () => {
    const ei = EdgeInsets.symmetric({ horizontal: 10, vertical: 5 });
    assert.equal(ei.left, 10);
    assert.equal(ei.right, 10);
    assert.equal(ei.top, 5);
    assert.equal(ei.bottom, 5);
  });

  it("horizontal 创建仅水平间距", () => {
    const ei = EdgeInsets.horizontal(12);
    assert.equal(ei.left, 12);
    assert.equal(ei.right, 12);
    assert.equal(ei.top, 0);
    assert.equal(ei.bottom, 0);
  });

  it("vertical 创建仅垂直间距", () => {
    const ei = EdgeInsets.vertical(6);
    assert.equal(ei.left, 0);
    assert.equal(ei.right, 0);
    assert.equal(ei.top, 6);
    assert.equal(ei.bottom, 6);
  });

  it("only 创建单方向间距", () => {
    const ei = EdgeInsets.only({ left: 1, bottom: 3 });
    assert.equal(ei.left, 1);
    assert.equal(ei.top, 0);
    assert.equal(ei.right, 0);
    assert.equal(ei.bottom, 3);
  });

  it("zero 为全零实例", () => {
    const ei = EdgeInsets.zero;
    assert.equal(ei.left, 0);
    assert.equal(ei.top, 0);
    assert.equal(ei.right, 0);
    assert.equal(ei.bottom, 0);
  });
});

// ════════════════════════════════════════════════════
//  2. EdgeInsets 属性测试
// ════════════════════════════════════════════════════

describe("EdgeInsets 属性", () => {
  it("horizontal 返回左右之和", () => {
    const ei = EdgeInsets.only({ left: 3, right: 7 });
    assert.equal(ei.horizontal, 10);
  });

  it("vertical 返回上下之和", () => {
    const ei = EdgeInsets.only({ top: 4, bottom: 6 });
    assert.equal(ei.vertical, 10);
  });

  it("equals 返回 true（值相同）", () => {
    const a = EdgeInsets.all(5);
    const b = EdgeInsets.all(5);
    assert.ok(a.equals(b));
  });

  it("equals 返回 false（值不同）", () => {
    const a = EdgeInsets.all(5);
    const b = EdgeInsets.all(6);
    assert.ok(!a.equals(b));
  });
});

// ════════════════════════════════════════════════════
//  3. RenderPadding 测试
// ════════════════════════════════════════════════════

describe("RenderPadding", () => {
  it("收缩约束传递给子节点", () => {
    const padding = new RenderPadding(EdgeInsets.all(10));
    const child = new TestRenderBox(50, 30);
    padding.adoptChild(child);

    padding.layout(BoxConstraints.loose(100, 80));

    // 子节点收到的约束：max 100-20=80, 80-20=60
    // 子节点首选 50x30，在约束 0..80 x 0..60 内 => 50x30
    assert.equal(child.size.width, 50);
    assert.equal(child.size.height, 30);
  });

  it("子节点偏移为 (left, top)", () => {
    const padding = new RenderPadding(EdgeInsets.only({ left: 5, top: 3, right: 7, bottom: 9 }));
    const child = new TestRenderBox(20, 10);
    padding.adoptChild(child);

    padding.layout(BoxConstraints.loose(100, 100));

    assert.equal(child.offset.x, 5);
    assert.equal(child.offset.y, 3);
  });

  it("自身尺寸 = 子节点尺寸 + 间距", () => {
    const insets = EdgeInsets.symmetric({ horizontal: 8, vertical: 4 });
    const padding = new RenderPadding(insets);
    const child = new TestRenderBox(40, 20);
    padding.adoptChild(child);

    padding.layout(BoxConstraints.loose(200, 200));

    // 子节点: 40x20, 间距: 16x8 => 56x28
    assert.equal(padding.size.width, 56);
    assert.equal(padding.size.height, 28);
  });

  it("无子节点时尺寸为间距经约束限定", () => {
    const padding = new RenderPadding(EdgeInsets.all(15));
    padding.layout(BoxConstraints.loose(100, 100));

    // 无子节点: constrain(30, 30) in 0..100 x 0..100 => 30x30
    assert.equal(padding.size.width, 30);
    assert.equal(padding.size.height, 30);
  });
});

// ════════════════════════════════════════════════════
//  4. RenderSizedBox 测试
// ════════════════════════════════════════════════════

describe("RenderSizedBox", () => {
  it("仅指定宽度时高度使用父约束", () => {
    const sizedBox = new RenderSizedBox(50, undefined);
    const child = new TestRenderBox(100, 30);
    sizedBox.adoptChild(child);

    sizedBox.layout(BoxConstraints.loose(200, 200));

    // 子约束: width 紧 50, height 0..200
    // 子节点首选 100x30，约束后 50x30
    assert.equal(sizedBox.size.width, 50);
    assert.equal(sizedBox.size.height, 30);
  });

  it("仅指定高度时宽度使用父约束", () => {
    const sizedBox = new RenderSizedBox(undefined, 40);
    const child = new TestRenderBox(60, 100);
    sizedBox.adoptChild(child);

    sizedBox.layout(BoxConstraints.loose(200, 200));

    // 子约束: width 0..200, height 紧 40
    // 子节点首选 60x100，约束后 60x40
    assert.equal(sizedBox.size.width, 60);
    assert.equal(sizedBox.size.height, 40);
  });

  it("同时指定宽高时两个维度都为紧约束", () => {
    const sizedBox = new RenderSizedBox(80, 60);
    const child = new TestRenderBox(200, 200);
    sizedBox.adoptChild(child);

    sizedBox.layout(BoxConstraints.loose(300, 300));

    assert.equal(sizedBox.size.width, 80);
    assert.equal(sizedBox.size.height, 60);
  });

  it("仅指定宽度时子节点高度受父约束影响", () => {
    const sizedBox = new RenderSizedBox(50, undefined);
    const child = new TestRenderBox(100, 300);
    sizedBox.adoptChild(child);

    // 父约束最大高度 80
    sizedBox.layout(BoxConstraints.loose(200, 80));

    assert.equal(sizedBox.size.width, 50);
    assert.equal(sizedBox.size.height, 80); // 受父约束限制
  });

  it("无子节点时使用请求值经约束限定", () => {
    const sizedBox = new RenderSizedBox(100, 50);
    sizedBox.layout(BoxConstraints.loose(200, 200));

    assert.equal(sizedBox.size.width, 100);
    assert.equal(sizedBox.size.height, 50);
  });

  it("无维度指定时尺寸为零经约束限定", () => {
    const sizedBox = new RenderSizedBox(undefined, undefined);
    sizedBox.layout(BoxConstraints.loose(200, 200));

    // constrain(0, 0) in 0..200 x 0..200 => 0x0
    assert.equal(sizedBox.size.width, 0);
    assert.equal(sizedBox.size.height, 0);
  });
});

// ════════════════════════════════════════════════════
//  5. Container 测试
// ════════════════════════════════════════════════════

describe("Container", () => {
  it("仅指定 padding 时构建 Padding Widget", () => {
    const container = new Container({
      padding: EdgeInsets.all(10),
    });
    const built = container.build(null as never);
    assert.ok(built instanceof Padding);
  });

  it("仅指定尺寸时构建 SizedBox Widget", () => {
    const container = new Container({
      width: 100,
      height: 50,
    });
    const built = container.build(null as never);
    assert.ok(built instanceof SizedBox);
  });

  it("同时指定 padding 和尺寸时外层为 Padding 内层为 SizedBox", () => {
    const container = new Container({
      padding: EdgeInsets.all(5),
      width: 80,
      height: 40,
    });
    const built = container.build(null as never);

    // 外层是 Padding
    assert.ok(built instanceof Padding);
    // 内层子 Widget 是 SizedBox
    const paddingWidget = built as Padding;
    assert.ok(paddingWidget.child instanceof SizedBox);
  });

  it("仅有子 Widget 时直接返回子 Widget", () => {
    const childSizedBox = new SizedBox({ width: 10, height: 10 });
    const container = new Container({
      child: childSizedBox as never,
    });
    const built = container.build(null as never);
    assert.equal(built, childSizedBox);
  });
});

// ════════════════════════════════════════════════════
//  6. 嵌套测试
// ════════════════════════════════════════════════════

describe("嵌套布局", () => {
  it("嵌套 Padding > Padding 正确累加间距", () => {
    // 外层 Padding: all(10)
    const outer = new RenderPadding(EdgeInsets.all(10));
    // 内层 Padding: all(5)
    const inner = new RenderPadding(EdgeInsets.all(5));
    // 叶子节点: 20x20
    const leaf = new TestRenderBox(20, 20);

    outer.adoptChild(inner);
    inner.adoptChild(leaf);

    outer.layout(BoxConstraints.loose(200, 200));

    // 叶子: 20x20
    assert.equal(leaf.size.width, 20);
    assert.equal(leaf.size.height, 20);

    // 内层: 20+10=30 x 20+10=30, offset=(5,5)
    assert.equal(inner.size.width, 30);
    assert.equal(inner.size.height, 30);
    assert.equal(leaf.offset.x, 5);
    assert.equal(leaf.offset.y, 5);

    // 外层: 30+20=50 x 30+20=50, inner.offset=(10,10)
    assert.equal(outer.size.width, 50);
    assert.equal(outer.size.height, 50);
    assert.equal(inner.offset.x, 10);
    assert.equal(inner.offset.y, 10);
  });
});

// ════════════════════════════════════════════════════
//  7. EdgeInsets 不可变性测试
// ════════════════════════════════════════════════════

describe("EdgeInsets 不可变性", () => {
  it("实例被 Object.freeze 冻结", () => {
    const ei = EdgeInsets.all(5);
    assert.ok(Object.isFrozen(ei));
  });
});

// ════════════════════════════════════════════════════
//  8. RenderPadding 属性更新测试
// ════════════════════════════════════════════════════

describe("RenderPadding 属性更新", () => {
  it("设置新 padding 后重新布局尺寸正确", () => {
    const padding = new RenderPadding(EdgeInsets.all(10));
    const child = new TestRenderBox(40, 20);
    padding.adoptChild(child);

    padding.layout(BoxConstraints.loose(200, 200));
    assert.equal(padding.size.width, 60); // 40+20

    // 更新 padding
    padding.padding = EdgeInsets.all(20);
    padding.layout(BoxConstraints.loose(200, 200));
    assert.equal(padding.size.width, 80); // 40+40
    assert.equal(padding.size.height, 60); // 20+40
  });
});

// ════════════════════════════════════════════════════
//  9. EdgeInsets toString 测试
// ════════════════════════════════════════════════════

describe("EdgeInsets toString", () => {
  it("返回可读的调试字符串", () => {
    const ei = EdgeInsets.only({ left: 1, top: 2, right: 3, bottom: 4 });
    assert.equal(ei.toString(), "EdgeInsets(left: 1, top: 2, right: 3, bottom: 4)");
  });
});
