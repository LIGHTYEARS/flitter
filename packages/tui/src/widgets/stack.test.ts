/**
 * Stack / Positioned Widget 单元测试。
 *
 * 使用 node:test + node:assert/strict，覆盖 Stack 层叠布局的核心行为：
 * StackParentData 默认值、setupParentData、非定位子节点布局、Stack 尺寸确定、
 * 对齐方式、Positioned 定位、混合布局和边界情况。
 *
 * 运行方式：
 * ```bash
 * npx tsx --test packages/tui/src/widgets/stack.test.ts
 * ```
 *
 * @module
 */

import * as assert from "node:assert/strict";
import { describe, it } from "node:test";
import { BoxConstraints } from "../tree/constraints.js";
import { RenderBox } from "../tree/render-box.js";
import { Positioned, RenderStack, Stack, StackParentData } from "./stack.js";

// ════════════════════════════════════════════════════
//  测试辅助
// ════════════════════════════════════════════════════

/**
 * 可实例化的 RenderBox 测试子类，用于模拟具有固定首选尺寸的子节点。
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
 * 创建 RenderStack，添加子节点，设置 StackParentData，并执行布局。
 *
 * @param args - 配置参数
 * @param args.alignment - 对齐方式
 * @param args.children - 子节点配置数组
 * @param constraints - 布局约束
 * @returns 已完成布局的 RenderStack
 */
function buildStack(
  args: {
    alignment?:
      | "topLeft"
      | "topCenter"
      | "topRight"
      | "centerLeft"
      | "center"
      | "centerRight"
      | "bottomLeft"
      | "bottomCenter"
      | "bottomRight";
    children: Array<{
      width: number;
      height: number;
      left?: number;
      top?: number;
      right?: number;
      bottom?: number;
      positioned?: boolean;
    }>;
  },
  constraints: BoxConstraints,
): RenderStack {
  const stack = new RenderStack({ alignment: args.alignment });

  for (const childConfig of args.children) {
    const child = new TestRenderBox(childConfig.width, childConfig.height);
    stack.adoptChild(child);

    if (childConfig.positioned) {
      const pd = child.parentData as StackParentData;
      pd.left = childConfig.left;
      pd.top = childConfig.top;
      pd.right = childConfig.right;
      pd.bottom = childConfig.bottom;
      pd.isPositioned = true;
    }
  }

  stack.layout(constraints);
  return stack;
}

/**
 * 获取 RenderStack 的第 n 个子 RenderBox。
 */
function getChild(stack: RenderStack, index: number): RenderBox {
  return stack.children[index] as RenderBox;
}

// ════════════════════════════════════════════════════
//  1. StackParentData 默认值
// ════════════════════════════════════════════════════

describe("StackParentData", () => {
  it("默认值全部为 undefined，isPositioned 为 false", () => {
    const pd = new StackParentData();
    assert.equal(pd.left, undefined);
    assert.equal(pd.top, undefined);
    assert.equal(pd.right, undefined);
    assert.equal(pd.bottom, undefined);
    assert.equal(pd.isPositioned, false);
  });

  it("setupParentData 为子节点设置 StackParentData", () => {
    const stack = new RenderStack();
    const child = new TestRenderBox(10, 10);
    stack.adoptChild(child);

    assert.ok(child.parentData instanceof StackParentData);
  });
});

// ════════════════════════════════════════════════════
//  2. 非定位子节点布局
// ════════════════════════════════════════════════════

describe("非定位子节点布局", () => {
  it("单个非定位子节点 -- Stack 尺寸等于子节点尺寸", () => {
    const stack = buildStack(
      { children: [{ width: 40, height: 30 }] },
      BoxConstraints.loose(100, 100),
    );

    assert.equal(stack.size.width, 40);
    assert.equal(stack.size.height, 30);
  });

  it("多个非定位子节点 -- Stack 尺寸取最大子节点", () => {
    const stack = buildStack(
      {
        children: [
          { width: 40, height: 20 },
          { width: 30, height: 50 },
          { width: 60, height: 10 },
        ],
      },
      BoxConstraints.loose(100, 100),
    );

    assert.equal(stack.size.width, 60);
    assert.equal(stack.size.height, 50);
  });

  it("非定位子节点默认 topLeft 对齐（偏移均为 0）", () => {
    const stack = buildStack(
      {
        children: [
          { width: 40, height: 30 },
          { width: 20, height: 10 },
        ],
      },
      BoxConstraints.loose(100, 100),
    );

    assert.equal(getChild(stack, 0).offset.x, 0);
    assert.equal(getChild(stack, 0).offset.y, 0);
    assert.equal(getChild(stack, 1).offset.x, 0);
    assert.equal(getChild(stack, 1).offset.y, 0);
  });
});

