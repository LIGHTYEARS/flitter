# Plan 06-04 Summary — TextEditingController 选区 + Kill Buffer + 词边界

## 状态: DONE

| 项目 | 值 |
|------|-----|
| **开始时间** | 2026-04-12T17:17:00Z |
| **结束时间** | 2026-04-12T17:18:07Z |
| **源文件** | `packages/tui/src/editing/text-editing-controller.ts` (1072 行) |
| **测试文件** | `packages/tui/src/editing/text-editing-controller.test.ts` (656 行) |
| **新增测试** | 41 个 |
| **总测试数** | 72 (编辑) / 1014 (TUI 全包) |
| **通过率** | 100% (0 失败, 0 回归) |

## 提交记录

| SHA | 说明 |
|-----|------|
| `10e68ad` | `test(06-04): add failing tests for selection + kill buffer + word boundary` |
| `d5c1587` | `feat(06-04): selection, kill buffer, word boundary for TextEditingController` |

## 实现内容

### 1. 选区 (Selection) — 23 个测试

- **新增字段**: `_selectionBase`, `_selectionExtent` (grapheme index)
- **getter**: `hasSelection`, `selectionRange`, `killBuffer`
- **CursorMoveOptions 接口**: `{ extend?: boolean }` — 所有 `moveCursor*` 方法现在接受选项对象
- **方法**:
  - `setSelectionRange(start, end)` — 设置选区并 clamp
  - `clearSelection()` — 折叠选区
  - `deleteSelectedText()` — 删除选区文本
  - `deleteSelectedOrText(count)` — 有选区删选区, 无选区删字符
  - `selectWordAt(offset)` — 选中 offset 处的单词 (词边界检测)
  - `selectLineAt(offset)` — 选中 offset 所在的整行
- **行为变更**: `insertText()` 有选区时先删选区
- **向后兼容**: 所有 `moveCursor*` 方法仍接受数字参数

### 2. Kill Buffer — 13 个测试

- **新增字段**: `_killBuffer` (string), `_lastKillWasContiguous` (boolean)
- **方法**:
  - `deleteWordLeft()` — Ctrl+Backspace 语义, 删除左侧词并存入 killBuffer
  - `deleteWordRight()` — Ctrl+Delete 语义, 删除右侧词并存入 killBuffer
  - `deleteToLineEnd()` — Ctrl+K 语义, 删除光标到行尾
  - `deleteToLineStart()` — Ctrl+U 语义, 删除行首到光标
  - `deleteCurrentLine()` — Ctrl+Shift+K 语义, 删除整行
  - `yankText()` — Ctrl+Y 语义, 粘贴 killBuffer 内容
- **连续追加**: 连续 kill 操作追加到 killBuffer; 非 kill 操作打断后重置

### 3. 词边界 (Word Boundary) — 5 个测试

- **常量集合**: `WHITESPACE_BOUNDARY`, `PUNCTUATION_BOUNDARY` (模块级 Set)
- **CJK 支持**: U+4E00-U+9FFF, U+3400-U+4DBF 范围的字符视为独立词边界
- **方法**:
  - `moveCursorWordBoundary('left' | 'right')` — 跳到词边界
- **私有辅助**:
  - `_isWordBoundary(ch)` — 判断字符是否为词边界
  - `_getWordBoundariesAt(offset)` — 获取 offset 所在词的 start/end
  - `_findWordBoundary(direction)` — 查找词边界位置
  - `_collapseSelection()` — 折叠选区到光标位置
  - `_parseMoveArgs()` — 解析移动参数 (兼容数字和选项对象)

## 还原对照

| 逆向代码位置 | 还原方法 |
|-------------|---------|
| `widget-property-system.js:1127-1136` | `_setCursorPosition` (+ extend 参数) |
| `widget-property-system.js:1140-1149` | `hasSelection`, `selectionRange` |
| `widget-property-system.js:1159-1161` | `clearSelection` |
| `widget-property-system.js:1241-1247` | `deleteWordLeft` |
| `tui-widget-library.js:11-20` | `deleteWordRight` |
| `tui-widget-library.js:21-23` | `yankText` |
| `tui-widget-library.js:24` | `_isWordBoundary` |
| `tui-widget-library.js:25-39` | `_getWordBoundariesAt` |
| `tui-widget-library.js:41-55` | `_findWordBoundary` |
| `tui-widget-library.js:56-66` | `deleteSelectedText`, `deleteSelectedOrText` |
| `tui-widget-library.js:92-94` | `moveCursorWordBoundary` |
| `tui-widget-library.js:118-146` | `deleteCurrentLine`, `deleteToLineEnd` |
| `tui-widget-library.js:147-174` | `deleteToLineStart` |
| `tui-widget-library.js:218-219` | `_collapseSelection` |
| `tui-widget-library.js:221-261` | `selectWordAt`, `selectLineAt` |
| `tui-widget-library.js:240-246` | `setSelectionRange` |

## 问题与偏差

无。全部功能忠实还原, 所有测试通过, 无回归。
