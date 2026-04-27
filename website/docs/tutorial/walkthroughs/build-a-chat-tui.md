# 构建聊天 TUI

本教程将带你构建一个支持 Markdown 渲染的终端聊天界面，展示 TextField 输入、Scrollable 消息列表、MarkdownParser + MarkdownRenderer 富文本渲染等组件的用法。

## 你将学到什么

- [ ] 使用 `TextField` + `TextEditingController` 实现文本输入
- [ ] 用 `Scrollable` + `ScrollController` 实现可滚动的消息列表
- [ ] 用 `MarkdownParser` + `MarkdownRenderer` 渲染富文本
- [ ] 用 `Container` + `BoxDecoration` 实现彩色消息气泡
- [ ] 组合以上组件构建完整的聊天界面

## 前置知识

在开始之前，建议你已经了解以下内容：

- TypeScript 基础语法
- [Flitter 核心概念](/tutorial/core-concepts/three-tree)中的 Widget、StatefulWidget、build 方法
- 建议先完成[构建仪表盘](/tutorial/walkthroughs/build-a-dashboard)教程

:::info 关于 LLM 集成
在本教程中我们使用预设的回复来演示聊天界面的构建。在实际应用中，你可以替换为真正的 LLM API 调用——Flitter 的 `@flitter/llm` 包提供了完整的大模型接入支持。
:::

## 1. 创建应用骨架

聊天应用需要维护消息列表和输入状态。使用 `StatefulWidget` 管理状态，`TextEditingController` 控制输入框：

```ts
import { runApp } from "../packages/tui/src/binding/run-app.js";
import { State, StatefulWidget } from "../packages/tui/src/tree/stateful-widget.js";
import { TextEditingController } from "../packages/tui/src/editing/text-editing-controller.js";
import type { Widget as WidgetInterface } from "../packages/tui/src/tree/element.js";
import type { BuildContext } from "../packages/tui/src/tree/stateless-widget.js";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

class ChatDemo extends StatefulWidget {
  createState(): State {
    return new ChatDemoState();
  }
}

class ChatDemoState extends State<ChatDemo> {
  private _messages: ChatMessage[] = [];
  private _inputCtrl!: TextEditingController;

  override initState(): void {
    super.initState();
    this._inputCtrl = new TextEditingController();
  }

  override dispose(): void {
    this._inputCtrl.dispose();
    super.dispose();
  }

  build(_context: BuildContext): WidgetInterface {
    // 稍后填充
  }
}

await runApp(new ChatDemo() as unknown as WidgetInterface);
```

:::info 关于 `as unknown as Widget` 类型转换
你可能注意到了 `as unknown as Widget` 类型转换。这是 TypeScript 类型系统的一个限制——框架内部使用了复杂的类型层次，但在实际使用中你可以安全地忽略这些转换。
:::

`TextEditingController` 管理输入框的文本内容，可通过 `.text` 属性读写，在 `dispose` 中清理资源。

## 2. 消息列表 — Scrollable + ScrollController

消息列表使用 `Scrollable` + `ScrollViewport` 实现滚动，`ScrollController` 控制滚动位置以支持自动滚到底部：

```ts
import { ScrollController } from "../packages/tui/src/scroll/scroll-controller.js";
import { Scrollable, ScrollViewport } from "../packages/tui/src/scroll/scrollable.js";
import { Column } from "../packages/tui/src/widgets/column.js";
import { Expanded } from "../packages/tui/src/widgets/flexible.js";

private _scrollCtrl = new ScrollController();

private _buildMessageList(): Widget {
  const msgWidgets: Widget[] = [];
  for (let i = 0; i < this._messages.length; i++) {
    msgWidgets.push(this._buildMessageBubble(this._messages[i]!));
    if (i < this._messages.length - 1) {
      msgWidgets.push(new SizedBox({ height: 1 }) as unknown as Widget);
    }
  }

  return new Scrollable({
    controller: this._scrollCtrl,
    viewportBuilder: (_ctx: BuildContext, ctrl: ScrollController) =>
      new ScrollViewport({
        controller: ctrl,
        child: new Column({ children: msgWidgets }),
      }),
  }) as unknown as Widget;
}
```

