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
  textAlign?: TextAlign;      // "left" | "center" | "right"，默认 "left"
  overflow?: TextOverflow;    // "clip" | "ellipsis" | "visible"，默认 "clip"
  maxLines?: number;          // 最大行数，undefined = 无限制
})
```

| 参数 | 类型 | 说明 |
|------|------|------|
| `text` | `TextSpan` | 根文本片段 |
| `textAlign` | `TextAlign` | 文本对齐方式 |
| `overflow` | `TextOverflow` | 溢出处理（`"ellipsis"` 仅在设置 `maxLines` 时生效） |
| `maxLines` | `number` | 最大行数限制 |

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
  onClick?: (event: MouseEvent) => void;
  onEnter?: (event: MouseEvent) => void;
  onExit?: (event: MouseEvent) => void;
  onHover?: (event: MouseEvent) => void;
  onScroll?: (event: MouseEvent) => void;
  onDrag?: (event: MouseEvent) => void;
  onRelease?: (event: MouseEvent) => void;
  opaque?: boolean;     // 默认 true，阻止事件穿透
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

## Scrollbar

滚动条指示器，支持鼠标交互和 1/8 字符精度渲染。

```ts
Scrollbar(props: {
  controller: ScrollController;
  getScrollInfo: () => ScrollInfo;
  thickness?: number;       // 默认 1
  thumbColor?: Color;       // 默认 rgb(150,150,150)
  trackColor?: Color;       // 默认 rgb(60,60,60)
  showTrack?: boolean;      // 默认 true
})
```

```ts
interface ScrollInfo {
  totalContentHeight: number;
  viewportHeight: number;
  scrollOffset: number;
}
```

---

## ClipBox

裁剪容器，将子节点的绘制限制在自身边界内。

```ts
ClipBox(props?: {
  child?: Widget;
})
```

---

## FuzzyPicker

通用模糊搜索选择器。

```ts
FuzzyPicker<T>(props: {
  items: T[];
  getLabel: (item: T) => string;
  onAccept: (item: T, info: { hasUserInteracted: boolean }) => void;
  onDismiss?: () => void;
  onSelectionChange?: (item: T | null) => void;
  renderItem?: (item: T, isSelected: boolean, isDisabled: boolean, ctx: BuildContext) => Widget;
  sortItems?: (a: ScoredItem<T>, b: ScoredItem<T>, query: string) => number;
  filterItem?: (item: T, query: string) => boolean;
  isItemDisabled?: (item: T) => boolean;
  normalizeQuery?: (query: string) => string;
  title?: string;
  maxRenderItems?: number;
  controller?: FuzzyPickerController;
})
```

| 参数 | 类型 | 说明 |
|------|------|------|
| `items` | `T[]` | 候选项列表 |
| `getLabel` | `(item: T) => string` | 获取显示文本 |
| `onAccept` | `Function` | 确认选择回调 |
| `onDismiss` | `Function` | 关闭回调（Escape） |
| `renderItem` | `Function` | 自定义渲染（可选） |
| `filterItem` | `Function` | 自定义前置过滤（在模糊评分之前） |
| `isItemDisabled` | `Function` | 禁用项判断 |
| `title` | `string` | 标题 |
| `maxRenderItems` | `number` | 最大渲染条目数 |

### fuzzyMatch

```ts
function fuzzyMatch(query: string, label: string): FuzzyMatchResult

