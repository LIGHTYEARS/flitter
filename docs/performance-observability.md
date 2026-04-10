# Flitter Performance Observability 使用指南

## 概述

Flitter 内建了一套分层的性能可观测性系统，覆盖从视觉叠加层到结构化数据导出的完整链路。所有功能**默认关闭**，启用后零开销保证（关闭时无 `performance.now()` 调用）。

```
┌──────────────────────────────────────────────────────────┐
│ L4  NDJSON Export    │ 结构化帧数据 → stderr / 自定义流  │
│ L3  Timeline         │ 每帧 span 树 (root + 4 phase)    │
│ L2  Attribution      │ 每 Widget 的 build/layout/paint   │
│ L1  Metrics Wire     │ 帧耗时 · 阶段耗时 · 事件延迟     │
│ L0  Visual Overlay   │ 终端内实时性能面板 + Sparkline    │
└──────────────────────────────────────────────────────────┘
```

---

## 快速上手

### 1. 环境变量方式（推荐）

无需改代码，启动时设置环境变量即可：

```bash
# 显示实时性能叠加层（终端右上角 34×17 面板）
FLITTER_DEBUG=pipeline bun run start

# 启用帧 Timeline span 追踪
FLITTER_DEBUG=timeline bun run start

# 启用 Widget 级性能归因（定位最慢的 Widget）
FLITTER_DEBUG=profile bun run start

# 全部启用
FLITTER_DEBUG=all bun run start

# 将帧数据导出为 NDJSON 流（写入 stderr）
FLITTER_PERF=ndjson bun run start 2>perf.ndjson

# 组合使用
FLITTER_DEBUG=all FLITTER_PERF=ndjson bun run start 2>perf.ndjson
```

### 2. 编程方式

```typescript
import {
  debugFlags,
  FrameStats,
  FrameTimeline,
  PerfAttribution,
  NdjsonPerfSink,
  WidgetsBinding,
} from 'flitter-core';
```

---

## 功能详解

### L0: PerformanceOverlay — 实时性能面板

在终端右上角渲染一个 34×17 字符的面板，实时显示：

- **FPS 和帧预算百分比**（< 70% 绿、70-100% 黄、> 100% 红）
- **Frame / Build / Layout / Paint** 各阶段的 P50 / P95 / P99
- **Repaint%** 和 **Bytes Written**（输出到 stdout 的字节数）
- **Key / Mouse** 事件处理延迟 P95
- **Dirty Nodes**: 每帧 build / layout 脏节点数
- **Sparkline**: 最近 30 帧的耗时迷你图（超 16.67ms 预算为红色）

**启用方式：**

```typescript
// 方式 A: 环境变量
// FLITTER_DEBUG=pipeline

// 方式 B: 运行时开关
debugFlags.debugShowFrameStats = true;

// 方式 C: 通过 WidgetsBinding 切换
WidgetsBinding.instance.toggleFrameStatsOverlay();
```

### L1: FrameStats — 帧级度量收集

`FrameStats` 使用 `Float64Array` 环形缓冲区收集每帧的计时数据，提供百分位统计。

**自动收集的数据：**

| 度量 | 说明 | API |
|------|------|-----|
| 帧总耗时 | 每帧 BUILD→RENDER 全链路时间 | `p50`, `p95`, `p99` |
| 阶段耗时 | build / layout / paint / render 各自耗时 | `getPhasePercentile(phase, p)`, `phaseP50(phase)` |
| 键盘事件延迟 | EventDispatcher 处理键盘事件的耗时 | `keyEventP95` |
| 鼠标事件延迟 | EventDispatcher 处理鼠标事件的耗时 | `mouseEventP95` |
| Repaint 百分比 | 每帧 diff 变化的 cell 占比 | `repaintPercentP95` |
| 写入字节数 | 输出到 stdout 的 ANSI 序列字节数 | `bytesWrittenP95` |

**使用示例：**

```typescript
const stats = WidgetsBinding.instance.getFrameStats();

// 百分位查询
console.log(`Frame P95: ${stats.p95.toFixed(2)}ms`);
console.log(`Build P50: ${stats.phaseP50('build').toFixed(2)}ms`);
console.log(`Key Event P95: ${stats.keyEventP95.toFixed(2)}ms`);

// 获取最近 N 帧的原始数据（用于自定义可视化）
const recentFrames = stats.getRecentFrameTimes(60);
```

### L2: PerfAttribution — Widget 级性能归因

当 build/layout/paint 慢时，定位具体是哪个 Widget/RenderObject 拖慢了帧率。

**启用方式：**

