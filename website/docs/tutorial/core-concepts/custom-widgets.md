# 自定义 Widget

本指南展示如何使用 Flitter 的三棵树架构构建自定义 Widget。

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
new StatusBar({ message: '✓ 保存成功', color: Color.green() })
```

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
createState()        ← StatefulWidget 首次被挂载
    ↓
initState()          ← 初始化（只调用一次）
    ↓
build()              ← 构建 Widget 子树
    ↓
[用户交互 → setState()]
    ↓
build()              ← 重新构建
    ↓
[父级重建，新 Widget 替换旧 Widget]
    ↓
didUpdateWidget()    ← 接收新配置
    ↓
build()              ← 重新构建
    ↓
dispose()            ← 卸载，释放资源
```

### setState 规则

```ts
// ✅ 正确：在回调中修改状态
this.setState(() => {
  this.count++;
});

// ✅ 也可以不传回调，先修改再调用
this.count++;
this.setState();

// ❌ 错误：在 dispose 后调用会抛异常
dispose() {
  super.dispose();
  // this.setState(() => {...}); // 抛出 "setState called after dispose"
}
```

## InheritedWidget

用于向子树高效传递数据（类似 React Context）。

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

## 组合模式

优先通过组合现有 Widget 构建新功能，而非创建自定义 RenderObject。

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
