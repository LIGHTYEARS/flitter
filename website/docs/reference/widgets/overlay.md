# 浮层与弹窗 Widget

本页涵盖 Flitter 的 Overlay 浮层系统和各类弹窗 Widget。

---

## Overlay / OverlayState

> 弹出层容器，管理多个 OverlayEntry 的插入、移除和按序渲染。条目按插入顺序堆叠（后插入在上层）。

| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| setState | `(fn?: () => void) => void` | 必填 | 宿主 Widget 的 setState 回调 |

**OverlayState 方法:**

| 方法 | 说明 |
|------|------|
| `insert(entry, options?)` | 插入 entry，支持 `{ below?, above? }` 定位 |
| `remove(entry)` | 移除条目 |
| `buildEntries()` | 按序构建所有 entry 的 Widget 列表 |
| `entryCount` | entry 数量 (只读) |
| `entries` | entry 列表只读副本 |

```ts
const state = new OverlayState((fn) => { fn?.(); });
const entry = new OverlayEntry({ builder: () => someWidget });
state.insert(entry);
const widgets = state.buildEntries();
state.remove(entry);
```

---

## OverlayEntry

> 延迟构建的弹出层条目。通过 builder 函数延迟构建 Widget，绑定到 OverlayState 后可通过 remove() 从 Overlay 移除。

| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| builder | `(context: unknown) => Widget` | 必填 | 构建弹出层 Widget 的工厂函数 |
| maintainState | `boolean` | `false` | 是否在隐藏时保持 Widget 状态 |

**属性与方法:**

| 成员 | 说明 |
|------|------|
| `mounted` | 是否已挂载到 Overlay |
| `remove()` | 从 Overlay 移除此条目 |
| `markNeedsBuild()` | 触发重建 |

```ts
const entry = new OverlayEntry({
  builder: (context) => new Text({ text: "弹出内容" }),
});
overlayState.insert(entry);
entry.remove();
```

---

## OverlayContainer

> 边缘定位浮层容器。在 Stack 中将多个 overlay 定位到容器边缘（top / bottom / left / right）。

| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| key | `Key` | - | 可选标识键 |
| child | `Widget` | 必填 | 基础内容 Widget |
| overlays | `OverlayPosition[]` | `[]` | 定位浮层列表 |

**OverlayPosition 接口:**

| 字段 | 类型 | 说明 |
|------|------|------|
| widget | `Widget` | 浮层 Widget |
| position | `"top" \| "bottom" \| "left" \| "right"` | 锚定边缘 |
| offset | `number` | 距离锚定边缘的偏移，默认 0 |

```ts
new OverlayContainer({
  child: new SizedBox({ width: 80, height: 24 }),
  overlays: [
    { widget: new Text({ data: "Header" }), position: "top", offset: 0 },
    { widget: new Text({ data: "Footer" }), position: "bottom" },
  ],
});
```

---

## ModalStack / ModalStackController

> 推入/弹出式模态管理系统。ModalStackController 控制模态栈，ModalStackWidget 渲染根内容与堆叠的模态层。

**ModalStackController 方法:**

| 方法 | 说明 |
|------|------|
| `push(widget)` | 将模态 Widget 推入栈顶 |
| `pop()` | 弹出栈顶模态，栈空时返回 `false` |
| `canPop` | 栈是否非空 (只读) |
| `length` | 当前模态数量 (只读) |
| `entries` | 只读快照 `{ id, widget }[]` |
| `addListener(fn)` | 注册变化监听 |
| `removeListener(fn)` | 移除监听 |

**ModalStackWidget 参数:**

| 参数 | 类型 | 说明 |
|------|------|------|
| root | `Widget` | 基础内容 Widget（始终可见） |
| controller | `ModalStackController` | 模态栈控制器 |

逆向: MZT.build() 返回 `Stack({ fit: "expand", children: [root, ...modals] })`。

```ts
const controller = new ModalStackController();

// 推入模态
controller.push(new Text({ data: "Modal Content" }));

// 渲染
new ModalStackWidget({ root: appContent, controller });

// 弹出
controller.pop();
```

---

## FuzzyPicker

> 通用模糊搜索选择器。组合 TextField + 可滚动列表 + 键盘/鼠标导航，用于命令面板、文件选择器等场景。

| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| items | `T[]` | 必填 | 候选项列表 |
| getLabel | `(item: T) => string` | 必填 | 提取显示标签 |
| onAccept | `(item: T, info) => void` | 必填 | 确认选择回调 |
| renderItem | `(item, isSelected, isDisabled, ctx) => Widget` | - | 自定义条目渲染 |
| onDismiss | `() => void` | - | 关闭回调 |
| onSelectionChange | `(item: T \| null) => void` | - | 选中变化回调 |
| sortItems | `(a, b, query) => number` | - | 自定义排序 |
| filterItem | `(item, query) => boolean` | - | 自定义过滤 |
| isItemDisabled | `(item) => boolean` | - | 禁用判断 |
| normalizeQuery | `(query) => string` | - | 查询归一化 |
| title | `string` | - | 标题文本 |
| maxRenderItems | `number` | - | 最大渲染条目数 |
| controller | `FuzzyPickerController` | - | 外部状态同步 |

