/**
 * RenderFlex 单元测试。
 *
 * 使用 node:test + node:assert/strict，覆盖 Flex 布局引擎的核心行为：
 * FlexParentData 默认值、setupParentData、水平/垂直排列、主轴对齐、
 * 交叉轴对齐、弹性分配、MainAxisSize 等。
 *
 * 运行方式：
 * ```bash
 * npx tsx --test packages/tui/src/widgets/flex.test.ts
 * ```
 *
 * @module
 */

import * as assert from "node:assert/strict";
import { describe, it } from "node:test";
import { BoxConstraints } from "../tree/constraints.js";
import { RenderBox } from "../tree/render-box.js";
import type { Axis, CrossAxisAlignment, MainAxisAlignment } from "./flex.js";
import { FlexParentData, RenderFlex } from "./flex.js";

// ════════════════════════════════════════════════════
//  测试辅助
// ════════════════════════════════════════════════════

/**
 * 可实例化的 RenderBox 测试子类，用于模拟具有固定首选尺寸的子节点。
 *
 * 在 performLayout 中，将尺寸设为首选宽高经约束限定后的结果。
 * 固有尺寸直接返回给定的固定值，供 intrinsic size 测试使用。
 */
class FixedSizeBox extends RenderBox {
  private _w: number;
  private _h: number;
  constructor(w: number, h: number) {
    super();
    this._w = w;
    this._h = h;
  }
  performLayout(): void {
    this.size = this._constraints!.constrain(this._w, this._h);
  }
  override getMinIntrinsicWidth(_h: number): number {
    return this._w;
  }
  override getMaxIntrinsicWidth(_h: number): number {
    return this._w;
  }
  override getMinIntrinsicHeight(_w: number): number {
    return this._h;
  }
  override getMaxIntrinsicHeight(_w: number): number {
    return this._h;
  }
}

/**
 * 可实例化的 RenderBox 测试子类，用于模拟具有固定首选尺寸的子节点。
 *
 * 在 performLayout 中，将尺寸设为首选宽高经约束限定后的结果。
 */
class TestRenderBox extends RenderBox {
  private preferredWidth: number;
  private preferredHeight: number;

  constructor(preferredWidth: number, preferredHeight: number) {
    super();
    this.preferredWidth = preferredWidth;
    this.preferredHeight = preferredHeight;
  }

  performLayout(): void {
    this.size = this._constraints!.constrain(this.preferredWidth, this.preferredHeight);
  }
}

/**
 * 创建 RenderFlex 并添加子节点的辅助函数。
 */
function createFlex(
  opts: {
    direction?: Axis;
    mainAxisAlignment?: MainAxisAlignment;
    crossAxisAlignment?: CrossAxisAlignment;
    mainAxisSize?: "min" | "max";
  },
  children: Array<{
    box: RenderBox;
    flex?: number;
    fit?: "tight" | "loose";
  }>,
): RenderFlex {
  const flex = new RenderFlex(opts);
  for (const child of children) {
    flex.adoptChild(child.box);
    if (child.flex !== undefined || child.fit !== undefined) {
      const pd = child.box.parentData as FlexParentData;
      if (child.flex !== undefined) pd.flex = child.flex;
      if (child.fit !== undefined) pd.fit = child.fit;
    }
  }
  return flex;
}

// ════════════════════════════════════════════════════
//  1. FlexParentData 默认值
// ════════════════════════════════════════════════════

describe("FlexParentData", () => {
  it("默认 flex=0, fit='loose'", () => {
    const pd = new FlexParentData();
    assert.equal(pd.flex, 0);
    assert.equal(pd.fit, "loose");
  });
});

// ════════════════════════════════════════════════════
//  2. setupParentData
// ════════════════════════════════════════════════════

describe("RenderFlex -- setupParentData", () => {
  it("adoptChild 时为子节点设置 FlexParentData", () => {
    const flex = new RenderFlex();
    const child = new TestRenderBox(10, 10);
    flex.adoptChild(child);
    assert.ok(child.parentData instanceof FlexParentData);
  });
});

