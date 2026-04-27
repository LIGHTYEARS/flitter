# 自定义 Widget

## 为什么要了解这个？

Widget 是你和 Flitter 打交道的主要方式。无论是显示一段文字、响应用户点击，还是构建复杂的交互界面，你都是在写 Widget。掌握自定义 Widget 的几种方式，是从「能用框架」到「用好框架」的关键一步。

:::info 你将学到什么
- 如何创建无状态的 `StatelessWidget`
- 如何用 `StatefulWidget` 管理可变状态和生命周期
- 如何用 `InheritedWidget` 在组件树中共享数据
- 组合模式：用现有 Widget 搭积木构建新功能
- 如何用 `runApp` 启动应用
- 低级别 RenderObject 的直接操作（进阶）
:::

## StatelessWidget

最简单的 Widget 类型——没有可变状态，`build()` 纯函数。

```ts
class StatusBar extends StatelessWidget {
  private message: string;
  private color: Color;

  constructor(args: { message: string; color?: Color }) {
    super();
    this.message = args.message;
    this.color = args.color ?? Color.white();
  }

  build(context: BuildContext): Widget {
    return new Container({
      padding: EdgeInsets.symmetric({ horizontal: 1 }),
      decoration: new BoxDecoration({
        color: Color.rgb(40, 40, 50),
        border: Border.all(new BorderSide(this.color, 1, 'rounded')),
      }),
      child: new Text({
        data: this.message,
        style: new TextStyle({ foreground: this.color }),
      }),
    });
  }
}

// 使用
new StatusBar({ message: '保存成功', color: Color.green() })
```

:::tip 什么时候用 StatelessWidget？
如果你的 Widget 只是把传入的数据渲染出来，不需要自己持有任何状态（没有计数器、没有选中/未选中这种内部状态），那就用 StatelessWidget。它更简单、更容易理解、性能也更好。
:::

## StatefulWidget

有可变状态的 Widget——状态变化时通过 `setState` 触发重建。

```ts
class Counter extends StatefulWidget {
  createState(): State {
    return new CounterState();
  }
}

class CounterState extends State<Counter> {
  private count = 0;

  // 首次挂载时调用
  initState(): void {
    super.initState();
  }

  // Widget 被新实例替换时调用
  didUpdateWidget(oldWidget: Counter): void {
    super.didUpdateWidget(oldWidget);
  }

  // 卸载时调用，释放资源
  dispose(): void {
    super.dispose();
  }

  build(context: BuildContext): Widget {
    return new Row({
      children: [
        new GestureDetector({
          onTap: () => {
            this.setState(() => { this.count++; });
          },
          child: new Container({
            padding: EdgeInsets.all(1),
            decoration: new BoxDecoration({
              border: Border.all(new BorderSide(Color.cyan(), 1, 'rounded')),
            }),
            child: new Text({ data: '+' }),
          }),
        }),
        new Padding({
          padding: EdgeInsets.symmetric({ horizontal: 2 }),
          child: new Text({
            data: `计数: ${this.count}`,
            style: new TextStyle({ foreground: Color.yellow(), bold: true }),
          }),
        }),
      ],
    });
  }
}
```

### State 生命周期

```
createState()        <-- StatefulWidget 首次被挂载
    |
initState()          <-- 初始化（只调用一次）
    |
build()              <-- 构建 Widget 子树
    |
[用户交互 -> setState()]
    |
build()              <-- 重新构建
    |
[父级重建，新 Widget 替换旧 Widget]
    |
didUpdateWidget()    <-- 接收新配置
    |
build()              <-- 重新构建
    |
dispose()            <-- 卸载，释放资源
```

下面逐步解释每个阶段：