// ════════════════════════════════════════════════════
//  3. Stack 尺寸确定
// ════════════════════════════════════════════════════

describe("Stack 尺寸确定", () => {
  it("无非定位子节点 -- 使用约束最大值", () => {
    const stack = buildStack(
      {
        children: [{ width: 20, height: 10, left: 5, top: 5, positioned: true }],
      },
      BoxConstraints.tight(100, 80),
    );

    assert.equal(stack.size.width, 100);
    assert.equal(stack.size.height, 80);
  });

  it("有非定位子节点 -- 使用最大子节点尺寸（受约束限制）", () => {
    const stack = buildStack(
      {
        children: [
          { width: 60, height: 40 },
          { width: 30, height: 50 },
        ],
      },
      BoxConstraints.loose(100, 100),
    );

    assert.equal(stack.size.width, 60);
    assert.equal(stack.size.height, 50);
  });
});

// ════════════════════════════════════════════════════
//  4. 对齐方式
// ════════════════════════════════════════════════════

describe("Stack 对齐方式", () => {
  it("topLeft -- 子节点偏移 (0, 0)", () => {
    const stack = buildStack(
      {
        alignment: "topLeft",
        children: [{ width: 20, height: 10 }],
      },
      BoxConstraints.tight(100, 80),
    );

    assert.equal(getChild(stack, 0).offset.x, 0);
    assert.equal(getChild(stack, 0).offset.y, 0);
  });

  it("center -- 子节点居中", () => {
    const stack = buildStack(
      {
        alignment: "center",
        children: [
          { width: 100, height: 80 }, // 决定 Stack 大小
          { width: 20, height: 10 }, // 被居中
        ],
      },
      BoxConstraints.loose(200, 200),
    );

    // Stack 尺寸 = 100x80，子节点 20x10
    // x = (100 - 20) / 2 = 40，y = (80 - 10) / 2 = 35
    assert.equal(getChild(stack, 1).offset.x, 40);
    assert.equal(getChild(stack, 1).offset.y, 35);
  });

  it("bottomRight -- 子节点在右下角", () => {
    const stack = buildStack(
      {
        alignment: "bottomRight",
        children: [
          { width: 100, height: 80 }, // 决定 Stack 大小
          { width: 20, height: 10 }, // 放右下角
        ],
      },
      BoxConstraints.loose(200, 200),
    );

    // x = 100 - 20 = 80，y = 80 - 10 = 70
    assert.equal(getChild(stack, 1).offset.x, 80);
    assert.equal(getChild(stack, 1).offset.y, 70);
  });

  it("topCenter -- 子节点水平居中、垂直靠顶", () => {
    const stack = buildStack(
      {
        alignment: "topCenter",
        children: [
          { width: 100, height: 80 }, // 决定 Stack 大小
          { width: 20, height: 10 }, // 被对齐
        ],
      },
      BoxConstraints.loose(200, 200),
    );

    // x = (100 - 20) / 2 = 40，y = 0
    assert.equal(getChild(stack, 1).offset.x, 40);
    assert.equal(getChild(stack, 1).offset.y, 0);
  });
});

// ════════════════════════════════════════════════════
//  5. Positioned 定位
// ════════════════════════════════════════════════════

describe("Positioned 定位", () => {
  it("Positioned(left=10, top=5) -- 偏移 (10, 5)", () => {
    const stack = buildStack(
      {
        children: [
          { width: 100, height: 80 }, // 非定位子节点，决定大小
          { width: 20, height: 10, left: 10, top: 5, positioned: true },
        ],
      },
      BoxConstraints.loose(200, 200),
    );

    assert.equal(getChild(stack, 1).offset.x, 10);
    assert.equal(getChild(stack, 1).offset.y, 5);
  });

  it("Positioned(right=10, bottom=5) -- 计算偏移", () => {
    const stack = buildStack(
      {
        children: [
          { width: 100, height: 80 }, // 非定位子节点，决定大小
          { width: 20, height: 10, right: 10, bottom: 5, positioned: true },
        ],
      },
      BoxConstraints.loose(200, 200),
    );

    // x = 100 - 10 - 20 = 70，y = 80 - 5 - 10 = 65
    assert.equal(getChild(stack, 1).offset.x, 70);
    assert.equal(getChild(stack, 1).offset.y, 65);
  });

  it("Positioned(left=0, right=0) -- 子节点宽度等于 Stack 宽度（紧约束）", () => {
    const stack = buildStack(
      {
        children: [
          { width: 100, height: 80 }, // 非定位子节点
          { width: 50, height: 10, left: 0, right: 0, positioned: true },
        ],
      },
      BoxConstraints.loose(200, 200),
    );

    // left=0 + right=0 → tightWidth = 100 - 0 - 0 = 100
    assert.equal(getChild(stack, 1).size.width, 100);
    assert.equal(getChild(stack, 1).offset.x, 0);
  });

  it("Positioned(top=0, bottom=0) -- 子节点高度等于 Stack 高度（紧约束）", () => {
    const stack = buildStack(
      {
        children: [
          { width: 100, height: 80 }, // 非定位子节点
          { width: 10, height: 20, top: 0, bottom: 0, positioned: true },
        ],
      },
      BoxConstraints.loose(200, 200),
    );

    // top=0 + bottom=0 → tightHeight = 80 - 0 - 0 = 80
    assert.equal(getChild(stack, 1).size.height, 80);
    assert.equal(getChild(stack, 1).offset.y, 0);
  });
});

