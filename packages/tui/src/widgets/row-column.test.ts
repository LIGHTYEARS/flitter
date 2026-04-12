/**
 * Row / Column / Flexible / Expanded Widget 单元测试。
 *
 * 使用 node:test + node:assert/strict，覆盖 Widget 层的核心行为：
 * createElement 类型、Row 水平布局、Column 垂直布局、Expanded 填满剩余空间、
 * Flexible 的 loose/tight 适配、MainAxisAlignment、CrossAxisAlignment、
 * 嵌套 Row/Column、update 更新等。
 *
 * 运行方式：
 * ```bash
 * npx tsx --test packages/tui/src/widgets/row-column.test.ts
 * ```
 *
 * @module
 */

import { describe, it } from "node:test";
import * as assert from "node:assert/strict";
import { Row } from "./row.js";
import { Column } from "./column.js";
import { Flexible, Expanded } from "./flexible.js";
import { MultiChildRenderObjectElement } from "./multi-child-render-object-element.js";
import { RenderFlex, FlexParentData } from "./flex.js";
import { RenderBox } from "../tree/render-box.js";
import { BoxConstraints } from "../tree/constraints.js";
import { Widget } from "../tree/widget.js";
import type { Element } from "../tree/element.js";
import { RenderObjectElement, type RenderObjectWidget } from "../tree/render-object-element.js";
import type { RenderObject } from "../tree/render-object.js";

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
    this.size = this._constraints!.constrain(
      this.preferredWidth,
      this.preferredHeight
    );
  }
}

/**
 * 测试用的叶子 Widget，创建 SingleChildRenderObjectElement。
 * 内部创建一个 TestRenderBox。
 */
class TestLeafWidget extends Widget {
  readonly preferredWidth: number;
  readonly preferredHeight: number;

  constructor(width: number, height: number) {
    super();
    this.preferredWidth = width;
    this.preferredHeight = height;
  }

  createRenderObject(): RenderObject {
    return new TestRenderBox(this.preferredWidth, this.preferredHeight);
  }

  updateRenderObject(_renderObject: RenderObject): void {
    // 测试中无需更新
  }

  createElement(): Element {
    return new TestLeafElement(this);
  }
}

/**
 * 测试用的叶子元素，继承 RenderObjectElement。
 */
class TestLeafElement extends RenderObjectElement {
  constructor(widget: Widget) {
    super(widget);
  }
}

/**
 * 辅助函数：构建 Widget 树并执行布局。
 *
 * 1. 调用 widget.createElement()
 * 2. 挂载元素
 * 3. 获取渲染对象并用给定约束执行布局
 *
 * @param widget - 根 Widget
 * @param constraints - 布局约束
 * @returns 根渲染对象
 */
function buildAndLayout(widget: Row | Column, constraints: BoxConstraints): RenderFlex {
  const element = widget.createElement();
  element.mount();
  const renderObject = element.renderObject as RenderFlex;
  renderObject.layout(constraints);
  return renderObject;
}

/**
 * 获取 RenderFlex 的第 n 个子 RenderBox。
 */
function getChild(flex: RenderFlex, index: number): RenderBox {
  return flex.children[index] as RenderBox;
}

// ════════════════════════════════════════════════════
//  1. createElement 类型检查
// ════════════════════════════════════════════════════

describe("Row/Column createElement", () => {
  it("Row.createElement 返回 MultiChildRenderObjectElement", () => {
    const row = new Row();
    const element = row.createElement();
    assert.ok(element instanceof MultiChildRenderObjectElement);
  });

  it("Column.createElement 返回 MultiChildRenderObjectElement", () => {
    const col = new Column();
    const element = col.createElement();
    assert.ok(element instanceof MultiChildRenderObjectElement);
  });
});

// ════════════════════════════════════════════════════
//  2. Row 水平布局基础
// ════════════════════════════════════════════════════

