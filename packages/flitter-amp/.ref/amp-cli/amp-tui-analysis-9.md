# Amp TUI 深度分析 #9: Markdown AST→Widget + 语法高亮 + 代码块渲染

> 基于 Amp CLI v0.0.1774512763 混淆 JS 逆向分析 + flitter-core / flitter-amp 完整源码对比
> 分析范围: Markdown 解析器、AST→Widget 映射、语法高亮引擎、代码块/内联代码/表格/列表/引用块/分隔线渲染、流式更新策略
> 分析日期: 2026-03-29

---

## 1. Amp 实现细节

### 1.1 混淆名映射表

| Amp 混淆名 | 概念 | 调用位置 |
|------------|------|---------|
| `ht` | Markdown Widget（StatelessWidget） | `assistant-message-XkL.js`, `thinking-block-zk.js` |
| `EA$` | Rainbow Markdown（彩虹彩蛋版） | `assistant-message-XkL.js` — "You're absolutely right" 触发 |
| `XkL` | Assistant Message Builder（函数） | `assistant-message-XkL.js` |
| `L0H` | StyleScheme 默认构造函数 | `thinking-block-zk.js` — `L0H(context)` 返回默认样式方案 |
| `ae` | syntaxHighlight 函数 | 文件扩展名→语法着色 |
| `BH` | TextStyle | 混淆源码中广泛使用 |
| `z` | TextSpan | 混淆源码中 `new z(text, style, children)` |
| `dH` | Text Widget | `new dH({text: span})` |
| `s$` | Column | `new s$({crossAxisAlignment, mainAxisSize, children})` |
| `YH` | SizedBox | `new YH({width, height})` |
| `a$` | Padding | `new a$({padding: H$.only({...})})` |
| `VT` | Column (另一个别名) | 用于嵌套 Column |

### 1.2 Markdown 解析器

#### 1.2.1 解析策略

Amp 使用**自定义逐行解析器**（非第三方库如 marked/unified/remark）。从混淆源码推断：

```
ht Widget 接收参数:
  - markdown: string        // Markdown 源文本
  - styleScheme?: object    // 可选样式覆盖（用于 thinking block 的 dim/italic 效果）
  - defaultColor?: Color    // 默认文本颜色
  - key?: Key
```

解析器按行扫描，识别以下块级元素：

1. **代码块**: `` ``` `` 起止（支持语言提示）
2. **标题**: `# ` 到 `#### `（H1-H4）
3. **水平分隔线**: `---`, `***`, `___`
4. **GFM 表格**: `| header | ... |` + `| --- | ... |` 分隔行检测
5. **引用块**: `> ` 前缀（连续行合并）
6. **有序列表**: `\d+\. ` 前缀
7. **无序列表**: `- ` 或 `* ` 前缀
8. **段落**: 兜底，所有不匹配的非空行

#### 1.2.2 内联格式解析

Amp 的内联解析支持以下格式（按优先级排序）：

| 优先级 | 语法 | 语义 |
|--------|------|------|
| 1 | `***text***` | 粗斜体 (bold + italic) |
| 2 | `**text**` | 粗体 |
| 3 | `*text*` | 斜体 |
| 4 | `` `text` `` | 内联代码 |
| 5 | `~~text~~` | 删除线 |
| 6 | `[text](url)` | 超链接 (OSC 8) |

#### 1.2.3 AST 缓存

从 `_g class` 注释和源码逻辑推断，Amp 使用 LRU 缓存（约 100 条）避免重复解析相同的 markdown 文本。流式渲染时内容不断追加，缓存 key = 完整 markdown 字符串。

### 1.3 AST 节点 → Widget 映射

从 `assistant-message-XkL.js` 和 `thinking-block-zk.js` 还原的映射关系：

