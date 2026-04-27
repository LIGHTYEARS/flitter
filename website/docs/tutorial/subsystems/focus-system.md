# 焦点系统

在终端应用中，同一时间只有一个 Widget 能接收键盘输入——比如用户正在编辑的文本框，或者正在操作的菜单。焦点系统就是用来管理「当前谁在接收键盘事件」的子系统。当你需要构建可交互的表单、支持 Tab 键在输入框之间切换、或者在弹出层打开时拦截按键时，都需要用到焦点系统。

焦点系统类似于浏览器中的 tab 导航——按 Tab 键在可交互元素之间切换，当前获得焦点的元素接收所有键盘输入。

Flitter 提供完整的焦点管理系统，控制键盘事件的路由目标。焦点系统决定了「哪个 Widget 接收键盘输入」。

### 你将学到什么

- FocusNode 和 FocusManager 的基本用法
- 键盘事件如何从终端输入流路由到目标 Widget
- Tab 遍历和全局键盘拦截
- Focus Widget 的声明式焦点管理

## 核心概念

下面这张表列出了焦点系统的三个核心角色：

- **FocusNode** — 焦点树的节点，可请求焦点、监听焦点变化、处理键盘事件
- **FocusManager** — 全局焦点管理器，维护焦点树和当前焦点
- **主焦点（primaryFocus）** — 当前接收键盘事件的节点

:::info 最常用的是 Focus Widget + onKey
大部分场景下，你只需要使用 `Focus` Widget 包裹你的内容，然后通过 `onKey` 回调处理键盘事件就够了。不需要直接操作 `FocusNode` 和 `FocusManager`。
:::

## FocusNode

### 创建

下面展示如何创建一个 FocusNode，并配置键盘事件处理器：

```ts
const node = new FocusNode({
  debugLabel: 'my-input',         // 调试标识
  canRequestFocus: true,          // 是否可以获取焦点（默认 true）
  skipTraversal: false,           // Tab 遍历时是否跳过（默认 false）
  onKey: (event) => {             // 键盘事件处理器
    if (event.key === 'Enter') {
      // 处理回车
      return 'handled';           // 阻止事件继续冒泡
    }
    return 'ignored';             // 让事件继续冒泡
  },
  onPaste: (event) => {           // 粘贴事件处理器（括号粘贴模式）
    console.log(event.text);
    return 'handled';
  },
});
```

### 焦点操作

FocusNode 提供了请求焦点、查询状态和监听变化的 API：

```ts
// 请求焦点
node.requestFocus();

// 失去焦点
node.unfocus();

// 查询状态
node.hasPrimaryFocus  // 是否是当前主焦点
node.hasFocus         // 自身或子节点是否持有焦点

// 监听焦点变化
node.addListener((focusNode) => {
  if (focusNode.hasPrimaryFocus) {
    console.log('获得焦点');
  } else {
    console.log('失去焦点');
  }
});

// 清理
node.dispose();
```

### KeyEventResult

键盘事件处理器返回 `"handled"` 或 `"ignored"`：

- **`"handled"`** — 事件已处理，停止冒泡
- **`"ignored"`** — 事件未处理，继续向父节点冒泡

## FocusManager

`FocusManager` 是全局单例，管理整个焦点树。

```ts
const fm = FocusManager.instance;

// 查询当前焦点
fm.primaryFocus   // 当前主焦点的 FocusNode，或 null

// 请求焦点
fm.requestFocus(node);

// Tab 导航
fm.focusNext();      // 移动到下一个可聚焦节点
fm.focusPrevious();  // 移动到上一个可聚焦节点

// 查找所有可聚焦节点
fm.findAllFocusableNodes();

// 事件分发
fm.handleKeyEvent(event);    // 分发键盘事件到焦点链
fm.handlePasteEvent(event);  // 分发粘贴事件
```

## 键盘事件流

```
终端原始输入
  ↓ VtParser 解析
  ↓ InputParser 转换为 KeyEvent
  ↓ WidgetsBinding 拦截器（addKeyInterceptor）
  ↓ FocusManager.handleKeyEvent()
  ↓ 从 primaryFocus 开始冒泡
  ↓ 第一个返回 "handled" 的节点消费事件
```

### 全局键盘拦截

:::tip 何时使用
全局拦截器适用于需要在焦点系统之前捕获按键的场景，比如用「q」键退出应用、或者在任何界面下都响应的全局快捷键。
:::

`WidgetsBinding.addKeyInterceptor` 用于注册在焦点系统之前执行的全局拦截器：

