# 浮层系统

## 概述

当你需要在应用中弹出一个确认对话框、显示右键菜单、或者打开一个命令面板时，就需要用到浮层系统。浮层系统让你能在主界面上方叠加临时 UI，而不干扰底层的 Widget 树结构。

浮层系统用于在 Widget 树上方渲染**弹窗、菜单、命令面板、确认对话框**等 UI。所有浮层独立于主内容树，通过 `OverlayEntry` 插入和移除，支持嵌套 Modal 和基于 `LayerLink` 的跟随定位。

:::info 什么是浮层？
如果你有 Web 开发经验，浮层类似于 HTML 中的 `<dialog>`、Bootstrap 的 Modal、或 Ant Design 的 Popover。它们浮在页面内容上方，用完即关闭。在终端 TUI 中，浮层的原理相同：在主内容区域上方绘制一个独立的图层。
:::

**你将学到什么：**

- 如何使用 `OverlayEntry` 插入和移除浮层
- 如何用 `ModalStackController` 管理多层弹窗
- 如何让浮层跟随某个 Widget 的位置
- 如何使用内置的对话框和命令面板组件

## 核心概念

下表列出了浮层系统涉及的所有核心类及其职责。初学者不需要一次掌握全部，从 `OverlayEntry` 和 `ModalStackController` 开始即可。

| 类 | 职责 |
|---|---|
| `OverlayEntry` | 延迟构建的弹出层条目；持有 `builder` 函数 |
| `OverlayState` | 管理 OverlayEntry 列表，提供 `insert` / `remove` |
| `OverlayContainer` | Widget 层，在主内容上方叠加所有 Entry |
| `ModalStackController` | push/pop 多层 Modal，`canPop` 检测是否可弹出 |
| `ModalStackWidget` | 将 Modal 栈渲染为 `Stack` + `Offstage` 树 |
| `LayerLink` | 标记锚点（`CompositedTransformTarget`）和跟随层（`CompositedTransformFollower`） |
| `FuzzyPicker` | 模糊搜索选择列表（命令面板基础组件） |
| `CommandPalette` | 命令面板：快捷键 `Ctrl+P` 触发，FuzzyPicker 内核 |

:::info 最常用的是 `OverlayEntry` 和 `ModalStackController`，大部分场景只需要它们就够了。
:::

### OverlayEntry 生命周期

```
new OverlayEntry({ builder }) → insert(entry) → ...使用... → entry.remove()
                                                              ↓
                                                     从 Overlay 移除，Widget 销毁
```

### ModalStackController API

```
push(widget)   // 向栈顶压入一个 Modal Widget
pop()          // 弹出栈顶 Modal，返回 false 表示栈为空
canPop         // boolean：栈是否非空
length         // 当前栈深度
entries        // 当前条目快照（只读）
addListener(fn) / removeListener(fn)
```

## 基本用法

下面从最简单的浮层操作开始，逐步演示核心用法。

### OverlayEntry 插入与移除

<!-- 演示最基本的浮层创建、插入和移除流程 -->

```typescript
import { OverlayEntry } from "@flitter/tui/overlay";

// 在 StatefulWidget.build 中获取 overlayState
const entry = new OverlayEntry({
  builder: (_ctx) =>
    new Container({
      decoration: new BoxDecoration({ border: Border.all() }),
      child: new Text("弹出内容"),
    }),
});

// 插入浮层
overlayState.insert(entry);

// 稍后移除
entry.remove();
```

### ModalStack 多层 Modal

当你需要在一个弹窗上面再弹出另一个弹窗（比如确认对话框中再弹出一个输入框），`ModalStackController` 提供了栈式管理。

<!-- 演示用 ModalStackController 管理多层 Modal 弹窗 -->

```typescript
import { ModalStackController, ModalStackWidget } from "@flitter/tui/overlay";

const modalStack = new ModalStackController();

// 压入 Modal
modalStack.push(new ConfirmDialog({
  message: "确认删除？",
  onConfirm: () => modalStack.pop(),
  onCancel: () => modalStack.pop(),
}));

// 根 Widget
const root = new ModalStackWidget({
  root: mainContentWidget,
  controller: modalStack,
});
```