// ════════════════════════════════════════════════════
//  水平布局基础
// ════════════════════════════════════════════════════

describe("RenderFlex -- 水平布局基础", () => {
  // 3. 三个等宽子节点水平排列
  it("三个等宽子节点从左到右排列", () => {
    const c1 = new TestRenderBox(20, 10);
    const c2 = new TestRenderBox(20, 10);
    const c3 = new TestRenderBox(20, 10);
    const flex = createFlex({ direction: "horizontal", mainAxisAlignment: "start" }, [
      { box: c1 },
      { box: c2 },
      { box: c3 },
    ]);
    flex.layout(BoxConstraints.tight(100, 50));

    assert.equal(c1.offset.x, 0);
    assert.equal(c2.offset.x, 20);
    assert.equal(c3.offset.x, 40);
    // 所有子节点 y 偏移为 0（start 对齐）
    assert.equal(c1.offset.y, 0);
    assert.equal(c2.offset.y, 0);
    assert.equal(c3.offset.y, 0);
  });

  // 4. 不同高度的子节点 → 交叉轴取最大值
  it("不同高度的子节点，交叉轴取最大值", () => {
    const c1 = new TestRenderBox(20, 10);
    const c2 = new TestRenderBox(20, 30);
    const c3 = new TestRenderBox(20, 20);
    const flex = createFlex({ direction: "horizontal", mainAxisSize: "min" }, [
      { box: c1 },
      { box: c2 },
      { box: c3 },
    ]);
    flex.layout(BoxConstraints.loose(200, 100));

    // 交叉轴（高度）应为 30
    assert.equal(flex.size.height, 30);
    // 主轴（宽度）应为 60
    assert.equal(flex.size.width, 60);
  });

  // 5. 空子节点不报错
  it("没有子节点时不报错，尺寸为约束值", () => {
    const flex = createFlex({ direction: "horizontal", mainAxisSize: "max" }, []);
    flex.layout(BoxConstraints.tight(100, 50));
    assert.equal(flex.size.width, 100);
    assert.equal(flex.size.height, 50);
  });
});

// ════════════════════════════════════════════════════
//  MainAxisSize
// ════════════════════════════════════════════════════

describe("RenderFlex -- MainAxisSize", () => {
  // 6. mainAxisSize="max" 填满约束
  it("mainAxisSize='max' 填满约束主轴", () => {
    const c1 = new TestRenderBox(20, 10);
    const flex = createFlex({ direction: "horizontal", mainAxisSize: "max" }, [{ box: c1 }]);
    flex.layout(BoxConstraints.tight(100, 50));
    assert.equal(flex.size.width, 100);
  });

  // 7. mainAxisSize="min" 收缩到内容
  it("mainAxisSize='min' 收缩到内容大小", () => {
    const c1 = new TestRenderBox(20, 10);
    const c2 = new TestRenderBox(30, 10);
    const flex = createFlex({ direction: "horizontal", mainAxisSize: "min" }, [
      { box: c1 },
      { box: c2 },
    ]);
    flex.layout(BoxConstraints.loose(200, 100));
    assert.equal(flex.size.width, 50);
  });
});

// ════════════════════════════════════════════════════
//  MainAxisAlignment
// ════════════════════════════════════════════════════

