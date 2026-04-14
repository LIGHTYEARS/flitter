/**
 * 示例 04: 容器与间距
 * 展示 Container、Padding、SizedBox、EdgeInsets 的用法
 */

import { Column } from "../src/widgets/column.js";
import { Container } from "../src/widgets/container.js";
import { EdgeInsets } from "../src/widgets/edge-insets.js";
import { Padding } from "../src/widgets/padding.js";
import { Row } from "../src/widgets/row.js";
import { SizedBox } from "../src/widgets/sized-box.js";
import { Text } from "../src/widgets/text.js";

// 1. EdgeInsets 工厂方法
const _uniform = EdgeInsets.all(2); // 四边各 2
const _symmetric = EdgeInsets.symmetric({ horizontal: 4, vertical: 1 }); // 左右 4, 上下 1
const _horiz = EdgeInsets.horizontal(3); // 左右各 3
const _vert = EdgeInsets.vertical(1); // 上下各 1
const _custom = EdgeInsets.only({ left: 2, top: 1 }); // 仅左 2 上 1

// 2. Padding 包裹文本
const _padded = new Padding({
  padding: EdgeInsets.all(2),
  child: new Text({ data: "四周留白 2 格" }),
});

// 3. SizedBox 固定尺寸
const _fixedBox = new SizedBox({
  width: 20,
  height: 3,
  child: new Text({ data: "20x3 区域" }),
});

// 4. SizedBox 作为间隔
const _spacedRow = new Row({
  children: [
    new Text({ data: "左" }),
    new SizedBox({ width: 5 }), // 5 列间隔
    new Text({ data: "右" }),
  ],
});

// 5. Container 一站式便捷组件
const _container = new Container({
  padding: EdgeInsets.symmetric({ horizontal: 2, vertical: 1 }),
  width: 30,
  height: 5,
  child: new Text({ data: "Container 内容" }),
});

// 6. 嵌套间距布局
const _card = new Container({
  padding: EdgeInsets.all(1),
  width: 40,
  child: new Column({
    children: [
      new Text({ data: "卡片标题" }),
      new SizedBox({ height: 1 }), // 垂直间距
      new Text({ data: "卡片内容描述文字..." }),
      new SizedBox({ height: 1 }),
      new Row({
        mainAxisAlignment: "end",
        children: [
          new Text({ data: "[确定]" }),
          new SizedBox({ width: 2 }),
          new Text({ data: "[取消]" }),
        ],
      }),
    ],
  }),
});
