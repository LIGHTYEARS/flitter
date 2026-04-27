# 交互 Widget

本页涵盖 Flitter TUI 中处理手势、焦点、文本编辑和快捷键的 Widget。这些组件让你的 TUI 应用能够响应鼠标点击、键盘输入和焦点切换。

:::tip 快速参考：最常用交互 Widget
- **GestureDetector** -- 检测鼠标点击（最常用的交互入口）
- **Focus** -- 管理键盘焦点（让 Widget 能接收按键事件）
- **TextField** -- 文本输入框
- **Shortcuts + Actions** -- 注册和响应快捷键
:::

---

## GestureDetector

**何时使用：** 需要让某个 Widget 可以被鼠标点击时使用。

> 高级手势检测，内部使用 MouseRegion。

| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `child` | `Widget` | **必填** | 子 Widget |
| `onTap` | `() => void` | `undefined` | 点击回调 |

```typescript
new GestureDetector({
  onTap: () => { console.log('Tapped!'); },
  child: new Text({ data: 'Click me' }),
})
```

**相关 Widget**: MouseRegion, Focus

---

## MouseRegion

**何时使用：** 需要检测鼠标 hover、拖拽、滚轮等精细鼠标事件时使用。大多数情况用 `GestureDetector` 即可。

> 底层鼠标区域检测（hover、click、drag 等全部事件）。

| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `child` | `Widget` | **必填** | 子 Widget |
| `onClick` | `(event) => void` | `undefined` | 鼠标点击 |
| `onEnter` | `(event) => void` | `undefined` | 鼠标进入 |
| `onExit` | `(event) => void` | `undefined` | 鼠标离开 |
| `onHover` | `(event) => void` | `undefined` | 鼠标移动 |
| `onScroll` | `(event) => void` | `undefined` | 滚轮 |
| `onDrag` | `(event) => void` | `undefined` | 拖拽 |
| `onRelease` | `(event) => void` | `undefined` | 释放 |
| `opaque` | `boolean` | `true` | 是否阻止事件穿透 |

```typescript
new MouseRegion({
  onClick: (e) => { console.log(`点击 (${e.x}, ${e.y})`); },
  onEnter: (e) => { /* 鼠标进入 */ },
  onExit: (e) => { /* 鼠标离开 */ },
  opaque: true,
  child: new Text({ data: 'Hover me' }),
})
```

**相关 Widget**: GestureDetector, Focus

---

## Focus

**何时使用：** 需要让 Widget 能接收键盘事件，或在焦点获得/失去时执行操作时使用。

> 焦点管理 Widget。声明式焦点管理，纯副作用 Widget，不改变子节点渲染。

| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `child` | `Widget` | **必填** | 子 Widget |
| `focusNode` | `FocusNode` | `undefined` | 外部焦点节点 |
| `autofocus` | `boolean` | `false` | 自动获取焦点 |
| `canRequestFocus` | `boolean` | `true` | 是否可请求焦点 |
| `skipTraversal` | `boolean` | `false` | 跳过焦点遍历 |
| `onKey` | `(event: KeyEvent) => KeyEventResult` | `undefined` | 按键回调 |
| `onPaste` | `(event: PasteEvent) => KeyEventResult` | `undefined` | 粘贴回调 |
| `onFocusChange` | `(hasFocus: boolean) => void` | `undefined` | 焦点变化回调 |
| `debugLabel` | `string` | `undefined` | 调试标签 |

```typescript
new Focus({
  autofocus: true,
  onFocusChange: (hasFocus) => {
    console.log(hasFocus ? '获得焦点' : '失去焦点');
  },
  onKey: (event) => {
    if (event.key === 'Enter') return 'handled';
    return 'ignored';
  },
  child: new Text({ data: '可聚焦内容' }),
})
```

**相关 Widget**: FocusNode, Shortcuts

---

## FocusNode

> 焦点节点。

| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `debugLabel` | `string` | `undefined` | 调试标签 |
| `canRequestFocus` | `boolean` | `true` | 是否可请求焦点 |
| `skipTraversal` | `boolean` | `false` | 跳过焦点遍历 |
| `onKey` | `(event) => "handled" \| "ignored"` | `undefined` | 按键回调 |
| `onPaste` | `(event) => "handled" \| "ignored"` | `undefined` | 粘贴回调 |

| 方法/属性 | 说明 |
|----------|------|
| `requestFocus()` | 请求焦点 |
| `unfocus()` | 失去焦点 |
| `hasPrimaryFocus` | 是否是当前主焦点 |
| `hasFocus` | 自身或子节点是否持有焦点 |
| `addListener(fn)` | 监听焦点变化 |
| `dispose()` | 释放资源 |

```typescript
const node = new FocusNode({ debugLabel: 'my-input' });
new Focus({
  focusNode: node,
  child: myWidget,
})

// 外部控制
node.requestFocus();
```

---

## TextField

**何时使用：** 需要用户输入文本时使用（搜索框、命令行输入等）。

> 可编辑文本输入框。

:::tip 最常用参数
- `controller` -- 必须提供一个 `TextEditingController` 来管理文本状态
- `placeholder` -- 输入为空时显示的提示文本
:::

| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `controller` | `TextEditingController` | **必填** | 文本编辑控制器 |
| `placeholder` | `string` | `undefined` | 占位文本 |
| `readOnly` | `boolean` | `false` | 是否只读 |
| `style` | `TextStyle` | `undefined` | 文本样式 |
| `maxLines` | `number` | `undefined` | 最大行数 |

```typescript
const ctrl = new TextEditingController({ text: '', width: 40 });
new TextField({
  controller: ctrl,
  placeholder: '请输入...',
  readOnly: false,
})
```