describe("RenderFlex -- MainAxisAlignment", () => {
  // 8. start → 从起点开始
  it("'start' 对齐：子节点从主轴起点排列", () => {
    const c1 = new TestRenderBox(20, 10);
    const c2 = new TestRenderBox(30, 10);
    const flex = createFlex({ direction: "horizontal", mainAxisAlignment: "start" }, [
      { box: c1 },
      { box: c2 },
    ]);
    flex.layout(BoxConstraints.tight(100, 50));
    assert.equal(c1.offset.x, 0);
    assert.equal(c2.offset.x, 20);
  });

  // 9. end → 靠末尾
  it("'end' 对齐：子节点靠主轴末尾排列", () => {
    const c1 = new TestRenderBox(20, 10);
    const c2 = new TestRenderBox(30, 10);
    const flex = createFlex({ direction: "horizontal", mainAxisAlignment: "end" }, [
      { box: c1 },
      { box: c2 },
    ]);
    flex.layout(BoxConstraints.tight(100, 50));
    // 剩余空间 = 100 - 50 = 50
    assert.equal(c1.offset.x, 50);
    assert.equal(c2.offset.x, 70);
  });

  // 10. center → 居中
  it("'center' 对齐：子节点在主轴居中排列", () => {
    const c1 = new TestRenderBox(20, 10);
    const c2 = new TestRenderBox(30, 10);
    const flex = createFlex({ direction: "horizontal", mainAxisAlignment: "center" }, [
      { box: c1 },
      { box: c2 },
    ]);
    flex.layout(BoxConstraints.tight(100, 50));
    // 剩余空间 = 100 - 50 = 50，起始偏移 = 25
    assert.equal(c1.offset.x, 25);
    assert.equal(c2.offset.x, 45);
  });

  // 11. spaceBetween → 两端对齐，等间距
  it("'spaceBetween' 对齐：首尾在边缘，中间等间距", () => {
    const c1 = new TestRenderBox(10, 10);
    const c2 = new TestRenderBox(10, 10);
    const c3 = new TestRenderBox(10, 10);
    const flex = createFlex({ direction: "horizontal", mainAxisAlignment: "spaceBetween" }, [
      { box: c1 },
      { box: c2 },
      { box: c3 },
    ]);
    flex.layout(BoxConstraints.tight(100, 50));
    // 剩余空间 = 100 - 30 = 70，间距 = 70 / 2 = 35
    assert.equal(c1.offset.x, 0);
    assert.equal(c2.offset.x, 45);
    assert.equal(c3.offset.x, 90);
  });

  // 12. spaceAround → 每个子节点周围等间距
  it("'spaceAround' 对齐：每个子节点周围等间距", () => {
    const c1 = new TestRenderBox(10, 10);
    const c2 = new TestRenderBox(10, 10);
    const flex = createFlex({ direction: "horizontal", mainAxisAlignment: "spaceAround" }, [
      { box: c1 },
      { box: c2 },
    ]);
    flex.layout(BoxConstraints.tight(100, 50));
    // 剩余空间 = 100 - 20 = 80，gap = 80 / 2 = 40，起始偏移 = 40 / 2 = 20
    assert.equal(c1.offset.x, 20);
    assert.equal(c2.offset.x, 70);
  });

  // 13. spaceEvenly → 均匀分布（包含两端）
  it("'spaceEvenly' 对齐：均匀分布包含两端", () => {
    const c1 = new TestRenderBox(10, 10);
    const c2 = new TestRenderBox(10, 10);
    const flex = createFlex({ direction: "horizontal", mainAxisAlignment: "spaceEvenly" }, [
      { box: c1 },
      { box: c2 },
    ]);
    flex.layout(BoxConstraints.tight(100, 50));
    // 剩余空间 = 100 - 20 = 80，间距 = 80 / 3 ≈ 26.67，起始偏移 = 26.67
    const gap = 80 / 3;
    assert.ok(Math.abs(c1.offset.x - gap) < 0.01);
    assert.ok(Math.abs(c2.offset.x - (gap + 10 + gap)) < 0.01);
  });
});

// ════════════════════════════════════════════════════
//  CrossAxisAlignment
// ════════════════════════════════════════════════════

