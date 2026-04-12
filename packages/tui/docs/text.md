# Flitter TUI 文本与字符宽度 API 文档

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

// 混合 ASCII 与 CJK
const mixed = new Text({ data: "Status: 正常运行中" });
```

### 注意事项

- `Text` 是 `StatelessWidget`，每次 `build()` 会创建新的 `RichText` 和 `TextSpan` 实例。
- 如果需要在同一段文本中使用多种样式（如部分加粗、部分变色），请直接使用 `RichText` + `TextSpan`。
- `style` 为空时使用 `TextStyle.NORMAL` 默认样式（终端默认前景/背景色，无修饰）。

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
}

class RichText extends Widget implements RenderObjectWidget {
  readonly text: TextSpan;
  readonly child: Widget | undefined;  // 始终为 undefined（叶子节点）

  constructor(args: RichTextArgs);
  createElement(): Element;
  createRenderObject(): RenderObject;         // 返回 RenderParagraph
  updateRenderObject(renderObject: RenderObject): void;
}
```

### RenderParagraph（内部渲染对象）

```typescript
class RenderParagraph extends RenderBox {
  constructor(textSpan: TextSpan);

  get textSpan(): TextSpan;
  set textSpan(value: TextSpan);  // 值变化时自动标记需要重新布局

  performLayout(): void;   // 按 maxWidth 自动换行，计算尺寸
  performPaint(screen: Screen, offsetX: number, offsetY: number): void;
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

// 自动换行示例
// 假设 constraints.maxWidth = 10，"Hello你好World" 总宽 14
// 布局结果：
//   第 1 行: "Hello你好"  (宽度 5 + 4 = 9)
//   第 2 行: "World"      (宽度 5)
```

### 注意事项