describe("Row -- 水平布局基础", () => {
  it("三个子节点从左到右排列", () => {
    const row = new Row({
      children: [
        new TestLeafWidget(20, 10),
        new TestLeafWidget(30, 10),
        new TestLeafWidget(15, 10),
      ],
    });
    const flex = buildAndLayout(row, BoxConstraints.tight(100, 50));

    assert.equal(getChild(flex, 0).offset.x, 0);
    assert.equal(getChild(flex, 1).offset.x, 20);
    assert.equal(getChild(flex, 2).offset.x, 50);
  });

  it("创建的 RenderFlex 方向为 horizontal", () => {
    const row = new Row();
    const element = row.createElement();
    element.mount();
    const renderObject = element.renderObject as RenderFlex;
    assert.equal(renderObject.direction, "horizontal");
  });

  it("mainAxisSize='max' 时 Row 填满约束宽度", () => {
    const row = new Row({
      mainAxisSize: "max",
      children: [new TestLeafWidget(20, 10)],
    });
    const flex = buildAndLayout(row, BoxConstraints.tight(100, 50));
    assert.equal(flex.size.width, 100);
  });

  it("mainAxisSize='min' 时 Row 收缩到内容宽度", () => {
    const row = new Row({
      mainAxisSize: "min",
      children: [
        new TestLeafWidget(20, 10),
        new TestLeafWidget(30, 10),
      ],
    });
    const flex = buildAndLayout(row, BoxConstraints.loose(200, 100));
    assert.equal(flex.size.width, 50);
  });
});

// ════════════════════════════════════════════════════
//  3. Column 垂直布局基础
// ════════════════════════════════════════════════════

describe("Column -- 垂直布局基础", () => {
  it("三个子节点从上到下排列", () => {
    const col = new Column({
      children: [
        new TestLeafWidget(10, 20),
        new TestLeafWidget(10, 30),
        new TestLeafWidget(10, 10),
      ],
    });
    const flex = buildAndLayout(col, BoxConstraints.tight(50, 200));

    assert.equal(getChild(flex, 0).offset.y, 0);
    assert.equal(getChild(flex, 1).offset.y, 20);
    assert.equal(getChild(flex, 2).offset.y, 50);
  });

  it("创建的 RenderFlex 方向为 vertical", () => {
    const col = new Column();
    const element = col.createElement();
    element.mount();
    const renderObject = element.renderObject as RenderFlex;
    assert.equal(renderObject.direction, "vertical");
  });
});

// ════════════════════════════════════════════════════
//  4. Expanded 填满剩余空间
// ════════════════════════════════════════════════════

describe("Expanded -- 填满剩余空间", () => {
  it("单个 Expanded 子节点填满 Row 剩余宽度", () => {
    const row = new Row({
      children: [
        new TestLeafWidget(30, 10),
        new Expanded({ child: new TestLeafWidget(0, 10) }),
      ],
    });
    const flex = buildAndLayout(row, BoxConstraints.tight(100, 50));

    // 固定子节点占 30，Expanded 占剩余 70
    assert.equal(getChild(flex, 0).size.width, 30);
    assert.equal(getChild(flex, 1).size.width, 70);
    assert.equal(getChild(flex, 1).offset.x, 30);
  });

  it("两个 Expanded 均分 Row 空间", () => {
    const row = new Row({
      children: [
        new Expanded({ child: new TestLeafWidget(0, 10) }),
        new Expanded({ child: new TestLeafWidget(0, 10) }),
      ],
    });
    const flex = buildAndLayout(row, BoxConstraints.tight(100, 50));

    assert.equal(getChild(flex, 0).size.width, 50);
    assert.equal(getChild(flex, 1).size.width, 50);
    assert.equal(getChild(flex, 0).offset.x, 0);
    assert.equal(getChild(flex, 1).offset.x, 50);
  });

  it("Expanded(flex=2) 和 Expanded(flex=1) 按 2:1 分配", () => {
    const row = new Row({
      children: [
        new Expanded({ child: new TestLeafWidget(0, 10), flex: 2 }),
        new Expanded({ child: new TestLeafWidget(0, 10), flex: 1 }),
      ],
    });
    const flex = buildAndLayout(row, BoxConstraints.tight(90, 50));

    assert.ok(Math.abs(getChild(flex, 0).size.width - 60) < 0.01);
    assert.ok(Math.abs(getChild(flex, 1).size.width - 30) < 0.01);
  });

  it("Column 中 Expanded 子节点填满剩余高度", () => {
    const col = new Column({
      children: [
        new TestLeafWidget(10, 30),
        new Expanded({ child: new TestLeafWidget(10, 0) }),
      ],
    });
    const flex = buildAndLayout(col, BoxConstraints.tight(50, 100));

    assert.equal(getChild(flex, 0).size.height, 30);
    assert.equal(getChild(flex, 1).size.height, 70);
    assert.equal(getChild(flex, 1).offset.y, 30);
  });
});

