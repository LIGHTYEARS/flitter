# Markdown 渲染

## 概述

`@flitter/tui` 内置 Markdown 渲染引擎，使用 **micromark + GFM 扩展**将 Markdown 字符串解析为 AST，再将 AST 转换为 `TextSpan` Widget 树，支持代码块语法高亮、GFM 表格和任务列表。

## 核心概念

| 类 | 职责 |
|---|---|
| `MarkdownParser` | Markdown 文本 → 中间 AST（`MarkdownNode[]`） |
| `MarkdownRenderer` | AST → `TextSpan` 树，可传入 `AppTheme` 控制样式 |
| `SyntaxHighlighter` | 代码块逐词着色；依赖 `AppTheme.syntaxHighlight` 色表 |

### AST 节点类型

`MarkdownNodeType` 覆盖常用元素：

```
document | paragraph | heading | strong | emphasis | delete
code | codeSpan | link | list | listItem
table | tableRow | tableCell | blockquote
thematicBreak | lineBreak | text | html
```

## 基本用法

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

渲染器自动识别围栏代码块的语言标记，通过 `SyntaxHighlighter` 逐词着色：

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

micromark-extension-gfm 已内置，直接支持：

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