| AST 节点类型 | Widget 输出 | 样式细节 |
|-------------|------------|---------|
| `heading1` | `Text(bold, primary color)` | 前景 = colorScheme.primary |
| `heading2` | `Text(bold, secondary color)` | 前景 = colorScheme.textSecondary |
| `heading3` | `Text(bold, primary color)` | 与 H1 同色 |
| `heading4` | `Text(bold, secondary color)` | 与 H2 同色 |
| `paragraph` | `Text(inline-formatted spans)` | 前景 = colorScheme.foreground |
| `code-block` | `Column(Text[] per line)` | 语法高亮着色（见 §1.4） |
| `bullet` | `Text("  • " + content)` | 项目符号 = `•` (U+2022), dim |
| `numbered-list` | `Text("  N. " + content)` | 编号 dim, 内容正常色 |
| `blockquote` | `Text("  │ " + content)` per line | 左边框 = `│` (U+2502), info/blue 色 |
| `horizontal-rule` | `Divider(border color)` | 全宽分隔线 |
| `table` | `Column(Text[])` — header + sep + rows | header bold primary, sep `─┼─`, data foreground |
| `inline code` | `TextSpan(bold, yellow)` | Amp: 黄色粗体前景 |
| `bold` | `TextSpan(bold: true)` | 继承父色 |
| `italic` | `TextSpan(italic: true)` | 继承父色 |
| `bold-italic` | `TextSpan(bold + italic)` | 继承父色 |
| `strikethrough` | `TextSpan(strikethrough: true)` | 继承父色 |
| `link` | `TextSpan(underline, primary color, hyperlink: OSC 8)` | 终端超链接 |

### 1.4 语法高亮引擎

#### 1.4.1 引擎类型

Amp 使用**自定义正则表达式 tokenizer**（混淆名 `ae`），不依赖 TextMate 语法或 Tree-sitter。基于文件扩展名检测语言，然后用该语言的规则集逐行 tokenize。

#### 1.4.2 Token 类型

Amp 定义了以下 token 类型，每个对应一个颜色：

| Token 类型 | Dark 默认色 | 匹配内容 |
|-----------|------------|---------|
| `keyword` | `rgb(255,122,198)` (粉红) | 语言关键字 (if, return, class, etc.) |
| `string` | `rgb(241,250,137)` (黄绿) | 字符串字面量 |
| `number` | `rgb(191,149,249)` (紫色) | 数字字面量 |
| `comment` | `rgb(98,109,167)` (暗蓝灰) | 注释 |
| `function` | `rgb(117,219,240)` (青色) | 函数调用 |
| `variable` | `rgb(246,255,245)` (前景色) | 变量标识符 |
| `type` | `rgb(82,250,124)` (绿色) | 类型名 (PascalCase) |
| `operator` | `rgb(246,255,245)` (前景色) | 运算符 |

这 8 个语法色定义在 `AmpSyntaxHighlight` 接口中（参见 TUI-CHATVIEW-SPEC §5.3）。

#### 1.4.3 支持的语言

从 `ae` 函数的扩展名映射推断（与 flitter-core `syntax-highlight.ts` 的 `EXTENSION_MAP` 一致）：

| 语言 | 扩展名 |
|------|--------|
| TypeScript/JavaScript | `.ts`, `.tsx`, `.js`, `.jsx`, `.mjs`, `.cjs` |
| Python | `.py`, `.pyw` |
| Go | `.go` |
| Rust | `.rs` |
| JSON | `.json`, `.jsonc` |
| YAML | `.yaml`, `.yml` |
| Markdown | `.md`, `.mdx` |
| Shell/Bash | `.sh`, `.bash`, `.zsh` |

#### 1.4.4 Tokenizer 算法

逐行处理，对每行：
1. 遍历所有规则，找到最早匹配的 regex
2. 匹配前的文本作为 `default` token
3. 匹配本身作为对应类型 token
4. 从匹配结束位置继续
5. 返回 token 数组

每个 token 映射到 `TextSpan` with `TextStyle({ foreground: colorForTokenType(type, config) })`。

### 1.5 代码块渲染

```
_renderCodeBlock(content, language, context):
  1. 如果 language 存在 && context 中有 AppTheme:
     a. 构造 syntheticPath = `file.${language}` (如 `file.typescript`)
     b. 调用 detectLanguage(syntheticPath) 检测语言
     c. 如果识别成功:
        调用 syntaxHighlight(content, config, syntheticPath)
        → 返回 TextSpan[] (每行一个)
        → 每行包装为 Text Widget
        → 所有行放入 Column
     d. 如果不识别: 回退到步骤 2
  2. 回退: 整个内容作为单个 Text(foreground: fgColor, background: bgColor)
```

关键点：
- Amp 的代码块**没有背景色容器**（Container/Box），也没有左侧行号
- 直接用彩色 TextSpan 逐行渲染
- 语法高亮 fallback = 纯前景色文本

### 1.6 内联代码渲染

Amp 内联代码使用**黄色粗体**（而非背景色）：

