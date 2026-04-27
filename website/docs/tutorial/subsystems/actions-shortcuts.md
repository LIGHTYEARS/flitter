# Actions 与 Shortcuts

当应用变得复杂，你可能会在多个地方处理同一个快捷键，或者希望不同界面对同一按键有不同响应。传统做法是在 `onKey` 里直接写 `if (key === 'Ctrl+S') save()`，但这会导致：
- 快捷键和业务逻辑耦合
- 无法在不同层级覆盖行为
- 无法查询「某个操作是否可用」

Actions/Shortcuts 系统就是为了解决这些问题而设计的。它将「键盘快捷键」与「业务逻辑」解耦，让快捷键绑定和业务逻辑分别定义，可以在 Widget 树的不同层级覆盖。

### 你将学到什么

- Intent、Action、Shortcuts 三个核心概念及其关系
- 如何定义快捷键并绑定到业务逻辑
- 何时使用 Actions/Shortcuts 而非直接在 onKey 中处理
- 动态快捷键管理和 Action 查找调用

:::tip 何时使用 Actions/Shortcuts，何时使用 onKey
如果你的快捷键只在一个特定 Widget 内使用、逻辑简单且不需要被外部查询或覆盖，直接用 `Focus` 的 `onKey` 就够了。当你需要以下能力时，才需要 Actions/Shortcuts：
- 同一个操作可以被多个快捷键触发（如 Ctrl+S 和菜单栏的「保存」按钮）
- 父级 Widget 需要覆盖子级的行为
- 需要通过 `Actions.handler` 查询操作是否可用（比如按钮的 disabled 状态）
:::

Flitter 提供了一套完整的 **Actions / Shortcuts** 系统，直接对标 Flutter 的同名机制，由三个核心概念组成：

- **Intent** — 描述用户意图（「做什么」）
- **Action** — 执行具体逻辑（「怎么做」）
- **Shortcuts** — 将按键映射到 Intent（「什么键触发」）

## 核心概念

下面的流程图展示了从按键事件到 Action 执行的完整路径：

```
按键事件 → Shortcuts（KeyActivator → Intent）→ Actions（Intent → Action）→ invoke()
```

## Intent

`Intent` 是一个标记类，用于描述用户意图。它只表示「想做什么」，不包含具体逻辑。创建自定义 Intent 只需继承：

```ts
import { Intent } from '@flitter/tui';

class SaveIntent extends Intent {}
class DeleteIntent extends Intent {}

// 可携带数据
class NavigateIntent extends Intent {
  constructor(public readonly direction: 'up' | 'down') {
    super();
  }
}
```

系统使用 `intent.constructor`（类引用本身）作为查找键。

## Action

`Action` 定义如何响应某个 Intent——即「怎么做」的部分：

```ts
import { Action } from '@flitter/tui';

class SaveAction extends Action<SaveIntent> {
  invoke(intent: SaveIntent): 'handled' | 'ignored' {
    // 执行保存逻辑
    saveFile();
    return 'handled';
  }

  // 可选：条件性启用
  isEnabled(_intent: SaveIntent): boolean {
    return hasUnsavedChanges;
  }

  // 可选：即使匹配也不消费按键事件
  consumesKey(_intent: SaveIntent): boolean {
    return true;  // 默认值
  }
}
```

### Action 返回值

Action 的 invoke 方法通过返回值控制事件是否继续冒泡：

| 返回值 | 说明 |
|--------|------|
| `"handled"` | 事件已处理，停止冒泡 |
| `"ignored"` | 事件未处理，继续向父节点冒泡 |
| `void` / `undefined` | 等同于 `"handled"` |

## KeyActivator

`KeyActivator` 描述一个按键组合：

```ts
import { KeyActivator } from '@flitter/tui';

// 完整构造
new KeyActivator('s', { ctrl: true })           // Ctrl+S
new KeyActivator('Enter')                        // Enter
new KeyActivator('Tab', { shift: true })         // Shift+Tab

// 静态工厂（更简洁）
KeyActivator.ctrl('s')                           // Ctrl+S
KeyActivator.shift('Tab')                        // Shift+Tab
KeyActivator.alt('Enter')                        // Alt+Enter
KeyActivator.meta('k')                           // Meta+K
KeyActivator.key('Escape')                       // 单键
```

### accepts

```ts
const activator = KeyActivator.ctrl('s');
activator.accepts(keyEvent);  // 精确匹配 key + 全部四个修饰键
```

## Shortcuts Widget

`Shortcuts` 将 `KeyActivator → Intent` 的映射注册到 Widget 树中：

```ts
import { Shortcuts, KeyActivator } from '@flitter/tui';

new Shortcuts({
  shortcuts: new Map([
    [KeyActivator.ctrl('s'), new SaveIntent()],
    [KeyActivator.ctrl('d'), new DeleteIntent()],
    [KeyActivator.key('Escape'), new DismissIntent()],
  ]),
  child: myWidget,
})
```

`Shortcuts` 内部与焦点系统集成：
- 如果没有提供 `focusNode`，会自动包裹一个 `Focus` Widget
- 按键事件由 FocusNode 接收，交给 `ShortcutManager` 匹配

## 进阶用法

### ShortcutManager

:::tip 何时使用
当你需要在运行时动态添加或移除快捷键（比如根据上下文切换键绑定），可以直接操作 `ShortcutManager`。大部分场景下，通过 `Shortcuts` Widget 的声明式用法就够了。
:::

