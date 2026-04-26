# 构建仪表盘

本教程将带你一步步构建一个实时刷新的终端仪表盘，展示 ProgressBar、Badge、Table 等组件的用法。

## 1. 创建应用骨架

每个 Flitter 应用都从 `StatefulWidget` + `State` + `runApp` 开始。仪表盘需要定时刷新数据，所以我们使用有状态组件：

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

`StatefulWidget` 拥有自己的 `State` 生命周期，可以通过 `setState()` 触发界面重建。

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

`SizedBox({ height: 1 })` 用作行间距，`Expanded` 填充剩余空间让底部栏始终贴底。

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
