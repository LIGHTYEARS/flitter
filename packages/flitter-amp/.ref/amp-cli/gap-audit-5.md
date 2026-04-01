# Gap 审计报告 #5: 文本渲染

## 审计范围

本审计覆盖 flitter 文本渲染子系统的所有核心模块，对比 Amp CLI 的实现行为：

- **RenderText**（`text.ts`）— 文本测量、换行、截断、绘制管线
- **wcwidth**（`wcwidth.ts`）— Unicode 终端列宽计算
- **TextStyle**（`text-style.ts`）— 不可变样式描述
- **TextSpan**（`text-span.ts`）— 富文本树结构
- **Markdown**（`markdown.ts`）— Markdown 解析器、AST→Widget、内联格式
- **语法高亮**（`syntax-highlight.ts`）— 正则 tokenizer、语言支持、多行状态
- **DiffView**（`diff-view.ts`）— Unified diff 渲染、word-level diff

**参考分析文件**：
- `amp-tui-analysis-8.md`（RenderText / wcwidth / emoji / 文本对齐）
- `amp-tui-analysis-9.md`（Markdown / 语法高亮 / 代码块 / 表格 / DiffView）

**已有 .gap 文件**：
- `.gap/21-gfm-table-cjk-width.md`
- `.gap/37-markdown-inline-nesting.md`
- `.gap/69-syntax-highlight-languages.md`
- `.gap/70-multiline-syntax-support.md`

---

## Gap 清单

### GAP-5-001: Markdown StyleScheme 覆盖机制缺失
- **优先级**: P0
- **影响范围**: `flitter-core/src/widgets/markdown.ts`，影响 thinking block 渲染
- **Amp 行为**: Amp 的 `ht` (Markdown Widget) 接受 `styleScheme` 参数，允许调用方覆盖 text / inlineCode / codeBlock / link / heading 的样式。Thinking block 使用此机制传入 `{ dim: true, italic: true }` 样式，使思维过程文本在视觉上与正式回答区分。
- **Flitter 现状**: Markdown 构造函数仅接受 `{ markdown, textAlign, maxLines, overflow, enableCache }`，无 styleOverrides / styleScheme 参数。Thinking block 中渲染的 Markdown 无法注入 dim + italic 样式覆盖，视觉上与 assistant message 无法区分。
- **已有 .gap 引用**: 无（新发现）
- **建议修复方向**: 为 `Markdown` 构造函数添加可选的 `styleOverrides?: MarkdownStyleOverrides` 参数（包含 `text?`, `inlineCode?`, `codeBlock?`, `link?`, `heading?` 五个 `TextStyle` 字段）。在 `_segmentToSpan`、`_renderParagraph`、`_renderCodeBlock`、`_renderHeading` 中检查并 merge override 样式。约 30 行代码修改。

### GAP-5-002: 代码块 Fallback 路径多余的背景色
- **优先级**: P1
- **影响范围**: `flitter-core/src/widgets/markdown.ts` L788-792
- **Amp 行为**: 当语言不被识别时，代码块以纯前景色文本渲染，**无背景色**。
- **Flitter 现状**: Fallback 路径使用 `new TextStyle({ foreground: fgColor, background: bgColor })`，额外添加了 `background` 属性。不识别的语言代码块会显示背景色块，与 Amp 不一致。
- **已有 .gap 引用**: 无（新发现）
- **建议修复方向**: 移除 fallback 中的 `background: bgColor`，改为 `new TextStyle({ foreground: fgColor })`。2 行代码修改。

