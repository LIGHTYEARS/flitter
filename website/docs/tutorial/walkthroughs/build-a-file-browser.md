# 构建文件浏览器

本教程将带你构建一个分栏式终端文件浏览器，展示 SplitPane、Scrollable、Focus 键盘导航等组件的用法。

## 1. 创建应用骨架

文件浏览器需要维护当前路径、文件列表和选中索引等状态，使用 `StatefulWidget`：

```ts
import { runApp } from "../packages/tui/src/binding/run-app.js";
import { State, StatefulWidget } from "../packages/tui/src/tree/stateful-widget.js";
import type { Widget as WidgetInterface } from "../packages/tui/src/tree/element.js";
import type { BuildContext } from "../packages/tui/src/tree/stateless-widget.js";
import { resolve } from "node:path";

class FileBrowserDemo extends StatefulWidget {
  createState(): State {
    return new FileBrowserDemoState();
  }
}

class FileBrowserDemoState extends State<FileBrowserDemo> {
  private _currentDir = resolve(".");
  private _entries: FileEntry[] = [];
  private _selectedIndex = 0;

  override initState(): void {
    super.initState();
    this._entries = listDirectory(this._currentDir);
  }

  build(_context: BuildContext): WidgetInterface {
    // 稍后填充
  }
}

await runApp(new FileBrowserDemo() as unknown as WidgetInterface);
```

`resolve(".")` 获取当前工作目录的绝对路径作为初始目录。

## 2. 文件列表 — Scrollable + ScrollViewport

文件列表可能超出屏幕高度，需要滚动。使用 `Scrollable` + `ScrollViewport` + `Column` 组合：

```ts
import { ScrollController } from "../packages/tui/src/scroll/scroll-controller.js";
import { Scrollable, ScrollViewport } from "../packages/tui/src/scroll/scrollable.js";
import { Column } from "../packages/tui/src/widgets/column.js";

private _listScrollCtrl = new ScrollController();

private _buildFileList(): Widget {
  const rows: Widget[] = this._entries.map((entry, i) =>
    this._buildFileRow(entry, i)
  );

  return new Scrollable({
    controller: this._listScrollCtrl,
    viewportBuilder: (_ctx: BuildContext, ctrl: ScrollController) =>
      new ScrollViewport({
        controller: ctrl,
        child: new Column({ children: rows }),
      }),
  }) as unknown as Widget;
}
```

`Scrollable` 是高层组件，自动集成键盘和鼠标滚动。`ScrollViewport` 是底层渲染组件，负责裁剪超出视口的内容。`viewportBuilder` 回调接收一个 `ScrollController`，用于控制滚动位置。

每一行用 `Container` + `RichText` 构建，选中项显示高亮背景和光标：

```ts
private _buildFileRow(entry: FileEntry, index: number): Widget {
  const selected = index === this._selectedIndex;
  const bgColor = selected ? Color.rgb(40, 60, 100) : Color.rgb(20, 20, 25);
  const icon = entry.isDir ? "/ " : "  ";

  return new Container({
    decoration: new BoxDecoration({ color: bgColor }),
    padding: EdgeInsets.symmetric({ horizontal: 1 }),
    child: new RichText({
      text: new TextSpan({
        children: [
          new TextSpan({
            text: selected ? "> " : "  ",
            style: new TextStyle({ foreground: Color.yellow(), bold: true }),
          }),
          new TextSpan({ text: icon }),
          new TextSpan({
            text: entry.name,
            style: new TextStyle({
              foreground: entry.isDir ? Color.cyan() : Color.white(),
              bold: entry.isDir,
            }),
          }),
        ],
      }),
    }),
  }) as unknown as Widget;
}
```

## 3. 键盘导航 — Focus + onKeyEvent

`Focus` 组件捕获键盘事件。`onKey` 回调返回 `"handled"` 或 `"ignored"` 控制事件冒泡：

```ts
import { Focus } from "../packages/tui/src/widgets/focus.js";
import type { KeyEvent } from "../packages/tui/src/vt/types.js";
import type { KeyEventResult } from "../packages/tui/src/focus/focus-node.js";

private _handleKey = (event: KeyEvent): KeyEventResult => {
  if (event.key === "j" || event.key === "ArrowDown") {
    this.setState(() => {
      this._selectedIndex = Math.min(
        this._selectedIndex + 1,
        this._entries.length - 1
      );
    });
    return "handled";
  }
  if (event.key === "k" || event.key === "ArrowUp") {
    this.setState(() => {
      this._selectedIndex = Math.max(this._selectedIndex - 1, 0);
    });
    return "handled";
  }
  if (event.key === "Enter") {
    const entry = this._entries[this._selectedIndex];
    if (entry?.isDir) {
      this.setState(() => {
        this._currentDir = join(this._currentDir, entry.name);
        this._selectedIndex = 0;
        this._refreshEntries();
      });
    }
    return "handled";
  }
  if (event.key === "Backspace") {
    // 返回上级目录
    const parent = dirname(this._currentDir);
    if (parent !== this._currentDir) {
      this.setState(() => {
        this._currentDir = parent;
        this._refreshEntries();
      });
    }
    return "handled";
  }
  if (event.key === "q") {
    WidgetsBinding.instance.stop();
    return "handled";
  }
  return "ignored";
};
```