describe("RenderFlex -- CrossAxisAlignment", () => {
  // 14. start → 交叉轴起点
  it("'start' 交叉轴对齐：子节点位于交叉轴起点", () => {
    const c1 = new TestRenderBox(20, 10);
    const flex = createFlex(
      {
        direction: "horizontal",
        crossAxisAlignment: "start",
        mainAxisSize: "max",
      },
      [{ box: c1 }],
    );
    flex.layout(BoxConstraints.tight(100, 50));
    assert.equal(c1.offset.y, 0);
  });

  // 15. end → 交叉轴末尾
  it("'end' 交叉轴对齐：子节点位于交叉轴末尾", () => {
    const c1 = new TestRenderBox(20, 10);
    const flex = createFlex(
      {
        direction: "horizontal",
        crossAxisAlignment: "end",
        mainAxisSize: "max",
      },
      [{ box: c1 }],
    );
    flex.layout(BoxConstraints.tight(100, 50));
    // 交叉轴尺寸 = 50, 子节点高度 = 10, offset.y = 50 - 10 = 40
    assert.equal(c1.offset.y, 40);
  });

  // 16. center → 交叉轴居中
  it("'center' 交叉轴对齐：子节点在交叉轴居中", () => {
    const c1 = new TestRenderBox(20, 10);
    const flex = createFlex(
      {
        direction: "horizontal",
        crossAxisAlignment: "center",
        mainAxisSize: "max",
      },
      [{ box: c1 }],
    );
    flex.layout(BoxConstraints.tight(100, 50));
    // 交叉轴尺寸 = 50, 子节点高度 = 10, offset.y = (50 - 10) / 2 = 20
    assert.equal(c1.offset.y, 20);
  });

  // 17. stretch → 交叉轴拉伸到最大
  it("'stretch' 交叉轴对齐：子节点被拉伸到交叉轴最大值", () => {
    const c1 = new TestRenderBox(20, 10);
    const flex = createFlex(
      {
        direction: "horizontal",
        crossAxisAlignment: "stretch",
        mainAxisSize: "max",
      },
      [{ box: c1 }],
    );
    flex.layout(BoxConstraints.tight(100, 50));
    // stretch 时子节点的高度应为 50
    assert.equal(c1.size.height, 50);
    assert.equal(c1.offset.y, 0);
  });
});

// ════════════════════════════════════════════════════
//  弹性（Flex）分配
// ════════════════════════════════════════════════════

