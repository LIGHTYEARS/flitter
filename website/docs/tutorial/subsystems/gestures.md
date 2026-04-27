# 手势系统

## 概述

终端应用同样需要响应用户的鼠标操作。当你需要让用户点击按钮、拖拽元素、或者在鼠标悬停时显示高亮效果，就需要用到手势系统。它的角色类似于 Web 中的 `addEventListener('click', ...)`，但为终端环境量身定制。

手势系统处理**鼠标点击、双击、悬停、拖拽、滚轮**等交互事件。核心是 `MouseManager` 单例：它对渲染树执行命中测试（hit-test），将鼠标事件精准路由到对应 Widget。

**你将学到什么：**

- 如何用 `GestureDetector` 处理点击和拖拽
- 如何用 `MouseRegion` 实现悬停效果
- 如何处理滚轮事件和命中测试排除
- 三种交互 Widget 的选择策略

## 核心概念

下表列出了手势系统中的核心类。日常开发中最常用的是 `GestureDetector` 和 `MouseRegion`，底层的 `MouseManager` 和命中测试通常由框架自动处理。

| 类 | 职责 |
|---|---|
| `MouseManager` | 单例；持有根渲染对象，执行命中测试并分发事件 |
| `HitTestResult` | 命中测试结果；持有命中的 `HitTestEntry` 列表（从叶到根） |
| `HitTestEntry` | 单个命中条目；持有 RenderObject 引用和局部坐标 |
| `RenderMouseRegion` | 渲染层实现；注册 onEnter/onHover/onExit/onClick 回调 |
| `MouseRegion` | Widget 层；包裹任意子 Widget，声明鼠标事件监听 |
| `GestureDetector` | 高层 Widget；提供 onTap/onDoubleTap/onPan* 语义手势 |

:::info 最常用的是 `GestureDetector` 和 `MouseRegion`，大部分交互只需要它们就够了。
:::

:::tip 选择指南
不确定该用哪个组件？参考以下决策表：

| 你的需求 | 推荐组件 | 说明 |
|---|---|---|
| 处理点击、双击、拖拽 | `GestureDetector` | 提供语义化的手势回调（onTap / onDoubleTap / onPan*） |
| 悬停高亮、鼠标光标变化 | `MouseRegion` | 提供 onEnter / onExit / onHover 回调 |
| 键盘输入、快捷键 | `Focus` | 参见[焦点系统](/tutorial/subsystems/focus-system) |

在实际应用中，`GestureDetector` 和 `MouseRegion` 经常组合使用：外层用 `GestureDetector` 处理点击，内层用 `MouseRegion` 处理悬停样式。
:::

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

<!-- 演示用 GestureDetector 处理最基本的点击事件 -->

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

<!-- 演示用 MouseRegion 实现鼠标悬停检测和光标样式变化 -->

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

:::tip 何时使用
双击常用于「打开」操作（如双击打开文件），与单击的「选中」操作区分。
:::

<!-- 演示同时处理单击和双击事件 -->

```typescript
new GestureDetector({
  onTap:       () => handleSingleClick(),
  onDoubleTap: () => handleDoubleClick(),
  child: itemWidget,
})
```

### 拖拽（onPan*）

:::tip 何时使用
需要实现拖拽交互时（如拖拽调整面板大小、拖拽排序列表项），使用 `onPanStart/onPanUpdate/onPanEnd` 回调。
:::

<!-- 演示用 onPan* 回调实现拖拽交互 -->

```typescript
new GestureDetector({
  onPanStart:  (details) => startDrag(details.globalPosition),
  onPanUpdate: (details) => updateDrag(details.delta),
  onPanEnd:    (_)        => endDrag(),
  child: draggableWidget,
})
```

### 滚轮事件

:::tip 何时使用
当内容区域需要响应鼠标滚轮滚动时，通过 `MouseRegion` 的 `onScroll` 回调与 `ScrollController` 联动。
:::

`MouseRegion` 的 `onScroll` 回调接收滚动增量，与 `ScrollController` 联动：

<!-- 演示处理鼠标滚轮事件并联动滚动控制器 -->

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

:::tip 何时使用
当某个装饰性浮层（如半透明遮罩）不应该拦截鼠标事件，需要让点击「穿透」到下层 Widget 时，使用 `IgnorePointer`。
:::

若某 Widget 不应参与命中测试（穿透点击），使用 `IgnorePointer`：

<!-- 演示用 IgnorePointer 让 Widget 不拦截鼠标事件 -->

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

<!-- 综合演示：列表中的每个条目都支持点击选中、双击打开、鼠标悬停高亮 -->

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
