---
phase: 06-tui
plan: 08
subsystem: "@flitter/tui perf"
tags: [performance, ring-buffer, overlay, tui]
dependency_graph:
  requires: ["packages/tui/src/screen/screen.ts", "packages/tui/src/screen/cell.ts", "packages/tui/src/screen/text-style.ts", "packages/tui/src/screen/color.ts", "packages/tui/src/tree/frame-scheduler.ts"]
  provides: ["packages/tui/src/perf/performance-tracker.ts", "packages/tui/src/perf/frame-stats-overlay.ts", "packages/tui/src/perf/index.ts"]
  affects: ["packages/tui/src/index.ts"]
tech_stack:
  added: []
  patterns: ["Float64Array ring buffer", "direct screen rendering (bypass Widget tree)", "color-coded threshold visualization"]
key_files:
  created:
    - packages/tui/src/perf/performance-tracker.ts
    - packages/tui/src/perf/performance-tracker.test.ts
    - packages/tui/src/perf/frame-stats-overlay.ts
    - packages/tui/src/perf/frame-stats-overlay.test.ts
    - packages/tui/src/perf/index.ts
  modified:
    - packages/tui/src/index.ts
decisions: []
metrics:
  duration: "~6 min"
  completed: "2026-04-12T16:44:37Z"
  tests_total: 55
  tests_passed: 55
---

# Phase 06 Plan 08: PerformanceTracker + FrameStatsOverlay Summary

Float64Array 环形缓冲 1024 样本帧性能采样 + "Gotta Go Fast" 34x14 Screen 直绘性能面板，含颜色编码阈值 (normal/warning/destructive)

## What Was Built

### Task 1: PerformanceTracker 帧性能采样器

- **`percentile()`** — ceil 索引法百分位计算函数，支持 P50/P95/P99 等任意百分位
- **`RingBuffer`** — 基于 `Float64Array` 的环形缓冲区，容量默认 1024，自动淘汰最旧样本
- **`PerformanceTracker`** — 帧性能数据采样器，记录 frame/phase(build|layout|paint|render)/key/mouse/repaint/bytes 六类数据，提供 P95/P99/Last 全套查询 API

逆向参照: `QXT` 类 (tui-layout-engine.js:709-798) + `Yh` 函数 (tui-layout-engine.js:702-708)

| Commit | 描述 | 文件 |
|--------|------|------|
| `9ced7cd` | PerformanceTracker + Float64Array 环形缓冲 | performance-tracker.ts, performance-tracker.test.ts |

### Task 2: FrameStatsOverlay 性能叠加层渲染

- **`FrameStatsOverlay`** — 34x14 "Gotta Go Fast" 性能面板，直接在 Screen buffer 上绘制，不走 Widget 树
- 固定位置: 右上角 (screenWidth - 34 - 2, 1)
- 数据行: Key/Mouse/(空行)/Build/Layout/Paint/Render/(空行)/Frame/Repaint/Bytes 的 Last/P95/P99
- 颜色编码:
  - 时间值: normal(白) → warning(黄, >=70% 帧预算) → destructive(红, >=100% 帧预算)
  - Repaint%: normal → warning(>=20%) → destructive(>=50%)
  - Bytes: 始终 foreground
- `formatValue()`: ms(2 位小数)/percent(1 位小数+%)/bytes(k 后缀) 三种格式化
- `toggle()/show()/hide()` 显示控制
- `perf/index.ts` 统一导出，`packages/tui/src/index.ts` 集成

逆向参照: `ZXT` 类 (tui-layout-engine.js:799-1045)

| Commit | 描述 | 文件 |
|--------|------|------|
| `c58ca88` | FrameStatsOverlay + perf 模块导出 | frame-stats-overlay.ts, frame-stats-overlay.test.ts, index.ts, packages/tui/src/index.ts |

## Test Results

| 测试文件 | 测试数 | 状态 |
|----------|--------|------|
| performance-tracker.test.ts | 30 | PASS |
| frame-stats-overlay.test.ts | 25 | PASS |
| **总计** | **55** | **PASS** |

## Deviations from Plan

None — plan executed exactly as written.

## Self-Check: PASSED

- [x] packages/tui/src/perf/performance-tracker.ts EXISTS
- [x] packages/tui/src/perf/performance-tracker.test.ts EXISTS
- [x] packages/tui/src/perf/frame-stats-overlay.ts EXISTS
- [x] packages/tui/src/perf/frame-stats-overlay.test.ts EXISTS
- [x] packages/tui/src/perf/index.ts EXISTS
- [x] Commit 9ced7cd EXISTS
- [x] Commit c58ca88 EXISTS
- [x] All 55 tests PASS
