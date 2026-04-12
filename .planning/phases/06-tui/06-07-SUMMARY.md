---
phase: 06-tui
plan: 07
subsystem: selection
tags: [tui, selection, clipboard, drag-select, keep-alive, cross-widget]
dependency_graph:
  requires: [screen/Screen, tree/RenderBox]
  provides: [selection/SelectionArea, selection/Selectable, selection/SelectionPosition, selection/Clipboard, selection/SelectionKeepAliveBoundary]
  affects: [packages/tui/src/selection/index.ts, packages/tui/src/index.ts]
tech_stack:
  added: []
  patterns: [strategy-pattern, observer-pattern, document-order-sort, stdin-pipe-security]
key_files:
  created:
    - packages/tui/src/selection/clipboard.ts
    - packages/tui/src/selection/clipboard.test.ts
    - packages/tui/src/selection/selection-area.ts
    - packages/tui/src/selection/selection-area.test.ts
    - packages/tui/src/selection/selection-keep-alive.ts
    - packages/tui/src/selection/index.ts
  modified:
    - packages/tui/src/index.ts
decisions:
  - "Clipboard 使用策略模式 (pbcopy/wl-copy/xclip/osc52)，构造时自动检测平台"
  - "_spawn 和 _writeStdout 设计为可覆盖的内部方法，方便测试 mock 而无需真正调用系统命令"
  - "SelectionArea.copySelection 在跨 Selectable 时使用换行符拼接各段文本"
  - "SelectionKeepAliveBoundary 通过 addListener 监听 SelectionArea 变化，而非轮询"
metrics:
  duration: ~5min
  completed: "2026-04-12T17:37:07Z"
  tasks: 2/2
  tests: 29
  files_created: 6
  files_modified: 1
---

# Phase 06 Plan 07: 跨 Widget 文本选择与剪贴板 Summary

跨 Widget 文本选区管理系统 + 跨平台剪贴板 (macOS pbcopy / Linux wl-copy+xclip / OSC 52 fallback) + ListView 虚拟化选区保活边界，29 个测试 48 个断言全部通过。

## Task Completion

| Task | Name | Commit | Files |
| ---- | ---- | ------ | ----- |
| 1 (RED+GREEN) | Clipboard + SelectionArea | 09b90ad | clipboard.ts, clipboard.test.ts, selection-area.ts, selection-area.test.ts |
| 2 | SelectionKeepAliveBoundary + 模块导出 | edf9006 | selection-keep-alive.ts, index.ts, packages/tui/src/index.ts |

## Implementation Details

### Task 1: Clipboard 跨平台剪贴板 + SelectionArea 选区管理

**Clipboard 策略模式:**
- `darwin` → `pbcopy` / `pbpaste` (spawn, stdin 传递文本)
- `linux` + `WAYLAND_DISPLAY` → `wl-copy` / `wl-paste`
- `linux` + `DISPLAY` → `xclip -selection clipboard` / `xclip -selection clipboard -o`
- fallback → OSC 52 转义序列 (`\x1b]52;c;{base64}\x07`)，不支持读取

**安全设计 (T-06-14/T-06-15):**
- spawn 命令名硬编码，不接受用户输入
- 文本通过 stdin 传递，不进入命令参数
- 不使用 `shell=true`

**SelectionArea 核心功能:**
- `register(selectable)` / `unregister(id)`: 管理可选组件
- `beginDrag → updateDrag → endDrag`: 鼠标拖选操作
- `selectAll()`: 按文档位置排序后选中所有 Selectable 全部内容
- `copySelection()`: 收集选区文本，跨 Selectable 用换行符拼接
- `endDrag()`: 自动调用 clipboard.writeText 复制到剪贴板
- `_refreshOrderedCache()`: 按 top → left 排序 Selectable (文档序)
- `_propagateSelection()`: 将全局选区分发到各 Selectable 的高亮范围
- `comparePositions()`: 比较两个 SelectionPosition 的文档顺序
- `addListener()`: 选区变化订阅 (观察者模式)

### Task 2: SelectionKeepAliveBoundary + 模块导出

**SelectionKeepAliveBoundary:**
- 通过 `addListener` 监听父 SelectionArea 的选区变化
- `register(id)` / `unregister(id)`: 管理此边界内的 Selectable ID
- `isKeptAlive`: 当选区触及边界内任何 Selectable 时为 true
- `_selectionTouchesSelectable`: 支持直接引用检查 + `comparePositions` 范围重叠检查
- `_setKeptAlive`: 仅在状态变化时触发回调，避免冗余通知
- `dispose()`: 移除监听器，清空状态

**模块导出:**
- `selection/index.ts`: 统一导出 SelectionArea, SelectionKeepAliveBoundary, Clipboard
- `packages/tui/src/index.ts`: 添加 `export * from "./selection/index.js"`

## Test Results

| Test File | Tests | Status |
|-----------|-------|--------|
| clipboard.test.ts | 11 | PASS |
| selection-area.test.ts | 18 | PASS |
| **Total new** | **29** | **ALL PASS** |

### 测试覆盖分类:
- Clipboard 平台检测: 4 tests (darwin/wayland/x11/osc52)
- Clipboard writeText: 3 tests (pbcopy spawn/spawn失败/osc52格式)
- Clipboard readText: 4 tests (pbpaste/osc52不支持/wl-paste/xclip-o)
- SelectionArea 注册: 3 tests (register/unregister/不存在ID)
- SelectionArea 拖选: 4 tests (创建选区/isDragging/自动复制/未拖选)
- SelectionArea selectAll: 2 tests (正常/空selectables)
- SelectionArea copySelection: 3 tests (单个/跨多个/无选区)
- SelectionArea clear: 1 test
- SelectionArea copyToClipboard: 2 tests (成功/无选区)
- SelectionArea 边界情况: 3 tests (空操作/未注册ID/文档顺序)

## Deviations from Plan

None - plan executed exactly as written.

## Threat Surface

| Threat ID | Status | Notes |
|-----------|--------|-------|
| T-06-14 (Info Disclosure - Clipboard) | Mitigated | 只写入用户主动选择的文本，spawn 命令名硬编码 |
| T-06-15 (Elevation - spawn) | Mitigated | 不使用 shell=true，文本通过 stdin 传递不进入命令参数 |
| T-06-16 (DoS - copySelection) | Accepted | 选区文本量受终端显示限制，复制为用户主动触发 |

## Known Stubs

None - SelectionArea, Clipboard, SelectionKeepAliveBoundary 全部完整实现，无硬编码占位或 TODO。

## Self-Check: PASSED

- [x] packages/tui/src/selection/clipboard.ts EXISTS
- [x] packages/tui/src/selection/clipboard.test.ts EXISTS
- [x] packages/tui/src/selection/selection-area.ts EXISTS
- [x] packages/tui/src/selection/selection-area.test.ts EXISTS
- [x] packages/tui/src/selection/selection-keep-alive.ts EXISTS
- [x] packages/tui/src/selection/index.ts EXISTS
- [x] packages/tui/src/index.ts contains `export * from "./selection/index.js"`
- [x] Commit 09b90ad EXISTS (Task 1)
- [x] Commit edf9006 EXISTS (Task 2)
- [x] 29 tests ALL PASS, 48 assertions
