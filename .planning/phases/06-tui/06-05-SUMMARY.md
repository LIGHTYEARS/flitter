---
phase: 06-tui
plan: 05
subsystem: "@flitter/tui markdown"
tags: [markdown, micromark, gfm, syntax-highlight, ast, textspan]
dependency_graph:
  requires:
    - "@flitter/tui screen (Color, TextStyle)"
    - "@flitter/tui widgets (TextSpan)"
  provides:
    - "MarkdownParser — micromark + GFM → 自定义 AST"
    - "MarkdownRenderer — AST → TextSpan Widget 树"
    - "SyntaxHighlighter — 基于正则的 token 级代码高亮"
  affects:
    - "packages/tui/src/index.ts (新增 markdown 导出)"
    - "packages/tui/package.json (新增 micromark 依赖)"
tech_stack:
  added:
    - "micromark ^4.0.0"
    - "micromark-extension-gfm ^3.0.0"
    - "micromark-extension-gfm-strikethrough ^2.0.0"
    - "micromark-extension-gfm-table ^2.0.0"
    - "micromark-extension-gfm-task-list-item ^2.0.0"
    - "micromark-extension-gfm-autolink-literal ^2.0.0"
  patterns:
    - "HTML→AST 状态机: micromark HTML 输出转自定义 AST (非 events API)"
    - "正则 token 高亮: 简单正则匹配关键字/字符串/数字/注释"
    - "递归渲染: AST 节点递归转 TextSpan 带样式树"
key_files:
  created:
    - packages/tui/src/markdown/markdown-parser.ts
    - packages/tui/src/markdown/markdown-parser.test.ts
    - packages/tui/src/markdown/markdown-renderer.ts
    - packages/tui/src/markdown/markdown-renderer.test.ts
    - packages/tui/src/markdown/syntax-highlight.ts
    - packages/tui/src/markdown/index.ts
  modified:
    - packages/tui/src/index.ts
    - packages/tui/package.json
    - bun.lock
decisions:
  - "使用 micromark HTML 输出 + 状态机转 AST (非底层 events API)，更可靠"
  - "allowDangerousHtml: true 用于检测 HTML 节点并标记为 html 类型"
  - "SyntaxHighlighter 使用简单正则 (与原版一致)，不做完整语法分析"
  - "安全措施: html 节点在渲染时被忽略 (T-06-10)"
  - "Color.indexed() (非 Color.index()) — 按现有 API 修正"
metrics:
  duration: "11m20s"
  completed: "2026-04-12T16:35:10Z"
---

# Phase 06 Plan 05: Markdown 解析与渲染 Summary

micromark + GFM 驱动的 Markdown 解析器和渲染器：解析 Markdown 到自定义 AST，转换为 TextSpan Widget 树，支持代码块语法高亮。

## One-liner

micromark GFM 解析 + HTML→AST 状态机 + TextSpan 递归渲染 + 正则 token 语法高亮，47 测试全过

## Commits

| Task | Commit | Message |
|------|--------|---------|
| 1 | 53bbf6a | feat(06-05): MarkdownParser — micromark + GFM 解析 Markdown 到自定义 AST |
| 2 | 5321986 | feat(06-05): MarkdownRenderer + SyntaxHighlighter — AST → TextSpan Widget 树 |
| - | 138d769 | chore(06-05): update bun.lock for micromark dependencies |

## Task Results

### Task 1: MarkdownParser — micromark 解析 + 中间 AST

- **MarkdownParser** 类使用 micromark + GFM 扩展解析 Markdown
- 解析策略: micromark → HTML → 状态机 → 自定义 AST (比直接操作 events 更可靠)
- AST 节点类型: paragraph, heading, strong, emphasis, delete, code, codeSpan, link, list, listItem, table, tableRow, tableCell, blockquote, thematicBreak, lineBreak, text, html
- GFM 扩展: 表格, 删除线 (~~text~~), 任务列表 ([x]/[ ]), autolink
- 增量追加: appendText() 缓冲累积文本并重新解析
- 安全: allowDangerousHtml 启用以检测并标记嵌入 HTML 为 html 节点
- **20 测试通过**

### Task 2: MarkdownRenderer + SyntaxHighlighter — AST → Widget 树

- **SyntaxHighlighter** 基于正则 token 匹配:
  - 支持: keyword, string, number, comment, function, variable, type, operator, punctuation
  - 默认主题配色参考原版 Amp CLI 的 yS.default (Blue/Green/Yellow/Cyan/Magenta)
  - 覆盖 JS/TS/Python/Rust/Go 常见关键字
- **MarkdownRenderer** 递归 AST → TextSpan:
  - paragraph → 透明 wrapper
  - heading → bold + "# " 前缀
  - strong → bold, emphasis → italic, delete → strikethrough
  - code → 背景色 + 语法高亮, codeSpan → 背景色 (Yellow 前景)
  - list → "  - " / "  N. " / "  [x] " 前缀
  - table → Unicode 边框 (│ ─ ┼ ├ ┤)
  - blockquote → "│ " 前缀 + dim
  - link → underline + Blue + url
  - html → 忽略 (T-06-10 安全措施)
  - renderStreaming → 跳过尾部空段落
- 创建 markdown/index.ts 统一导出
- 更新 packages/tui/src/index.ts 添加 markdown 模块
- **27 测试通过** (7 SyntaxHighlighter + 20 MarkdownRenderer)

## Test Summary

| File | Tests | Pass | Fail |
|------|-------|------|------|
| markdown-parser.test.ts | 20 | 20 | 0 |
| markdown-renderer.test.ts | 27 | 27 | 0 |
| **Total** | **47** | **47** | **0** |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Color.index → Color.indexed**
- **Found during:** Task 2
- **Issue:** Plan 使用 `Color.index(n)` 但现有 API 是 `Color.indexed(n)`
- **Fix:** 修改 syntax-highlight.ts 和 markdown-renderer.ts 中所有 `Color.index` → `Color.indexed`
- **Files modified:** syntax-highlight.ts, markdown-renderer.ts
- **Commit:** 5321986

**2. [Rule 1 - Bug] 列表/表格中的空白文本节点过滤**
- **Found during:** Task 1
- **Issue:** micromark HTML 输出中标签间的换行符被错误地作为文本节点添加到 list/table children
- **Fix:** 在 _pushChild 前检查父节点类型，过滤纯空白文本
- **Files modified:** markdown-parser.ts
- **Commit:** 53bbf6a

**3. [Rule 1 - Bug] micromark allowDangerousHtml**
- **Found during:** Task 1
- **Issue:** 默认 micromark 不输出原始 HTML 标签，导致无法检测嵌入 HTML
- **Fix:** 添加 `allowDangerousHtml: true` 配置以保留 HTML 标签供安全检测
- **Files modified:** markdown-parser.ts
- **Commit:** 53bbf6a

## Decisions Made

1. **HTML→AST 而非 Events API**: micromark 的 events/tokens API 过于底层，HTML 输出经过完整验证，使用状态机从 HTML 转 AST 更简单可靠
2. **allowDangerousHtml**: 启用以检测嵌入 HTML → 标记为 html 节点 → 渲染时忽略 (安全)
3. **简单正则高亮**: 与原版一致，不做完整语法分析，仅 token 级匹配
4. **Color.indexed()**: 遵循现有 Color API 命名
