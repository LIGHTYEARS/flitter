/**
 * 示例 01: 基础文本渲染
 * 展示 Text、RichText、TextSpan 的基本用法
 */
import { Text } from "../src/widgets/text.js";
import { RichText } from "../src/widgets/rich-text.js";
import { TextSpan } from "../src/widgets/text-span.js";
import { TextStyle } from "../src/screen/text-style.js";
import { Color } from "../src/screen/color.js";

// 1. 简单文本
const hello = new Text({ data: "Hello, Flitter TUI!" });

// 2. 带样式的文本
const styled = new Text({
  data: "粗体红色文本",
  style: new TextStyle({ bold: true, foreground: Color.red() }),
});

// 3. 富文本（混合样式）
const rich = new RichText({
  text: new TextSpan({
    text: "普通文本 ",
    children: [
      new TextSpan({
        text: "粗体",
        style: new TextStyle({ bold: true }),
      }),
      new TextSpan({ text: " 和 " }),
      new TextSpan({
        text: "彩色斜体",
        style: new TextStyle({
          italic: true,
          foreground: Color.cyan(),
        }),
      }),
    ],
  }),
});

// 4. TextSpan 工具方法
const span = new TextSpan({
  text: "Hello ",
  children: [new TextSpan({ text: "World" })],
});
console.log(span.toPlainText()); // "Hello World"
