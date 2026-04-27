# 构建仪表盘

本教程将带你一步步构建一个实时刷新的终端仪表盘，展示 ProgressBar、Badge、Table 等组件的用法。

## 你将学到什么

- [ ] 使用 `StatefulWidget` 和 `State` 管理动态数据
- [ ] 用 `Column`、`Row`、`Expanded` 等组件进行布局
- [ ] 使用 `ProgressBar`、`Badge`、`Table` 等高级组件
- [ ] 通过 `Container` + `BoxDecoration` 设置样式和背景色
- [ ] 用 `setInterval` + `setState` 实现定时刷新
- [ ] 用 `Focus` 捕获键盘事件退出应用

## 前置知识

在开始之前，建议你已经了解以下内容：

- TypeScript 基础语法
- 终端 / 命令行的基本操作
- [Flitter 核心概念](/tutorial/core-concepts/three-tree)中的 Widget、StatefulWidget、build 方法

## 1. 创建应用骨架

每个 Flitter 应用都从 `StatefulWidget` + `State` + `runApp` 开始。仪表盘需要定时刷新数据，所以我们使用有状态组件：

:::info 关于导入路径
本教程中的导入路径（如 `../packages/tui/src/...`）是从 monorepo 源码直接运行示例时的写法。如果你在自己的项目中使用 Flitter，导入路径应该是 `@flitter/tui`，例如：`import { runApp } from "@flitter/tui";`
:::

```ts
import { runApp } from "../packages/tui/src/binding/run-app.js";
import { State, StatefulWidget } from "../packages/tui/src/tree/stateful-widget.js";
import type { Widget as WidgetInterface } from "../packages/tui/src/tree/element.js";
import type { BuildContext } from "../packages/tui/src/tree/stateless-widget.js";

class DashboardDemo extends StatefulWidget {
  createState(): State {
    return new DashboardDemoState();
  }
}

class DashboardDemoState extends State<DashboardDemo> {
  build(_context: BuildContext): WidgetInterface {
    // 稍后填充布局
  }
}

await runApp(new DashboardDemo() as unknown as WidgetInterface);
```

:::info StatefulWidget 是什么？
`StatefulWidget` 拥有自己的 `State` 生命周期，可以通过 `setState()` 触发界面重建。当你的界面需要随时间变化（比如定时刷新数据），就需要使用它。更多细节参见[核心概念](/tutorial/core-concepts/three-tree)。
:::

:::info 关于 `as unknown as Widget` 类型转换
你可能注意到了 `as unknown as Widget` 类型转换。这是 TypeScript 类型系统的一个限制——框架内部使用了复杂的类型层次，但在实际使用中你可以安全地忽略这些转换。
:::

## 2. 布局结构

仪表盘采用纵向布局：顶部状态栏 → 帮助提示 → 指标面板 → 数据表格 → 底部栏。使用 `Column` 纵向排列，`Row` 用于横向组合：

```ts
import { Column } from "../packages/tui/src/widgets/column.js";
import { SizedBox } from "../packages/tui/src/widgets/sized-box.js";
import { Expanded } from "../packages/tui/src/widgets/flexible.js";
import type { Widget } from "../packages/tui/src/tree/widget.js";

build(_context: BuildContext): WidgetInterface {
  return new Column({
    children: [
      this._buildStatusBar(),
      new SizedBox({ height: 1 }) as unknown as Widget,
      this._buildMetricsPanel(),
      new SizedBox({ height: 1 }) as unknown as Widget,
      this._buildServerTable(),
      new Expanded({ child: new SizedBox() as unknown as Widget }) as unknown as Widget,
      this._buildFooter(),
    ],
  }) as unknown as WidgetInterface;
}
```

**这段代码做了什么：** 使用 `Column` 将所有内容纵向排列——状态栏在最上面，指标面板和表格在中间，底部栏贴在最下面。`SizedBox({ height: 1 })` 用作行间距，`Expanded` 填充剩余空间让底部栏始终贴底。

运行后你会看到一个纵向排列的界面骨架，从上到下依次是各个区域。