describe("RenderFlex -- 弹性分配", () => {
  // 18. 单个 flex=1 填满剩余空间
  it("单个 flex=1 填满剩余空间", () => {
    const fixed = new TestRenderBox(30, 10);
    const flexible = new TestRenderBox(0, 10);
    const flex = createFlex({ direction: "horizontal", mainAxisAlignment: "start" }, [
      { box: fixed },
      { box: flexible, flex: 1, fit: "tight" },
    ]);
    flex.layout(BoxConstraints.tight(100, 50));
    // 剩余 = 100 - 30 = 70
    assert.equal(flexible.size.width, 70);
    assert.equal(fixed.offset.x, 0);
    assert.equal(flexible.offset.x, 30);
  });

  // 19. 两个 flex=1 均分
  it("两个 flex=1 均分剩余空间", () => {
    const f1 = new TestRenderBox(0, 10);
    const f2 = new TestRenderBox(0, 10);
    const flex = createFlex({ direction: "horizontal", mainAxisAlignment: "start" }, [
      { box: f1, flex: 1, fit: "tight" },
      { box: f2, flex: 1, fit: "tight" },
    ]);
    flex.layout(BoxConstraints.tight(100, 50));
    assert.equal(f1.size.width, 50);
    assert.equal(f2.size.width, 50);
    assert.equal(f1.offset.x, 0);
    assert.equal(f2.offset.x, 50);
  });

  // 20. flex=2 和 flex=1 按 2:1 分配
  it("flex=2 和 flex=1 按 2:1 分配剩余空间", () => {
    const f1 = new TestRenderBox(0, 10);
    const f2 = new TestRenderBox(0, 10);
    const flex = createFlex({ direction: "horizontal", mainAxisAlignment: "start" }, [
      { box: f1, flex: 2, fit: "tight" },
      { box: f2, flex: 1, fit: "tight" },
    ]);
    flex.layout(BoxConstraints.tight(90, 50));
    // 90 / 3 = 30，flex=2 得 60，flex=1 得 30
    assert.ok(Math.abs(f1.size.width - 60) < 0.01);
    assert.ok(Math.abs(f2.size.width - 30) < 0.01);
  });

  // 21. 混合固定 + 弹性子节点
  it("混合固定宽度和弹性子节点正确分配", () => {
    const fixed1 = new TestRenderBox(20, 10);
    const flexible = new TestRenderBox(0, 10);
    const fixed2 = new TestRenderBox(30, 10);
    const flex = createFlex({ direction: "horizontal", mainAxisAlignment: "start" }, [
      { box: fixed1 },
      { box: flexible, flex: 1, fit: "tight" },
      { box: fixed2 },
    ]);
    flex.layout(BoxConstraints.tight(100, 50));
    // 固定总宽度 = 20 + 30 = 50, 剩余 = 50
    assert.equal(fixed1.offset.x, 0);
    assert.equal(flexible.offset.x, 20);
    assert.equal(flexible.size.width, 50);
    assert.equal(fixed2.offset.x, 70);
  });

  // 22. FlexFit="tight" 强制填满分配空间
  it("FlexFit='tight' 强制填满分配的空间", () => {
    const child = new TestRenderBox(10, 10);
    const flex = createFlex({ direction: "horizontal", mainAxisAlignment: "start" }, [
      { box: child, flex: 1, fit: "tight" },
    ]);
    flex.layout(BoxConstraints.tight(100, 50));
    // tight 约束下，即使首选宽度 10，也被强制设为 100
    assert.equal(child.size.width, 100);
  });

  // 23. FlexFit="loose" 允许小于分配空间
  it("FlexFit='loose' 允许子节点小于分配空间", () => {
    const child = new TestRenderBox(10, 10);
    const flex = createFlex({ direction: "horizontal", mainAxisAlignment: "start" }, [
      { box: child, flex: 1, fit: "loose" },
    ]);
    flex.layout(BoxConstraints.tight(100, 50));
    // loose 约束 0..100，首选宽度 10，所以结果为 10
    assert.equal(child.size.width, 10);
  });
});

// ════════════════════════════════════════════════════
//  垂直布局
// ════════════════════════════════════════════════════

describe("RenderFlex -- 垂直布局", () => {
  // 24. 三个子节点从上到下排列
  it("三个子节点从上到下排列", () => {
    const c1 = new TestRenderBox(10, 20);
    const c2 = new TestRenderBox(10, 30);
    const c3 = new TestRenderBox(10, 10);
    const flex = createFlex({ direction: "vertical", mainAxisAlignment: "start" }, [
      { box: c1 },
      { box: c2 },
      { box: c3 },
    ]);
    flex.layout(BoxConstraints.tight(50, 200));

    assert.equal(c1.offset.y, 0);
    assert.equal(c2.offset.y, 20);
    assert.equal(c3.offset.y, 50);
    // 交叉轴（x）全为 0
    assert.equal(c1.offset.x, 0);
    assert.equal(c2.offset.x, 0);
    assert.equal(c3.offset.x, 0);
  });

  // 25. 垂直方向居中对齐
  it("垂直方向 center 对齐", () => {
    const c1 = new TestRenderBox(10, 20);
    const c2 = new TestRenderBox(10, 20);
    const flex = createFlex({ direction: "vertical", mainAxisAlignment: "center" }, [
      { box: c1 },
      { box: c2 },
    ]);
    flex.layout(BoxConstraints.tight(50, 100));
    // 总高度 = 40, 剩余 = 60, 起始偏移 = 30
    assert.equal(c1.offset.y, 30);
    assert.equal(c2.offset.y, 50);
  });
});