```
segment.code === true → TextStyle({ bold: true, foreground: Color.yellow })
```

没有背景色高亮，这是 TUI 环境的务实选择。

### 1.7 链接渲染 — OSC 8

```
segment.linkUrl → TextSpan({
  text: linkText,
  style: { foreground: primary/blue, underline: true },
  hyperlink: { uri: url }
})
```

Amp 在终端中输出 OSC 8 转义序列：`ESC]8;params;URI ST`，支持终端原生超链接（iTerm2, WezTerm, Kitty 等）。`TextSpanHyperlink` 支持可选的 `id` 参数用于跨行链接识别。

### 1.8 Thinking Block 内的特殊 Markdown 样式

从 `thinking-block-zk.js` 可以看到 Amp 为 thinking block 创建了特殊的 `styleScheme`：

```javascript
styleScheme = {
  ...L0H(context),           // 默认 style scheme
  text: { color: foreground, dim: true, italic: true },
  inlineCode: { color: foreground, dim: true, italic: true, bold: true },
  codeBlock: { color: foreground, dim: true, italic: true },
  link: { color: foreground, dim: true, italic: true, underline: true },
}
```

这意味着 Amp 的 `ht` (Markdown Widget) 支持**可定制的 styleScheme**，允许调用方覆盖各类型的默认样式。用于 thinking block 时，所有文本变为 dim + italic 以视觉区分思维过程与正式回答。

### 1.9 流式 Markdown 渲染

Amp 的 assistant 消息通过 SSE 流式接收。渲染策略：

1. 每次收到新的 token，追加到 `assistant_message` 文本
2. 触发 `setState()` → rebuild
3. Markdown Widget 的 `build()` 重新解析**完整**的 markdown 文本
4. LRU 缓存命中（如果文本未变）→ 直接使用缓存的 MarkdownBlock[]
5. 缓存未命中 → 重新解析（流式追加时每次都是新字符串，所以每帧都重新解析）
6. 产生新的 Widget 子树 → 框架 diff 对比更新

**不是增量解析**：每次 rebuild 都从头解析整个 markdown。缓存的主要价值在于非流式场景（如滚动回看时 Widget 重建但内容不变）。

### 1.10 嵌套 Markdown

在 `GenericToolCard` 中，工具输出如果不是 diff 格式，也用 `Markdown` Widget 渲染：

```
GenericToolCard.build():
  if (diff detected):
    DiffView({ diff })
  else if (outputText):
    Markdown({ markdown: outputText })
```

这意味着工具的 stdout 输出如果包含 markdown 格式，也会被解析渲染。`TaskTool`（子代理）的嵌套输出同样可能包含 markdown。

---

## 2. Flitter 实现细节

### 2.1 Markdown 解析器

**文件**: `flitter-core/src/widgets/markdown.ts`（823 行）

#### 2.1.1 解析策略

flitter-core 完全复刻了 Amp 的自定义逐行解析器。`Markdown._parseMarkdownNoCache()` 按行扫描：

```typescript
static _parseMarkdownNoCache(markdown: string): MarkdownBlock[] {
  const lines = markdown.split('\n');
  // ... 逐行状态机，优先级顺序:
  // 1. Code block (``` ... ```)
  // 2. Heading (#### → ### → ## → #)
  // 3. Horizontal rule (---, ***, ___)
  // 4. GFM Table (检测下一行是否为分隔行)
  // 5. Blockquote (> prefix)
  // 6. Numbered list (\d+\. )
  // 7. Bullet list (- or * prefix)
  // 8. Empty line (skip)
  // 9. Paragraph (fallback)
}
```

#### 2.1.2 LRU 缓存

```typescript
class MarkdownCache {
  private _cache: Map<string, MarkdownBlock[]> = new Map();
  private _order: string[] = [];
  private _maxSize: number = 100;  // 与 Amp 一致
  // LRU: get 时移到末尾, set 时驱逐最旧
}
const _astCache = new MarkdownCache(100);
```

- 支持 `invalidateCache(key)` 和 `clearCache()` 静态方法
- `enableCache` 构造参数可关闭缓存（默认 true）

#### 2.1.3 内联解析

```typescript
static parseInline(text: string): InlineSegment[] {
  // 优先级: ***boldItalic*** > **bold** > *italic* > ~~strike~~ > `code` > [link](url) > plain
  // 逐字符前进，正则贪心匹配
}
```