- **`createState()`** -- 框架调用 `StatefulWidget.createState()` 创建对应的 State 对象。每个 StatefulWidget 实例在树中挂载时只会调用一次。
- **`initState()`** -- State 创建后立即调用。适合做一次性的初始化工作，比如启动定时器、注册监听器。注意：这里还拿不到 `context` 的完整信息（如 InheritedWidget），如果需要的话请在 `didChangeDependencies()` 中处理。
- **`build()`** -- 根据当前 State 构建 Widget 子树。这个方法可能会被频繁调用（每次 `setState` 都会触发），所以里面不要放耗时操作。
- **`didUpdateWidget()`** -- 当父级重建并为这个位置提供了一个新的 Widget 实例时调用。你可以在这里对比新旧 Widget 的属性，决定是否需要更新内部状态。
- **`dispose()`** -- Widget 从树中移除时调用。这是释放资源的地方：取消定时器、移除监听器、关闭流。调用完 `dispose()` 之后再调用 `setState()` 会抛异常。

### setState 规则

```ts
// 正确：在回调中修改状态
this.setState(() => {
  this.count++;
});

// 也可以不传回调，先修改再调用
this.count++;
this.setState();

// 错误：在 dispose 后调用会抛异常
dispose() {
  super.dispose();
  // this.setState(() => {...}); // 抛出 "setState called after dispose"
}
```

:::tip setState 的最佳实践
`setState()` 的回调里应该只包含状态修改逻辑，不要放异步操作或其他副作用。同时，尽量让 `setState()` 的影响范围最小化——如果只有一个子组件的数据变了，就把那部分 State 下放到子组件中，而不是在顶层 `setState()` 导致整棵子树重建。
:::

## InheritedWidget

:::info 想在多个 Widget 之间共享数据？InheritedWidget 就是答案
在实际开发中，你经常需要让多个不同层级的 Widget 访问同一份数据——比如主题色、用户信息、应用配置。如果层层传递 constructor 参数，代码会变得非常臃肿。`InheritedWidget` 就是为了解决这个问题：它类似 React 的 Context，把数据「注入」到子树中，任何后代 Widget 都可以直接获取。
:::

```ts
class ThemeProvider extends InheritedWidget {
  readonly colorScheme: AppColorScheme;

  constructor(args: { colorScheme: AppColorScheme; child: Widget }) {
    super({ child: args.child });
    this.colorScheme = args.colorScheme;
  }

  updateShouldNotify(old: ThemeProvider): boolean {
    return !this.colorScheme.equals(old.colorScheme);
  }

  // 便捷方法：从 context 获取最近的 ThemeProvider
  static of(context: BuildContext): AppColorScheme {
    const provider = context.dependOnInheritedWidgetOfExactType(ThemeProvider);
    return provider?.colorScheme ?? AppColorScheme.default();
  }
}

// 在树顶部提供
new ThemeProvider({
  colorScheme: AppColorScheme.default(),
  child: new MyApp(),
})

// 在任意子节点消费
class MyWidget extends StatelessWidget {
  build(context: BuildContext): Widget {
    const colors = ThemeProvider.of(context);
    return new Text({
      data: '主题色文本',
      style: new TextStyle({ foreground: colors.primary }),
    });
  }
}
```

当 `updateShouldNotify` 返回 `true` 时，所有通过 `dependOnInheritedWidgetOfExactType` 订阅了该 Widget 的子节点会自动标记为脏并重建。

:::tip InheritedWidget 的典型用法
定义一个 `static of(context)` 方法是 InheritedWidget 的惯用模式。调用方只需要 `ThemeProvider.of(context)` 一行代码就能拿到数据，完全不用关心 InheritedWidget 的内部机制。
:::

## 组合模式

:::tip 优先使用组合模式而非自定义 RenderObject
90% 的需求都可以通过组合现有 Widget 来实现。`Container`、`Row`、`Column`、`Stack`、`Padding`、`GestureDetector` 这些内置 Widget 已经覆盖了大多数布局和交互场景。只有在这些 Widget 无法满足需求时（比如你需要自定义布局算法），才需要直接操作 RenderObject。
:::

通过组合现有 Widget 构建新功能：

