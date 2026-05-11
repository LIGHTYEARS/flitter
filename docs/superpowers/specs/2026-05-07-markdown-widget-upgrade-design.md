# Markdown 渲染 Widget 化升级

**日期**: 2026-05-07
**状态**: Approved
**范围**: `packages/tui/src/markdown/`

## 1. 目标

将 Markdown 渲染从 TextSpan[] 扁平输出升级为 Widget 树输出，对齐 amp-cli 的 Z3 (MarkdownBody) 架构。同时将解析器从 micromark→HTML→regex 切换为 unified/remark（mdast + position 信息）。

一期交付，不分阶段。

## 2. 背景与动机

当前实现的核心问题：

- **输出是 TextSpan[]**：所有块级元素被扁平化为文本，丧失布局能力
- **列表多行不对齐**：无法实现 Row[Bullet, Expanded(Column)] 的自动缩进
- **Blockquote 仅首行有边框**：纯文本 `│` 字符无法覆盖多行
- **无 position 信息**：micromark→HTML 路径丢失源码位置，无法实现 hasBlankLineBetween、colorTransform
- **标题渲染前缀**：flitter 显示 `# ` 源码符号，amp 不渲染

## 3. 整体架构

```
对话消息（Markdown 文本）
  ├─ assistant 流式回复（主场景）
  ├─ 用户消息
  ├─ 工具输出
  └─ 系统文本
       │
       ▼
┌──────────────────────────────────────┐
│ unified + remark-parse + remark-gfm  │
│ 输出: mdast Root (带 position)       │
└──────────────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────┐
│ MarkdownView (StatelessWidget)       │
│ build(context) → Widget 树           │
│                                      │
│  Column(crossAxis: start)            │
│   ├─ RichText(paragraph)             │
│   ├─ RichText(heading)               │
│   ├─ Container(code block)           │
│   ├─ Container+Border(blockquote)    │
│   ├─ Column[Row(bullet, Expanded)]   │
│   ├─ Table(widget)                   │
│   └─ RichText("---")                 │
└──────────────────────────────────────┘
       │
       ▼
   TUI 渲染管线（layout → paint → render）
```

## 4. 文件结构

```
packages/tui/src/markdown/
├── markdown-parser.ts         ← 重写：unified + remark-parse + remark-gfm
├── markdown-view.ts           ← 新增：MarkdownView StatelessWidget
├── markdown-block-builder.ts  ← 新增：mdast block node → Widget
├── markdown-inline-builder.ts ← 新增：mdast inline node → TextSpan
├── markdown-theme.ts          ← 改造：InheritedWidget 集成
├── syntax-highlight.ts        ← 保留不变
├── prism-languages.ts         ← 保留不变
└── index.ts                   ← 更新导出
```

废弃文件：
- `markdown-renderer.ts` — 标记 `@deprecated`，不再使用

## 5. 核心 API

### 5.1 MarkdownView Widget

```typescript
class MarkdownView extends StatelessWidget {
  readonly content: string;
  readonly streaming: boolean;
  readonly colorTransform?: (offset: number, baseColor: Color) => Color;

  build(context: BuildContext): Widget {
    const theme = MarkdownTheme.of(context);
    const ast = parse(this.content);
    const children = buildBlocks(ast.children, {
      theme,
      streaming: this.streaming,
      colorTransform: this.colorTransform,
    });
    return new Column({ crossAxisAlignment: "start", children });
  }
}
```

### 5.2 解析器

```typescript
import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkGfm from "remark-gfm";
import type { Root } from "mdast";

const processor = unified().use(remarkParse).use(remarkGfm);

export function parse(markdown: string): Root {
  return processor.parse(markdown) as Root;
}
```

### 5.3 块级构建器

```typescript
function buildBlocks(nodes: MdastContent[], ctx: BlockContext): Widget[];
```

### 5.4 内联构建器

```typescript
function buildInline(nodes: PhrasingContent[], ctx: InlineContext): TextSpan;
```

## 6. 块级节点 → Widget 映射

| mdast 节点 | 输出 Widget | 细节 |
|------------|-------------|------|
| `paragraph` | `RichText({ text: buildInline(children), selectable: true })` | |
| `heading` | `RichText({ text: headingSpan })` | level ≤ 2 bold；颜色从 theme.colors.primary/secondary 取；不渲染 `#` 前缀 |
| `code` | `Container({ padding: EdgeInsets.only(left:4, right:4), child: RichText(highlighted) })` | Prism.js 高亮，跳过 value.trim() 为空的代码块 |
| `blockquote` | `Container({ padding: EdgeInsets.only(left:2, right:4), decoration: BoxDecoration(border: Border.left(borderColor, 1)), child: Column(buildBlocks(children)) })` | 递归构建子块 |
| `list` | `Column({ children: items.map(buildListItem) })` | |
| `listItem` | `Row({ crossAxisAlignment: "start", children: [RichText(bullet), Expanded(Column(buildBlocks(children)))] })` | 解决多行对齐 |
| `listItem` (nested) | 外层 `Container({ padding: EdgeInsets.only(left: depth*2) })` 包裹 | |
| `table` | `Table({ rows, columnConfigs: "proportional", borderColor, showBorders: true })` | 使用已有 Table Widget |
| `thematicBreak` | `RichText({ text: "---" })` | 3 字符，对齐 amp |
| `html` | `RichText({ text: extractText(parse5(value)) })` | parse5 提取纯文本 |