返回 `InlineSegment[]`，每个 segment 携带 `bold/italic/code/linkUrl/strikethrough/boldItalic` 标记。

### 2.2 AST → Widget 映射

**核心方法**: `_renderBlock(block, themeData, context)`

| 块类型 | Widget 输出 | 样式来源 |
|--------|------------|---------|
| `heading1` | `Text(TextSpan, bold, primary)` | `themeData?.primary` |
| `heading2` | `Text(TextSpan, bold, textSecondary)` | `themeData?.textSecondary` |
| `heading3` | `Text(TextSpan, bold, primary)` | 与 H1 同色 |
| `heading4` | `Text(TextSpan, bold, textSecondary)` | 与 H2 同色 |
| `paragraph` | `Text(TextSpan with inline children)` | `themeData?.text` |
| `code-block` | `Column(Text[])` with syntax highlight | `AppTheme.syntaxHighlight` |
| `bullet` | `Text("  • " + content spans)` | bullet = `textSecondary`, content = `text` |
| `numbered-list` | `Text("  N. " + content spans)` | number = brightBlack dim, content = `text` |
| `blockquote` | `Text("  │ " + content)` or `Column(Text[])` | border = `info`/blue, content = brightBlack |
| `horizontal-rule` | `Divider({ color: border })` | `themeData?.border` |
| `table` | `Column(Text[])` — header + separator + rows | header = primary bold, sep = border, rows = text |

**外层容器**: `Column({ crossAxisAlignment: 'stretch', mainAxisSize: 'min', children })`

### 2.3 代码块渲染

```typescript
_renderCodeBlock(content, themeData, language, context): Widget {
  if (context && language) {
    const appThemeData = AppTheme.maybeOf(context);
    if (appThemeData) {
      const syntheticPath = `file.${language}`;
      const detectedLang = detectLanguage(syntheticPath);
      if (detectedLang) {
        const highlightedLines = syntaxHighlight(content, appThemeData.syntaxHighlight, syntheticPath);
        return new Column({ children: highlightedLines.map(span => new Text({ text: span })) });
      }
    }
  }
  // Fallback: single Text with bg + fg color
  return new Text({ text: new TextSpan({ text: content, style: { foreground: fgColor, background: bgColor } }) });
}
```

关键点：
- 语法高亮路径: language hint → `file.${lang}` → `detectLanguage()` → `syntaxHighlight()`
- Fallback 路径: `Text` with background color（Amp 没有 background color fallback）

### 2.4 语法高亮引擎

**文件**: `flitter-core/src/widgets/syntax-highlight.ts`（473 行）

#### 2.4.1 架构

```
syntaxHighlight(content, config, filePath) → TextSpan[]
  1. detectLanguage(filePath) → LanguageName | undefined
  2. content.split('\n') → lines
  3. 每行: tokenizeLine(line, rules) → Token[]
  4. 每个 Token → TextSpan({ text, style: { foreground: colorForTokenType(type, config) } })
  5. 多 Token 行 → TextSpan({ children: [...] })
```

#### 2.4.2 支持语言（8 种）

| 语言 | 规则集常量 | 规则数 |
|------|-----------|--------|
| TypeScript/JS | `TS_JS_RULES` | 12 规则 |
| Python | `PYTHON_RULES` | 12 规则 |
| Go | `GO_RULES` | 11 规则 |
| Rust | `RUST_RULES` | 13 规则 |
| JSON | `JSON_RULES` | 4 规则 |
| YAML | `YAML_RULES` | 8 规则 |
| Markdown | `MARKDOWN_RULES` | 12 规则 |
| Shell/Bash | `SHELL_RULES` | 10 规则 |

#### 2.4.3 Token 类型（13 种）

```typescript
type TokenType =
  | 'keyword' | 'string' | 'comment' | 'number' | 'type'
  | 'function' | 'operator' | 'punctuation' | 'variable'
  | 'property' | 'tag' | 'attribute' | 'default';
```

#### 2.4.4 颜色映射

`SyntaxHighlightConfig` 为每个 token 类型指定一个 `Color`。默认配置来自 `AppTheme.defaultTheme()`：