### GAP-5-003: GFM 表格列对齐标记未实际应用
- **优先级**: P1
- **影响范围**: `flitter-core/src/widgets/markdown.ts`，`_renderTable` 方法
- **Amp 行为**: GFM 表格支持 `:---:` (居中) 和 `---:` (右对齐) 语法标记，Amp 的渲染器会解析并应用对齐。
- **Flitter 现状**: Markdown 解析器中的 separator regex 能够匹配 `:---:` / `:---` / `---:` 对齐标记，但 `_renderTable` 渲染时始终使用 `padEndDisplayWidth()`（左对齐），未从 separator 行提取对齐信息，居中/右对齐表格仍显示为左对齐。`MarkdownBlock` 接口中也没有 `tableAlignments` 字段。
- **已有 .gap 引用**: 无（新发现）
- **建议修复方向**: (1) 解析 separator 行时提取对齐信息到 `MarkdownBlock.tableAlignments?: ('left'|'center'|'right')[]`；(2) 渲染时根据对齐类型使用不同的 pad 策略：left = padEnd, right = padStart, center = 左右均分空格。约 30 行修改。

### GAP-5-004: RenderText 超链接未传递到 Cell
- **优先级**: P2
- **影响范围**: `flitter-core/src/widgets/text.ts` paint 方法，`flitter-core/src/scheduler/paint-context.ts` drawChar 签名
- **Amp 行为**: Amp 的 RenderText 通过 screen 直接操作 `cell.hyperlink` 字段，使 OSC 8 超链接转义序列能正确输出。
- **Flitter 现状**: `RenderText.paint()` 使用 `ctx.drawChar(col, row, char, cellStyle)` 逐字符绘制，但 `drawChar` 签名中没有 `hyperlink` 参数。虽然 `_characterInteractions` 缓存中有 hyperlink 信息，但不会传递到 `ScreenBuffer` 的 `Cell.hyperlink`。通过 `RenderText` 直接渲染的超链接文本不会在终端生成 OSC 8 序列。注：Markdown widget 走 `drawTextSpan` 路径时可正确传递超链接，此问题仅影响 RenderText 直接渲染场景。
- **已有 .gap 引用**: 无（新发现）
- **建议修复方向**: 方案 A — 扩展 drawChar 签名添加可选 `hyperlink?` 参数；方案 B — 在 RenderText.paint 中通过 PaintContext 暴露 `setHyperlink(x, y, uri)` 方法。

### GAP-5-005: _emojiWidthSupported 标志未实际使用
- **优先级**: P2
- **影响范围**: `flitter-core/src/widgets/text.ts` L232-247, performLayout/paint
- **Amp 行为**: Amp 也是逐 codepoint 计算 emoji 宽度，依赖终端 mode 2027 处理 ZWJ 序列。两者行为一致。但 Amp 没有 `_emojiWidthSupported` 这个预留标志。
- **Flitter 现状**: `_emojiWidthSupported` 标志已定义，`updateEmojiSupport()` 方法可更新并触发 `markNeedsLayout()`，但 `performLayout()` 和 `paint()` 中完全未使用此标志调整 emoji 宽度计算。标志变为"死代码"—— 调用 `updateEmojiSupport('wide')` 会触发不必要的 re-layout 但不改变任何输出。
- **已有 .gap 引用**: 无（新发现）
- **建议修复方向**: 短期方案 — 在 `performLayout`/`paint` 中当 `_emojiWidthSupported === true` 时，识别 emoji ZWJ 序列并将整个序列视为 width 2。长期方案 — 需要 grapheme cluster 级别的宽度计算。当前与 Amp 行为一致，可标记为 P2 低优先级。

### GAP-5-006: _getLines() 在 performLayout 和 paint 中双重调用
- **优先级**: P2
- **影响范围**: `flitter-core/src/widgets/text.ts` performLayout + paint
- **Amp 行为**: Amp 的 `gU0` 同样存在此问题（每帧遍历 TextSpan 树两次），两者行为一致。
- **Flitter 现状**: `performLayout()` 和 `paint()` 各自独立调用 `_getLines()`，每次重新遍历 TextSpan 树并构建字符数组。对大文本每帧 TextSpan 遍历开销翻倍。
- **已有 .gap 引用**: 无（新发现，但与 Amp 一致，为性能优化项）
- **建议修复方向**: 在 `performLayout` 中缓存 `_cachedDisplayLines`，在 `paint` 中复用缓存。注意缓存失效需与 `markNeedsLayout` 同步。

