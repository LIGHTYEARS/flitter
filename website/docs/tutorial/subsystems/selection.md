# 文本选择系统

:::info 本页面适合需要实现文本选择功能的开发者
如果你的应用不需要用户用鼠标选取和复制文本内容，可以跳过本页。大多数应用只需要显示文本，不需要手动集成选择系统。
:::

## 概述

在终端应用中，用户期望能像在浏览器中一样用鼠标选取文本并复制。文本选择系统就是为此而生的：它让你的 TUI 应用支持鼠标拖选、双击选词、三击选行等常见文本选择交互，并自动将选中内容写入系统剪贴板。

简单来说，文本选择系统帮你处理了三件事：
1. **选区计算** -- 根据鼠标事件确定选中了哪些文字
2. **视觉高亮** -- 让选中的文字显示高亮背景
3. **剪贴板写入** -- 自动将选中文本复制到系统剪贴板

:::tip 框架自动处理
在大多数情况下，框架会自动处理文本选择。如果你使用 `SelectionAreaWidget` 包裹内容区域，鼠标拖选、双击选词、剪贴板复制等功能都会自动工作，不需要手动编写选择逻辑。
:::

文本选择系统支持**鼠标拖选、双击选词、三击选行、Ctrl+A 全选**以及**跨视口选区保持**。选区结束后自动写入系统剪贴板，剪贴板策略按优先级降序尝试：`OSC 52` → `pbcopy` → `wl-copy` → `xclip`。

**你将学到什么：**

- 如何用 `SelectionAreaWidget` 为内容区域启用文本选择
- 如何实现双击选词、三击选行等高级选择操作
- 如何配置自动滚动和选区高亮样式
- 剪贴板的跨平台降级策略

## 核心概念

下表列出了文本选择系统的核心组件。对于大部分使用场景，你只需要关注 `SelectionArea` 和 `Selectable` 接口。

| 类 | 职责 |
|---|---|
| `SelectionArea` | 跨 Widget 选区管理器；注册 Selectable，驱动拖选/词选/行选 |
| `Selectable` | 接口：任何参与选择的 Widget 需实现 `id / getText / getGlobalBounds / setHighlightRange / clearHighlight` |
| `SelectionKeepAliveBoundary` | 包裹滚动区域，保持滚动时选区不被回收 |
| `Clipboard` | 跨平台剪贴板；OSC 52 → pbcopy → wl-copy → xclip 降级链 |

:::info 最常用的是 `SelectionArea`，大部分场景只需要用 `SelectionAreaWidget` 包裹内容区域就够了。
:::

### SelectionArea 主要 API

```
register(selectable)           // 注册可选组件
unregister(selectableId)       // 注销

beginDrag(position)            // 开始拖选
updateDrag(position)           // 更新拖选
endDrag()                      // 结束拖选，自动复制到剪贴板

selectWordAt(id, offset)       // 双击词选
selectLineAt(id, offset)       // 三击行选
selectAll()                    // Ctrl+A 全选

beginWordDrag(id, offset)      // 双击后拖拽词级扩选
updateWordDrag(id, offset)
endWordDrag()

recordClick(x, y) → 1|2|3     // 记录点击次数，返回连击计数
copySelection()                // 返回选中文本字符串
copyToClipboard()              // 写入剪贴板
clear()                        // 清除选区

setAutoScrollConfig(config)    // 拖选到边缘时自动滚动
addListener(fn) → cleanup      // 选区变化订阅
dispose()
```

## 基本用法

<!-- 演示用 SelectionAreaWidget 包裹内容区域，启用自动文本选择 -->

```typescript
import { SelectionArea } from "@flitter/tui/selection";

// 通常由框架层自动创建，包裹内容区域
new SelectionAreaWidget({
  child: new Column({
    children: textWidgets,
  }),
})
```

如果你需要更精细的控制，可以手动构建选区管理器：

<!-- 演示手动创建 SelectionArea 并执行拖选操作 -->

```typescript
const clipboard = new Clipboard();
const area = new SelectionArea(clipboard);

// 注册一个可选择组件
area.register(mySelectable);

// 模拟单击-拖选
area.beginDrag({ selectableId: "line-0", offset: 3 });
area.updateDrag({ selectableId: "line-0", offset: 12 });
await area.endDrag(); // 自动写剪贴板
```

## 进阶用法

以下是一些高级选择操作的实现方式。

### 双击选词

:::tip 何时使用
当你希望用户双击某个单词时自动选中整个单词（类似浏览器行为），可以使用 `selectWordAt` 配合 `recordClick` 实现。
:::

<!-- 演示根据点击次数实现双击选词 -->

```typescript
const clickCount = area.recordClick(mouseX, mouseY);

if (clickCount === 2) {
  area.selectWordAt(hitSelectableId, hitOffset);
  area.beginWordDrag(hitSelectableId, hitOffset); // 支持词级拖拽
}
```

### 三击选行

:::tip 何时使用
三击选行是终端应用中常见的交互模式，适合需要快速选中整行内容的场景。
:::

<!-- 演示三击选中整行文本 -->

```typescript
if (clickCount === 3) {
  area.selectLineAt(hitSelectableId, hitOffset);
}
```

### Ctrl+A 全选

<!-- 演示在键盘事件处理中实现全选功能 -->

```typescript
// 在 FocusNode.onKeyEvent 中：
if (event.key === "a" && event.ctrlKey) {
  area.selectAll();
  return "handled";
}
```

### 选区高亮颜色自定义

:::tip 何时使用
当默认高亮颜色与你的应用主题不协调时，可以通过主题系统自定义选区背景色。
:::

`Selectable.setHighlightRange` 中自行使用 `AppTheme.selection.highlightColor` 渲染背景色。

### 自动滚动配置

:::tip 何时使用
当你的内容区域可滚动，并且希望用户拖选到边缘时自动滚动（类似浏览器中的拖选滚动行为），需要配置自动滚动。
:::

拖选到视口边缘时触发自动滚动：

<!-- 演示配置拖选到边缘时的自动滚动行为 -->

```typescript
area.setAutoScrollConfig({
  threshold: 1,
  step: 1,
  intervalMs: 30,
  getScrollBounds: () => ({ top: 0, bottom: viewportHeight }),
  scrollUp: (n) => controller.scrollUp(n),
  scrollDown: (n) => controller.scrollDown(n),
});
```

## 与其他子系统的配合

- **滚动系统**：`SelectionKeepAliveBoundary` 包裹 `ListView`，防止滚动时选区丢失；自动滚动配置联动 `ScrollController`。
- **手势系统**：`MouseManager` 在 `onMouseDown/Move/Up` 中调用 `area.beginDrag/updateDrag/endDrag`。
- **焦点系统**：全选快捷键 `Ctrl+A` 在 `FocusNode.onKeyEvent` 中分发。

## 完整示例

可选择的文本查看器：

<!-- 综合演示：可滚动的文本查看器，支持鼠标拖选文本 -->

```typescript
const area = new SelectionArea();

const view = new SelectionAreaWidget({
  selectionArea: area,
  child: new ListView({
    itemCount: lines.length,
    itemBuilder: (i) => new SelectableText(lines[i], area),
  }),
});
```

:::tip 运行示例
```bash
bun run examples/tui-editing-demo.ts
```
:::

## 下一步

> 📖 详细 API: [文本 Widget 参考](/reference/widgets/text)
