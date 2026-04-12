/**
 * 示例 02: Flex 弹性布局
 * 展示 Row、Column、Flexible、Expanded 的用法
 */
import { Row } from "../src/widgets/row.js";
import { Column } from "../src/widgets/column.js";
import { Flexible, Expanded } from "../src/widgets/flexible.js";
import { SizedBox } from "../src/widgets/sized-box.js";
import { Text } from "../src/widgets/text.js";

// 1. 基本水平排列
const row = new Row({
  children: [
    new Text({ data: "左" }),
    new Text({ data: "中" }),
    new Text({ data: "右" }),
  ],
});

// 2. 主轴居中 + 等间距
const centeredRow = new Row({
  mainAxisAlignment: "spaceEvenly",
  children: [
    new Text({ data: "A" }),
    new Text({ data: "B" }),
    new Text({ data: "C" }),
  ],
});

// 3. 弹性布局：1:2 比例分配
const flexRow = new Row({
  children: [
    new Expanded({
      flex: 1,
      child: new Text({ data: "1/3 空间" }),
    }),
    new Expanded({
      flex: 2,
      child: new Text({ data: "2/3 空间" }),
    }),
  ],
});

// 4. 固定 + 弹性混合
const mixedRow = new Row({
  children: [
    new SizedBox({ width: 10, child: new Text({ data: "固定10列" }) }),
    new Expanded({
      child: new Text({ data: "填满剩余空间" }),
    }),
    new SizedBox({ width: 8, child: new Text({ data: "固定8列" }) }),
  ],
});

// 5. 垂直布局
const column = new Column({
  crossAxisAlignment: "stretch",
  children: [
    new Text({ data: "第一行" }),
    new Text({ data: "第二行" }),
    new Text({ data: "第三行" }),
  ],
});

// 6. 嵌套布局
const nested = new Column({
  children: [
    new Row({
      mainAxisAlignment: "spaceBetween",
      children: [
        new Text({ data: "标题" }),
        new Text({ data: "操作" }),
      ],
    }),
    new Row({
      children: [
        new Expanded({ child: new Text({ data: "内容区域" }) }),
      ],
    }),
  ],
});