// ════════════════════════════════════════════════════
//  5. Flexible -- loose 适配
// ════════════════════════════════════════════════════

describe("Flexible -- loose 适配", () => {
  it("Flexible(fit='loose') 允许子节点小于分配空间", () => {
    const row = new Row({
      children: [
        new Flexible({
          child: new TestLeafWidget(10, 10),
          fit: "loose",
        }),
      ],
    });
    const flex = buildAndLayout(row, BoxConstraints.tight(100, 50));

    // loose 时子节点保持首选宽度 10
    assert.equal(getChild(flex, 0).size.width, 10);
  });

  it("Flexible 默认 fit 为 'loose'", () => {
    const flexible = new Flexible({ child: new TestLeafWidget(10, 10) });
    assert.equal(flexible.fit, "loose");
  });

  it("Flexible 默认 flex 为 1", () => {
    const flexible = new Flexible({ child: new TestLeafWidget(10, 10) });
    assert.equal(flexible.flex, 1);
  });

  it("Expanded 的 fit 始终为 'tight'", () => {
    const expanded = new Expanded({ child: new TestLeafWidget(10, 10) });
    assert.equal(expanded.fit, "tight");
  });
});

// ════════════════════════════════════════════════════
//  6. MainAxisAlignment
// ════════════════════════════════════════════════════

describe("Row -- MainAxisAlignment", () => {
  it("'end' 对齐：子节点靠主轴末尾", () => {
    const row = new Row({
      mainAxisAlignment: "end",
      children: [
        new TestLeafWidget(20, 10),
        new TestLeafWidget(30, 10),
      ],
    });
    const flex = buildAndLayout(row, BoxConstraints.tight(100, 50));

    // 剩余空间 = 100 - 50 = 50
    assert.equal(getChild(flex, 0).offset.x, 50);
    assert.equal(getChild(flex, 1).offset.x, 70);
  });

  it("'center' 对齐：子节点在主轴居中", () => {
    const row = new Row({
      mainAxisAlignment: "center",
      children: [
        new TestLeafWidget(20, 10),
        new TestLeafWidget(30, 10),
      ],
    });
    const flex = buildAndLayout(row, BoxConstraints.tight(100, 50));

    // 剩余空间 = 50，起始偏移 = 25
    assert.equal(getChild(flex, 0).offset.x, 25);
    assert.equal(getChild(flex, 1).offset.x, 45);
  });

  it("'spaceBetween' 对齐：首尾贴边，中间等间距", () => {
    const row = new Row({
      mainAxisAlignment: "spaceBetween",
      children: [
        new TestLeafWidget(10, 10),
        new TestLeafWidget(10, 10),
        new TestLeafWidget(10, 10),
      ],
    });
    const flex = buildAndLayout(row, BoxConstraints.tight(100, 50));

    // 剩余空间 = 70，间距 = 35
    assert.equal(getChild(flex, 0).offset.x, 0);
    assert.equal(getChild(flex, 1).offset.x, 45);
    assert.equal(getChild(flex, 2).offset.x, 90);
  });
});