```typescript
// 环境变量
// FLITTER_DEBUG=profile

// 或运行时逐项开启
debugFlags.debugProfileBuilds = true;   // 追踪每个 Widget 的 build() 耗时
debugFlags.debugProfileLayouts = true;  // 追踪每个 RenderObject 的 layout() 耗时
debugFlags.debugProfilePaints = true;   // 追踪每个 RenderObject 的 paint() 耗时
```

**查询最慢的 Widget：**

```typescript
const attribution = PerfAttribution.instance;

// 获取 build 阶段最慢的 5 个 Widget
const slowBuilds = attribution.getTopSlowWidgets(5, 'build');
for (const entry of slowBuilds) {
  console.log(`${entry.name}: ${entry.totalMs.toFixed(2)}ms (${entry.count} calls, avg ${entry.avgMs.toFixed(2)}ms)`);
}

// 获取 layout 阶段最慢的 3 个 RenderObject
const slowLayouts = attribution.getTopSlowWidgets(3, 'layout');

// 获取 paint 阶段最慢的 3 个 RenderObject
const slowPaints = attribution.getTopSlowWidgets(3, 'paint');

// 当前帧的脏节点计数
console.log(`Dirty builds: ${attribution.frameBuildCount}`);
console.log(`Dirty layouts: ${attribution.frameLayoutCount}`);

// 重置所有累计数据
attribution.resetAll();
```

**返回值类型：**

```typescript
interface WidgetPerfEntry {
  name: string;     // Widget/RenderObject 的类名
  totalMs: number;  // 累计总耗时
  count: number;    // 调用次数
  avgMs: number;    // 平均每次耗时
}
```

### L3: FrameTimeline — 结构化 Span 追踪

为每帧生成层次化的 span 追踪数据，类似 Chrome DevTools Timeline。

**启用方式：**

```typescript
// FLITTER_DEBUG=timeline
debugFlags.debugTimeline = true;
```

**Span 结构：**

```
frame:42 (root span)
├── build   { durationMs: 0.45, dirtyNodes: 3 }
├── layout  { durationMs: 0.30 }
├── paint   { durationMs: 0.25 }
└── render  { durationMs: 0.20 }
attributes: { totalMs: 1.20, budgetPercent: 7.2 }
```

**手动访问：**

```typescript
const timeline = WidgetsBinding.instance.getFrameTimeline();

// 最近完成的帧 span（用于调试/测试）
const lastSpan = timeline.lastFrameSpan;
if (lastSpan) {
  console.log(`Frame ${lastSpan.name}: ${lastSpan.durationMs}ms`);
  for (const child of lastSpan.children) {
    console.log(`  ${child.name}: ${child.durationMs}ms`);
  }
}
```

**TimelineSpan 类型：**

```typescript
interface TimelineSpan {
  kind: 'span';
  name: string;
  startTime: number;     // performance.now() 时间戳
  endTime?: number;
  durationMs?: number;
  attributes: Record<string, unknown>;
  children: TimelineSpan[];
}
```

### L4: PerfSink + NDJSON Export — 数据导出管道

将帧级度量和 Timeline span 导出为 NDJSON（每行一个 JSON 对象）流，便于外部工具分析。

**环境变量激活：**

```bash
# 自动创建 NdjsonPerfSink，写入 stderr
FLITTER_PERF=ndjson bun run start 2>perf.ndjson
```

**编程式激活：**

```typescript
import { NdjsonPerfSink } from 'flitter-core';

// 写入 stderr（默认）
WidgetsBinding.instance.setPerfSink(new NdjsonPerfSink());

// 写入自定义目标
const sink = new NdjsonPerfSink((line) => {
  myLogCollector.append(line);
});
WidgetsBinding.instance.setPerfSink(sink);

// 关闭导出
WidgetsBinding.instance.setPerfSink(null);
```

**自定义 PerfSink：**

```typescript
import type { PerfSink, FramePerfData } from 'flitter-core';
import type { TimelineSpan } from 'flitter-core';

class MyCustomSink implements PerfSink {
  onFrame(data: FramePerfData): void {
    // data.kind === 'frame'
    // data.frameNumber, data.totalMs, data.phases, data.dirtyNodes, ...
    if (data.totalMs > 16.67) {
      alertSlowFrame(data);
    }
  }

  onSpan(span: TimelineSpan): void {
    // 结构化 span 数据
    sendToTracing(span);
  }
}

WidgetsBinding.instance.setPerfSink(new MyCustomSink());
```

**NDJSON 输出格式：**

```jsonl
{"kind":"frame","frameNumber":1,"totalMs":12.5,"phases":{"build":3,"layout":2,"paint":4,"render":3.5},"dirtyNodes":{"build":10,"layout":5},"repaintPercent":15.2,"bytesWritten":4096}
{"kind":"span","name":"frame:1","startTime":1234567.89,"endTime":1234580.39,"durationMs":12.5,"attributes":{"totalMs":12.5,"budgetPercent":75},"children":[...]}
```

