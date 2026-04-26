# 文本选择系统

## 概述

文本选择系统支持**鼠标拖选、双击选词、三击选行、Ctrl+A 全选**以及**跨视口选区保持**。选区结束后自动写入系统剪贴板，剪贴板策略按优先级降序尝试：`OSC 52` → `pbcopy` → `wl-copy` → `xclip`。

## 核心概念

| 类 | 职责 |
|---|---|
| `SelectionArea` | 跨 Widget 选区管理器；注册 Selectable，驱动拖选/词选/行选 |
| `Selectable` | 接口：任何参与选择的 Widget 需实现 `id / getText / getGlobalBounds / setHighlightRange / clearHighlight` |
| `SelectionKeepAliveBoundary` | 包裹滚动区域，保持滚动时选区不被回收 |
| `Clipboard` | 跨平台剪贴板；OSC 52 → pbcopy → wl-copy → xclip 降级链 |

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

```typescript
import { SelectionArea } from "@flitter/tui/selection";

// 通常由框架层自动创建，包裹内容区域
new SelectionAreaWidget({
  child: new Column({
    children: textWidgets,
  }),
})
```

手动构建选区管理器：

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

### 双击选词

```typescript
const clickCount = area.recordClick(mouseX, mouseY);

if (clickCount === 2) {
  area.selectWordAt(hitSelectableId, hitOffset);
  area.beginWordDrag(hitSelectableId, hitOffset); // 支持词级拖拽
}
```

### 三击选行

```typescript
if (clickCount === 3) {
  area.selectLineAt(hitSelectableId, hitOffset);
}
```

### Ctrl+A 全选

```typescript
// 在 FocusNode.onKeyEvent 中：
if (event.key === "a" && event.ctrlKey) {
  area.selectAll();
  return "handled";
}
```

### 选区高亮颜色自定义

`Selectable.setHighlightRange` 中自行使用 `AppTheme.selection.highlightColor` 渲染背景色。

### 自动滚动配置

拖选到视口边缘时触发自动滚动：

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