| Token | 默认 ANSI 色 | Amp Dark RGB |
|-------|-------------|-------------|
| keyword | blue | `rgb(255,122,198)` |
| string | green | `rgb(241,250,137)` |
| comment | brightBlack | `rgb(98,109,167)` |
| number | yellow | `rgb(191,149,249)` |
| type | magenta | `rgb(82,250,124)` |
| function | cyan | `rgb(117,219,240)` |
| operator | defaultColor | `rgb(246,255,245)` |
| variable | defaultColor | `rgb(246,255,245)` |
| property | defaultColor | (同 foreground) |
| punctuation | defaultColor | (同 foreground) |
| tag | red | (N/A) |
| attribute | yellow | (N/A) |
| default | defaultColor | `rgb(246,255,245)` |

### 2.5 内联代码渲染

```typescript
if (segment.code) {
  style = style.copyWith({ bold: true, foreground: Color.yellow });
}
```

与 Amp 一致：黄色粗体，无背景色。

### 2.6 链接渲染

```typescript
if (segment.linkUrl) {
  const linkColor = themeData?.primary ?? Color.rgb(97, 175, 239);
  style = style.copyWith({ foreground: linkColor, underline: true });
  return new TextSpan({
    text: segment.text,
    style,
    hyperlink: { uri: segment.linkUrl },
  });
}
```

支持 OSC 8 终端超链接：
- `TextSpanHyperlink` 接口: `{ uri: string; id?: string }`
- Renderer 输出: `ESC]8;params;URI ST`
- 鼠标悬停时自动切换光标为 pointer（通过 RenderText + MouseManager）

### 2.7 表格渲染

```typescript
_renderTable(block, themeData): Widget {
  // 1. 计算列宽: max(header[c].length, row[c].length) for each column
  // 2. Header 行: padEnd(colWidth) + " │ " 分隔, primary bold
  // 3. Separator 行: "─" × colWidth + "─┼─" 连接, border color
  // 4. Data 行: padEnd(colWidth) + " │ " 分隔, text color
  // 5. 整体 Column
}
```

Unicode box-drawing 字符:
- 列分隔: `│` (U+2502)
- 水平线: `─` (U+2500)
- 交叉: `┼` (U+253C)

### 2.8 DiffView

**文件**: `flitter-core/src/widgets/diff-view.ts`（873 行）

核心特性：
- 自带 Myers diff 算法（`_myersDiff`），可从 oldText + newText 生成 unified diff
- 解析 unified diff 格式（`parseDiff`）
- 行号显示（可选）
- Word-level diff 高亮（相邻的 deletion+addition 行对比）
- 语法高亮整合（addition/context 行可带语法着色）
- Context 行过滤（仅显示变化附近 N 行）

### 2.9 flitter-amp 中的使用位置

| 使用位置 | 文件 | 用法 |
|---------|------|------|
| Assistant 消息 | `chat-view.ts:273` | `new Markdown({ markdown: text })` |
| 工具输出 | `generic-tool-card.ts:103` | `new Markdown({ markdown: outputText })` |
| Diff 输出 | `generic-tool-card.ts:94` | `new DiffView({ diff })` |
| Edit 工具 | `edit-file-tool.ts` | `new DiffView({ diff, filePath })` |

### 2.10 缺失：StyleScheme 覆盖

Amp 的 `ht` Widget 支持 `styleScheme` 参数，允许 thinking block 覆盖 text/inlineCode/codeBlock/link 的样式。flitter-core 的 `Markdown` Widget **不支持** styleScheme 覆盖——只能通过 Theme/AppTheme InheritedWidget 间接影响。

---

## 3. 差异对比表