```ts
// 带标签的输入框
class LabeledInput extends StatelessWidget {
  private label: string;
  private controller: TextEditingController;

  constructor(args: { label: string; controller: TextEditingController }) {
    super();
    this.label = args.label;
    this.controller = args.controller;
  }

  build(context: BuildContext): Widget {
    return new Column({
      crossAxisAlignment: 'start',
      mainAxisSize: 'min',
      children: [
        new Text({
          data: this.label,
          style: new TextStyle({ foreground: Color.brightBlack(), dim: true }),
        }),
        new Container({
          decoration: new BoxDecoration({
            border: Border.all(new BorderSide(Color.blue(), 1, 'rounded')),
          }),
          child: new TextField({
            controller: this.controller,
            placeholder: `输入${this.label}...`,
          }),
        }),
      ],
    });
  }
}
```

## 使用 runApp 启动

```ts
import { runApp } from '@flitter/tui';

await runApp(new MyApp(), {
  onRootElementMounted: () => {
    // 根 Element 挂载后回调
    // 适合注册全局键盘拦截器
    WidgetsBinding.instance.addKeyInterceptor((event) => {
      if (event.key === 'q') {
        WidgetsBinding.instance.stop();
        return true;
      }
      return false;
    });
  },
});
```

`runApp` 返回一个 `Promise<void>`，在应用退出时 resolve。它会：

1. 初始化 `WidgetsBinding` 单例
2. 进入终端 alternate screen 模式
3. 启用鼠标追踪和原始输入模式
4. 挂载 Widget 树并开始帧循环
5. 等待 `stop()` 被调用后退出并恢复终端

## 低级别：直接使用 RenderObject

:::warning 大多数开发者不需要这个
下面这一节是面向需要绕过 Widget 层直接操控渲染的高级场景（如一次性渲染、性能测试工具）。如果你刚开始学习 Flitter，可以放心跳过这部分，等有需要时再回来看。
:::

对于不需要完整 Widget 树的场景（如一次性渲染），可以直接操作 RenderObject：

```ts
import { Screen, AnsiRenderer } from '@flitter/tui';

const screen = new Screen(80, 24);

// 创建渲染对象
const container = new ContainerRenderObject(
  40, 10,                    // width, height
  EdgeInsets.all(1),         // padding
  undefined,                 // margin
  new BoxDecoration({        // decoration
    border: Border.all(new BorderSide(Color.cyan(), 1, 'rounded')),
  }),
);

// 布局
container.layout(BoxConstraints.tight(40, 10));

// 绘制到 Screen
container.paint(screen, 0, 0);

// 输出 ANSI
const renderer = new AnsiRenderer();
process.stdout.write(renderer.renderFull(screen));
```

### Screen API

```ts
const screen = new Screen(width, height);

// 写入单个字符
screen.writeChar(x, y, char, style, charWidth?);

// 填充区域
screen.fill(x, y, width, height, char, { fg?: Color, bg?: Color, dim?: boolean });

// 边框字符合并（自动连接相邻边框）
screen.mergeBorderChar(x, y, char, style);

// 清空
screen.clear();

// 调整大小
screen.resize(newWidth, newHeight);
```

## 下一步

掌握了自定义 Widget 的基础之后，可以继续探索这些主题：

- **[布局系统](../subsystems/layout.md)** -- 深入了解 BoxConstraints、Flex 布局等布局机制
- **[手势与交互](../subsystems/gestures.md)** -- 处理点击、拖拽等用户交互
- **[焦点系统](../subsystems/focus-system.md)** -- 管理键盘焦点和 Tab 导航
- **[输入处理](../subsystems/input-handling.md)** -- 键盘事件处理与快捷键绑定
- **[滚动](../subsystems/scroll.md)** -- 可滚动容器的使用
- **[实战教程：构建聊天 TUI](../walkthroughs/build-a-chat-tui.md)** -- 从零开始构建一个完整的终端聊天界面