**内置 Intent 类:**

- `MoveDownIntent` — 向下移动选择 (↓ / Ctrl+N)
- `MoveUpIntent` — 向上移动选择 (↑ / Ctrl+P)
- `AcceptIntent` — 确认选择 (Enter)
- `DismissIntent` — 关闭/取消 (Escape)

```ts
new FuzzyPicker({
  items: commands,
  getLabel: (cmd) => cmd.label,
  onAccept: (cmd) => cmd.execute(),
  onDismiss: () => close(),
  title: "Command Palette",
});
```

---

## CommandPalette

> 基于 AutocompleteController 的命令搜索面板。内部创建 TextEditingController 管理搜索输入，通过模糊匹配过滤命令列表。

| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| commands | `CommandPaletteCommand[]` | 必填 | 命令列表 |
| onDismiss | `() => void` | 必填 | 关闭回调 |

**CommandPaletteCommand 接口:**

| 字段 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| id | `string` | 必填 | 唯一标识 |
| label | `string` | 必填 | 显示标签 |
| action | `() => void` | 必填 | 执行动作 |
| category | `string` | - | 分类 (对应 amp 的 noun) |
| description | `string` | - | 描述 |
| shortcut | `string` | - | 快捷键提示 |
| enabled | `boolean` | `true` | 是否启用 |
| priority | `number` | `0` | 排序优先级（高值优先） |

```ts
new CommandPalette({
  commands: [
    { id: "new", label: "New Thread", action: () => createThread() },
    { id: "quit", label: "Quit", shortcut: "Ctrl+C", action: () => quit() },
  ],
  onDismiss: () => closePalette(),
});
```

---

## AutocompleteController

> 自动补全状态管理器。监听 TextEditingController 的文本变更，根据触发器字符和查询文本异步获取选项列表，支持 debounce 限流和 generationId 竞态保护。

**初始化选项 (AutocompleteInitOptions):**

| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| textController | `TextEditingController` | 必填 | 绑定的文本编辑控制器 |
| triggers | `AutocompleteTrigger[]` | 必填 | 触发器配置列表 |
| optionsBuilder | `(query) => Option[] \| Promise<Option[]>` | 必填 | 选项构建函数 |
| onSelected | `(option) => void` | 必填 | 选中回调 |
| debounceMs | `number` | `100` | debounce 间隔 (ms) |

**AutocompleteTrigger:**

| 字段 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| char | `string` | 必填 | 触发字符 (如 `"/"`, `"@"`) |
| minLength | `number` | `0` | 最小查询长度 |

```ts
const ac = new AutocompleteController();
ac.initialize({
  textController: ctrl,
  triggers: [{ char: "/", minLength: 0 }],
  optionsBuilder: (query) => filterCommands(query),
  onSelected: (opt) => executeCommand(opt.value),
});
```

---

## PopupOverlay

> 模态弹出层。全屏背景遮罩 + 居中内容 + Escape 键关闭 + 焦点捕获。

| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| key | `Key` | - | 可选标识键 |
| child | `Widget` | 必填 | 弹出内容 |
| onDismiss | `() => void` | 必填 | 关闭回调 |
| barrierDismissible | `boolean` | `true` | 点击遮罩是否关闭 |
| escapeDismissible | `boolean` | `true` | Escape 键是否关闭 |
| autofocus | `boolean` | `true` | 是否自动获取焦点 |

逆向结构: `Stack(fit: "expand") + GestureDetector(backdrop) + Focus(onKey: Escape)`

```ts
new PopupOverlay({
  onDismiss: () => closePopup(),
  child: new Container({
    child: new Text({ data: "Hello from popup!" }),
  }),
});
```

---

## ConfirmDialog

> 模态确认对话框，带内联键绑定提示。Y/y 确认，N/n/Escape 取消。

| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| key | `Key` | - | 可选标识键 |
| title | `string` | 必填 | 标题 |
| message | `string` | - | 正文消息 |
| confirmButtonText | `string` | `"yes"` | 确认按钮文本 |
| onConfirm | `() => void` | 必填 | 确认回调 |
| onCancel | `() => void` | 必填 | 取消回调 |
| terminalWidth | `number` | `80` | 终端宽度（用于计算对话框宽度） |
| terminalHeight | `number` | `24` | 终端高度（用于计算最大高度） |
| colors | `ConfirmDialogColors` | 暗色默认 | 主题颜色 |

**ConfirmDialogColors:**

