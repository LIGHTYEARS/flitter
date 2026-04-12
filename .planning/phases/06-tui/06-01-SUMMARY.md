---
phase: 06-tui
plan: 01
subsystem: scroll
tags: [tui, scroll, controller, keyboard, widget]
dependency_graph:
  requires: [tree/stateful-widget, tree/render-box, tree/constraints, vt/types]
  provides: [scroll/ScrollController, scroll/ScrollPhysics, scroll/ClampingScrollPhysics, scroll/Scrollable, scroll/ScrollKeyHandler]
  affects: [packages/tui/src/index.ts]
tech_stack:
  added: []
  patterns: [observer-pattern, strategy-pattern, clamping-physics, easeOutCubic-animation]
key_files:
  created:
    - packages/tui/src/scroll/scroll-physics.ts
    - packages/tui/src/scroll/scroll-controller.ts
    - packages/tui/src/scroll/scroll-controller.test.ts
    - packages/tui/src/scroll/scroll-key-handler.ts
    - packages/tui/src/scroll/scrollable.ts
    - packages/tui/src/scroll/scrollable.test.ts
    - packages/tui/src/scroll/index.ts
  modified:
    - packages/tui/src/index.ts
decisions:
  - "ScrollController 使用 Set 管理 listeners (vs Array)，提升 remove 性能"
  - "MouseEvent 使用 MouseAction 字符串类型 ('wheel_up'/'wheel_down') 而非逆向中的数字 button 编码 (64/65)"
  - "Scrollable 采用简化方案 — 无需继承 StatefulWidget，作为 props 容器暴露 controller + 静态 computeMaxScrollExtent 方法"
metrics:
  duration: ~7min
  completed: "2026-04-12T16:11:48Z"
  tasks: 2/2
  tests: 60
  files_created: 7
  files_modified: 1
---

# Phase 06 Plan 01: ScrollController + Scrollable 滚动基础设施 Summary

ScrollController 滚动偏移量管理器 + ClampingScrollPhysics 物理特性 + Scrollable 容器 Widget + ScrollKeyHandler vim/标准键盘/鼠标滚轮事件处理器，为 TUI 框架中所有可滚动内容提供完整滚动基础设施。

## Task Completion

| Task | Name | Commit | Files |
| ---- | ---- | ------ | ----- |
| 1 | ScrollController + ScrollPhysics 滚动状态管理器 | a82c074 | scroll-physics.ts, scroll-controller.ts, scroll-controller.test.ts |
| 2 | Scrollable + ScrollKeyHandler + 模块导出 | 7c2d063 | scroll-key-handler.ts, scrollable.ts, scrollable.test.ts, index.ts, packages/tui/src/index.ts |

## Implementation Details

### Task 1: ScrollController + ClampingScrollPhysics

**ScrollPhysics 接口 + ClampingScrollPhysics:**
- `clampOffset(offset, min, max)` — Math.max/Math.min 钳位实现
- 策略模式: 接口允许未来替换为弹性回弹等物理模型

**ScrollController (忠实还原逆向 Q3 类):**
- **偏移量管理:** `jumpTo()` 通过 physics 钳位到 [0, maxScrollExtent]，取消动画，通知 listeners
- **方向滚动:** `scrollUp(n)` / `scrollDown(n)` — 默认 3 行
- **翻页:** `scrollPageUp(viewportSize)` / `scrollPageDown(viewportSize)` — 半屏翻页 `Math.floor(viewportSize / 2)`
- **边界跳转:** `scrollToTop()` / `scrollToBottom()`
- **动画:** `animateTo(target, duration)` — 16ms interval + easeOutCubic 缓动曲线
- **followMode:** 新内容追加时自动滚到底部，`enableFollowMode()` / `disableFollowMode()` / `toggleFollowMode()`
- **边界检测:** `atTop` / `atBottom` / `atEdge` getter
- **生命周期:** `dispose()` 清理 interval + listeners，disposed 后方法为 no-op
- **listeners:** Set 管理，try/catch 隔离单个回调异常

### Task 2: ScrollKeyHandler + Scrollable + 模块导出

