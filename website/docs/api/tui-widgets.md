# Widget API 参考

## Text

单样式文本组件。

```ts
Text(text: string, props?: {
  style?: TextStyle;
  maxLines?: number;
  overflow?: TextOverflow;
})
```

| 参数 | 类型 | 说明 |
|------|------|------|
| `text` | `string` | 文本内容 |
| `style` | `TextStyle` | 文本样式 |
| `maxLines` | `number` | 最大行数 |
| `overflow` | `TextOverflow` | 溢出处理方式 |

---

## RichText

多样式富文本组件。

```ts
RichText(props: {
  text: TextSpan;
})
```

---

## TextStyle

文本样式对象。

```ts
TextStyle(props?: {
  color?: Color;
  backgroundColor?: Color;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  strikethrough?: boolean;
  dim?: boolean;
})
```

---

## Column / Row

Flex 布局容器。

```ts
Column(props: {
  children: Widget[];
  mainAxisAlignment?: MainAxisAlignment;
  crossAxisAlignment?: CrossAxisAlignment;
})

Row(props: {
  children: Widget[];
  mainAxisAlignment?: MainAxisAlignment;
  crossAxisAlignment?: CrossAxisAlignment;
})
```

### MainAxisAlignment

| 值 | 说明 |
|----|------|
| `start` | 起始对齐 |
| `end` | 末尾对齐 |
| `center` | 居中 |
| `spaceBetween` | 两端对齐，中间等距 |
| `spaceAround` | 每项两侧等距 |
| `spaceEvenly` | 所有间距相等 |

---

## Container

通用容器组件。

```ts
Container(props?: {
  child?: Widget;
  width?: number;
  height?: number;
  padding?: EdgeInsets;
  margin?: EdgeInsets;
  decoration?: BoxDecoration;
  alignment?: Alignment;
})
```

---

## Stack / Positioned

层叠布局。

```ts
Stack(props: {
  children: Widget[];
})

Positioned(props: {
  top?: number;
  right?: number;
  bottom?: number;
  left?: number;
  child: Widget;
})
```

---

## ListView

可滚动列表。

```ts
ListView(props: {
  children: Widget[];
  controller?: ScrollController;
})
```

---

## TextField

可编辑文本输入。

```ts
TextField(props: {
  controller: TextEditingController;
  placeholder?: string;
  style?: TextStyle;
  maxLines?: number;
})
```

---

## MouseRegion

鼠标区域检测。

```ts
MouseRegion(props: {
  child: Widget;
  onEnter?: (event: MouseEvent) => void;
  onExit?: (event: MouseEvent) => void;
  onHover?: (event: MouseEvent) => void;
})
```

---

## GestureDetector

手势检测。

```ts
GestureDetector(props: {
  child: Widget;
  onTap?: () => void;
})
```

---

## EdgeInsets

间距值对象。

```ts
EdgeInsets.all(value: number): EdgeInsets
EdgeInsets.symmetric(opts: { horizontal?: number; vertical?: number }): EdgeInsets
EdgeInsets.horizontal(value: number): EdgeInsets
EdgeInsets.vertical(value: number): EdgeInsets
EdgeInsets.only(opts: { left?: number; top?: number; right?: number; bottom?: number }): EdgeInsets
EdgeInsets.zero: EdgeInsets
```

| 属性 | 类型 | 说明 |
|------|------|------|
| `left` | `number` | 左间距 |
| `top` | `number` | 上间距 |
| `right` | `number` | 右间距 |
| `bottom` | `number` | 下间距 |
| `horizontal` | `number` | left + right |
| `vertical` | `number` | top + bottom |

---

## BoxDecoration

容器装饰。

```ts
new BoxDecoration(opts?: {
  color?: Color;
  border?: Border;
})
```

---

## Border / BorderSide

边框定义。

```ts
new BorderSide(color?: Color, width?: number, style?: "rounded" | "solid")
// 默认: color=Color.black(), width=1, style="rounded"

Border.all(side: BorderSide): Border
new Border(opts?: { top?, bottom?, left?, right?: BorderSide })
```