### 列表标记规则

- 无序列表: `• ` (U+2022)
- 有序列表: `${start + index}. `（支持 ol.start 偏移）
- 任务列表: `[✓] ` / `[ ] `

### 空行控制

使用 mdast position 信息实现 `hasBlankLineBetween(prev, next)`：

```typescript
function hasBlankLineBetween(prev: MdastNode, next: MdastNode): boolean {
  return next.position!.start.line - prev.position!.end.line > 1;
}
```

有空行时在 Widget 间插入 `SizedBox({ height: 1 })`，无空行时紧邻排列。

## 7. 内联节点 → TextSpan 映射

| mdast 节点 | TextSpan 处理 |
|------------|---------------|
| `text` | `TextSpan({ text: value, style })` |
| `strong` | `style.copyWith({ bold: true })` |
| `emphasis` | `style.copyWith({ italic: true })` |
| `delete` | `style.copyWith({ strikethrough: true })` |
| `inlineCode` | `TextSpan({ text: value, style: theme.inlineCode })`，支持 colorTransform |
| `link` | `TextSpan({ text, style: theme.link, url, hyperlinkId: generateId(url, offset) })` |
| `image` | `TextSpan({ text: "[Image: ${alt}]", style: theme.link.copyWith({ italic: true }) })` |

### Hyperlink ID 生成

```typescript
function generateHyperlinkId(url: string, index: number): string {
  // DJB2 hash，对齐 amp 的 eE0()
  let hash = 5381;
  const str = `${url}:${index}`;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash + str.charCodeAt(i)) | 0;
  }
  return `md-${(hash >>> 0).toString(36)}`;
}
```

## 8. 主题系统

### MarkdownThemeData

```typescript
interface MarkdownThemeData {
  colors: {
    primary: Color;
    secondary: Color;
    border: Color;
    foreground: Color;
  };
  text: TextStyle;
  inlineCode: TextStyle;
  codeBlock: { foreground: Color; padding: EdgeInsets };
  link: TextStyle;
  tableBorder: Color;
  syntaxHighlight: SyntaxTheme;
}
```

### InheritedWidget 集成

```typescript
class MarkdownTheme extends InheritedWidget {
  readonly data: MarkdownThemeData;

  static of(context: BuildContext): MarkdownThemeData {
    const widget = context.findAncestorWidgetOfType<MarkdownTheme>();
    return widget?.data ?? defaultMarkdownThemeData();
  }
}
```

对话视图层负责在 Widget 树上方注入 `MarkdownTheme`。

## 9. 流式渲染

- `MarkdownView` 在 `streaming: true` 时：
  1. 过滤尾部未闭合的空段落
  2. 支持 `colorTransform(offset, baseColor)` 用于新 token 入场染色
  3. 每次 content 更新触发 rebuild（全量 parse，mdast 解析开销可忽略）
- 解析器不做增量，每次全量 parse（与 amp 行为一致）

## 10. 依赖变更

### 新增 (`packages/tui/package.json`)

- `unified` ^11
- `remark-parse` ^11
- `remark-gfm` ^4
- `@types/mdast` ^4
- `parse5` ^7

### 移除

- `micromark` 及其 GFM 扩展（若仅用于 markdown-parser）

## 11. 兼容性处理

- `markdown-renderer.ts` 文件保留，类和方法标记 `@deprecated`
- 所有消费方迁移到 `MarkdownView` Widget：
  - `examples/tui-markdown-demo.ts`
  - `examples/tui-chat-demo.ts`
  - 其他引用 `MarkdownRenderer` 的文件

## 12. 验证标准

- [ ] `MarkdownView` 渲染 heading（无 `#` 前缀，h1/h2 有颜色+粗体）
- [ ] 代码块有 left/right padding，Prism.js 语法高亮正常
- [ ] 列表多行对齐（第二行文本对齐到 bullet 之后）
- [ ] 有序列表支持 start 偏移
- [ ] Blockquote 每行都有左边框
- [ ] 嵌套 blockquote 正确递归
- [ ] 表格使用 Table Widget 渲染
- [ ] thematicBreak 渲染为 `---`（3字符）
- [ ] HTML 节点提取纯文本显示
- [ ] 流式模式尾部空段落过滤
- [ ] colorTransform 回调被正确调用
- [ ] hasBlankLineBetween 精确控制块间距
- [ ] 主题通过 BuildContext 获取，支持外部注入

## 13. amp 参考文件索引

| 功能 | amp 文件 | 行号 |
|------|----------|------|
| Z3 (MarkdownBody) Widget | `amp-cli-reversed/modules/1472_tui_components/text_rendering.js` | 1261-1816 |
| Prism.js 高亮 | `amp-cli-reversed/modules/2460_unknown_tE0.js` | 全文件 |
| Token flatten | `amp-cli-reversed/modules/0483_unknown_Sv.js` | 全文件 |
| Token color mapping | `amp-cli-reversed/modules/0480_unknown_vm0.js` | 全文件 |
| Table Widget (JY) | `amp-cli-reversed/modules/1472_tui_components/text_rendering.js` | ~900-1260 |
| hasBlankLineBetween | `amp-cli-reversed/modules/1472_tui_components/text_rendering.js` | ~1300 |