// ════════════════════════════════════════════════════
//  边界情况
// ════════════════════════════════════════════════════

describe("RenderFlex -- 边界情况", () => {
  // 26. 单个子节点正确布局
  it("单个子节点正确布局", () => {
    const c1 = new TestRenderBox(30, 20);
    const flex = createFlex({ direction: "horizontal", mainAxisAlignment: "center" }, [
      { box: c1 },
    ]);
    flex.layout(BoxConstraints.tight(100, 50));
    // 居中：剩余 = 100 - 30 = 70, offset.x = 35
    assert.equal(c1.offset.x, 35);
    assert.equal(c1.size.width, 30);
    assert.equal(c1.size.height, 20);
  });

  // 27. 全部弹性子节点均分
  it("所有子节点都是弹性时均分空间", () => {
    const c1 = new TestRenderBox(0, 10);
    const c2 = new TestRenderBox(0, 10);
    const c3 = new TestRenderBox(0, 10);
    const flex = createFlex({ direction: "horizontal", mainAxisAlignment: "start" }, [
      { box: c1, flex: 1, fit: "tight" },
      { box: c2, flex: 1, fit: "tight" },
      { box: c3, flex: 1, fit: "tight" },
    ]);
    flex.layout(BoxConstraints.tight(90, 30));
    assert.equal(c1.size.width, 30);
    assert.equal(c2.size.width, 30);
    assert.equal(c3.size.width, 30);
    assert.equal(c1.offset.x, 0);
    assert.equal(c2.offset.x, 30);
    assert.equal(c3.offset.x, 60);
  });

  // 28. 剩余空间为零时 spaceBetween 不报错
  it("剩余空间为零时 spaceBetween 不报错", () => {
    const c1 = new TestRenderBox(50, 10);
    const c2 = new TestRenderBox(50, 10);
    const flex = createFlex({ direction: "horizontal", mainAxisAlignment: "spaceBetween" }, [
      { box: c1 },
      { box: c2 },
    ]);
    flex.layout(BoxConstraints.tight(100, 50));
    // 剩余空间 = 0，间距 = 0
    assert.equal(c1.offset.x, 0);
    assert.equal(c2.offset.x, 50);
  });
});

// ════════════════════════════════════════════════════
//  额外覆盖
// ════════════════════════════════════════════════════

describe("RenderFlex -- 额外覆盖", () => {
  it("垂直方向 stretch 拉伸交叉轴宽度", () => {
    const c1 = new TestRenderBox(10, 20);
    const flex = createFlex({ direction: "vertical", crossAxisAlignment: "stretch" }, [
      { box: c1 },
    ]);
    flex.layout(BoxConstraints.tight(80, 100));
    // stretch 时子节点的宽度应为 80
    assert.equal(c1.size.width, 80);
  });

  it("垂直方向 end 交叉轴对齐", () => {
    const c1 = new TestRenderBox(10, 20);
    const flex = createFlex({ direction: "vertical", crossAxisAlignment: "end" }, [{ box: c1 }]);
    flex.layout(BoxConstraints.tight(80, 100));
    // 交叉轴（宽度）= 80, 子节点宽度 = 10, offset.x = 80 - 10 = 70
    assert.equal(c1.offset.x, 70);
  });

  it("垂直方向 center 交叉轴对齐", () => {
    const c1 = new TestRenderBox(10, 20);
    const flex = createFlex({ direction: "vertical", crossAxisAlignment: "center" }, [{ box: c1 }]);
    flex.layout(BoxConstraints.tight(80, 100));
    // 交叉轴（宽度）= 80, 子节点宽度 = 10, offset.x = (80 - 10) / 2 = 35
    assert.equal(c1.offset.x, 35);
  });

  it("spaceBetween 只有一个子节点时不报错，子节点在起点", () => {
    const c1 = new TestRenderBox(20, 10);
    const flex = createFlex({ direction: "horizontal", mainAxisAlignment: "spaceBetween" }, [
      { box: c1 },
    ]);
    flex.layout(BoxConstraints.tight(100, 50));
    assert.equal(c1.offset.x, 0);
  });

  it("垂直方向弹性子节点填满剩余高度", () => {
    const fixed = new TestRenderBox(10, 30);
    const flexible = new TestRenderBox(10, 0);
    const flex = createFlex({ direction: "vertical", mainAxisAlignment: "start" }, [
      { box: fixed },
      { box: flexible, flex: 1, fit: "tight" },
    ]);
    flex.layout(BoxConstraints.tight(50, 100));
    // 剩余 = 100 - 30 = 70
    assert.equal(flexible.size.height, 70);
    assert.equal(fixed.offset.y, 0);
    assert.equal(flexible.offset.y, 30);
  });

  it("构造函数默认值正确", () => {
    const flex = new RenderFlex();
    assert.equal(flex.direction, "horizontal");
    assert.equal(flex.mainAxisAlignment, "start");
    assert.equal(flex.crossAxisAlignment, "start");
    assert.equal(flex.mainAxisSize, "max");
  });
});