interface FuzzyMatchResult {
  matches: boolean;   // score > 0.15
  score: number;      // 0.0–1.0
}
```

---

## Focus

焦点管理 Widget。

```ts
Focus(props: {
  child: Widget;
  focusNode?: FocusNode;
  autofocus?: boolean;              // 默认 false
  canRequestFocus?: boolean;        // 默认 true
  skipTraversal?: boolean;          // 默认 false
  onKey?: (event: KeyEvent) => KeyEventResult;
  onPaste?: (event: PasteEvent) => KeyEventResult;
  onFocusChange?: (hasFocus: boolean) => void;
  debugLabel?: string;
})
```

---

## Intent

用户意图基类，Actions 系统的核心。

```ts
abstract class Intent {}
```

继承创建自定义 Intent：

```ts
class SaveIntent extends Intent {}
class NavigateIntent extends Intent {
  constructor(public readonly direction: 'up' | 'down') { super(); }
}
```

---

## Action

响应 Intent 的处理器基类。

```ts
abstract class Action<T extends Intent> {
  abstract invoke(intent: T): 'handled' | 'ignored' | void;
  isEnabled(intent: T): boolean;        // 默认 true
  consumesKey(intent: T): boolean;      // 默认 true
}
```

---

## Actions

在 Widget 树中注册 Intent → Action 映射。

```ts
Actions(props: {
  actions: Map<IntentConstructor, Action>;
  child: Widget;
  dispatcher?: ActionDispatcher;
})
```

| 静态方法 | 说明 |
|----------|------|
| `Actions.invoke(context, intent)` | 查找并调用 Action（找不到时抛异常） |
| `Actions.maybeInvoke(context, intent)` | 安全版本（返回 null） |
| `Actions.find(context, intent)` | 查找 Action |
| `Actions.maybeFind(context, intent)` | 安全查找 |
| `Actions.handler(context, intent)` | 获取可调用回调（null 表示不可用） |

---

## Shortcuts

在 Widget 树中注册 KeyActivator → Intent 映射。

```ts
Shortcuts(props: {
  shortcuts: Map<KeyActivator, Intent>;
  child: Widget;
  manager?: ShortcutManager;
  focusNode?: FocusNode;
  debugLabel?: string;
})
```

---

## KeyActivator

按键组合描述器。

```ts
new KeyActivator(key: string, modifiers?: {
  shift?: boolean;
  ctrl?: boolean;
  alt?: boolean;
  meta?: boolean;
})
```

| 工厂方法 | 说明 |
|----------|------|
| `KeyActivator.key(k)` | 单键 |
| `KeyActivator.ctrl(k)` | Ctrl + 键 |
| `KeyActivator.shift(k)` | Shift + 键 |
| `KeyActivator.alt(k)` | Alt + 键 |
| `KeyActivator.meta(k)` | Meta + 键 |

| 方法 | 说明 |
|------|------|
| `accepts(event: KeyEvent)` | 精确匹配 key + 修饰键 |
| `modifierNames()` | 返回修饰键名称数组 |

---

## ShortcutManager

快捷键映射管理器。

```ts
new ShortcutManager(shortcuts?: Map<KeyActivator, Intent>)
```

| 方法 | 说明 |
|------|------|
| `handleKeyEvent(event)` | 匹配按键，返回 `Intent \| null` |
| `addShortcut(activator, intent)` | 添加映射 |
| `removeShortcut(activator)` | 移除映射 |
| `getAllShortcuts()` | 获取所有映射的副本 |
| `copyWith(additional)` | 创建合并后的新 Manager |

---

## ScrollBehavior

vim 风格键盘滚动行为。

```ts
new ScrollBehavior(controller: ScrollController, options?: {
  scrollStep?: number;       // 默认 3
  pageScrollStep?: number;   // 默认 10
  axisDirection?: 'vertical' | 'horizontal';  // 默认 "vertical"
})
```

| 方法 | 说明 |
|------|------|
| `handleKeyEvent(event)` | 匹配按键并执行滚动 |
| `handleScrollDelta(delta)` | 直接应用滚动偏移 |

---

## TextSpan

文本片段，用于 RichText 的子节点。

```ts
new TextSpan(options?: {
  text?: string;
  style?: TextStyle;
  children?: TextSpan[];
  url?: string;            // OSC 8 终端超链接
  onTap?: () => void;      // 点击回调
})
```

| 属性 | 类型 | 说明 |
|------|------|------|
| `text` | `string` | 文本内容 |
| `style` | `TextStyle` | 文本样式 |
| `children` | `TextSpan[]` | 子片段 |
| `url` | `string` | 超链接 URL |
| `onTap` | `() => void` | 点击回调 |

| 方法 | 说明 |
|------|------|
| `toPlainText()` | 整个 span 树拼接为纯文本 |
| `visitTextSpan(visitor)` | 遍历 span 树 |

:::warning
以上 API 签名基于源码整理。具体参数类型和默认值请参考 `packages/tui/src/` 中的 TypeScript 类型定义。
:::