// ════════════════════════════════════════════════════
//  6. 混合布局
// ════════════════════════════════════════════════════

describe("混合布局", () => {
  it("非定位子节点 + Positioned 子节点共存", () => {
    const stack = buildStack(
      {
        children: [
          { width: 80, height: 60 }, // 非定位
          { width: 20, height: 10, left: 5, top: 10, positioned: true },
        ],
      },
      BoxConstraints.loose(200, 200),
    );

    // Stack 尺寸由非定位子节点决定
    assert.equal(stack.size.width, 80);
    assert.equal(stack.size.height, 60);

    // 非定位子节点在 topLeft
    assert.equal(getChild(stack, 0).offset.x, 0);
    assert.equal(getChild(stack, 0).offset.y, 0);

    // 定位子节点
    assert.equal(getChild(stack, 1).offset.x, 5);
    assert.equal(getChild(stack, 1).offset.y, 10);
  });

  it("多个 Positioned 子节点重叠", () => {
    const stack = buildStack(
      {
        children: [
          { width: 100, height: 80 }, // 非定位
          { width: 30, height: 20, left: 10, top: 10, positioned: true },
          { width: 30, height: 20, left: 20, top: 20, positioned: true },
        ],
      },
      BoxConstraints.loose(200, 200),
    );

    assert.equal(getChild(stack, 1).offset.x, 10);
    assert.equal(getChild(stack, 1).offset.y, 10);
    assert.equal(getChild(stack, 2).offset.x, 20);
    assert.equal(getChild(stack, 2).offset.y, 20);
  });
});

// ════════════════════════════════════════════════════
//  7. 边界情况
// ════════════════════════════════════════════════════

describe("Stack 边界情况", () => {
  it("空子节点列表 -- 不报错，尺寸为约束值", () => {
    const stack = buildStack({ children: [] }, BoxConstraints.tight(100, 80));

    assert.equal(stack.size.width, 100);
    assert.equal(stack.size.height, 80);
    assert.equal(stack.children.length, 0);
  });

  it("仅有单个 Positioned 子节点（无非定位子节点确定尺寸）", () => {
    const stack = buildStack(
      {
        children: [{ width: 30, height: 20, left: 10, top: 5, positioned: true }],
      },
      BoxConstraints.tight(100, 80),
    );

    // 无非定位子节点，使用约束最大值
    assert.equal(stack.size.width, 100);
    assert.equal(stack.size.height, 80);

    // 定位子节点正常定位
    assert.equal(getChild(stack, 0).offset.x, 10);
    assert.equal(getChild(stack, 0).offset.y, 5);
  });
});

// ════════════════════════════════════════════════════
//  8. Positioned Widget applyParentData
// ════════════════════════════════════════════════════

describe("Positioned Widget", () => {
  it("applyParentData 正确设置 StackParentData", () => {
    const child = new TestRenderBox(20, 10);
    // 手动设置 StackParentData
    child.parentData = new StackParentData();

    const positioned = new Positioned({
      child: new Stack(), // Widget 层的 child
      left: 15,
      top: 25,
      right: 35,
      bottom: 45,
    });

    positioned.applyParentData(child);

    const pd = child.parentData as StackParentData;
    assert.equal(pd.left, 15);
    assert.equal(pd.top, 25);
    assert.equal(pd.right, 35);
    assert.equal(pd.bottom, 45);
    assert.equal(pd.isPositioned, true);
  });
});
