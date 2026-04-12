---
phase: 06-tui
plan: 06
subsystem: "@flitter/tui overlay"
tags: [overlay, autocomplete, command-palette, layer-link, popup, tdd]
dependency_graph:
  requires:
    - "packages/tui/src/editing/text-editing-controller.ts (TextEditingController)"
    - "packages/tui/src/tree/stateful-widget.ts (StatefulWidget, State)"
    - "packages/tui/src/widgets/stack.ts (Stack/Positioned — 用于层叠渲染)"
  provides:
    - "OverlayEntry — 延迟构建的弹出层条目"
    - "OverlayState — 管理 OverlayEntry 列表的增删和构建"
    - "LayerLink — 锚点定位 (target → followers 通知)"
    - "AutocompleteController — 触发器检测 + debounce + generationId 竞态保护"
    - "CommandPalette — 命令搜索面板 StatefulWidget"
  affects:
    - "packages/tui/src/index.ts (新增 overlay 导出)"
tech_stack:
  added: []
  patterns:
    - "generationId 竞态保护 (旧异步结果丢弃)"
    - "debounce 限流 (默认 100ms)"
    - "arrow function 绑定 this (_handleTextChange)"
    - "Partial<State> 更新模式 (_updateState)"
key_files:
  created:
    - packages/tui/src/overlay/overlay-entry.ts
    - packages/tui/src/overlay/overlay.ts
    - packages/tui/src/overlay/layer-link.ts
    - packages/tui/src/overlay/autocomplete-controller.ts
    - packages/tui/src/overlay/autocomplete-controller.test.ts
    - packages/tui/src/overlay/command-palette.ts
    - packages/tui/src/overlay/index.ts
  modified:
    - packages/tui/src/index.ts
decisions:
  - "OverlayState 使用简单 setState 回调而非 BehaviorSubject (对齐逆向代码 + 简化)"
  - "AutocompleteController 触发器检测使用 lastIndexOf 字符串搜索 (简化自逆向代码的 grapheme 检测)"
  - "CommandPalette.build 返回简化 Text Widget (完整 Column+TextField+ListView 渲染延后)"
metrics:
  duration: "7m24s"
  completed: "2026-04-12T17:29:18Z"
---

# Phase 06 Plan 06: Overlay/Popup 系统 Summary

OverlayEntry/Overlay/LayerLink 弹出层基础设施 + AutocompleteController (debounce + generationId 竞态保护) + CommandPalette 命令面板

## One-liner

弹出层管理系统: OverlayEntry 延迟构建 + LayerLink 锚点定位 + AutocompleteController 触发器检测/debounce/竞态保护 + CommandPalette 命令搜索面板

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | OverlayEntry + Overlay + LayerLink | `d95e065` | overlay-entry.ts, overlay.ts, layer-link.ts, index.ts, src/index.ts |
| 2 (RED) | AutocompleteController 失败测试 | `e795679` | autocomplete-controller.test.ts |
| 2 (GREEN) | AutocompleteController + CommandPalette 实现 | `a5f423d` | autocomplete-controller.ts, command-palette.ts, index.ts, test.ts |

## Test Results

- **AutocompleteController**: 19 tests, 33 expect() calls -- all pass
- **TUI 全套回归**: 1033 tests, 0 failures
- **Total new**: 19 tests

### Test Coverage Areas

AutocompleteController:
- 初始状态 isActive=false, options=[], selectedIndex=-1
- initialize 绑定 textController 和 triggers
- 触发字符 "/" → isActive=true
- 查询 "/he" → optionsBuilder 返回匹配项
- selectNext 循环递增 selectedIndex
- selectPrevious 循环递减 selectedIndex
- selectNext/Previous 非激活状态无操作
- acceptSelected 调用 onSelected 回调并 dismiss
- acceptSelected 非激活状态无操作
- dismiss 清空 options + isActive=false
- debounce: 快速输入只触发一次 optionsBuilder
- generationId: 旧异步结果不覆盖新结果
- addListener / removeListener 管理状态监听
- dispose 清理 timer 和 textController listener
- dispose 后 initialize 抛出错误
- 多触发器 (/ 和 @)
- 普通文本输入不触发补全
- optionsBuilder 返回空数组时 isActive=false

## Implementation Details

### OverlayEntry (还原自逆向代码 lZT 类, micromark-parser.js:11427-11453)

- builder: 延迟构建 Widget 的工厂函数
- _needsBuild 脏标记, markNeedsBuild 触发重建
- remove() 从 OverlayState 移除
- mounted getter 检测是否已绑定

### OverlayState

- _entries[] 列表管理, insert/remove
- insert 支持 below/above 相对定位
- buildEntries() 按序调用所有 entry.builder
- _markNeedsRebuild() 触发宿主 setState

### LayerLink (还原自逆向代码 mZT 类, micromark-parser.js:11454-11485)

- setTarget/clearTarget 设置锚点目标
- getTargetTransform() → { position, size } | null
- addFollower/removeFollower 追随者通知
- _notifyFollowers 安全调用 + 错误捕获

### AutocompleteController (还原自逆向代码 uZT 类, micromark-parser.js:11486-11640)

核心机制:
1. **触发器检测**: 从光标位置向前搜索触发字符, 提取 query
2. **debounce**: _scheduleDebouncedBuild 使用 setTimeout 限流
3. **generationId 竞态保护**: 每次文本变更递增 genId, 异步结果返回时比对
4. **状态管理**: _updateState(partial) 合并更新 + 通知 listeners
5. **生命周期**: initialize/dispose 管理 textController listener 绑定

### CommandPalette (还原自逆向代码 commandPaletteMode, tui-thread-widgets.js:2748)

- StatefulWidget + State 模式
- 内部创建 TextEditingController (搜索输入)
- 内部创建 AutocompleteController (匹配和选择)
- _filterCommands: label/description 模糊匹配
- build 当前简化返回 Text Widget (完整 UI 延后)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] 测试期望值修正**
- **Found during:** Task 2
- **Issue:** 测试预期 "/he" 匹配 2 个结果 (help, history), 但 "history" 不包含 "he"
- **Fix:** 将期望从 2 改为 1, 只有 "help" 匹配
- **Files modified:** autocomplete-controller.test.ts
- **Commit:** a5f423d

## Decisions Made

1. **OverlayState 使用 setState 回调**: 对齐逆向代码中 Nv (BehaviorSubject) 的简化实现, 通过 setState 回调触发宿主重建
2. **AutocompleteController 触发器检测简化**: 使用 lastIndexOf 字符串搜索而非逆向代码中的 grapheme 级检测 (ef.detect), 满足 95% 场景
3. **CommandPalette.build 简化**: 完整的 Column + TextField + ListView 渲染需要更多组件协调, 当前返回 Text Widget 占位

## Self-Check: PASSED

Files verified:
- FOUND: packages/tui/src/overlay/overlay-entry.ts
- FOUND: packages/tui/src/overlay/overlay.ts
- FOUND: packages/tui/src/overlay/layer-link.ts
- FOUND: packages/tui/src/overlay/autocomplete-controller.ts
- FOUND: packages/tui/src/overlay/autocomplete-controller.test.ts
- FOUND: packages/tui/src/overlay/command-palette.ts
- FOUND: packages/tui/src/overlay/index.ts

Commits verified:
- FOUND: d95e065 -- feat(06-06): OverlayEntry + Overlay + LayerLink 弹出层基础设施
- FOUND: e795679 -- test(06-06): add failing tests for AutocompleteController
- FOUND: a5f423d -- feat(06-06): AutocompleteController + CommandPalette + 19 tests