## 3. 状态栏

状态栏用 `Container` + `BoxDecoration` 实现背景色，`RichText` + `TextSpan` 实现多色文字：

```ts
import { Container } from "../packages/tui/src/widgets/container.js";
import { BoxDecoration } from "../packages/tui/src/widgets/box-decoration.js";
import { RichText } from "../packages/tui/src/widgets/rich-text.js";
import { TextSpan } from "../packages/tui/src/widgets/text-span.js";
import { Color } from "../packages/tui/src/screen/color.js";
import { TextStyle } from "../packages/tui/src/screen/text-style.js";

private _buildStatusBar(): Widget {
  const time = new Date().toLocaleTimeString("en-US", { hour12: false });
  return new Container({
    width: 240,
    height: 1,
    decoration: new BoxDecoration({ color: Color.rgb(30, 60, 100) }),
    child: new RichText({
      text: new TextSpan({
        children: [
          new TextSpan({
            text: " Flitter Dashboard",
            style: new TextStyle({ foreground: Color.cyan(), bold: true }),
          }),
          new TextSpan({
            text: `  ${time}`,
            style: new TextStyle({ foreground: Color.rgb(180, 180, 180) }),
          }),
        ],
      }),
    }),
  }) as unknown as Widget;
}
```

**这段代码做了什么：** 创建一个蓝色背景的状态栏，左侧显示青色粗体的标题「Flitter Dashboard」，右侧显示当前时间。运行后你会看到一个蓝色背景的状态栏横跨终端顶部。

`Color.rgb(r, g, b)` 可以创建任意 24 位真彩色，`Color.cyan()` 等提供常用预设色。

## 4. 指标面板 — ProgressBar + Badge

`ProgressBar` 接受 `value`（0.0-1.0）、`width`（字符数）、`label`、`color` 和 `backgroundColor`。搭配 `Badge` 显示状态标签：

```ts
import { ProgressBar } from "../packages/tui/src/widgets/progress-bar.js";
import { Badge } from "../packages/tui/src/widgets/badge.js";
import { Row } from "../packages/tui/src/widgets/row.js";
import { Padding } from "../packages/tui/src/widgets/padding.js";
import { EdgeInsets } from "../packages/tui/src/widgets/edge-insets.js";
import { Text } from "../packages/tui/src/widgets/text.js";

private _buildMetricRow(label: string, value: number): Widget {
  const pct = Math.round(value * 100);
  const color = value > 0.85 ? Color.red() : value > 0.6 ? Color.yellow() : Color.green();
  return new Padding({
    padding: EdgeInsets.symmetric({ horizontal: 2 }),
    child: new Row({
      children: [
        new Text({
          data: label.padEnd(10),
          style: new TextStyle({ foreground: Color.white(), bold: true }),
        }) as unknown as Widget,
        new ProgressBar({
          value,
          width: 30,
          color,
          backgroundColor: Color.rgb(60, 60, 60),
        }) as unknown as Widget,
        new Text({
          data: ` ${String(pct).padStart(3)}%`,
          style: new TextStyle({ foreground: color }),
        }) as unknown as Widget,
        new SizedBox({ width: 2 }) as unknown as Widget,
        new Badge({
          label: pct > 85 ? "CRIT" : pct > 60 ? "WARN" : "OK",
          color,
        }) as unknown as Widget,
      ],
    }),
  }) as unknown as Widget;
}
```

**这段代码做了什么：** 构建一行指标数据——左侧是指标名称，中间是带颜色的进度条，右侧是百分比数字和状态标签。进度条颜色会根据数值自动变化：绿色表示正常，黄色表示警告，红色表示危险。

`ProgressBar` 内部使用 Unicode 块元素 `▏▎▍▌▋▊▉█` 实现亚字符级精度的平滑进度条。`Badge` 渲染为 `[OK]`、`[WARN]` 等彩色标签。

## 5. 数据表格 — Table