// ════════════════════════════════════════════════════
//  整数空间分配 (amp s1T line 402)
// ════════════════════════════════════════════════════

describe("RenderFlex — integer space allocation (amp s1T alignment)", () => {
  it("flex children get integer main-axis sizes, last child gets remainder", () => {
    const child1 = new TestRenderBox(0, 10);
    const child2 = new TestRenderBox(0, 10);
    const child3 = new TestRenderBox(0, 10);

    const flex = createFlex({ direction: "horizontal", mainAxisSize: "max" }, [
      { box: child1, flex: 1, fit: "tight" },
      { box: child2, flex: 1, fit: "tight" },
      { box: child3, flex: 1, fit: "tight" },
    ]);

    // Layout with width=100 — 100/3 = 33.333... per child
    // Expected: 33, 33, 34 (last gets remainder)
    const constraints = BoxConstraints.tight(100, 10);
    flex.layout(constraints);

    const w1 = child1.size.width;
    const w2 = child2.size.width;
    const w3 = child3.size.width;

    assert.equal(Number.isInteger(w1), true, `child1 width should be integer, got ${w1}`);
    assert.equal(Number.isInteger(w2), true, `child2 width should be integer, got ${w2}`);
    assert.equal(Number.isInteger(w3), true, `child3 width should be integer, got ${w3}`);
    assert.equal(w1 + w2 + w3, 100, "total should equal container width");
    // First two should be floor(100/3) = 33, last gets 100 - 33 - 33 = 34
    assert.equal(w1, 33);
    assert.equal(w2, 33);
    assert.equal(w3, 34);
  });

  it("evenly divisible flex allocation produces equal sizes", () => {
    const child1 = new TestRenderBox(0, 10);
    const child2 = new TestRenderBox(0, 10);

    const flex = createFlex({ direction: "horizontal", mainAxisSize: "max" }, [
      { box: child1, flex: 1, fit: "tight" },
      { box: child2, flex: 1, fit: "tight" },
    ]);

    // 80 / 2 = 40 — evenly divisible, no remainder issue
    const constraints = BoxConstraints.tight(80, 10);
    flex.layout(constraints);

    assert.equal(child1.size.width, 40);
    assert.equal(child2.size.width, 40);
  });

  it("vertical flex also uses integer allocation", () => {
    const child1 = new TestRenderBox(10, 0);
    const child2 = new TestRenderBox(10, 0);
    const child3 = new TestRenderBox(10, 0);

    const flex = createFlex({ direction: "vertical", mainAxisSize: "max" }, [
      { box: child1, flex: 1, fit: "tight" },
      { box: child2, flex: 1, fit: "tight" },
      { box: child3, flex: 1, fit: "tight" },
    ]);

    const constraints = BoxConstraints.tight(10, 25);
    flex.layout(constraints);

    const h1 = child1.size.height;
    const h2 = child2.size.height;
    const h3 = child3.size.height;

    assert.equal(Number.isInteger(h1), true, `child1 height should be integer, got ${h1}`);
    assert.equal(Number.isInteger(h2), true, `child2 height should be integer, got ${h2}`);
    assert.equal(Number.isInteger(h3), true, `child3 height should be integer, got ${h3}`);
    assert.equal(h1 + h2 + h3, 25, "total should equal container height");
  });
});