| 字段 | 说明 |
|------|------|
| primary | 标题和边框颜色 |
| foreground | 消息文本颜色 |
| background | 对话框背景色 |
| keybind | 快捷键提示颜色 |

```ts
new ConfirmDialog({
  title: "Delete file?",
  message: "This action cannot be undone.",
  onConfirm: () => doAction(),
  onCancel: () => dismiss(),
  terminalWidth: 80,
  colors: {
    primary: Color.cyan(),
    foreground: Color.default(),
    background: Color.rgb(30, 30, 46),
    keybind: Color.blue(),
  },
});
```

---

## PromptDialog

> 模态文本输入对话框。Enter 提交，Escape 取消。

| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| key | `Key` | - | 可选标识键 |
| message | `string` | 必填 | 提示消息 |
| title | `string` | - | 对话框标题 |
| placeholder | `string` | - | 输入占位文本 |
| initialValue | `string` | - | 初始值 |
| confirmLabel | `string` | `"OK"` | 确认按钮文本 |
| cancelLabel | `string` | `"Cancel"` | 取消按钮文本 |
| onSubmit | `(value: string) => void` | 必填 | 提交回调 |
| onCancel | `() => void` | 必填 | 取消回调 |
| width | `number` | `50` | 对话框宽度 |

```ts
new PromptDialog({
  message: "Enter file name:",
  placeholder: "filename.txt",
  onSubmit: (value) => saveFile(value),
  onCancel: () => dismiss(),
});
```

---

## SpinnerOverlay

> 模态加载对话框，带动画 BrailleSpinner（100ms 帧率匹配 amp）。

| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| key | `Key` | - | 可选标识键 |
| message | `string` | - | spinner 旁的消息文本 |
| onCancel | `() => void` | - | Escape 取消回调（提供时显示 "Esc to cancel" 提示） |
| colors | `SpinnerOverlayColors` | 暗色默认 | 主题颜色 |

**SpinnerOverlayColors:**

| 字段 | 说明 |
|------|------|
| processing | Braille 字符颜色 |
| foreground | 消息文本、提示和边框颜色 |
| background | 对话框背景色 |
| info | "Esc" 高亮颜色 |

逆向: `Container(bg+border) > SizedBox(60x7) > Column > [Expanded(spinner+message), cancelHint]`

```ts
new SpinnerOverlay({
  message: "Loading...",
  onCancel: () => abort(),
  colors: {
    processing: Color.cyan(),
    foreground: Color.default(),
    background: Color.rgb(30, 30, 46),
    info: Color.blue(),
  },
});
```

---

## LayerLink

> 锚点定位链接。将 Overlay 弹出层锚定到目标 Widget 位置，当 target 位置变化时通知所有 followers 更新。

**方法:**

| 方法 | 说明 |
|------|------|
| `setTarget(target)` | 设置锚点目标 |
| `clearTarget()` | 清除目标 |
| `getTargetTransform()` | 获取目标的位置和尺寸 `{ position, size }` |
| `addFollower(fn)` | 注册追随者回调 |
| `removeFollower(fn)` | 移除追随者 |

```ts
const link = new LayerLink();
link.setTarget(renderBox);
const transform = link.getTargetTransform();
// { position: { x: 10, y: 20 }, size: { width: 80, height: 1 } }
```

---

## CompositedTransformTarget

> 锚点定位目标组件。将自身位置注册到 LayerLink，供 CompositedTransformFollower 追踪。

| 参数 | 类型 | 说明 |
|------|------|------|
| key | `Key` | 可选标识键 |
| link | `LayerLink` | 关联的 LayerLink |
| child | `Widget` | 子 Widget |

逆向: bZT — 在 attach/detach 生命周期中向 LayerLink 注册/注销自身，performLayout 后调用 `updateGlobalPosition()` 通知追随者。

---

## CompositedTransformFollower

> 锚点追随者组件。追踪 LayerLink 目标的全局位置，将自身渲染到目标位置（加偏移量）。

| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| key | `Key` | - | 可选标识键 |
| link | `LayerLink` | 必填 | 关联的 LayerLink |
| showWhenUnlinked | `boolean` | `true` | 目标未链接时是否显示 |
| offset | `{ x: number, y: number }` | `{x:0, y:0}` | 相对于目标的额外偏移 |
| child | `Widget` | - | 子 Widget |

逆向: pZT — 在 performLayout 中查询 LayerLink 目标的全局位置，减去自身父节点全局偏移后通过 `setOffset()` 定位。

```ts
const link = new LayerLink();

// 目标 Widget
new CompositedTransformTarget({ link, child: anchorWidget });

// 追随者 Widget
new CompositedTransformFollower({
  link,
  offset: { x: 0, y: 1 },
  child: dropdownWidget,
});
```

---

> 浮层教程详见 [Overlay 子系统教程](../../tutorial/subsystems/overlay)。
