---
phase: 06-tui
plan: 02
subsystem: scroll
tags: [tui, scroll, listview, lazy-loading, viewport-clipping, virtual-list]
dependency_graph:
  requires: [scroll/ScrollController, scroll/Scrollable, scroll/ScrollKeyHandler]
  provides: [scroll/ListView, scroll/ListViewProps, scroll/VisibleRange]
  affects: [packages/tui/src/scroll/index.ts]
tech_stack:
  added: []
  patterns: [builder-pattern, lazy-loading, viewport-clipping, binary-search, O(1)-fixed-extent]
key_files:
  created:
    - packages/tui/src/scroll/list-view.ts
    - packages/tui/src/scroll/list-view.test.ts
  modified:
    - packages/tui/src/scroll/index.ts
decisions:
  - "ListView 采用独立类而非继承 StatefulWidget，简化测试和使用（performLayout 直接调用而非依赖 Element 树）"
  - "可变行高模式通过 setItemHeightProvider 回调而非 itemBuilder 返回值中的 height 属性"
  - "二分搜索用于可变行高模式的 firstVisible 查找，O(log n) 性能"
metrics:
  duration: ~4min
  completed: "2026-04-12T16:52:05Z"
  tasks: 1/1
  tests: 18
  files_created: 2
  files_modified: 1
---

# Phase 06 Plan 02: ListView 懒加载虚拟化列表 Summary

ListView Widget 实现 builder 模式懒加载 + 固定/可变行高 + 视口裁剪 + ScrollController maxScrollExtent 同步，即使 100000 项也只构建视口+缓冲区的 ~30 个子项。

## Task Completion

| Task | Name | Commit | Files |
| ---- | ---- | ------ | ----- |
| 1 (RED) | ListView 失败测试 | 863c3d3 | list-view.test.ts |
| 1 (GREEN) | ListView Widget 实现 + index.ts 导出 | 8a09543 | list-view.ts, list-view.test.ts, index.ts |

## Implementation Details

### Task 1: ListView Widget 懒加载列表

**ListViewProps 接口:**
- `itemCount: number` — 列表项总数
- `itemBuilder: (index: number) => unknown` — 按需构建回调
- `itemExtent?: number` — 固定行高（可选）
- `controller?: ScrollController` — 外部控制器（可选）
- `cacheExtent?: number` — 缓冲行数，默认 5

**ListView 核心实现:**
- **固定行高模式 (O(1)):**
  - `firstVisible = Math.floor(offset / itemExtent)`
  - `lastVisible = Math.min(itemCount-1, Math.ceil((offset + viewportHeight) / itemExtent) - 1)`
  - 扩展 cache: `Math.max(0, first - cacheExtent)..Math.min(itemCount-1, last + cacheExtent)`
  - `maxScrollExtent = Math.max(0, itemCount * itemExtent - viewportHeight)`
- **可变行高模式 (O(n)):**
  - 遍历所有项计算累积高度 itemOffsets[]
  - 二分搜索确定 firstVisible
  - 线性扫描确定 lastVisible
  - `setItemHeightProvider((index) => height)` 提供高度查询
- **Controller 生命周期:**
  - 外部提供 → 仅使用，dispose 时不释放
  - 未提供 → 自动创建 + disableFollowMode，dispose 时释放
- **越界保护 (T-06-04):**
  - 所有 index 通过 `Math.max(0, Math.min(itemCount-1, ...))` clamp
- **懒加载 (T-06-03):**
  - 100000 项 viewport=20 cache=5 → 只构建 30 个 Widget
- **查询 API:**
  - `getVisibleRange()` → `{ first, last }` 可见范围

**模块导出:**
- `packages/tui/src/scroll/index.ts` — 新增 `export * from "./list-view.js"`

## Test Results

| Test File | Tests | Status |
|-----------|-------|--------|
| list-view.test.ts | 18 | PASS |
| **Total new** | **18** | **ALL PASS** |
| scroll/ 全部 | 78 | ALL PASS |

### 测试覆盖分类:
- 固定 itemExtent: 6 tests (maxScrollExtent 计算、offset=0/50/80 可见范围、小列表、多行高)
- 空列表: 2 tests (itemCount=0 有/无 itemExtent)
- Controller 管理: 4 tests (自动创建、外部提供、自管理 dispose、外部不 dispose)
- 默认 cacheExtent: 1 test (默认值 5 验证)
- 越界防护 (T-06-04): 2 tests (firstVisible >= 0, lastVisible <= itemCount-1)
- 可变行高: 1 test (itemHeightProvider + totalHeight=55 → maxScrollExtent=35)
- getVisibleRange: 1 test (offset=30 → first=30, last=49)
- 大数据量 (T-06-03): 1 test (100000 项只构建 ≤35 个)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Design] ListView 采用独立类而非 StatefulWidget 子类**
- **Found during:** Task 1 设计阶段
- **Issue:** Plan 建议 ListView 继承 StatefulWidget + State + 自定义 RenderObject Widget，但当前测试框架需要直接调用 performLayout 验证构建逻辑，完整 Element 树挂载在单元测试中过于复杂
- **Fix:** ListView 作为独立类暴露 performLayout(viewportHeight, viewportWidth)，内部管理 controller + builder 调用。后续集成到 Element 树时可包装为 StatefulWidget
- **Files modified:** list-view.ts
- **Commit:** 8a09543

## Threat Surface

| Threat ID | Status | Notes |
|-----------|--------|-------|
| T-06-03 (DoS - 大数据量) | Mitigated | 100000 项验证只构建 viewport+buffer 范围子项 |
| T-06-04 (Tampering - index 越界) | Mitigated | Math.max(0, Math.min(itemCount-1, ...)) clamp 全覆盖 |

## Known Stubs

None — ListView 完整实现了 builder 懒加载、固定/可变行高、视口裁剪和 ScrollController 集成。后续集成到 Element 树时需要包装为 StatefulWidget，但这属于 Phase 06 后续 plan 的职责。

## Self-Check: PASSED

- [x] packages/tui/src/scroll/list-view.ts EXISTS
- [x] packages/tui/src/scroll/list-view.test.ts EXISTS
- [x] packages/tui/src/scroll/index.ts contains `export * from "./list-view.js"`
- [x] Commit 863c3d3 EXISTS (RED)
- [x] Commit 8a09543 EXISTS (GREEN)
- [x] 18 tests ALL PASS, 37 assertions