```ts
const unsubscribe = WidgetsBinding.instance.addKeyInterceptor((event) => {
  if (event.key === 'q' && !event.modifiers.ctrl) {
    WidgetsBinding.instance.stop();
    return true;   // 已消费
  }
  return false;     // 传递给焦点系统
});

// 取消拦截
unsubscribe();
```

## Tab 遍历

焦点系统支持 Tab/Shift+Tab 在可聚焦节点间导航：

- Tab → `FocusManager.focusNext()`
- Shift+Tab → `FocusManager.focusPrevious()`
- 设置 `skipTraversal: true` 跳过某个节点

```ts
// 不参与 Tab 遍历的节点
const decorativeNode = new FocusNode({
  skipTraversal: true,
  debugLabel: 'decorative',
});
```

## 与 Widget 集成

### Focus Widget

`Focus` Widget 提供声明式焦点管理，自动创建和管理 FocusNode 的生命周期：

```ts
// 基本用法：自动创建内部 FocusNode
new Focus({
  autofocus: true,                     // 自动获取焦点
  onFocusChange: (hasFocus) => {
    console.log(hasFocus ? '获得焦点' : '失去焦点');
  },
  onKey: (event) => {
    if (event.key === 'Enter') return 'handled';
    return 'ignored';
  },
  child: new Text({ data: '可聚焦内容' }),
})

// 接管外部 FocusNode
const node = new FocusNode({ debugLabel: 'my-input' });
new Focus({
  focusNode: node,
  canRequestFocus: true,
  skipTraversal: false,
  child: myWidget,
})
```

`Focus` 是一个纯副作用 Widget——`build()` 直接返回 `child`，不额外包裹任何节点。它的作用是在焦点树中注册节点，自动挂载到最近的祖先 `FocusState` 下。

### 动态键盘处理器

:::tip 何时使用
动态处理器适用于需要临时拦截按键的场景，比如弹层打开时拦截 Escape 关闭弹层，弹层关闭后移除处理器。
:::

FocusNode 支持动态添加/移除键盘事件处理器：

```ts
const handler = (event: KeyEvent) => {
  if (event.key === 'Escape') return 'handled';
  return 'ignored';
};

node.addKeyHandler(handler);
// ... 稍后移除
node.removeKeyHandler(handler);
```

这对于需要临时拦截按键的场景很有用（如弹层打开时拦截 Escape）。

### TextField

`TextField` 等可交互 Widget 内部自动管理 FocusNode：

```ts
// TextField 自动创建和管理 FocusNode
const ctrl = new TextEditingController({ text: '', width: 40 });
new TextField({ controller: ctrl })
// → 点击时自动获取焦点
// → 获取焦点后接收键盘输入
// → 失去焦点后停止接收输入
```

`GestureDetector` 也可以持有焦点，支持键盘激活：

```ts
new GestureDetector({
  onTap: () => { /* 鼠标点击或键盘激活 */ },
  child: new Text({ data: '可点击按钮' }),
})
```

## Modifiers

键盘事件包含修饰键信息：

```ts
interface Modifiers {
  shift: boolean;
  alt: boolean;
  ctrl: boolean;
  meta: boolean;
}

// 检查是否有任何修饰键
hasModifier(event.modifiers)  // true if any modifier is pressed
```

常见组合键示例：

| 按键 | event.key | modifiers |
|------|-----------|-----------|
| `a` | `"a"` | 全 false |
| `Ctrl+C` | `"c"` | ctrl: true |
| `Alt+Enter` | `"Enter"` | alt: true |
| `Shift+Tab` | `"Tab"` | shift: true |

## 与其他子系统的配合

- **Actions/Shortcuts**：快捷键系统建立在焦点系统之上，`Shortcuts` Widget 内部通过 FocusNode 接收按键事件。详见 [Actions 与 Shortcuts](./actions-shortcuts.md)。
- **手势系统**：`GestureDetector` 点击时会自动调用 `requestFocus()` 获取焦点，实现点击聚焦。详见 [手势系统](./gestures.md)。
- **浮层系统**：Modal 弹出时需要将焦点转移到 Modal 内部，弹出后恢复焦点。详见 [浮层系统](./overlay.md)。
- **输入处理**：焦点系统消费的 KeyEvent 来自底层的 VtParser 输入解析管线。详见 [输入与手势](./input-handling.md)。

## 下一步

- [Actions 与 Shortcuts](./actions-shortcuts.md) — 将快捷键与业务逻辑解耦
- [输入与手势](./input-handling.md) — 底层输入解析和鼠标事件处理
