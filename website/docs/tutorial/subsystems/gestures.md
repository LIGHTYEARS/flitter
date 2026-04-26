# 手势系统

## 概述

手势系统处理**鼠标点击、双击、悬停、拖拽、滚轮**等交互事件。核心是 `MouseManager` 单例：它对渲染树执行命中测试（hit-test），将鼠标事件精准路由到对应 Widget。

## 核心概念

| 类 | 职责 |
|---|---|
| `MouseManager` | 单例；持有根渲染对象，执行命中测试并分发事件 |
| `HitTestResult` | 命中测试结果；持有命中的 `HitTestEntry` 列表（从叶到根） |
| `HitTestEntry` | 单个命中条目；持有 RenderObject 引用和局部坐标 |
| `RenderMouseRegion` | 渲染层实现；注册 onEnter/onHover/onExit/onClick 回调 |
| `MouseRegion` | Widget 层；包裹任意子 Widget，声明鼠标事件监听 |
| `GestureDetector` | 高层 Widget；提供 onTap/onDoubleTap/onPan* 语义手势 |

### 事件路由管线

```
Terminal Mouse Event
      ↓
MouseManager.handleMouseEvent(event)
      ↓
HitTestResult.hitTest(root, globalPos)   ← 从根向叶递归
      ↓
entries（叶 → 根顺序）
      ↓
RenderMouseRegion.handleEvent(event, entry)  ← 按序分发
```

全局点击回调（`GlobalClickInfo`）在命中测试后触发，携带 `clickCount`、`mouseTargets` 等完整上下文，供 `SelectionArea` 等跨 Widget 系统使用。

## 基本用法

### GestureDetector：点击事件

```typescript
import { GestureDetector } from "@flitter/tui/widgets";

new GestureDetector({
  onTap: () => console.log("clicked"),
  child: new Container({
    padding: EdgeInsets.all(1),
    child: new Text("Click me"),
  }),
})
```

### MouseRegion：悬停与光标

```typescript
import { MouseRegion } from "@flitter/tui/widgets";

new MouseRegion({
  cursor: "pointer",          // 终端光标样式
  onEnter: (event) => setState(() => hovered = true),
  onExit:  (event) => setState(() => hovered = false),
  child: buttonWidget,
})
```

## 进阶用法

### 双击

```typescript
new GestureDetector({
  onTap:       () => handleSingleClick(),
  onDoubleTap: () => handleDoubleClick(),
  child: itemWidget,
})
```

### 拖拽（onPan*）

```typescript
new GestureDetector({
  onPanStart:  (details) => startDrag(details.globalPosition),
  onPanUpdate: (details) => updateDrag(details.delta),
  onPanEnd:    (_)        => endDrag(),
  child: draggableWidget,
})
```

### 滚轮事件

`MouseRegion` 的 `onScroll` 回调接收滚动增量，与 `ScrollController` 联动：

```typescript
new MouseRegion({
  onScroll: (event) => {
    if (event.deltaY > 0) controller.scrollDown(3);
    else controller.scrollUp(3);
  },
  child: scrollableContent,
})
```

### 命中测试排除

若某 Widget 不应参与命中测试（穿透点击），使用 `IgnorePointer`：

```typescript
new IgnorePointer({
  ignoring: true,
  child: overlayDecoration,
})
```

## 与其他子系统的配合

- **选择系统**：`MouseManager` 的全局点击回调（`GlobalClickInfo`）触发 `SelectionArea.beginDrag/updateDrag/endDrag`。
- **焦点系统**：`GestureDetector.onTap` 中调用 `FocusNode.requestFocus()` 实现点击获焦。
- **浮层系统**：点击遮罩关闭 Modal——`GestureDetector.onTap` 调用 `modalStack.pop()`。

## 完整示例

可点击、可悬停的按钮列表：

```typescript
new Column({
  children: items.map((item) =>
    new GestureDetector({
      onTap: () => selectItem(item),
      onDoubleTap: () => openItem(item),
      child: new MouseRegion({
        cursor: "pointer",
        onEnter: (_) => setState(() => hoveredId = item.id),
        onExit:  (_) => setState(() => hoveredId = null),
        child: new Container({
          color: hoveredId === item.id ? theme.hoverColor : null,
          child: new Text(item.label),
        }),
      }),
    })
  ),
})
```

:::tip 运行示例
```bash
bun run examples/tui-interactive-demo.ts
```
:::

## 下一步

> 📖 详细 API: [交互 Widget 参考](/reference/widgets/interaction)