`j`/`k` 是 Vim 风格的上下导航键，同时支持方向键。`Enter` 进入目录，`Backspace` 返回上级。

## 4. 焦点管理 — Focus + autofocus

使用 `Focus` 包裹整个应用，设置 `autofocus: true` 自动获取焦点：

```ts
build(_context: BuildContext): WidgetInterface {
  return new Focus({
    autofocus: true,
    onKey: this._handleKey,
    child: new Column({ children: [...] }),
  }) as unknown as WidgetInterface;
}
```

`autofocus` 确保应用启动时焦点自动落在此节点上，键盘事件能被正确捕获。

## 5. 分割面板 — SplitPane

`SplitPane` 将两个子组件以指定比例分割显示，中间绘制分隔线：

```ts
import { SplitPane } from "../packages/tui/src/widgets/split-pane.js";

new Expanded({
  child: new SplitPane({
    direction: "horizontal",
    initialRatio: 0.35,
    children: [
      this._buildFileList() as unknown as WidgetInterface,
      this._buildPreview() as unknown as WidgetInterface,
    ],
  }),
}) as unknown as Widget;
```

`direction` 支持 `"horizontal"`（左右分割）和 `"vertical"`（上下分割）。`initialRatio` 设定左/上面板的初始占比（0.0-1.0）。分隔线自动使用 `│` 或 `─` 字符绘制。

用 `Expanded` 包裹 `SplitPane` 让它占据所有可用空间。

## 6. 文件预览 — RichText

右侧面板读取选中文件的前 20 行并显示行号：

```ts
import { readdirSync, readFileSync, statSync } from "node:fs";

function readPreview(filePath: string, maxLines: number): string[] {
  const st = statSync(filePath);
  if (st.isDirectory()) {
    return listDirectory(filePath).map(e => `${e.isDir ? "[DIR] " : "      "}${e.name}`);
  }
  if (st.size > 1024 * 512) return ["(file too large to preview)"];
  return readFileSync(filePath, "utf-8").split("\n").slice(0, maxLines);
}
```

每行使用 `RichText` + `TextSpan` 显示灰色行号和白色内容：

```ts
new RichText({
  text: new TextSpan({
    children: [
      new TextSpan({
        text: `${String(i + 1).padStart(3)} `,
        style: new TextStyle({ foreground: Color.rgb(80, 80, 80) }),
      }),
      new TextSpan({
        text: line,
        style: new TextStyle({ foreground: Color.rgb(200, 200, 200) }),
      }),
    ],
  }),
})
```

对于目录，显示子项列表；对于大文件，显示提示信息而非尝试读取。

## 7. 状态栏 — 当前路径 + 文件数

底部状态栏显示当前目录路径、文件总数和选中位置：

```ts
private _buildStatusBar(): Widget {
  const fileCount = this._entries.length;
  const dirCount = this._entries.filter(e => e.isDir).length;
  return new Container({
    width: 240,
    height: 1,
    decoration: new BoxDecoration({ color: Color.rgb(40, 40, 40) }),
    child: new RichText({
      text: new TextSpan({
        children: [
          new TextSpan({
            text: ` ${this._currentDir}`,
            style: new TextStyle({ foreground: Color.cyan() }),
          }),
          new TextSpan({
            text: `  ${fileCount} items (${dirCount} dirs)`,
            style: new TextStyle({ foreground: Color.rgb(140, 140, 140) }),
          }),
          new TextSpan({
            text: `  [${this._selectedIndex + 1}/${fileCount}]`,
            style: new TextStyle({ foreground: Color.yellow() }),
          }),
        ],
      }),
    }),
  }) as unknown as Widget;
}
```

## 8. 完整代码

完整的文件浏览器示例包含约 280 行代码，涵盖了 SplitPane 分栏布局、Scrollable 滚动列表、Focus 键盘导航和文件系统操作。

:::tip 运行完整示例
```bash
bun run examples/tui-file-browser-demo.ts
```
:::