**相关 Widget**: TextEditingController, Focus

---

## TextEditingController

> 文本编辑状态控制器。

```typescript
new TextEditingController(opts?: { text?: string; width?: number })
```

### 属性

| 属性 | 类型 | 说明 |
|------|------|------|
| `text` | `string` | 当前文本 |
| `cursorPosition` | `number` | 光标位置（grapheme 索引） |
| `cursorLine` | `number` | 光标所在行 |
| `cursorColumn` | `number` | 光标所在列 |
| `lineCount` | `number` | 总行数 |
| `hasSelection` | `boolean` | 是否有选区 |
| `graphemes` | `string[]` | 字素数组 |

### 编辑方法

| 方法 | 说明 |
|------|------|
| `insertText(text)` | 在光标处插入 |
| `deleteText(count?)` | 向后删除 |
| `deleteForward(count?)` | 向前删除 |
| `deleteWordLeft()` | 删除左侧单词 |
| `deleteWordRight()` | 删除右侧单词 |
| `deleteToLineEnd()` | 删除到行尾 (Ctrl+K) |
| `deleteCurrentLine()` | 删除当前行 |
| `yankText()` | 粘贴 kill buffer (Ctrl+Y) |

### 光标移动方法

| 方法 | 说明 |
|------|------|
| `moveCursorLeft/Right/Up/Down()` | 方向移动 |
| `moveCursorToLineStart/End()` | 行首/尾 (Home/End, Ctrl+A/E) |
| `moveCursorToStart/End()` | 文档首/尾 |
| `moveCursorWordBoundary(dir)` | 按单词移动 (`"left"` / `"right"`) |

### 选区方法

| 方法 | 说明 |
|------|------|
| `moveCursorRight({ extend: true })` | 扩展选区 |
| `setSelectionRange(start, end)` | 设置选区 |
| `selectWordAt(pos)` | 选中单词 |
| `selectLineAt(line)` | 选中一行 |
| `clearSelection()` | 清除选区 |
| `deleteSelectedText()` | 删除选中文本 |

### 生命周期

| 方法 | 说明 |
|------|------|
| `addListener(fn)` | 监听文本/光标变化 |
| `dispose()` | 释放资源 |

---

## Shortcuts

**何时使用：** 需要在 Widget 树中注册快捷键绑定时使用。与 `Actions` 配合，实现「按键 → 意图 → 动作」的解耦。

> 在 Widget 树中注册 KeyActivator -> Intent 映射。

| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `shortcuts` | `Map<KeyActivator, Intent>` | **必填** | 按键映射 |
| `child` | `Widget` | **必填** | 子 Widget |
| `manager` | `ShortcutManager` | `undefined` | 自定义管理器 |
| `focusNode` | `FocusNode` | `undefined` | 焦点节点 |
| `debugLabel` | `string` | `undefined` | 调试标签 |

**相关 Widget**: Actions, KeyActivator, Intent

---

## Actions

**何时使用：** 需要将 Intent（用户意图）映射到具体的 Action（处理逻辑）时使用。

> 在 Widget 树中注册 Intent -> Action 映射。

| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `actions` | `Map<IntentConstructor, Action>` | **必填** | Intent 到 Action 的映射 |
| `child` | `Widget` | **必填** | 子 Widget |
| `dispatcher` | `ActionDispatcher` | `undefined` | 自定义分发器 |

### 静态方法

| 方法 | 说明 |
|------|------|
| `Actions.invoke(context, intent)` | 查找并调用 Action（找不到时抛异常） |
| `Actions.maybeInvoke(context, intent)` | 安全版本（返回 null） |
| `Actions.find(context, intent)` | 查找 Action |
| `Actions.maybeFind(context, intent)` | 安全查找 |
| `Actions.handler(context, intent)` | 获取可调用回调（null 表示不可用） |

**相关 Widget**: Shortcuts, Intent, Action

---

## Intent

> 用户意图基类。

```typescript
abstract class Intent {}

// 继承创建自定义 Intent
class SaveIntent extends Intent {}
class NavigateIntent extends Intent {
  constructor(public readonly direction: 'up' | 'down') { super(); }
}
```

---

## Action

> 响应 Intent 的处理器基类。

```typescript
abstract class Action<T extends Intent> {
  abstract invoke(intent: T): 'handled' | 'ignored' | void;
  isEnabled(intent: T): boolean;        // 默认 true
  consumesKey(intent: T): boolean;      // 默认 true
}
```

---

## KeyActivator

> 按键组合描述器。

```typescript
new KeyActivator(key: string, modifiers?: {
  shift?: boolean; ctrl?: boolean; alt?: boolean; meta?: boolean;
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
| `accepts(event)` | 精确匹配 key + 修饰键 |
| `modifierNames()` | 返回修饰键名称数组 |

---

## ShortcutManager

> 快捷键映射管理器。

```typescript
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

## 综合示例

```typescript
import { Actions, Shortcuts, KeyActivator, Intent, Action } from '@flitter/tui';

class SaveIntent extends Intent {}
class SaveAction extends Action<SaveIntent> {
  invoke() { save(); return 'handled'; }
}

new Actions({
  actions: new Map([[SaveIntent, new SaveAction()]]),
  child: new Shortcuts({
    shortcuts: new Map([[KeyActivator.ctrl('s'), new SaveIntent()]]),
    child: myEditor,
  }),
})
```

---

> 📖 相关教程: [手势系统](/tutorial/subsystems/gestures) · [焦点系统](/tutorial/subsystems/focus-system) · [Actions 与 Shortcuts](/tutorial/subsystems/actions-shortcuts)