**这段代码做了什么：** 将所有聊天消息映射为 Widget 列表，每条消息之间添加 1 行间距。然后用 `Scrollable` + `ScrollViewport` 包裹，当消息数量超出屏幕时可以滚动查看。

在 `build()` 中用 `Expanded` 包裹消息列表，让它占据输入框和标题栏之外的所有空间：

```ts
new Expanded({
  child: this._buildMessageList(),
}) as unknown as Widget,
```

## 3. 输入框 — TextField + TextEditingController

使用 `TextField` 创建输入框，`onSubmitted` 回调在用户按 Enter 时触发：

```ts
import { TextField } from "../packages/tui/src/editing/text-field.js";
import { Row } from "../packages/tui/src/widgets/row.js";
import { Container } from "../packages/tui/src/widgets/container.js";
import { Text } from "../packages/tui/src/widgets/text.js";

private _buildInput(): Widget {
  return new Container({
    decoration: new BoxDecoration({ color: Color.rgb(25, 25, 35) }),
    padding: EdgeInsets.symmetric({ horizontal: 1 }),
    child: new Row({
      children: [
        new Text({
          data: "> ",
          style: new TextStyle({ foreground: Color.cyan(), bold: true }),
        }) as unknown as Widget,
        new Expanded({
          child: new TextField({
            controller: this._inputCtrl,
            placeholder: "Type a message...",
            autofocus: true,
            textStyle: new TextStyle({ foreground: Color.white() }),
            cursorColor: Color.brightCyan(),
            backgroundColor: Color.rgb(25, 25, 35),
            onSubmitted: (text: string) => {
              this._sendMessage(text);
            },
          }),
        }) as unknown as Widget,
      ],
    }),
  }) as unknown as Widget;
}
```

**这段代码做了什么：** 创建一个带深色背景的输入区域——左侧是青色的 `>` 提示符，右侧是可编辑的文本输入框。用户按 Enter 时触发 `onSubmitted` 回调发送消息。

`TextField` 支持丰富的配置：

- `placeholder` — 空内容时的提示文字
- `autofocus` — 自动获取焦点
- `textStyle` / `cursorColor` / `backgroundColor` — 样式定制
- `onSubmitted` — Enter 键回调
- `readOnly` — 只读模式

用 `Expanded` 包裹 `TextField` 让它占满行内剩余宽度。

## 4. Markdown 消息渲染

终端聊天界面的一大亮点是支持 Markdown 富文本渲染。Flitter 让这件事变得非常简单——只需三行代码就能将 Markdown 文本渲染为带样式的终端富文本。

`MarkdownParser` 将 Markdown 文本解析为 AST，`MarkdownRenderer` 将 AST 转换为 `TextSpan[]`，然后用 `RichText` 渲染：

```ts
import { MarkdownParser } from "../packages/tui/src/markdown/markdown-parser.js";
import { MarkdownRenderer } from "../packages/tui/src/markdown/markdown-renderer.js";
import { RichText } from "../packages/tui/src/widgets/rich-text.js";
import { TextSpan } from "../packages/tui/src/widgets/text-span.js";

private _parser = new MarkdownParser();
private _renderer = new MarkdownRenderer();

private _renderMarkdown(content: string): Widget {
  const ast = this._parser.parse(content);
  const spans = this._renderer.render(ast);
  return new RichText({
    text: new TextSpan({
      children: spans.length > 0 ? spans : [new TextSpan({ text: content })],
    }),
  }) as unknown as Widget;
}
```

**这段代码做了什么：** 只需三步——解析 Markdown 文本、渲染为 TextSpan、用 RichText 显示。就这么简单！如果解析结果为空，则回退到显示原始文本。

`MarkdownParser` 基于 micromark + GFM 扩展，支持标准 Markdown 语法：

- **粗体**、*斜体*、~~删除线~~
- 行内代码 `` `code` ``
- 代码块（带语法高亮）
- 列表（有序/无序/任务列表）
- 表格、引用块、链接

`MarkdownRenderer` 为不同元素应用对应样式：标题加粗、代码块加背景色、链接添加下划线等。

## 5. 消息发送逻辑 — setState + scroll to bottom

