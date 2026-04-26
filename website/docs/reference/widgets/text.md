# 文本 Widget

本文档涵盖 Flitter TUI 中文本渲染及字符宽度计算相关的全部组件，包括 Widget 层
（`Text`、`RichText`、`TextSpan`）和底层 Unicode 处理模块（`char-width`、`emoji`）。

---

## 目录

1. [Text](#1-text)
2. [RichText](#2-richtext)
3. [TextSpan](#3-textspan)
4. [字符宽度计算 (char-width)](#4-字符宽度计算-char-width)
5. [Emoji 检测 (emoji)](#5-emoji-检测-emoji)

---

## 1. Text

### 简介

`Text` 是一个简便的纯文本 Widget（继承自 `StatelessWidget`），用于显示单一样式的文本。
内部自动构建 `RichText` + `TextSpan`，适合不需要混合样式的简单场景。

### API 签名

```typescript
interface TextArgs {
  key?: Key;
  data: string;
  style?: TextStyle;
}

class Text extends StatelessWidget {
  readonly data: string;
  readonly style?: TextStyle;
  constructor(args: TextArgs);
  build(context: BuildContext): Widget;
}
```

### 参数说明

| 参数    | 类型        | 必填 | 说明                         |
| ------- | ----------- | ---- | ---------------------------- |
| `key`   | `Key`       | 否   | Widget 标识键，用于差分更新  |
| `data`  | `string`    | 是   | 要显示的文本内容             |
| `style` | `TextStyle` | 否   | 文本样式（粗体、颜色等）     |

### 使用示例

```typescript
import { Text } from "@flitter/tui/widgets/text";
import { TextStyle } from "@flitter/tui/screen/text-style";
import { Color } from "@flitter/tui/screen/color";

// 基本用法：纯文本
const hello = new Text({ data: "Hello World" });

// 带样式：粗体红色
const styled = new Text({
  data: "错误：连接超时",
  style: new TextStyle({ bold: true, foreground: Color.red() }),
});

// CJK 文本自动支持双宽度字符
const cjk = new Text({ data: "你好世界" });
```

### 注意事项

- `Text` 是 `StatelessWidget`，每次 `build()` 会创建新的 `RichText` 和 `TextSpan` 实例。
- 如果需要在同一段文本中使用多种样式，请直接使用 `RichText` + `TextSpan`。
- `style` 为空时使用 `TextStyle.NORMAL` 默认样式。

---

## 2. RichText

### 简介

`RichText` 是富文本 Widget，接收一棵 `TextSpan` 树并将其渲染为多行段落文本。
内部创建 `RenderParagraph` 渲染对象来执行布局计算和屏幕绘制。支持基于约束
`maxWidth` 的自动换行。

### API 签名

```typescript
interface RichTextArgs {
  key?: Key;
  text: TextSpan;
  textAlign?: TextAlign;      // "left" | "center" | "right"，默认 "left"
  overflow?: TextOverflow;    // "clip" | "ellipsis" | "visible"，默认 "clip"
  maxLines?: number;          // 最大行数，undefined = 无限制
}

class RichText extends Widget implements RenderObjectWidget {
  readonly text: TextSpan;
  constructor(args: RichTextArgs);
}
```

### 布局算法

1. 深度优先遍历 `TextSpan` 树，收集所有字素（grapheme）及其有效样式
2. 按 `constraints.maxWidth` 进行逐字素换行
3. 最终尺寸 = (最宽行的显示宽度, 总行数)

### 使用示例

```typescript
import { RichText } from "@flitter/tui/widgets/rich-text";
import { TextSpan } from "@flitter/tui/widgets/text-span";
import { TextStyle } from "@flitter/tui/screen/text-style";
import { Color } from "@flitter/tui/screen/color";

// 基本富文本：混合样式
const richText = new RichText({
  text: new TextSpan({
    text: "提示：",
    style: new TextStyle({ bold: true }),
    children: [
      new TextSpan({
        text: "操作成功",
        style: new TextStyle({ foreground: Color.green() }),
      }),
      new TextSpan({ text: "，请继续。" }),
    ],
  }),
});

// 对齐与溢出控制
new RichText({
  text: new TextSpan({ text: '这是一段很长的文本...' }),
  textAlign: 'center',
  overflow: 'ellipsis',
  maxLines: 2,
})
```

### 注意事项

- `RenderParagraph` 是叶子渲染节点，不包含子 `RenderObject`。
- 换行粒度为单个字素（grapheme cluster），不会在字素内部断开。
- 样式继承：子 `TextSpan` 会合并父级样式，子级的非默认属性覆盖父级。

---

## 3. TextSpan

### 简介

`TextSpan` 是样式化文本的树节点，支持嵌套子节点来构建富文本结构。每个节点可携带
可选的文本内容和样式，通过树结构实现同一段落中多种样式的混排。

### API 签名

```typescript
class TextSpan {
  readonly text?: string;
  readonly style?: TextStyle;
  readonly children?: TextSpan[];
  readonly url?: string;          // OSC 8 终端超链接
  readonly onTap?: () => void;    // 点击回调

  constructor(options: {
    text?: string;
    style?: TextStyle;
    children?: TextSpan[];
    url?: string;
    onTap?: () => void;
  });

  toPlainText(): string;
  visitTextSpan(visitor: (span: TextSpan) => boolean): boolean;
  equals(other: TextSpan): boolean;
}
```

### 方法说明

| 方法             | 返回值    | 说明                                                       |
| ---------------- | --------- | ---------------------------------------------------------- |
| `toPlainText()`  | `string`  | 递归拼接所有节点的纯文本（先自身 `text`，再子节点）        |
| `visitTextSpan()`| `boolean` | 深度优先遍历，`visitor` 返回 `false` 时立即停止            |
| `equals()`       | `boolean` | 递归比较 `text`、`style`、`children` 三个字段              |

### 使用示例

```typescript
import { TextSpan } from "@flitter/tui/widgets/text-span";
import { TextStyle } from "@flitter/tui/screen/text-style";
import { Color } from "@flitter/tui/screen/color";

// 构建混合样式文本树
const span = new TextSpan({
  text: "日志 ",
  style: new TextStyle({ foreground: Color.white() }),
  children: [
    new TextSpan({
      text: "[ERROR]",
      style: new TextStyle({ bold: true, foreground: Color.red() }),
    }),
    new TextSpan({ text: " 连接数据库失败：" }),
    new TextSpan({
      text: "timeout",
      style: new TextStyle({ italic: true, foreground: Color.yellow() }),
    }),
  ],
});

// 可点击超链接
new TextSpan({
  text: 'Flitter 文档',
  url: 'https://flitter.dev',
  onTap: () => { openBrowser(url); },
  style: new TextStyle({ foreground: Color.cyan(), underline: true }),
})

// 提取纯文本
span.toPlainText();
// => "日志 [ERROR] 连接数据库失败：timeout"
```

### 注意事项

- `TextSpan` 是不可变对象（所有属性为 `readonly`），修改时需创建新实例。
- `toPlainText()` 的拼接顺序：先当前节点的 `text`，再按顺序拼接 `children` 的递归结果。
- `equals()` 执行深度比较，包括所有子节点的递归对比。

---

## 4. 字符宽度计算 (char-width)

### 简介

`char-width` 模块提供 Unicode 字符显示宽度计算功能，用于终端环境下的精确文本布局。
支持 CJK 统一汉字、韩文音节、日文假名、全角字符等双宽度字符的判定，以及 Emoji 字符
（含 ZWJ 序列、肤色修饰、旗帜序列、变体选择符）的宽度计算。

### API 签名

```typescript
function textWidth(text: string): number;
function charWidth(grapheme: string): number;
function graphemeSegments(text: string): string[];
function codePointWidth(codePoint: number): number;
function isCjk(codePoint: number): boolean;
function isZeroWidth(codePoint: number): boolean;
```

### 函数详解

#### `textWidth(text: string): number`

计算文本的总显示宽度（列数）。

```typescript
textWidth("hello");      // => 5
textWidth("你好");        // => 4   (2 个 CJK 字符，各占 2 列)
textWidth("hello你好");   // => 9
textWidth("😀🚀");       // => 4   (2 个 Emoji，各占 2 列)
```

#### `charWidth(grapheme: string): number`

计算单个字素簇的显示宽度，带内部缓存。

**多码点字素簇规则**（按优先级）：

| 优先级 | 条件                        | 宽度 | 说明                     |
| ------ | --------------------------- | ---- | ------------------------ |
| 1      | 包含 VS15 (U+FE0E)         | 1    | 强制文本呈现             |
| 2      | Emoji 基础 + VS16/ZWJ/肤色 | 2    | 强制 Emoji 呈现          |
| 3      | 首码点为区域指示符          | 2    | 旗帜序列                 |
| 4      | 其他                        | max  | 取各码点宽度的最大值     |

#### `graphemeSegments(text: string): string[]`

基于 `Intl.Segmenter` 按 Unicode 字素簇边界分割文本。

```typescript
graphemeSegments("abc");       // => ["a", "b", "c"]
graphemeSegments("你好");       // => ["你", "好"]
graphemeSegments("👨‍👩‍👧");      // => ["👨‍👩‍👧"]  (ZWJ 序列为单个字素)
```

#### `codePointWidth(codePoint: number): number`

判定顺序：零宽 -> 0；CJK -> 2；默认 Emoji 呈现 -> 2；默认文本呈现 Emoji -> 1；其他 -> 1。

#### `isCjk(codePoint: number): boolean`

判断码点是否属于 CJK 双宽度字符范围。覆盖 CJK 统一汉字、扩展 A-G、韩文音节、假名、全角字符等 20+ Unicode 块。

#### `isZeroWidth(codePoint: number): boolean`

判断码点是否为零宽字符。覆盖控制字符（Tab 除外）、零宽空格/连接符、组合变音符号、变体选择符等。

### 注意事项

- **`Intl.Segmenter` 依赖**：需要 Node.js >= 16 或支持该 API 的浏览器环境。
- **缓存机制**：`charWidth()` 使用模块级 `Map<string, number>` 缓存字素宽度结果。
- 所有宽度计算假设等宽字体终端环境，每个全角字符占 2 个半角字符位。

---

## 5. Emoji 检测 (emoji)

### 简介

`emoji` 模块提供 Unicode Emoji 码点的识别功能，区分默认以 Emoji 图形方式呈现
和默认以文本方式呈现的码点。

### API 签名

```typescript
function isEmoji(codePoint: number): boolean;
function isEmojiPresentation(codePoint: number): boolean;
```

#### `isEmoji(codePoint: number): boolean`

判断码点是否属于 Emoji 范围（10 个 Unicode 块）。

#### `isEmojiPresentation(codePoint: number): boolean`

判断码点是否默认以 Emoji 图形样式显示（无需 VS16），覆盖 7 个范围。

### 与 char-width 的交互

```
码点 ──> isZeroWidth?  ──(是)──> 宽度 0
          │(否)
          ├──> isCjk?  ──(是)──> 宽度 2
          │(否)
          ├──> isEmojiPresentation?  ──(是)──> 宽度 2
          │(否)
          ├──> isEmoji?  ──(是)──> 宽度 1 (需 VS16 升级为 2)
          │(否)
          └──> 宽度 1
```

**变体选择符对宽度的影响**：

| 场景                           | 宽度 | 示例                    |
| ------------------------------ | ---- | ----------------------- |
| 默认 Emoji 呈现码点            | 2    | `😀` (U+1F600)          |
| 默认文本呈现 + VS16 (U+FE0F)  | 2    | `☀️` (U+2600 + U+FE0F)  |
| 默认文本呈现 + VS15 (U+FE0E)  | 1    | `☀︎` (U+2600 + U+FE0E)  |
| 默认文本呈现（无修饰）         | 1    | `☀` (U+2600)            |
| Emoji + ZWJ 序列               | 2    | `👨‍👩‍👧` (家庭序列)       |
| Emoji + 肤色修饰符             | 2    | `👍🏻` (U+1F44D + U+1F3FB) |

### 综合使用示例

```typescript
import { textWidth, charWidth, graphemeSegments } from "@flitter/tui/text/char-width";

// 计算终端表格列宽
function formatColumn(text: string, columnWidth: number): string {
  const width = textWidth(text);
  if (width >= columnWidth) return text;
  return text + " ".repeat(columnWidth - width);
}

// 终端文本截断
function truncate(text: string, maxWidth: number, ellipsis = "..."): string {
  const segments = graphemeSegments(text);
  let currentWidth = 0;
  let result = "";
  const ellipsisWidth = textWidth(ellipsis);
  for (const seg of segments) {
    const segWidth = charWidth(seg);
    if (currentWidth + segWidth + ellipsisWidth > maxWidth) {
      return result + ellipsis;
    }
    result += seg;
    currentWidth += segWidth;
  }
  return result;
}
```

---

> 📖 教程: [Markdown 渲染](/tutorial/subsystems/markdown)