| 特性 | Amp 实现 | Flitter 实现 | 差异等级 | 说明 |
|------|---------|-------------|---------|------|
| **Markdown 解析器** | 自定义逐行解析器 | 自定义逐行解析器 (完全复刻) | 🟢 一致 | 解析逻辑、优先级、边界处理均已对齐 |
| **LRU AST 缓存** | 100 条 LRU 缓存 | 100 条 LRU 缓存 (`MarkdownCache`) | 🟢 一致 | 支持 invalidate / clear |
| **块类型种类** | H1-H4, p, code, bullet, numbered, blockquote, hr, table | 同 Amp（11 种 MarkdownBlockType） | 🟢 一致 | |
| **内联格式种类** | bold, italic, bold-italic, code, strikethrough, link | 同 Amp (6 种 InlineSegment) | 🟢 一致 | |
| **Heading 颜色** | H1/H3=primary, H2/H4=textSecondary, bold | H1/H3=primary, H2/H4=textSecondary, bold | 🟢 一致 | |
| **代码块：语法高亮路径** | language → `file.${lang}` → tokenize → TextSpan[] | 同 Amp 逻辑 | 🟢 一致 | detectLanguage + syntaxHighlight |
| **代码块：fallback** | 纯前景色文本 (无 bg) | `TextSpan(fg + bg color)` | 🟡 轻微差异 | flitter fallback 加了 background 色，Amp 没有 |
| **代码块：行号** | 无行号 | 无行号 | 🟢 一致 | DiffView 有行号，Markdown 的 code block 无 |
| **代码块：Container 包裹** | 无 Container/Border | 无 Container/Border | 🟢 一致 | |
| **内联代码样式** | bold + yellow foreground | bold + Color.yellow foreground | 🟢 一致 | |
| **语法高亮引擎类型** | 自定义正则 tokenizer | 自定义正则 tokenizer (完全复刻) | 🟢 一致 | |
| **支持语言数量** | 8 种 (TS/JS, Py, Go, Rust, JSON, YAML, MD, Shell) | 8 种 (同 Amp) | 🟢 一致 | |
| **语法色数量** | 8 色 (keyword, string, number, comment, function, variable, type, operator) | 13 色 (增加 punctuation, property, tag, attribute, default) | 🟡 扩展 | flitter 比 Amp 多 5 个 token 类型色，超集 |
| **语法色 RGB 值** | RGB 主题色 (如 keyword=`rgb(255,122,198)`) | ANSI named 色 (如 keyword=blue) | 🟡 差异 | flitter 默认用 ANSI named 色，需要 AmpThemeProvider 注入 RGB 色 |
| **链接：OSC 8** | `hyperlink: { uri, id }` | `hyperlink: { uri, id? }` | 🟢 一致 | TextSpanHyperlink 接口完全对齐 |
| **链接：颜色** | primary color + underline | primary color + underline | 🟢 一致 | |
| **Bullet：符号** | `•` (U+2022), 2 格缩进 | `•` (U+2022), 2 格缩进 | 🟢 一致 | |
| **Bullet：嵌套缩进** | 不支持多级嵌套 | 不支持多级嵌套 | 🟢 一致 | 两者都只处理一级列表 |
| **有序列表：编号** | `  N. ` 前缀, dim | `  N. ` 前缀, brightBlack dim | 🟢 一致 | |
| **Blockquote：左边框** | `│` (U+2502), info/blue 色 | `│` (U+2502), info/blue 色 | 🟢 一致 | |
| **Blockquote：内容色** | dim foreground | brightBlack (dim) | 🟢 一致 | |
| **Blockquote：多行处理** | 每行独立 border + content | Column(Text[]) 每行独立 border | 🟢 一致 | |
| **水平分隔线** | Divider widget | Divider widget | 🟢 一致 | |
| **表格：列宽计算** | max(header, data) | max(header, data) | 🟢 一致 | |
| **表格：分隔字符** | `─`, `│`, `┼` | `─`, `│`, `┼` | 🟢 一致 | Unicode box-drawing |
| **表格：对齐** | GFM `:---:` 语法检测 | GFM 对齐标记**解析**但**未应用** | 🟡 差异 | 解析时匹配 `:---:` 但 padEnd 始终左对齐 |
| **Markdown Column 属性** | `crossAxisAlignment:'stretch', mainAxisSize:'min'` | 同 Amp | 🟢 一致 | 测试用例验证 |
| **StyleScheme 覆盖** | `ht({ styleScheme: {...} })` 支持样式覆盖 | **不支持** | 🔴 缺失 | Thinking block 中的 dim/italic 样式无法通过 Markdown 传入 |
| **Rainbow 彩蛋** | `EA$` — "You're absolutely right" 触发彩虹色 | 未实现 | 🟡 缺失 | 非核心功能 |
| **流式增量渲染** | 全量重新解析 + LRU 缓存 | 全量重新解析 + LRU 缓存 | 🟢 一致 | 两者均非增量解析 |
| **嵌套 Markdown** | 工具输出 / 子代理输出内可嵌套 | GenericToolCard 使用 Markdown 渲染输出 | 🟢 一致 | |
| **DiffView 整合** | 工具输出自动检测 diff 格式 | extractDiff() 检测 `@@` + `---/+++` | 🟢 一致 | |
| **Word-level diff** | 有（相邻 deletion+addition 行对比高亮） | 有 (`computeWordDiff` + Myers 算法) | 🟢 一致 | |
| **Theme 系统** | 双 Theme: `YL`(base) + `_$`(app) → `Qt`(combined) | 双 Theme: `Theme`(base) + `AppTheme`(app) + `AmpThemeProvider` | 🟢 等价 | AmpThemeProvider 桥接到 Theme/AppTheme |
| **Strikethrough 支持** | TextStyle 支持 strikethrough | TextStyle 支持 strikethrough | 🟢 一致 | SGR code 9 |
| **Image 渲染** | 不支持 (TUI 环境) | 不支持 (TUI 环境) | 🟢 一致 | Markdown `![alt](url)` 不渲染图片 |