:::tip 何时使用 ModalStack vs 普通 OverlayEntry
- **普通 OverlayEntry**：适合单个浮层场景，比如一个下拉菜单或一个提示气泡。你手动控制插入和移除。
- **ModalStackController**：适合需要多层嵌套弹窗的场景，比如「设置页 -> 确认对话框 -> 输入框」这种层叠关系。它帮你自动管理栈的顺序和弹出逻辑。
:::

## 进阶用法

掌握基本用法后，以下进阶功能可以帮助你处理更复杂的浮层场景。

### CompositedTransformFollower：跟随定位

:::tip 何时使用
当你需要让浮层「跟着」某个 Widget 移动时（比如下拉菜单需要出现在按钮正下方），就需要跟随定位。
:::

将浮层锚定到某个 Widget 的位置：

<!-- 演示如何让浮层跟随某个锚点 Widget 的位置 -->

```typescript
import { LayerLink } from "@flitter/tui/overlay";
import { CompositedTransformTarget, CompositedTransformFollower } from "@flitter/tui/overlay";

const link = new LayerLink();

// 锚点 Widget（在 Widget 树中）
new CompositedTransformTarget({ link, child: anchorWidget })

// 跟随层（在 OverlayEntry.builder 中）
new CompositedTransformFollower({
  link,
  offset: { x: 0, y: 1 },   // 锚点下方 1 行
  child: dropdownWidget,
})
```

### FuzzyPicker：模糊搜索列表

:::tip 何时使用
当你有一组选项需要用户快速筛选时（类似 VS Code 的 Ctrl+P 文件搜索），FuzzyPicker 提供了开箱即用的模糊搜索能力。
:::

<!-- 演示如何创建带模糊搜索的选择列表 -->

```typescript
import { FuzzyPicker } from "@flitter/tui/overlay";

new FuzzyPicker({
  items: commands.map((c) => ({ label: c.name, value: c })),
  onSelect: (item) => {
    item.value.execute();
    overlayEntry.remove();
  },
  placeholder: "搜索命令…",
  maxHeight: 10,
})
```

### SpinnerOverlay：异步等待

:::tip 何时使用
当你需要在执行耗时操作（如网络请求、文件处理）时给用户一个视觉反馈，SpinnerOverlay 提供了加载指示器。
:::

<!-- 演示在异步操作期间显示加载指示器 -->

```typescript
import { SpinnerOverlay } from "@flitter/tui/overlay";

const spinner = new OverlayEntry({
  builder: (_ctx) => new SpinnerOverlay({ message: "加载中…" }),
});
overlayState.insert(spinner);
await longOperation();
spinner.remove();
```

### 内置对话框

:::tip 何时使用
需要快速实现「确认/取消」或「文本输入」交互时，直接使用内置对话框组件，无需自己构建 UI。
:::

<!-- 演示使用框架内置的确认对话框和文本输入对话框 -->

```typescript
import { ConfirmDialog, PromptDialog } from "@flitter/tui/overlay";

// 确认对话框
new ConfirmDialog({
  message: "确认提交？",
  onConfirm: () => { /* ... */ },
  onCancel:  () => { /* ... */ },
});

// 文本输入对话框
new PromptDialog({
  title: "输入文件名",
  onSubmit: (value) => { /* ... */ },
});
```

## 与其他子系统的配合

- **焦点系统**：Modal 压入时应将焦点移入 Modal 内部；弹出时恢复上一层焦点。
- **主题系统**：`ConfirmDialog` / `PromptDialog` 的边框和高亮色通过 `AppTheme.dialog` 配置。
- **手势系统**：点击遮罩区域关闭 Modal 需在 `GestureDetector.onTap` 中调用 `pop()`。

## 完整示例

多层 Modal + 命令面板：

<!-- 综合演示：在应用中同时使用 ModalStack 管理多层弹窗和命令面板 -->

```typescript
const modalStack = new ModalStackController();

function openCommandPalette() {
  modalStack.push(
    new CommandPalette({
      commands: registeredCommands,
      onClose: () => modalStack.pop(),
    })
  );
}

const app = new ModalStackWidget({
  root: new Column({
    children: [mainView, new Text("Ctrl+P 打开命令面板")],
  }),
  controller: modalStack,
});
```

:::tip 运行示例
```bash
bun run examples/tui-overlay-demo.ts
bun run examples/tui-command-palette-demo.ts
```
:::

## 下一步

> 📖 详细 API: [浮层 Widget 参考](/reference/widgets/overlay)
