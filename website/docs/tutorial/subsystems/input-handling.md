# 输入与手势

终端应用需要响应用户的键盘输入和鼠标操作。无论是按下快捷键触发功能，还是点击按钮、悬停高亮，都需要输入处理系统的支持。当你需要让 Widget 响应点击、监听键盘事件、或处理鼠标悬停效果时，就会用到这个子系统。

Flitter 提供完整的键盘和鼠标输入处理系统。

### 你将学到什么

- 如何使用 `GestureDetector` 和 `MouseRegion` 处理鼠标事件
- 如何通过 `Focus` Widget 接收键盘输入
- 双击检测和全局鼠标回调的使用方式
- 底层输入解析（VtParser）的工作原理

## 常用 Widget

大部分场景下，你只需要两个 Widget 就能处理所有鼠标交互：

:::info 最常用的是 GestureDetector 和 MouseRegion
`GestureDetector` 用于处理点击、双击、拖拽等语义手势；`MouseRegion` 用于处理悬停效果。大部分交互场景只需要它们就够了，不需要直接接触底层的输入解析。
:::

### GestureDetector

处理点击等语义手势的高层 Widget：

```ts
GestureDetector({
  onTap: () => { /* 点击 */ },
  child: Text('Click me'),
})
```

### MouseRegion

处理鼠标进入、离开、悬停等事件：

```ts
MouseRegion({
  onEnter: () => { /* 鼠标进入 */ },
  onExit: () => { /* 鼠标离开 */ },
  onHover: (event) => { /* 鼠标移动 */ },
  child: Text('Hover me'),
})
```

### 焦点管理

框架提供焦点系统，管理键盘输入的路由目标：
- 焦点节点接收键盘事件
- Tab 键在可聚焦节点间切换
- `TextField` 等 Widget 自动管理焦点
- `Focus` Widget 提供声明式焦点管理

:::tip 何时使用
焦点系统是一个独立的大话题，如果你需要处理键盘事件，建议先阅读 [焦点系统](./focus-system.md) 专门章节。
:::

## 双击检测

MouseManager 内置双击检测（`_calculateClickCount`），在 300ms 窗口内的连续点击会累加 `clickCount`。该计数通过 `GlobalClickInfo` 传递给全局点击回调。

## 全局鼠标回调

:::tip 何时使用
全局鼠标回调适用于需要在所有 MouseRegion 之前拦截事件的场景，比如实现跨 Widget 的文本选择、全局拖拽等功能。
:::

`MouseManager` 支持注册全局回调，在所有 MouseRegion 之前触发：

```ts
// 全局释放回调（在 per-target 释放之前触发）
MouseManager.instance.addGlobalReleaseCallback(() => {
  console.log('鼠标释放');
});

// 全局点击回调（包含完整命中信息）
MouseManager.instance.addGlobalClickCallback((info) => {
  console.log(`点击位置: (${info.globalPosition.x}, ${info.globalPosition.y})`);
  console.log(`点击次数: ${info.clickCount}`);  // 双击为 2
  console.log(`命中目标数: ${info.mouseTargets.length}`);
});
```

### GlobalClickInfo

全局点击回调的参数结构：

```ts
interface GlobalClickInfo {
  event: MouseEvent;
  globalPosition: { x: number; y: number };
  mouseTargets: Array<{
    target: RenderMouseRegion;
    localPosition: { x: number; y: number };
  }>;
  clickCount: number;    // 1 = 单击, 2 = 双击, 3 = 三击...
}
```

## 底层细节：输入解析

以下内容介绍框架内部如何将终端原始字节流转换为结构化事件。如果你只是使用 `GestureDetector` 和 `Focus` Widget，可以跳过这一节。

### VtParser

`VtParser` 将终端原始字节流解析为结构化事件：

```
原始字节 → VtParser → InputEvent (KeyEvent | MouseEvent | ResizeEvent | ...)
```

### 键盘事件

支持的键盘输入：
- 普通字符输入
- 功能键（F1-F12、方向键、Home/End 等）
- 修饰键组合（Ctrl+、Alt+、Shift+）

### 鼠标事件

使用 **SGR 鼠标协议**（终端需支持 `\x1b[?1003h` 和 `\x1b[?1006h`）：

:::info 你不需要记住这些编码
下面的表格展示的是终端底层的鼠标协议细节。框架会自动处理这些编码的解析和转换，你在应用层只需要使用 `GestureDetector` 和 `MouseRegion` 的回调即可。这里列出仅供对终端协议感兴趣的读者参考。
:::

| 事件 | SGR 编码 |
|------|---------|
| 左键按下 | `\x1b[<0;{col};{row}M` |
| 左键释放 | `\x1b[<0;{col};{row}m` |
| 鼠标移动 | `\x1b[<35;{col};{row}M` |
| 滚轮上滚 | `\x1b[<64;{col};{row}M` |
| 滚轮下滚 | `\x1b[<65;{col};{row}M` |

### HitTest

当鼠标事件到达时，框架执行 **命中测试**：

1. 从 RenderObject 树的根开始
2. 检查鼠标坐标是否在当前节点的布局区域内
3. 递归检查子节点（后绘制的在前，实现 z-order）
4. 收集所有命中的节点，形成 HitTest 路径

## 与其他子系统的配合

- **焦点系统**：键盘事件通过焦点系统路由到当前持有焦点的 Widget。详见 [焦点系统](./focus-system.md)。
- **手势系统**：`GestureDetector` 和 `MouseRegion` 的底层事件源来自本页介绍的输入解析管线。详见 [手势系统](./gestures.md)。
- **选择系统**：文本选择依赖鼠标拖拽事件和全局点击回调。详见 [文本选择系统](./selection.md)。
- **Actions/Shortcuts**：快捷键系统建立在键盘事件之上，将按键映射为高层意图。详见 [Actions 与 Shortcuts](./actions-shortcuts.md)。

## 下一步

- [焦点系统](./focus-system.md) — 深入了解键盘事件的路由和焦点管理
- [手势系统](./gestures.md) — GestureDetector 和 MouseRegion 的完整用法
- [Actions 与 Shortcuts](./actions-shortcuts.md) — 将快捷键与业务逻辑解耦
