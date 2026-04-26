# 浮层系统

## 概述

浮层系统用于在 Widget 树上方渲染**弹窗、菜单、命令面板、确认对话框**等 UI。所有浮层独立于主内容树，通过 `OverlayEntry` 插入和移除，支持嵌套 Modal 和基于 `LayerLink` 的跟随定位。

## 核心概念

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

### OverlayEntry 插入与移除

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

## 进阶用法

### CompositedTransformFollower：跟随定位

将浮层锚定到某个 Widget 的位置：

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