---

## 4. 差异修复建议（按优先级排序）

### P0 — 功能缺失，影响视觉一致性

#### 4.1 StyleScheme 覆盖机制

**现状**: Amp 的 `ht` (Markdown) Widget 支持 `styleScheme` 参数，允许 thinking block 传入自定义样式（dim + italic），使思维过程的 markdown 文本在视觉上与正式回答区分。flitter-core 的 Markdown Widget 只接受 `markdown`, `textAlign`, `maxLines`, `overflow`, `enableCache`，无法从外部覆盖内部的 text/code/link 样式。

**影响**: ThinkingBlock 中使用的 Markdown 无法正确显示 dim + italic 效果。当前 thinking block 的文本样式可能与 assistant message 无区别。

**建议**:

为 Markdown 构造函数添加可选的 `styleOverrides` 参数：

```typescript
interface MarkdownStyleOverrides {
  text?: TextStyle;
  inlineCode?: TextStyle;
  codeBlock?: TextStyle;
  link?: TextStyle;
  heading?: TextStyle;
}

class Markdown extends StatelessWidget {
  readonly styleOverrides?: MarkdownStyleOverrides;
  // ...
}
```

在 `_segmentToSpan`, `_renderParagraph`, `_renderCodeBlock`, `_renderHeading` 中检查并应用 override。

**工作量**: ~30 行代码修改 + ~20 行测试

### P1 — 轻微视觉差异

#### 4.2 代码块 fallback 去除背景色

**现状**: flitter-core 的 `_renderCodeBlock` fallback 路径（语言不识别时）使用 `background: bgColor`：

```typescript
const style = new TextStyle({
  foreground: fgColor,
  background: bgColor,  // ← Amp 没有这个
});
```

**影响**: 不识别的语言的代码块在 flitter 中有背景色，在 Amp 中没有。

**建议**: 移除 fallback 中的 `background` 属性，与 Amp 一致使用纯前景色。

**工作量**: 2 行代码修改

#### 4.3 表格列对齐

**现状**: GFM 表格的 `:---:` 对齐标记已在 separator regex 中被解析匹配（flitter 可以识别 `:---:`, `:---`, `---:`），但渲染时 `padEnd()` 始终做左对齐，未实现居中和右对齐。

**影响**: 使用 `:---:` (center) 或 `---:` (right) 的表格在终端中仍为左对齐。

**建议**: 
1. 解析 separator 行时提取对齐信息到 `MarkdownBlock.tableAlignments?: ('left'|'center'|'right')[]`
2. 渲染时根据对齐类型使用 `padStart/padEnd/pad居中` 策略

**工作量**: ~30 行代码修改

#### 4.4 语法高亮色从 ANSI → RGB

**现状**: `AppTheme.defaultTheme()` 使用 ANSI named 色（`Color.blue`, `Color.green` 等），而 Amp 的主题使用 RGB 色（如 keyword=`rgb(255,122,198)`）。当 flitter-amp 使用 `AmpThemeProvider` 时，会注入 `AmpSyntaxHighlight` RGB 色，但 `AppTheme.defaultTheme()` 仍是 ANSI 色。

**影响**: 如果代码路径未正确桥接 AmpThemeProvider → AppTheme，语法高亮色可能回退到 ANSI named 色而非 Amp RGB 色。

**建议**: 确认 `AmpThemeProvider` 在 Widget 树中正确注入了 `AppTheme`（或在 Markdown._renderCodeBlock 中同时检查 `AmpThemeProvider.maybeOf(context)` 作为备选色来源）。

**工作量**: 需审计桥接逻辑，可能 ~10 行修改