// ════════════════════════════════════════════════════
//  7. CrossAxisAlignment
// ════════════════════════════════════════════════════

describe("Row -- CrossAxisAlignment", () => {
  it("'center' 交叉轴居中", () => {
    const row = new Row({
      crossAxisAlignment: "center",
      children: [new TestLeafWidget(20, 10)],
    });
    const flex = buildAndLayout(row, BoxConstraints.tight(100, 50));

    // 交叉轴尺寸 50，子节点高度 10，offset.y = (50-10)/2 = 20
    assert.equal(getChild(flex, 0).offset.y, 20);
  });

  it("'end' 交叉轴末尾", () => {
    const row = new Row({
      crossAxisAlignment: "end",
      children: [new TestLeafWidget(20, 10)],
    });
    const flex = buildAndLayout(row, BoxConstraints.tight(100, 50));

    // offset.y = 50 - 10 = 40
    assert.equal(getChild(flex, 0).offset.y, 40);
  });

  it("'stretch' 交叉轴拉伸", () => {
    const row = new Row({
      crossAxisAlignment: "stretch",
      children: [new TestLeafWidget(20, 10)],
    });
    const flex = buildAndLayout(row, BoxConstraints.tight(100, 50));

    // stretch 拉伸到 50
    assert.equal(getChild(flex, 0).size.height, 50);
    assert.equal(getChild(flex, 0).offset.y, 0);
  });
});

// ════════════════════════════════════════════════════
//  8. 嵌套 Row/Column
// ════════════════════════════════════════════════════

describe("嵌套 Row/Column", () => {
  it("Column 嵌套 Row 正确布局", () => {
    const innerRow = new Row({
      children: [
        new TestLeafWidget(20, 10),
        new TestLeafWidget(30, 10),
      ],
    });
    const col = new Column({
      children: [
        new TestLeafWidget(10, 20),
        innerRow,
      ],
    });

    const element = col.createElement();
    element.mount();
    const colFlex = element.renderObject as RenderFlex;
    colFlex.layout(BoxConstraints.tight(100, 200));

    // 第一个子节点
    const child0 = colFlex.children[0] as RenderBox;
    assert.equal(child0.offset.y, 0);
    assert.equal(child0.size.height, 20);

    // 第二个子节点是嵌套的 RenderFlex
    const innerFlex = colFlex.children[1] as RenderFlex;
    assert.equal(innerFlex.offset.y, 20);
    assert.equal(innerFlex.direction, "horizontal");

    // 内层 Row 的子节点
    const innerChild0 = innerFlex.children[0] as RenderBox;
    const innerChild1 = innerFlex.children[1] as RenderBox;
    assert.equal(innerChild0.offset.x, 0);
    assert.equal(innerChild0.size.width, 20);
    assert.equal(innerChild1.offset.x, 20);
    assert.equal(innerChild1.size.width, 30);
  });
});

// ════════════════════════════════════════════════════
//  9. 空子节点
// ════════════════════════════════════════════════════

describe("空子节点", () => {
  it("Row 没有子节点时不报错，尺寸为约束值", () => {
    const row = new Row({ mainAxisSize: "max" });
    const flex = buildAndLayout(row, BoxConstraints.tight(100, 50));
    assert.equal(flex.size.width, 100);
    assert.equal(flex.size.height, 50);
  });

  it("Column 没有子节点时不报错，尺寸为约束值", () => {
    const col = new Column({ mainAxisSize: "max" });
    const flex = buildAndLayout(col, BoxConstraints.tight(50, 100));
    assert.equal(flex.size.width, 50);
    assert.equal(flex.size.height, 100);
  });
});

// ════════════════════════════════════════════════════
//  10. 混合 Flexible/Expanded + 固定子节点
// ════════════════════════════════════════════════════

