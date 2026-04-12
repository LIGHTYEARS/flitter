---
phase: 06-tui
plan: 03
subsystem: "@flitter/tui editing"
tags: [text-editing, layout-engine, grapheme, cjk, tdd]
dependency_graph:
  requires:
    - "packages/tui/src/text/char-width.ts (charWidth, graphemeSegments)"
    - "packages/tui/src/text/emoji.ts (isEmoji, isEmojiPresentation)"
    - "packages/tui/src/tree/stateful-widget.ts (StatefulWidget, State)"
  provides:
    - "TextLayoutEngine — 文本换行布局 + offset↔行列映射"
    - "TextEditingController — 多行编辑核心 (光标、文本操作、preferredColumn)"
    - "TextField — StatefulWidget 文本输入组件"
  affects:
    - "packages/tui/src/index.ts (新增 editing 导出)"
tech_stack:
  added: []
  patterns:
    - "Intl.Segmenter grapheme cluster 分割 (原生高性能)"
    - "惰性计算 + 脏标记 (TextLayoutEngine)"
    - "grapheme-based 文本操作 (非 char-based)"
key_files:
  created:
    - packages/tui/src/editing/text-layout-engine.ts
    - packages/tui/src/editing/text-layout-engine.test.ts
    - packages/tui/src/editing/text-editing-controller.ts
    - packages/tui/src/editing/text-editing-controller.test.ts
    - packages/tui/src/editing/text-field.ts
    - packages/tui/src/editing/index.ts
  modified:
    - packages/tui/src/index.ts
decisions:
  - "TextLayoutEngine 使用简单字符级换行 (wrapMode=none 对齐逆向代码构造默认值)"
  - "TextEditingController 简化版不含选区逻辑 (selection 将在后续 plan 实现)"
  - "TextField.build 当前使用简化 Text Widget 返回, 完整 RichText+光标渲染延后"
metrics:
  duration: "6m19s"
  completed: "2026-04-12T16:21:20Z"
---

# Phase 06 Plan 03: TextLayoutEngine + TextEditingController + TextField Summary

TextLayoutEngine (Intl.Segmenter grapheme 分割 + CJK/Emoji 宽度感知换行布局) + TextEditingController (grapheme 级多行编辑 + preferredColumn 垂直移动记忆) + TextField StatefulWidget 壳

## One-liner

基于 Intl.Segmenter 的 grapheme 级文本布局引擎 + 多行编辑控制器 (CJK/Emoji 宽度感知, preferredColumn 跨行记忆)

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | TextLayoutEngine 文本换行布局引擎 | `73daa53` | text-layout-engine.ts, text-layout-engine.test.ts |
| 2 | TextEditingController + TextField Widget | `f10e7bd` | text-editing-controller.ts, text-editing-controller.test.ts, text-field.ts, index.ts, packages/tui/src/index.ts |

## Test Results

- **TextLayoutEngine**: 21 tests, 66 expect() calls — all pass
- **TextEditingController**: 31 tests, 50 expect() calls — all pass
- **Total**: 52 tests, 116 expect() calls

### Test Coverage Areas

TextLayoutEngine:
- 空文本 / 单行 / 多行 / 末尾换行
- ASCII 超宽自动换行
- CJK 文本按宽度换行 (每 CJK 字符占 2 列)
- CJK 字符不拆分 (剩余宽度不够时整个字符换行)
- offsetToPosition / positionToOffset 往返一致性
- Grapheme cluster: 组合字符 (é), ZWJ 家庭 Emoji, 多 Emoji
- 布局列宽度计算 (getLayoutColumnFromOffset)

TextEditingController:
- 文本插入 / 删除 / 向后删除 (Backspace/Delete)
- 水平光标移动 (left/right)
- 垂直光标移动 (up/down) + preferredColumn 跨越短行恢复
- 行首行尾 / 文档首尾跳转
- CJK 文本插入/删除/光标移动
- listener add/remove/notify
- dispose 安全性
- lineCount / cursorLine / cursorColumn getters

## Implementation Details

### TextLayoutEngine (还原自逆向代码 Kw 类)

核心算法:
1. 使用 `Intl.Segmenter('zh', { granularity: 'grapheme' })` 分割全文
2. 逐 grapheme 遍历，遇 `\n` 产生硬换行，累计宽度超过视口宽度产生软换行
3. CJK 字符宽度 = 2，通过已有的 `charWidth` 函数计算
4. 惰性计算 + 脏标记，updateText/updateWidth 后标记 dirty，访问时才重新布局

关键接口: `updateText`, `updateWidth`, `getLineCount`, `getLine`, `offsetToPosition`, `positionToOffset`, `getLayoutColumnFromOffset`, `getGraphemeCount`

### TextEditingController (还原自逆向代码 wc 类)

核心能力:
- 所有位置计算基于 grapheme index (非 char index)
- `_getStringPositionFromGraphemeIndex` 将 grapheme index 转为字符串字节位置
- `_preferredColumn` 实现垂直移动的列位置记忆
- 水平移动重置 preferredColumn，垂直移动保持
- listener 数组实现变更通知

### TextField (StatefulWidget)

最小可编译实现:
- 管理 TextEditingController 生命周期 (自建 vs 外部传入)
- 订阅 controller 变更 → setState 触发重建
- build 当前返回简化 Text Widget (完整 RichText + 光标渲染将在后续实现)

## Deviations from Plan

None - plan executed exactly as written.

## Decisions Made

1. **TextLayoutEngine 使用简单字符级换行**: 对齐逆向代码 wc 构造函数中 `wrapMode: "none"` 的默认值，当前不实现 word-wrap 模式
2. **TextEditingController 简化版不含选区**: 选区 (selection) 逻辑将在后续 plan 中实现
3. **TextField.build 简化实现**: 完整的 RichText + 光标位置反色渲染依赖更多组件协调，延后到后续 plan

## Self-Check: PASSED

Files verified:
- FOUND: packages/tui/src/editing/text-layout-engine.ts
- FOUND: packages/tui/src/editing/text-layout-engine.test.ts
- FOUND: packages/tui/src/editing/text-editing-controller.ts
- FOUND: packages/tui/src/editing/text-editing-controller.test.ts
- FOUND: packages/tui/src/editing/text-field.ts
- FOUND: packages/tui/src/editing/index.ts

Commits verified:
- FOUND: 73daa53 — feat(06-03): TextLayoutEngine 文本换行布局引擎
- FOUND: f10e7bd — feat(06-03): TextEditingController + TextField Widget