`ShortcutManager` 管理快捷键映射，可以动态增删：

```ts
import { ShortcutManager } from '@flitter/tui';

const manager = new ShortcutManager(new Map([
  [KeyActivator.ctrl('s'), new SaveIntent()],
]));

// 动态添加/移除
manager.addShortcut(KeyActivator.ctrl('n'), new NewFileIntent());
manager.removeShortcut(KeyActivator.ctrl('n'));

// 查询
manager.getAllShortcuts();  // Map<KeyActivator, Intent>

// 事件匹配
const intent = manager.handleKeyEvent(event);  // Intent | null
```

## Actions Widget

`Actions` 将 `Intent → Action` 的映射注册到 Widget 树中。通常和 `Shortcuts` 组合使用：

```ts
import { Actions } from '@flitter/tui';

new Actions({
  actions: new Map([
    [SaveIntent, new SaveAction()],
    [DeleteIntent, new DeleteAction()],
  ]),
  child: new Shortcuts({
    shortcuts: new Map([
      [KeyActivator.ctrl('s'), new SaveIntent()],
      [KeyActivator.ctrl('d'), new DeleteIntent()],
    ]),
    child: myEditor,
  }),
})
```

### 静态方法

:::tip 何时使用
静态方法适合在 Widget 树中「远程」调用 Action 的场景。比如你有一个工具栏按钮，需要触发在编辑器深层注册的 SaveAction——用 `Actions.invoke(context, new SaveIntent())` 就能做到。
:::

`Actions` 提供了一组静态方法，可在 Widget 树中查找和调用 Action：

```ts
// 查找并调用（找不到时抛异常）
Actions.invoke(context, new SaveIntent());

// 安全版本（找不到时返回 null）
Actions.maybeInvoke(context, new SaveIntent());

// 仅查找 Action（不调用）
const action = Actions.find(context, new SaveIntent());
const actionOrNull = Actions.maybeFind(context, new SaveIntent());

// 获取 ActionDispatcher
const dispatcher = Actions.of(context);

// 获取可调用的回调（常用于构建按钮）
const handler = Actions.handler(context, new SaveIntent());
// handler 为 null 表示该 action 不可用（isEnabled 为 false）
```

### ActionDispatcher

`ActionDispatcher` 沿 Widget 树向上查找能处理指定 Intent 的 Action：

```ts
const dispatcher = new ActionDispatcher();

// 查找
const result = dispatcher.findAction(intent, context);
// result: { action: Action; enabled: boolean } | null

// 查找并调用
dispatcher.invokeAction(intent, context);
```

查找算法：从当前 Element 向上遍历，在每个 `ActionsState` 节点上查找是否注册了对应 Intent 的 Action。找到第一个匹配即停止（即使 `isEnabled` 为 false）。

## 完整示例

```ts
// 1. 定义 Intent
class IncrementIntent extends Intent {}
class DecrementIntent extends Intent {}

// 2. 定义 Action
class IncrementAction extends Action<IncrementIntent> {
  constructor(private counter: { value: number }) { super(); }
  invoke() {
    this.counter.value++;
    return 'handled' as const;
  }
}

class DecrementAction extends Action<DecrementIntent> {
  constructor(private counter: { value: number }) { super(); }
  invoke() {
    this.counter.value--;
    return 'handled' as const;
  }
  isEnabled() { return this.counter.value > 0; }
}

// 3. 在 Widget 树中组装
class CounterWidget extends StatefulWidget {
  createState() { return new CounterState(); }
}

class CounterState extends State<CounterWidget> {
  counter = { value: 0 };

  build(context: BuildContext) {
    return new Actions({
      actions: new Map([
        [IncrementIntent, new IncrementAction(this.counter)],
        [DecrementIntent, new DecrementAction(this.counter)],
      ]),
      child: new Shortcuts({
        shortcuts: new Map([
          [KeyActivator.key('='), new IncrementIntent()],
          [KeyActivator.key('-'), new DecrementIntent()],
          [KeyActivator.key('ArrowUp'), new IncrementIntent()],
          [KeyActivator.key('ArrowDown'), new DecrementIntent()],
        ]),
        child: new Center({
          child: new Text({ data: `Count: ${this.counter.value}` }),
        }),
      }),
    });
  }
}
```

## 按键事件流

```
FocusNode 接收 KeyEvent
  ↓ Shortcuts Widget 的 onKey 处理器
  ↓ ShortcutManager.handleKeyEvent(event) → Intent | null
  ↓ 如果匹配到 Intent：
  ↓   ActionDispatcher.findAction(intent, context)
  ↓   沿 Element 树向上查找 ActionsState
  ↓   找到匹配的 Action → 检查 isEnabled
  ↓   调用 action.invoke(intent)
  ↓   返回 "handled" | "ignored"
```

## 与其他子系统的配合

- **焦点系统**：`Shortcuts` Widget 内部通过 FocusNode 接收按键事件，因此它依赖焦点系统来确定哪个 Shortcuts 节点是活跃的。详见 [焦点系统](./focus-system.md)。
- **浮层系统**：在 Modal 弹层中注册独立的 Shortcuts/Actions，可以让弹层有自己的快捷键集合，与主界面互不干扰。详见 [浮层系统](./overlay.md)。

## 下一步

- [焦点系统](./focus-system.md) — 了解快捷键事件是如何路由到 Shortcuts Widget 的
- [浮层系统](./overlay.md) — 在弹层中使用独立的快捷键配置