### P2 — 非核心功能

#### 4.5 Rainbow 彩蛋 (EA$)

**现状**: Amp 检测 assistant 消息是否以 "You're absolutely right" 开头，如果是则使用 `EA$` (Rainbow Markdown) 替代普通 `ht` (Markdown) 渲染，文本显示彩虹色动画。

**影响**: 纯装饰性功能，不影响核心用户体验。

**建议**: 可在 `buildAssistantMessage()` 中检测特定前缀，应用彩虹 TextStyle（从 Perlin noise 色或循环色生成）。优先级最低。

**工作量**: ~50 行代码

#### 4.6 更多语言支持

**现状**: 8 种语言覆盖了主流场景，但 Amp 的实际用户可能会遇到 C/C++, Java, Ruby, PHP, Swift, Kotlin 等语言的代码块。

**影响**: 不支持的语言会 fallback 到纯色文本，功能可用但无高亮。

**建议**: 按需添加更多语言规则集。每种语言约 10-15 条正则规则。

**工作量**: 每种语言 ~30 行

---

## 附录 A: 完整渲染管线图

```
Markdown 文本
    │
    ▼
Markdown._parseMarkdownNoCache()        ← 逐行状态机
    │ [缓存命中则跳过]
    ▼
MarkdownBlock[]                          ← AST (扁平块数组)
    │
    ├─ heading1-4 → _renderHeading()
    │   └→ Text(TextSpan(bold, primary/secondary, inline-parsed children))
    │
    ├─ paragraph → _renderParagraph()
    │   └→ Text(TextSpan(children: InlineSegment[] → TextSpan[]))
    │
    ├─ code-block → _renderCodeBlock()
    │   ├─ [语言已知] syntaxHighlight() → Column(Text[])
    │   └─ [语言未知] Text(TextSpan(fg, bg))
    │
    ├─ bullet → _renderBullet()
    │   └→ Text("  • " + inline-parsed content)
    │
    ├─ numbered-list → _renderNumberedList()
    │   └→ Text("  N. " + inline-parsed content)
    │
    ├─ blockquote → _renderBlockquote()
    │   └→ [single line] Text("  │ " + content)
    │   └→ [multi line]  Column(Text("  │ " + line)[])
    │
    ├─ horizontal-rule → _renderHorizontalRule()
    │   └→ Divider({ color: border })
    │
    └─ table → _renderTable()
        └→ Column(
            Text(header, bold primary),
            Text(separator, border),
            Text(row, text)[],
           )
    │
    ▼
Column(crossAxisAlignment:'stretch', mainAxisSize:'min', children: Widget[])
```

## 附录 B: 语法高亮 Token 流水线

```
源代码字符串
    │
    ▼
syntaxHighlight(content, config, filePath)
    │
    ├── detectLanguage(filePath)    ← 文件扩展名 → LanguageName
    │   └── EXTENSION_MAP['.ts'] → 'typescript'
    │
    ├── content.split('\n')         ← 按行拆分
    │
    └── lines.map(line => {
          tokens = tokenizeLine(line, LANGUAGE_RULES[lang])
          ├── 遍历 rules，找最早匹配的 regex
          ├── 未匹配部分 → { type: 'default' }
          └── 匹配部分 → { type: rule.type }

          tokens.map(token =>
            TextSpan({
              text: token.text,
              style: { foreground: config[token.type] }
            })
          )
        })
    │
    ▼
TextSpan[] (每行一个 TextSpan，包含子 TextSpan 或单独 TextSpan)
```

## 附录 C: 测试覆盖矩阵

| 测试文件 | 用例数 | 覆盖范围 |
|---------|-------|---------|
| `markdown.test.ts` | ~50 | 块解析(H1-H4, bullet, numbered, code, paragraph, table, blockquote, hr)、内联解析(bold, italic, bold-italic, strikethrough, code, link)、缓存(LRU, invalidate, clear)、边界(空输入, 无闭合code block, heading无空格) |
| `syntax-highlight.test.ts` | ~50 | 语言检测(8种)、每语言关键token着色、自定义色应用、边界(长行, 特殊字符, 空内容, 多行) |
| `markdown-rendering.test.ts` | 5 | Column 属性(crossAxisAlignment, mainAxisSize)、空 markdown 处理 |

**总计**: ~105 测试用例覆盖 Markdown + 语法高亮子系统。