### GAP-5-007: Markdown 嵌套列表不支持
- **优先级**: P2
- **影响范围**: `flitter-core/src/widgets/markdown.ts`，bullet / numbered-list 渲染
- **Amp 行为**: Amp 同样不支持多级嵌套列表，只处理一级列表。两者一致。
- **Flitter 现状**: 解析器使用 `/^[\-\*]\s+/` 检测 bullet，不识别缩进层级。嵌套列表（如 `  - sub-item`）会被当做段落文本处理。
- **已有 .gap 引用**: 无（与 Amp 一致，非差异 gap，但为功能完整性缺口）
- **建议修复方向**: 当前与 Amp 行为一致，标记为低优先级。如需支持，需修改解析器检测缩进级别并在渲染时增加相应缩进。

### GAP-5-008: 语法高亮 Amp RGB 主题色 vs ANSI Named 色桥接
- **优先级**: P1
- **影响范围**: `flitter-core/src/widgets/app-theme.ts` defaultTheme，`flitter-amp` AmpThemeProvider 桥接
- **Amp 行为**: 语法高亮使用精确 RGB 色值（如 keyword=`rgb(255,122,198)` 粉红、string=`rgb(241,250,137)` 黄绿、comment=`rgb(98,109,167)` 暗蓝灰等 8 色）。
- **Flitter 现状**: `AppTheme.defaultTheme()` 使用 ANSI named 色（keyword=blue, string=green 等）。当 `AmpThemeProvider` 正确注入时会使用 RGB 色，但如果桥接链路不完整（如 Markdown 只检查 `AppTheme.maybeOf(context)` 而非同时检查 `AmpThemeProvider`），可能回退到 ANSI 色，导致语法高亮色与 Amp 不一致。
- **已有 .gap 引用**: 无（新发现）
- **建议修复方向**: 审计 `AmpThemeProvider` → `AppTheme` 桥接路径，确保 Widget 树中 Markdown code block 渲染时总能获取到 AmpSyntaxHighlight RGB 色。需审查约 10 行桥接逻辑。

### GAP-5-009: Rainbow 彩蛋 Markdown (EA$) 未实现
- **优先级**: P2
- **影响范围**: `flitter-amp` 层
- **Amp 行为**: 当 assistant 消息以 "You're absolutely right" 开头时，使用 `EA$`（Rainbow Markdown）替代普通 `ht`（Markdown），文本显示彩虹色效果。
- **Flitter 现状**: 未实现彩虹彩蛋。纯装饰性功能。
- **已有 .gap 引用**: 无（新发现）
- **建议修复方向**: 在 `buildAssistantMessage()` 中检测特定前缀，应用彩虹 TextStyle。优先级最低，约 50 行代码。

### GAP-5-010: Rust 嵌套块注释深度追踪缺失
- **优先级**: P2
- **影响范围**: `flitter-core/src/widgets/syntax-highlight.ts` RUST_MULTILINE_RULES
- **Amp 行为**: Amp 同样不追踪嵌套深度（简化处理），两者一致。
- **Flitter 现状**: Rust 支持嵌套块注释（`/* /* inner */ outer */`），但当前多行 tokenizer 在遇到第一个 `*/` 时即关闭 region，对嵌套注释高亮不正确。`.gap/70-multiline-syntax-support.md` Open Question #1 已记录此问题。
- **已有 .gap 引用**: `.gap/70-multiline-syntax-support.md` §7.1
- **建议修复方向**: 为 `LineState` 添加 `nestingDepth: number` 字段，在 Rust block comment 规则的 continuation 处理中跟踪 `/*` / `*/` 的嵌套深度。约 15 行修改。当前与 Amp 一致，可视为增强项。