**ScrollKeyHandler (忠实还原逆向 P1T 类):**
- vim 风格: `j`(下) / `k`(上) / `g`(顶) / `G`(底)
- 标准键盘: `ArrowUp/Down` / `PageUp/Down` / `Home/End`
- 修饰键组合: `Ctrl+u`(上翻页) / `Ctrl+d`(下翻页) / `Shift+g`(底)
- 鼠标滚轮: `wheel_up`(上) / `wheel_down`(下)
- 可配置 `scrollStep` (默认 3) / `pageScrollStep` (默认 10)
- 返回 boolean 表示事件是否已消费

**Scrollable:**
- 接受可选 `controller` prop，支持外部/自管理两种模式
- 静态方法 `computeMaxScrollExtent(childHeight, viewportHeight)` — `Math.max(0, child - viewport)`

**模块导出:**
- `packages/tui/src/scroll/index.ts` — 统一导出全部 scroll API
- `packages/tui/src/index.ts` — 注册 scroll 模块到 @flitter/tui 公共 API

## Test Results

| Test File | Tests | Status |
|-----------|-------|--------|
| scroll-controller.test.ts | 37 | PASS |
| scrollable.test.ts | 23 | PASS |
| **Total** | **60** | **ALL PASS** |

### 测试覆盖分类:
- ClampingScrollPhysics: 3 tests (钳位、边界、零范围)
- ScrollController 初始状态: 4 tests
- jumpTo + clamping: 5 tests (正常值、负值、超大值、通知、无变化)
- scrollUp/Down: 4 tests (正常、clamp)
- scrollToTop/Bottom: 2 tests
- scrollPageUp/Down: 3 tests (正常、clamp)
- followMode: 4 tests (自动滚底、禁用、启用、切换)
- listeners: 2 tests (add/remove、错误隔离)
- animateTo: 2 tests (异步动画、即时跳转)
- dispose: 5 tests (disposed 标志、no-op、双重 dispose)
- 边界检测: 3 tests (atTop、atBottom、atEdge)
- ScrollKeyHandler 键盘: 14 tests (全键位映射 + 无关键)
- ScrollKeyHandler 鼠标: 3 tests (wheel_up、wheel_down、其他)
- ScrollKeyHandler 自定义: 1 test
- Scrollable 创建: 2 tests
- Scrollable maxScrollExtent: 2 tests
- Scrollable 生命周期: 1 test

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] 测试用例 "animateTo should be no-op after dispose" 修正**
- **Found during:** Task 1 GREEN phase
- **Issue:** 测试期望 dispose 后 offset=0，但 `updateMaxScrollExtent(100)` 在 followMode=true 时已将 offset 设为 100
- **Fix:** 在测试中 disable followMode 后再 updateMaxScrollExtent，确保 offset=0
- **Files modified:** scroll-controller.test.ts
- **Commit:** a82c074 (包含修正)

**2. [Rule 2 - Design] MouseEvent 接口适配**
- **Found during:** Task 2 设计阶段
- **Issue:** 逆向代码使用数字 button 编码 (64/65)，但项目已有 MouseAction 类型使用字符串 ('wheel_up'/'wheel_down')
- **Fix:** ScrollKeyHandler.handleMouseScroll 接受 MouseAction 字符串而非数字，与已有 vt/types.ts 接口一致
- **Files modified:** scroll-key-handler.ts
- **Commit:** 7c2d063

## Threat Surface

| Threat ID | Status | Notes |
|-----------|--------|-------|
| T-06-02 (offset tampering) | Mitigated | ClampingScrollPhysics.clampOffset 强制 [0, maxScrollExtent] 范围 |
| T-06-01 (animateTo DoS) | Accepted | 动画 timer 在 dispose 时 clearInterval，无资源泄漏 |

## Self-Check: PASSED

- [x] packages/tui/src/scroll/scroll-physics.ts EXISTS
- [x] packages/tui/src/scroll/scroll-controller.ts EXISTS
- [x] packages/tui/src/scroll/scroll-controller.test.ts EXISTS
- [x] packages/tui/src/scroll/scroll-key-handler.ts EXISTS
- [x] packages/tui/src/scroll/scrollable.ts EXISTS
- [x] packages/tui/src/scroll/scrollable.test.ts EXISTS
- [x] packages/tui/src/scroll/index.ts EXISTS
- [x] Commit a82c074 EXISTS
- [x] Commit 7c2d063 EXISTS
- [x] 60 tests ALL PASS