发送消息时：添加用户消息 → 添加模拟回复 → 清空输入框 → 滚动到底部：

```ts
private _sendMessage(text: string): void {
  if (!text.trim()) return;
  this.setState(() => {
    this._messages.push({ role: "user", content: text });
    // 添加模拟助手回复
    const response = CANNED_RESPONSES[this._responseIndex % CANNED_RESPONSES.length]!;
    this._responseIndex++;
    this._messages.push({ role: "assistant", content: response });
    // 清空输入框
    this._inputCtrl.text = "";
    // 滚动到底部
    if (this._scrollCtrl.maxScrollExtent > 0) {
      this._scrollCtrl.jumpTo(this._scrollCtrl.maxScrollExtent + 20);
    }
  });
}
```

**这段代码做了什么：** 处理消息发送流程——先添加用户消息，再添加模拟的助手回复，然后清空输入框并滚动到底部，确保最新消息始终可见。

`ScrollController.jumpTo(offset)` 可以立即跳转到指定滚动偏移。加上一个小余量（+20）确保新消息完全可见。

:::tip 替换为真实的 LLM 调用
在实际应用中，你可以将 `CANNED_RESPONSES` 替换为真正的 LLM API 调用，并使用 `MarkdownParser.appendText()` 支持流式渲染——让助手的回复像打字一样逐字出现。
:::

## 6. 样式美化 — Container + 彩色消息气泡

每条消息用 `Container` + `BoxDecoration` 添加背景色，用户和助手使用不同颜色区分：

```ts
private _buildMessageBubble(msg: ChatMessage): Widget {
  const isUser = msg.role === "user";
  const bgColor = isUser ? Color.rgb(30, 50, 80) : Color.rgb(35, 35, 45);
  const labelColor = isUser ? Color.cyan() : Color.green();
  const label = isUser ? "You" : "Assistant";

  const ast = this._parser.parse(msg.content);
  const spans = this._renderer.render(ast);

  return new Padding({
    padding: EdgeInsets.symmetric({ horizontal: 1 }),
    child: new Container({
      decoration: new BoxDecoration({ color: bgColor }),
      padding: EdgeInsets.symmetric({ horizontal: 1 }),
      child: new Column({
        children: [
          new Text({
            data: label,
            style: new TextStyle({ foreground: labelColor, bold: true }),
          }) as unknown as Widget,
          new RichText({
            text: new TextSpan({ children: spans }),
          }) as unknown as Widget,
        ],
      }),
    }),
  }) as unknown as Widget;
}
```

**这段代码做了什么：** 为每条消息创建一个彩色气泡——用户消息用蓝色背景，助手消息用深灰色背景。每个气泡顶部显示角色标签（「You」或「Assistant」），下方是经过 Markdown 渲染的消息内容。

`Padding` 添加外边距，`Container.padding` 添加内边距，`BoxDecoration.color` 设置背景色。`Column` 垂直排列角色标签和消息内容。

退出方式：输入 `q` + Enter 退出，或使用 `Ctrl+C`。`Ctrl+C` 通过 `WidgetsBinding.addKeyInterceptor` 全局拦截。

## 7. 完整代码

完整的聊天 TUI 示例包含约 260 行代码，涵盖了 TextField 输入、Markdown 渲染、Scrollable 消息列表和消息气泡样式。

:::tip 运行完整示例
```bash
bun run examples/tui-chat-demo.ts
```
:::

## 恭喜完成！

你已经成功构建了一个支持 Markdown 渲染的终端聊天界面！在这个过程中，你学会了：

- 使用 `TextField` + `TextEditingController` 实现文本输入
- 用 `Scrollable` + `ScrollController` 实现可滚动消息列表
- 用 `MarkdownParser` + `MarkdownRenderer` 渲染 Markdown 富文本
- 用 `Container` + `BoxDecoration` 创建彩色消息气泡

**下一步：**

- [LLM 集成架构](/architecture/llm-integration) — 了解如何接入真实的大模型 API
- [核心概念](/tutorial/core-concepts/three-tree) — 深入理解 Widget 树、Element 树和渲染机制
- [构建仪表盘](/tutorial/walkthroughs/build-a-dashboard) — 学习 ProgressBar、Table 等更多组件