`Table` 接受 `rows`（`TableRow[]`）和 `columnConfigs`（`TableColumnConfig[]`），支持 `fixed`、`intrinsic`、`flex`、`proportional` 四种列宽策略：

```ts
import { Table } from "../packages/tui/src/widgets/table.js";
import type { TableRow } from "../packages/tui/src/widgets/table.js";

const headerRow: TableRow = {
  cells: [
    { child: new Text({ data: "Hostname", style: headerStyle }) as unknown as Widget },
    { child: new Text({ data: "Status", style: headerStyle }) as unknown as Widget },
    { child: new Text({ data: "Uptime", style: headerStyle }) as unknown as Widget },
    { child: new Text({ data: "Load", style: headerStyle }) as unknown as Widget },
  ],
};

const table = new Table({
  rows: [headerRow, ...dataRows],
  columnConfigs: [
    { widthType: "fixed", fixedWidth: 20 },
    { widthType: "fixed", fixedWidth: 10 },
    { widthType: "fixed", fixedWidth: 12 },
    { widthType: "fixed", fixedWidth: 8 },
  ],
  borderColor: Color.rgb(80, 80, 100),
  showBorders: true,
});
```

**这段代码做了什么：** 创建一个带圆角边框的数据表格，包含表头行和数据行。每列使用固定宽度，表格自动绘制 Unicode 边框字符。

表格自动绘制圆角边框（`╭╮╰╯`），行列分隔线使用 `─│┼├┤┬┴` 字符。每个 `TableCell.child` 可以是任意 Widget，不仅限于文字。

## 6. 定时刷新 — setInterval + setState

在 `initState` 中启动定时器，在 `dispose` 中清除。每次 `setState()` 调用都会触发 `build()` 重建界面：

```ts
override initState(): void {
  super.initState();
  this._timer = setInterval(() => {
    this.setState(() => {
      this._cpu = randomDrift(this._cpu, 0.15);
      this._memory = randomDrift(this._memory, 0.08);
    });
  }, 2000);
}

override dispose(): void {
  clearInterval(this._timer);
  super.dispose();
}
```

**这段代码做了什么：** 在组件初始化时启动一个每 2 秒触发一次的定时器，每次触发时用 `setState` 更新 CPU 和内存的模拟数据，框架会自动重新调用 `build()` 刷新界面。组件销毁时清除定时器，防止内存泄漏。

`setState` 接受一个可选回调，在回调中修改状态数据，之后框架自动调用 `build()` 重新构建 Widget 树并更新终端显示。

退出使用 `Focus` 组件捕获 `q` 键，调用 `WidgetsBinding.instance.stop()` 停止应用：

```ts
import { Focus } from "../packages/tui/src/widgets/focus.js";
import { WidgetsBinding } from "../packages/tui/src/binding/widgets-binding.js";

private _handleKey = (event: KeyEvent): KeyEventResult => {
  if (event.key === "q") {
    WidgetsBinding.instance.stop();
    return "handled";
  }
  return "ignored";
};
```

## 7. 完整代码

完整的仪表盘示例包含约 250 行代码，涵盖了布局、样式、数据表格、进度条、定时刷新等核心概念。

:::tip 运行完整示例
```bash
bun run examples/tui-dashboard-demo.ts
```
:::

## 恭喜完成！

你已经成功构建了一个实时刷新的终端仪表盘！在这个过程中，你学会了：

- 使用 `StatefulWidget` 管理动态状态
- 用 `Column`、`Row`、`Expanded` 进行灵活布局
- 用 `ProgressBar` 和 `Badge` 展示指标数据
- 用 `Table` 渲染结构化数据
- 用 `setInterval` + `setState` 实现定时刷新

**下一步：**

- [构建文件浏览器](/tutorial/walkthroughs/build-a-file-browser) — 学习 SplitPane 分栏布局和键盘导航
- [构建聊天 TUI](/tutorial/walkthroughs/build-a-chat-tui) — 学习 TextField 输入和 Markdown 渲染
- [核心概念](/tutorial/core-concepts/three-tree) — 深入理解 Widget 树、Element 树和渲染机制