---

## debugFlags 参考

| 标志 | 默认 | 环境变量 | 说明 |
|------|------|----------|------|
| `debugShowFrameStats` | false | `FLITTER_DEBUG=pipeline` | 启用 PerformanceOverlay |
| `debugPrintBuilds` | false | `FLITTER_DEBUG=verbose` | 日志每次 Widget.build() |
| `debugPrintLayouts` | false | `FLITTER_DEBUG=verbose` | 日志每次 performLayout() |
| `debugPrintPaints` | false | `FLITTER_DEBUG=verbose` | 日志每次 paint() |
| `debugTimeline` | false | `FLITTER_DEBUG=timeline` | 启用 FrameTimeline span |
| `debugProfileBuilds` | false | `FLITTER_DEBUG=profile` | 启用 build 归因 |
| `debugProfileLayouts` | false | `FLITTER_DEBUG=profile` | 启用 layout 归因 |
| `debugProfilePaints` | false | `FLITTER_DEBUG=profile` | 启用 paint 归因 |
| `debugPaintSize` | false | — | 显示 RenderBox 边界 |
| `debugRepaintRainbow` | false | — | 重绘区域彩虹色 |
| `debugInspectorEnabled` | false | — | HTTP 调试检查器 (9876) |
| `debugMode` | false | — | 运行时不变量检查 |

**快捷映射：**

| FLITTER_DEBUG 值 | 启用的标志 |
|-------------------|-----------|
| `pipeline` | `debugShowFrameStats` |
| `verbose` | `debugShowFrameStats` + `debugPrint{Builds,Layouts,Paints}` |
| `timeline` | `debugTimeline` |
| `profile` | `debugProfile{Builds,Layouts,Paints}` |
| `all` | 所有标志全部开启 |

---

## 实战场景

### 场景 1: 帧率下降排查

```bash
# Step 1: 开启性能面板观察整体情况
FLITTER_DEBUG=pipeline bun run start
# 观察 PerformanceOverlay 中哪个阶段 (Build/Layout/Paint) 耗时最长

# Step 2: 定位到具体 Widget
FLITTER_DEBUG=profile bun run start
```

```typescript
// 在 postFrameCallback 中查询最慢的 Widget
WidgetsBinding.instance.frameScheduler.addPostFrameCallback(() => {
  const top = PerfAttribution.instance.getTopSlowWidgets(3, 'build');
  if (top.length > 0 && top[0].avgMs > 1) {
    console.error(`Slow build: ${top[0].name} avg=${top[0].avgMs.toFixed(2)}ms`);
  }
});
```

### 场景 2: 导出性能数据进行离线分析

```bash
# 同时启用 Timeline 和 NDJSON 导出
FLITTER_DEBUG=timeline FLITTER_PERF=ndjson bun run start 2>perf.ndjson
```

```bash
# 分析帧数据
cat perf.ndjson | jq 'select(.kind=="frame") | {frame: .frameNumber, total: .totalMs, build: .phases.build}'

# 找出超预算帧
cat perf.ndjson | jq 'select(.kind=="frame" and .totalMs > 16.67)'

# 统计平均帧时间
cat perf.ndjson | jq -s '[.[] | select(.kind=="frame")] | (map(.totalMs) | add / length)'
```

### 场景 3: 监控生产环境性能

```typescript
import type { PerfSink, FramePerfData } from 'flitter-core';

class PerformanceMonitor implements PerfSink {
  private _slowFrameCount = 0;

  onFrame(data: FramePerfData): void {
    if (data.totalMs > 16.67) {
      this._slowFrameCount++;
      if (this._slowFrameCount % 100 === 0) {
        reportMetric('slow_frames', this._slowFrameCount);
      }
    }
  }

  onSpan(): void {}
}
```

---

## 零开销设计

所有性能可观测性功能遵循 **"关闭即零成本"** 原则：

- `debugTimeline = false` → `FrameTimeline.beginFrame()` 第一行 `return`，无 `performance.now()` 调用
- `debugProfileBuilds = false` → build 循环走 `else` 分支，无计时代码
- 无 `PerfSink` → render 回调中跳过 `FramePerfData` 构造
- `FrameStats` 的 `recordFrame/recordPhase` 始终运行（开销 ~50ns/call），为 PerformanceOverlay 提供数据

核心管线度量（FrameStats 记录）是唯一 always-on 的开销，使用 `Float64Array` 环形缓冲区，无 GC 压力。