### GAP-5-011: JS/TS 模板字符串插值 `${expr}` 中的反引号处理
- **优先级**: P2
- **影响范围**: `flitter-core/src/widgets/syntax-highlight.ts` TS_JS_MULTILINE_RULES
- **Amp 行为**: Amp 同样不追踪模板字符串插值深度，简化处理。两者一致。
- **Flitter 现状**: 多行 tokenizer 将第一个闭合反引号视为模板字符串结束。`` `outer ${`inner`} outer` `` 中 `inner` 后的反引号会错误地关闭整个模板字符串 region。`.gap/70-multiline-syntax-support.md` Open Question #2 已记录。
- **已有 .gap 引用**: `.gap/70-multiline-syntax-support.md` §7.2
- **建议修复方向**: 为 `LineState` 添加 `interpolationDepth: number`，跟踪 `${` / `}` 的嵌套。较复杂，当前与 Amp 一致，优先级低。

---

## 已有 .gap 交叉引用

| .gap 编号 | 标题 | 状态 | 是否仍然有效 |
|-----------|------|------|-------------|
| 21 | GFM Table CJK Width | 已实现 | ❌ 已修复 — `markdown.ts` 已使用 `stringWidth()` + `padEndDisplayWidth()` 替换 `string.length` + `padEnd()`，所有 3 个位置均已修正。测试覆盖完善。 |
| 37 | Markdown Inline Nesting | 已实现 | ❌ 已修复 — `parseInline` 已重写为递归下降解析器 `_parseInlineRecursive`，支持任意深度内联格式嵌套（bold 内 italic、link 内 bold 等）。完整测试覆盖含 bold inside italic、strikethrough inside bold、formatting inside link、code span 不递归、unmatched delimiter 优雅降级等。 |
| 69 | Syntax Highlight Languages | 已实现 | ❌ 已修复 — 已从 8 种语言扩展至 30 种（原 8 + Tier 1: C/C++/Java/HTML/CSS/SQL/TOML + Tier 2: Ruby/PHP/Swift/Kotlin/C#/Lua/SCSS/XML/Dockerfile + Tier 3: Scala/Elixir/Haskell/Zig/OCaml/Makefile）。包含 `EXTENSION_MAP`、`FILENAME_MAP`（Dockerfile/Makefile）、`LANGUAGE_DEFS` 全部更新。 |
| 70 | Multiline Syntax Support | 已实现 | ⚠️ 部分有效 — 核心多行 tokenizer 已实现（`LineState` + `tokenizeLineStateful` + `MultiLineRule`），JS/TS 块注释和模板字符串、Python 三引号、Go 原始字符串、Rust 块注释/原始字符串、Shell heredoc、Markdown fenced code block 均已支持。但 Open Questions 中的 Rust 嵌套块注释（§7.1）和 JS 模板字符串插值（§7.2）仍未解决，参见 GAP-5-010 和 GAP-5-011。 |

---

## 审计总结

### 高度对齐领域（无 Gap）
- **文本测量算法**: 逐 codepoint wcwidth 累加，完全一致
- **换行策略**: 仅 `\n` 显式换行，不做 soft-wrap，完全一致
- **maxLines / ellipsis / clip 截断**: 算法完全一致
- **textAlign (left/center/right)**: 偏移计算公式完全一致
- **wcwidth 零宽/宽字符表**: Unicode 区间覆盖完全一致
- **TextSpan 树遍历**: DFS + 样式 merge + hyperlink/onClick 继承完全一致
- **TextStyle**: 9 字段、merge/copyWith/equals/toSgr 完全一致
- **Markdown 解析器**: 逐行状态机、块类型、LRU 缓存完全一致
- **内联代码样式**: bold + yellow 前景色，完全一致
- **DiffView**: Myers diff + word-level diff + 语法高亮整合完全一致

### 需关注领域
- **P0**: StyleScheme 覆盖（GAP-5-001）— 影响 thinking block 视觉区分
- **P1**: 代码块 fallback 背景色（GAP-5-002）、表格列对齐（GAP-5-003）、RGB 主题色桥接（GAP-5-008）
- **P2**: RenderText 超链接传递（GAP-5-004）、emoji 标志死代码（GAP-5-005）、性能优化（GAP-5-006）、彩虹彩蛋（GAP-5-009）、Rust 嵌套注释/JS 模板插值（GAP-5-010/011）
