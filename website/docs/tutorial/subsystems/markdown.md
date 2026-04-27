# Markdown 渲染

## 概述

很多终端应用需要显示格式化的文本内容，比如帮助文档、聊天消息中的代码片段、或者 README 预览。Markdown 渲染引擎让你只需三行代码就能将 Markdown 字符串渲染为带样式的终端文本。

:::info 与 Web Markdown 库的对比
如果你用过 Web 端的 `marked`、`remark` 或 `react-markdown`，Flitter 的 Markdown 渲染遵循相似的流程：解析 -> AST -> 渲染。区别在于输出目标不是 HTML DOM，而是终端中的 `TextSpan` Widget 树。
:::

**你将学到什么：**

- 如何将 Markdown 字符串渲染为终端 Widget
- 如何自定义代码块的语法高亮颜色
- 如何使用内置的 GFM 表格和任务列表支持

**最简用法 -- 三行代码渲染 Markdown：**

<!-- 最简示例：三行代码将 Markdown 字符串渲染为终端 Widget -->

```typescript
import { MarkdownParser, MarkdownRenderer } from "@flitter/tui/markdown";

const parser = new MarkdownParser();
const renderer = new MarkdownRenderer({ theme: appTheme });
const spans = renderer.render(parser.parse("**Hello** *world*"));

new RichText({ text: spans })
```

:::tip 内置 GFM 支持
内置 GFM 支持意味着你不需要额外配置就能渲染表格和任务列表。直接在 Markdown 中使用 `| 表头 |` 语法和 `- [x] 任务` 语法即可。
:::

`@flitter/tui` 内置 Markdown 渲染引擎，使用 **micromark + GFM 扩展**将 Markdown 字符串解析为 AST，再将 AST 转换为 `TextSpan` Widget 树，支持代码块语法高亮、GFM 表格和任务列表。

## 核心概念

下表列出了 Markdown 渲染的三个核心组件。在大部分使用场景中，你只需要用 `MarkdownParser` 和 `MarkdownRenderer` 即可。

| 类 | 职责 |
|---|---|
| `MarkdownParser` | Markdown 文本 → 中间 AST（`MarkdownNode[]`） |
| `MarkdownRenderer` | AST → `TextSpan` 树，可传入 `AppTheme` 控制样式 |
| `SyntaxHighlighter` | 代码块逐词着色；依赖 `AppTheme.syntaxHighlight` 色表 |

:::info 最常用的是 `MarkdownParser` + `MarkdownRenderer` 组合，大部分场景只需要它们就够了。`SyntaxHighlighter` 由渲染器自动调用，无需手动使用。
:::

### AST 节点类型

`MarkdownNodeType` 覆盖常用元素：

```
document | paragraph | heading | strong | emphasis | delete
code | codeSpan | link | list | listItem
table | tableRow | tableCell | blockquote
thematicBreak | lineBreak | text | html
```

## 基本用法

下面是完整的解析-渲染流程：

<!-- 演示完整的 Markdown 解析和渲染流程：解析 -> AST -> TextSpan -> RichText -->

```typescript
import { MarkdownParser } from "@flitter/tui/markdown";
import { MarkdownRenderer } from "@flitter/tui/markdown";

const parser = new MarkdownParser();
const renderer = new MarkdownRenderer({ theme: appTheme });

// 1. 解析为 AST
const nodes = parser.parse("**Hello** *world*\n\n```ts\nconsole.log(1)\n```");

// 2. 渲染为 TextSpan 树
const spans = renderer.render(nodes);

// 3. 显示
new RichText({ text: spans })
```

解析策略：调用 micromark 生成 HTML，再通过状态机将 HTML 转为自定义 AST——比直接操作 micromark events 更可靠，micromark 的 HTML 输出经过完整验证。

## 进阶用法

### 代码块语法高亮

:::tip 何时使用
当你的 Markdown 内容包含代码块（用 ``` 围栏标记）时，渲染器会自动调用语法高亮。你只需要在主题中配置颜色即可。
:::

渲染器自动识别围栏代码块的语言标记，通过 `SyntaxHighlighter` 逐词着色：

<!-- 演示带语言标记的代码块如何自动获得语法高亮 -->

````typescript
const md = `
\`\`\`typescript
const x: number = 42;
\`\`\`
`;
const nodes = parser.parse(md);
const spans = renderer.render(nodes);
// code 节点的子 TextSpan 已按 token 着色
````

颜色来自 `AppTheme.syntaxHighlight`，可在主题中统一配置关键字色、字符串色、注释色等。

### 主题化

:::tip 何时使用
当你想让 Markdown 中的代码配色与应用整体主题一致时，通过 `AppTheme` 统一配置语法高亮颜色。
:::

<!-- 演示通过 AppTheme 自定义语法高亮的颜色方案 -->

```typescript
import { AppTheme } from "@flitter/tui/theme";

const theme = new AppTheme({
  syntaxHighlight: {
    keyword:  new TextStyle({ color: Colors.blue }),
    string:   new TextStyle({ color: Colors.green }),
    comment:  new TextStyle({ color: Colors.grey }),
    number:   new TextStyle({ color: Colors.yellow }),
  },
});

const renderer = new MarkdownRenderer({ theme });
```

### GFM 扩展：表格和任务列表

:::tip 何时使用
当你的 Markdown 内容包含 GitHub 风格的表格或任务列表时，无需任何额外配置，解析器已内置 GFM 支持。
:::

micromark-extension-gfm 已内置，直接支持：

<!-- 演示 GFM 表格和任务列表的 Markdown 语法 -->

```markdown
| 列1 | 列2 |
|-----|-----|
| a   | b   |

- [x] 已完成
- [ ] 待处理
```

解析结果包含 `table / tableRow / tableCell` 和带 `checked` 属性的 `listItem` 节点。

## 与其他子系统的配合

- **主题系统**：所有 Markdown 样式（标题大小、代码背景色、高亮色表）集中在 `AppTheme` 中配置。
- **滚动系统**：将 `RichText` 包裹在 `ListView` 中可支持超长文档的虚拟化滚动。
- **选择系统**：`SelectionArea` 包裹 `RichText`，让用户可以鼠标选取 Markdown 内容。

## 完整示例

渲染 Markdown 预览面板：

<!-- 综合演示：在可滚动区域中渲染 Markdown 内容预览 -->

```typescript
const parser   = new MarkdownParser();
const renderer = new MarkdownRenderer({ theme: appTheme });

function MarkdownPreview({ content }: { content: string }) {
  const spans = renderer.render(parser.parse(content));
  return new Scrollable({
    controller: scrollController,
    child: new Padding({
      padding: EdgeInsets.all(2),
      child: new RichText({ text: spans }),
    }),
  });
}
```

:::tip 运行示例
```bash
bun run examples/tui-markdown-demo.ts
```
:::

## 下一步

> 📖 详细 API: [文本 Widget 参考](/reference/widgets/text)