---

## Color

终端颜色。

```ts
Color.default(): Color
Color.black(): Color       // 至 Color.brightWhite() 共 16 色
Color.indexed(n: number): Color     // 0-255
Color.rgb(r: number, g: number, b: number): Color  // 0-255 each
```

| 属性 | 类型 | 说明 |
|------|------|------|
| `kind` | `"default" \| "named" \| "index" \| "rgb"` | 颜色模式 |
| `index` | `number` | 索引值 |
| `r`, `g`, `b` | `number` | RGB 分量 |

---

## ScrollController

滚动状态控制器。

```ts
new ScrollController()
```

| 方法 | 说明 |
|------|------|
| `jumpTo(offset)` | 跳转到偏移量 |
| `scrollUp(lines?)` | 上滚 |
| `scrollDown(lines?)` | 下滚 |
| `scrollToTop()` | 滚到顶部 |
| `scrollToBottom()` | 滚到底部 |
| `scrollPageUp(viewportSize)` | 上翻一页 |
| `scrollPageDown(viewportSize)` | 下翻一页 |
| `animateTo(target, duration?)` | 动画滚动（默认 200ms） |
| `enableFollowMode()` | 开启自动跟随 |
| `disableFollowMode()` | 关闭自动跟随 |
| `addListener(fn)` | 监听偏移变化 |
| `dispose()` | 释放资源 |

| 属性 | 类型 | 说明 |
|------|------|------|
| `offset` | `number` | 当前偏移 |
| `maxScrollExtent` | `number` | 最大滚动范围 |
| `atTop` | `boolean` | 是否在顶部 |
| `atBottom` | `boolean` | 是否在底部 |
| `followMode` | `boolean` | 是否自动跟随 |

---

## TextEditingController

文本编辑状态控制器。

```ts
new TextEditingController(opts?: { text?: string; width?: number })
```

| 属性 | 类型 | 说明 |
|------|------|------|
| `text` | `string` | 当前文本 |
| `cursorPosition` | `number` | 光标位置 |
| `cursorLine` | `number` | 光标行号 |
| `cursorColumn` | `number` | 光标列号 |
| `lineCount` | `number` | 总行数 |
| `hasSelection` | `boolean` | 是否有选区 |
| `graphemes` | `string[]` | 字素数组 |

| 方法 | 说明 |
|------|------|
| `insertText(text)` | 插入文本 |
| `deleteText(count?)` | 向后删除 |
| `deleteForward(count?)` | 向前删除 |
| `deleteWordLeft()` | 删除左侧单词 |
| `deleteWordRight()` | 删除右侧单词 |
| `deleteToLineEnd()` | 删除到行尾 |
| `moveCursorLeft/Right/Up/Down()` | 移动光标 |
| `moveCursorToLineStart/End()` | 移到行首/尾 |
| `moveCursorToStart/End()` | 移到文档首/尾 |
| `moveCursorWordBoundary(dir)` | 按单词移动 |
| `setSelectionRange(start, end)` | 设置选区 |
| `clearSelection()` | 清除选区 |
| `addListener(fn)` | 监听变化 |
| `dispose()` | 释放资源 |

---

## FocusNode

焦点节点。

```ts
new FocusNode(opts?: {
  debugLabel?: string;
  canRequestFocus?: boolean;
  skipTraversal?: boolean;
  onKey?: (event: KeyEvent) => "handled" | "ignored";
  onPaste?: (event: PasteEvent) => "handled" | "ignored";
})
```

| 方法/属性 | 说明 |
|----------|------|
| `requestFocus()` | 请求焦点 |
| `unfocus()` | 失去焦点 |
| `hasPrimaryFocus` | 是否是当前主焦点 |
| `hasFocus` | 自身或子节点是否持有焦点 |
| `addListener(fn)` | 监听焦点变化 |
| `dispose()` | 释放资源 |

:::warning
以上 API 签名基于源码整理。具体参数类型和默认值请参考 `packages/tui/src/` 中的 TypeScript 类型定义。
:::