// ════════════════════════════════════════════════════
//  RenderFlex — intrinsic sizes (amp s1T alignment)
// ════════════════════════════════════════════════════

describe("RenderFlex — intrinsic sizes (amp s1T alignment)", () => {
  it("Row: getMinIntrinsicWidth = sum of non-flex children minWidths", () => {
    const flex = new RenderFlex({ direction: "horizontal" });
    const fixed1 = new FixedSizeBox(10, 5);
    const fixed2 = new FixedSizeBox(20, 5);
    const flexChild = new FixedSizeBox(30, 5);

    flex.adoptChild(fixed1);
    flex.adoptChild(fixed2);
    flex.adoptChild(flexChild);
    (flexChild.parentData as FlexParentData).flex = 1;

    // non-flex: 10 + 20 = 30; flex child contributes 0 for min
    assert.equal(flex.getMinIntrinsicWidth(Infinity), 30);
  });

  it("Row: getMaxIntrinsicWidth = sum of ALL children maxWidths", () => {
    const flex = new RenderFlex({ direction: "horizontal" });
    const fixed1 = new FixedSizeBox(10, 5);
    const fixed2 = new FixedSizeBox(20, 5);
    const flexChild = new FixedSizeBox(30, 5);

    flex.adoptChild(fixed1);
    flex.adoptChild(fixed2);
    flex.adoptChild(flexChild);
    (flexChild.parentData as FlexParentData).flex = 1;

    // All children: 10 + 20 + 30 = 60
    assert.equal(flex.getMaxIntrinsicWidth(Infinity), 60);
  });

  it("Row: getMinIntrinsicHeight = max of children minHeights (cross axis)", () => {
    const flex = new RenderFlex({ direction: "horizontal" });
    const child1 = new FixedSizeBox(10, 3);
    const child2 = new FixedSizeBox(10, 7);

    flex.adoptChild(child1);
    flex.adoptChild(child2);

    assert.equal(flex.getMinIntrinsicHeight(Infinity), 7);
  });

  it("Column: getMinIntrinsicHeight = sum of non-flex children minHeights", () => {
    const flex = new RenderFlex({ direction: "vertical" });
    const fixed1 = new FixedSizeBox(10, 5);
    const flexChild = new FixedSizeBox(10, 8);

    flex.adoptChild(fixed1);
    flex.adoptChild(flexChild);
    (flexChild.parentData as FlexParentData).flex = 1;

    assert.equal(flex.getMinIntrinsicHeight(Infinity), 5);
  });

  it("Column: getMaxIntrinsicHeight = sum of ALL children maxHeights", () => {
    const flex = new RenderFlex({ direction: "vertical" });
    const fixed1 = new FixedSizeBox(10, 5);
    const flexChild = new FixedSizeBox(10, 8);

    flex.adoptChild(fixed1);
    flex.adoptChild(flexChild);
    (flexChild.parentData as FlexParentData).flex = 1;

    assert.equal(flex.getMaxIntrinsicHeight(Infinity), 13);
  });

  it("Column: getMinIntrinsicWidth = max of all children (cross axis)", () => {
    const flex = new RenderFlex({ direction: "vertical" });
    const child1 = new FixedSizeBox(15, 5);
    const child2 = new FixedSizeBox(25, 5);

    flex.adoptChild(child1);
    flex.adoptChild(child2);

    assert.equal(flex.getMinIntrinsicWidth(Infinity), 25);
  });
});