describe("混合弹性与固定子节点", () => {
  it("固定 + Expanded + 固定的混合 Row 布局", () => {
    const row = new Row({
      children: [
        new TestLeafWidget(20, 10),
        new Expanded({ child: new TestLeafWidget(0, 10) }),
        new TestLeafWidget(30, 10),
      ],
    });
    const flex = buildAndLayout(row, BoxConstraints.tight(100, 50));

    assert.equal(getChild(flex, 0).offset.x, 0);
    assert.equal(getChild(flex, 0).size.width, 20);
    assert.equal(getChild(flex, 1).offset.x, 20);
    assert.equal(getChild(flex, 1).size.width, 50); // 100 - 20 - 30 = 50
    assert.equal(getChild(flex, 2).offset.x, 70);
    assert.equal(getChild(flex, 2).size.width, 30);
  });
});

// ════════════════════════════════════════════════════
//  11. FlexParentData 设置验证
// ════════════════════════════════════════════════════

describe("FlexParentData 设置验证", () => {
  it("Expanded 子节点的 parentData 的 flex 和 fit 正确设置", () => {
    const row = new Row({
      children: [
        new Expanded({ child: new TestLeafWidget(0, 10), flex: 3 }),
      ],
    });
    const element = row.createElement();
    element.mount();
    const flex = element.renderObject as RenderFlex;

    const childRO = flex.children[0];
    const pd = childRO.parentData as FlexParentData;
    assert.equal(pd.flex, 3);
    assert.equal(pd.fit, "tight");
  });

  it("Flexible 子节点的 parentData 的 flex 和 fit 正确设置", () => {
    const row = new Row({
      children: [
        new Flexible({
          child: new TestLeafWidget(10, 10),
          flex: 2,
          fit: "loose",
        }),
      ],
    });
    const element = row.createElement();
    element.mount();
    const flex = element.renderObject as RenderFlex;

    const childRO = flex.children[0];
    const pd = childRO.parentData as FlexParentData;
    assert.equal(pd.flex, 2);
    assert.equal(pd.fit, "loose");
  });
});

// ════════════════════════════════════════════════════
//  12. Row/Column 默认值
// ════════════════════════════════════════════════════

describe("Row/Column 默认值", () => {
  it("Row 默认属性正确", () => {
    const row = new Row();
    assert.equal(row.mainAxisAlignment, "start");
    assert.equal(row.crossAxisAlignment, "start");
    assert.equal(row.mainAxisSize, "max");
    assert.deepEqual(row.children, []);
  });

  it("Column 默认属性正确", () => {
    const col = new Column();
    assert.equal(col.mainAxisAlignment, "start");
    assert.equal(col.crossAxisAlignment, "start");
    assert.equal(col.mainAxisSize, "max");
    assert.deepEqual(col.children, []);
  });
});

// ════════════════════════════════════════════════════
//  13. 元素卸载
// ════════════════════════════════════════════════════

describe("元素卸载", () => {
  it("unmount 后渲染对象子节点被清空", () => {
    const row = new Row({
      children: [
        new TestLeafWidget(20, 10),
        new TestLeafWidget(30, 10),
      ],
    });
    const element = row.createElement();
    element.mount();
    const flex = element.renderObject as RenderFlex;

    assert.equal(flex.children.length, 2);

    element.unmount();
    // unmount 后渲染对象应无子节点
    assert.equal(flex.children.length, 0);
  });
});

// ════════════════════════════════════════════════════
//  14. Column MainAxisAlignment
// ════════════════════════════════════════════════════

describe("Column -- MainAxisAlignment", () => {
  it("'center' 对齐：子节点在垂直方向居中", () => {
    const col = new Column({
      mainAxisAlignment: "center",
      children: [
        new TestLeafWidget(10, 20),
        new TestLeafWidget(10, 20),
      ],
    });
    const flex = buildAndLayout(col, BoxConstraints.tight(50, 100));

    // 总高度 = 40，剩余 = 60，起始偏移 = 30
    assert.equal(getChild(flex, 0).offset.y, 30);
    assert.equal(getChild(flex, 1).offset.y, 50);
  });
});