- `RenderParagraph` 是叶子渲染节点，不包含子 `RenderObject`。
- 换行粒度为单个字素（grapheme cluster），不会在字素内部断开。
- 样式继承：子 `TextSpan` 会合并父级样式，子级的非默认属性覆盖父级。
- 设置 `textSpan` 属性时，仅当新值与旧值不相等（通过 `TextSpan.equals()` 判断）时才触发重新布局。

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

  constructor(options: {
    text?: string;
    style?: TextStyle;
    children?: TextSpan[];
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
| `visitTextSpan()`| `boolean` | 深度优先遍历，`visitor` 返回 `false` 时立即停止并返回      |
| `equals()`       | `boolean` | 递归比较 `text`、`style`、`children` 三个字段是否完全相同  |

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

// 提取纯文本
span.toPlainText();
// => "日志 [ERROR] 连接数据库失败：timeout"

// 遍历所有节点
const texts: string[] = [];
span.visitTextSpan((s) => {
  if (s.text) texts.push(s.text);
  return true;  // 继续遍历
});
// texts => ["日志 ", "[ERROR]", " 连接数据库失败：", "timeout"]

// 提前终止遍历
span.visitTextSpan((s) => {
  if (s.text === "[ERROR]") {
    console.log("发现错误标记");
    return false;  // 停止遍历
  }
  return true;
});

// 结构相等比较
const spanA = new TextSpan({ text: "你好", style: new TextStyle({ bold: true }) });
const spanB = new TextSpan({ text: "你好", style: new TextStyle({ bold: true }) });
spanA.equals(spanB);  // => true
```

### 注意事项

- `TextSpan` 是不可变对象（所有属性为 `readonly`），修改时需创建新实例。
- `toPlainText()` 的拼接顺序：先当前节点的 `text`，再按顺序拼接 `children` 的递归结果。
- `equals()` 执行深度比较，包括所有子节点的递归对比。
- 空 `TextSpan`（`new TextSpan({})`）的 `toPlainText()` 返回空字符串 `""`。

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

计算文本的总显示宽度（列数）。内部将文本按字素簇分割后累加各字素宽度。

```typescript
textWidth("hello");      // => 5   (5 个 ASCII 字符)
textWidth("你好");        // => 4   (2 个 CJK 字符，各占 2 列)
textWidth("hello你好");   // => 9   (5 + 4)
textWidth("😀🚀");       // => 4   (2 个 Emoji，各占 2 列)
textWidth("你😀好");      // => 6   (2 + 2 + 2)
textWidth("");            // => 0
```

#### `charWidth(grapheme: string): number`

计算单个字素簇（grapheme cluster）的显示宽度，带内部缓存以提升性能。

**单码点规则**：直接调用 `codePointWidth()` 计算。

**多码点字素簇规则**（按优先级）：

| 优先级 | 条件                        | 宽度 | 说明                     |
| ------ | --------------------------- | ---- | ------------------------ |
| 1      | 包含 VS15 (U+FE0E)         | 1    | 强制文本呈现             |
| 2      | Emoji 基础 + VS16/ZWJ/肤色 | 2    | 强制 Emoji 呈现          |
| 3      | 首码点为区域指示符          | 2    | 旗帜序列                 |
| 4      | 其他                        | max  | 取各码点宽度的最大值     |

```typescript
charWidth("A");    // => 1
charWidth("中");   // => 2
charWidth("😀");   // => 2  (默认 Emoji 呈现)
charWidth("🇯🇵");  // => 2  (旗帜序列)
charWidth("👨‍👩‍👧"); // => 2  (ZWJ 家庭序列)
charWidth("👍🏻");  // => 2  (肤色变体)
charWidth("☀\uFE0E"); // => 1  (VS15 强制文本呈现)
charWidth("☀\uFE0F"); // => 2  (VS16 强制 Emoji 呈现)
```

#### `graphemeSegments(text: string): string[]`

基于 `Intl.Segmenter` 将文本按 Unicode 字素簇边界分割。能正确处理组合字符、
Emoji ZWJ 序列等复杂情况。

```typescript
graphemeSegments("abc");       // => ["a", "b", "c"]
graphemeSegments("你好");       // => ["你", "好"]
graphemeSegments("👨‍👩‍👧");      // => ["👨‍👩‍👧"]  (整个 ZWJ 序列为单个字素)
graphemeSegments("cafe\u0301"); // => ["c", "a", "f", "e\u0301"]  (e + 组合重音符)
graphemeSegments("");           // => []
```

#### `codePointWidth(codePoint: number): number`

计算单个 Unicode 码点的显示宽度，返回 0、1 或 2。

判定顺序：
1. 零宽字符 -> `0`
2. CJK 双宽字符 -> `2`
3. 默认 Emoji 呈现码点 -> `2`
4. Emoji 但默认文本呈现码点 -> `1`（需 VS16 才变为 2）
5. 其他 -> `1`

```typescript
codePointWidth(0x0041);  // => 1  ('A')
codePointWidth(0x4E2D);  // => 2  ('中')
codePointWidth(0x200D);  // => 0  (ZWJ 零宽连接符)
codePointWidth(0xFF21);  // => 2  ('Ａ' 全角)
codePointWidth(0x1F600); // => 2  (😀 默认 Emoji 呈现)
codePointWidth(0x2600);  // => 1  (☀ 默认文本呈现)
```

#### `isCjk(codePoint: number): boolean`

判断码点是否属于 CJK 双宽度字符范围。覆盖以下 Unicode 块：

| 范围                  | 说明                 |
| --------------------- | -------------------- |
| U+4E00-9FFF           | CJK 统一汉字        |
| U+3400-4DBF           | CJK 扩展 A          |
| U+20000-2A6DF         | CJK 扩展 B          |
| U+2A700-2B73F         | CJK 扩展 C          |
| U+2B740-2B81F         | CJK 扩展 D          |
| U+2B820-2CEAF         | CJK 扩展 E          |
| U+2CEB0-2EBEF         | CJK 扩展 F          |
| U+30000-3134F         | CJK 扩展 G          |
| U+AC00-D7AF           | 韩文音节             |
| U+3040-309F           | 平假名               |
| U+30A0-30FF           | 片假名               |
| U+31F0-31FF           | 片假名音标扩展       |
| U+FF01-FF60           | 全角 ASCII 变体      |
| U+FFE0-FFE6           | 全角货币符号         |
| U+3000-303F           | CJK 符号和标点       |
| U+FE30-FE4F           | CJK 兼容形式         |
| U+FE50-FE6F           | 小写变体             |
| U+1F1E6-1F1FF         | 区域指示符           |
| U+2329-232A           | 尖括号               |

```typescript
isCjk(0x4E00);  // => true   ('一')
isCjk(0xAC00);  // => true   ('가')
isCjk(0x3042);  // => true   ('あ')
isCjk(0x30A2);  // => true   ('ア')
isCjk(0xFF01);  // => true   ('！' 全角感叹号)
isCjk(0x0041);  // => false  ('A')
```

#### `isZeroWidth(codePoint: number): boolean`

判断码点是否为零宽字符。覆盖范围：

| 范围/码点         | 说明                              |
| ----------------- | --------------------------------- |
| U+0000-001F       | 控制字符（Tab U+0009 除外）       |
| U+00AD            | 软连字符                          |
| U+200B-200F       | 零宽空格、零宽连接符、方向标记    |
| U+2060-2069       | 格式控制字符                      |
| U+0300-036F       | 组合变音符号                      |
| U+FE00-FE0F       | 变体选择符 (VS1-VS16)             |
| U+FEFF            | 字节序标记 (BOM)                  |

```typescript
isZeroWidth(0x200D);  // => true   (ZWJ)
isZeroWidth(0x200B);  // => true   (零宽空格)
isZeroWidth(0xFE0F);  // => true   (VS16)
isZeroWidth(0x0300);  // => true   (组合变音符号)
isZeroWidth(0x0009);  // => false  (Tab 不是零宽)
isZeroWidth(0x0041);  // => false  ('A')
```

### 注意事项

- **`Intl.Segmenter` 依赖**：`graphemeSegments()` 使用 `Intl.Segmenter` API（ECMAScript 2024），
  需要 Node.js >= 16 或支持该 API 的浏览器环境。模块初始化时创建单例 Segmenter。
- **缓存机制**：`charWidth()` 使用模块级 `Map<string, number>` 缓存字素宽度结果，
  对重复文本的宽度计算有显著性能提升。缓存生命周期与模块相同。
- **区域指示符**：旗帜 Emoji（如 `🇯🇵`）由两个区域指示符码点组成，在 `isCjk` 中被标记为
  双宽度，确保单独出现时也能正确计算宽度。

---

## 5. Emoji 检测 (emoji)

### 简介

`emoji` 模块提供 Unicode Emoji 码点的识别功能，区分默认以 Emoji 图形方式呈现
和默认以文本方式呈现的码点。该模块与 `char-width` 模块协同工作，确保 Emoji
字符在终端中的显示宽度计算准确。

### API 签名

```typescript
function isEmoji(codePoint: number): boolean;
function isEmojiPresentation(codePoint: number): boolean;
```

### 函数详解

#### `isEmoji(codePoint: number): boolean`

判断码点是否属于 Emoji 范围（10 个 Unicode 块）：

| 范围            | 说明                           |
| --------------- | ------------------------------ |
| U+1F600-1F64F   | 表情符号 (Emoticons)           |
| U+1F300-1F5FF   | 杂项符号与象形                 |
| U+1F680-1F6FF   | 交通与地图符号                 |
| U+1F900-1F9FF   | 补充符号与象形                 |
| U+1FA00-1FA6F   | 符号与象形扩展 A               |
| U+1FA70-1FAFF   | 符号与象形扩展 B               |
| U+2702-27B0     | 丁巴特 (Dingbats)              |
| U+2600-26FF     | 杂项符号                       |
| U+2300-23FF     | 杂项技术符号（部分 Emoji）     |
| U+1F100-1F1FF   | 封闭字母数字补充               |

```typescript
isEmoji(0x1F600);  // => true   (😀)
isEmoji(0x1F680);  // => true   (🚀)
isEmoji(0x2600);   // => true   (☀)
isEmoji(0x2702);   // => true   (✂)
isEmoji(0x231A);   // => true   (⌚)
isEmoji(0x1F916);  // => true   (🤖)
isEmoji(0x0041);   // => false  ('A')
isEmoji(0x4E2D);   // => false  ('中')
```

#### `isEmojiPresentation(codePoint: number): boolean`

判断码点是否默认以 Emoji 图形样式显示（无需 VS16 U+FE0F），覆盖 7 个范围：

| 范围            | 说明                           |
| --------------- | ------------------------------ |
| U+1F600-1F64F   | 表情符号                       |
| U+1F300-1F5FF   | 杂项符号与象形                 |
| U+1F680-1F6FF   | 交通与地图符号                 |
| U+1F900-1F9FF   | 补充符号与象形                 |
| U+1FA00-1FA6F   | 符号与象形扩展 A               |
| U+1FA70-1FAFF   | 符号与象形扩展 B               |
| U+1F1E6-1F1FF   | 区域指示符                     |

**默认文本呈现**（`isEmoji()` 返回 `true` 但 `isEmojiPresentation()` 返回 `false`）：
- U+2600-26FF 大部分（如 ☀、☁）
- U+2702-27B0 大部分（如 ✂、✈）
- U+2300-23FF 范围（如 ⌚）

```typescript
isEmojiPresentation(0x1F600);  // => true   (😀 默认 Emoji 图形)
isEmojiPresentation(0x1F680);  // => true   (🚀 默认 Emoji 图形)
isEmojiPresentation(0x1F1E6);  // => true   (区域指示符)
isEmojiPresentation(0x2600);   // => false  (☀ 默认文本呈现)
isEmojiPresentation(0x2702);   // => false  (✂ 默认文本呈现)
```

### 与 char-width 的交互

Emoji 检测模块与字符宽度计算的协作关系：

```
码点 ──> isZeroWidth?  ──(是)──> 宽度 0
          │
         (否)
          │
          ├──> isCjk?  ──(是)──> 宽度 2
          │
         (否)
          │
          ├──> isEmojiPresentation?  ──(是)──> 宽度 2
          │
         (否)
          │
          ├──> isEmoji?  ──(是)──> 宽度 1 (需 VS16 升级为 2)
          │
         (否)
          │
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

// 场景一：计算终端表格列宽
function formatColumn(text: string, columnWidth: number): string {
  const width = textWidth(text);
  if (width >= columnWidth) return text;
  return text + " ".repeat(columnWidth - width);
}

formatColumn("名称", 10);    // "名称      "  (宽度 4 + 6 空格)
formatColumn("Status", 10);  // "Status    "  (宽度 6 + 4 空格)

// 场景二：终端文本截断
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

truncate("这是一段很长的中文文本", 12);  // "这是一段..."
truncate("Hello World! 你好世界", 16);   // "Hello World!..."

// 场景三：混合 CJK、ASCII、Emoji 的宽度计算
textWidth("用户 Alice 的状态：✅ 在线");
// '用' 2 + '户' 2 + ' ' 1 + 'Alice' 5 + ' ' 1
// + '的' 2 + '状' 2 + '态' 2 + '：' 2 + '✅' 2 + ' ' 1 + '在' 2 + '线' 2
// => 26

// 场景四：处理复杂 Emoji 序列
charWidth("🏳️‍🌈");   // => 2  (彩虹旗，ZWJ 序列)
charWidth("👨‍💻");    // => 2  (程序员，ZWJ 序列)
charWidth("🇨🇳");     // => 2  (中国国旗，区域指示符对)
```

### 注意事项

- 区域指示符（U+1F1E6-1F1FF）在 `isCjk()` 中被处理为双宽度字符，而非在 `isEmojiPresentation()` 中处理。
  这是因为单独的区域指示符码点也需要占 2 列。
- `isEmoji()` 与 `isEmojiPresentation()` 的区别在于：前者仅判断是否属于 Emoji 范围，
  后者进一步判断是否默认以 Emoji 图形方式呈现。属于 `isEmoji()` 但不属于
  `isEmojiPresentation()` 的码点（如 ☀ U+2600），需要附加 VS16 (U+FE0F) 才会以
  Emoji 图形方式显示并占据 2 列宽度。
- 所有宽度计算假设等宽字体终端环境，每个全角字符占 2 个半角字符位。
