/**
 * 示例 03: Stack 层叠布局
 * 展示 Stack、Positioned 的用法
 */
import { Stack, Positioned } from "../src/widgets/stack.js";
import { SizedBox } from "../src/widgets/sized-box.js";
import { Text } from "../src/widgets/text.js";

// 1. 基本层叠 —— 子节点从左上角开始叠放
const basicStack = new Stack({
  children: [
    new SizedBox({ width: 20, height: 5 }),  // 底层背景
    new Text({ data: "叠加文本" }),            // 上层文本
  ],
});

// 2. 居中对齐
const centeredStack = new Stack({
  alignment: "center",
  children: [
    new SizedBox({ width: 30, height: 10 }),
    new Text({ data: "居中显示" }),
  ],
});

// 3. 精确定位
const positioned = new Stack({
  children: [
    new SizedBox({ width: 40, height: 10 }),
    new Positioned({
      top: 0,
      right: 0,
      child: new Text({ data: "[X]" }),  // 右上角关闭按钮
    }),
    new Positioned({
      bottom: 0,
      left: 0,
      right: 0,
      child: new Text({ data: "底部状态栏" }),  // 底部拉伸
    }),
    new Positioned({
      top: 2,
      left: 2,
      child: new Text({ data: "内容区域" }),
    }),
  ],
});

// 4. 同时指定 left + right = 固定子节点宽度
const stretchH = new Stack({
  children: [
    new SizedBox({ width: 40, height: 5 }),
    new Positioned({
      left: 2,
      right: 2,
      top: 1,
      child: new Text({ data: "水平拉伸（宽度 = 40-2-2 = 36）" }),
    }),
  ],
});
