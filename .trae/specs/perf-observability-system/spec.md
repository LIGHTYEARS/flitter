# Performance Observability System Spec

## Why

flitter-core 已具备基础性能基础设施（`FrameStats` 环形缓冲区、`PerformanceOverlay` 实时面板、`debugFlags` 调试开关），但这些组件之间**缺乏系统性整合**，存在 5 个关键 gap：

1. **数据不流通**：`FrameScheduler` 有自己的 `FrameStats` 接口（仅存 lastTime），`WidgetsBinding` 有 `FrameStats` 类（环形缓冲+百分位），二者不通信 —— PerformanceOverlay 显示的数据全是 0。
2. **无事件级追踪**：键盘/鼠标事件处理耗时从未被记录到 `FrameStats` 中。
3. **无 Timeline/Span 追踪**：flitter-cli 的 `TraceStore` 仅用于 AI 请求追踪，框架核心无结构化 span 追踪机制。
4. **无 NDJSON 导出**：性能数据只能通过 PerformanceOverlay 肉眼查看或 debugPrint stderr，无法导出到外部分析工具。
5. **缺少 Widget 级归因**：无法知道哪个 Widget 的 build/layout/paint 最慢。

## What Changes

### 核心管线度量整合 (PERF-WIRE)
- **FrameScheduler → FrameStats 桥接**：在每帧执行完成后，将帧总耗时和各阶段耗时写入 `WidgetsBinding.getFrameStats()`
- **事件处理计时**：在 `EventDispatcher` 中包装键盘/鼠标事件分发，记录处理耗时到 `FrameStats`
- **Render 阶段度量**：记录 diff patch 数量、输出字节数、repaint 百分比到 `FrameStats`

### Timeline 追踪层 (PERF-TIMELINE)
- 新增 `FrameTimeline` 类：每帧创建一个根 span，4 个阶段各创建子 span，span 包含结构化 attributes
- 兼容 `TraceStore`/`Span` 接口，可复用 flitter-cli 的 NDJSON 基础设施
- 受 `debugFlags.debugTimeline` 开关保护，生产环境零开销

### Widget 级性能归因 (PERF-ATTRIBUTION)
- 新增 `debugProfileBuilds` / `debugProfileLayouts` / `debugProfilePaints` 标志
- 当启用时，记录每个 Widget/RenderObject 的 build/layout/paint 耗时到 per-frame attribution 表
- 提供 `getTopSlowWidgets(n)` API 查询最慢的 N 个 Widget

### NDJSON 导出管道 (PERF-EXPORT)
- 新增 `PerfSink` 接口：接收结构化性能事件
- 内置 `NdjsonPerfSink`：将帧指标和 Timeline span 写入可配置的 `Writable`（默认 stderr）
- 通过 `WidgetsBinding.setPerfSink(sink)` 或环境变量 `FLITTER_PERF=ndjson` 激活

### PerformanceOverlay 增强 (PERF-OVERLAY)
- 修复数据源：使 overlay 读取真实管线数据
- 增加帧柱状图（sparkline）：最近 60 帧的耗时柱状图，超预算帧红色高亮
- 增加 dirty node count 显示：每帧 build/layout/paint 的脏节点数

## Impact

- **受影响模块**：
  - `packages/flitter-core/src/diagnostics/` — 新增 `frame-timeline.ts`, `perf-sink.ts`, `perf-attribution.ts`；修改 `debug-flags.ts`, `perf-overlay.ts`
  - `packages/flitter-core/src/scheduler/frame-scheduler.ts` — 增加 FrameStats 桥接逻辑
  - `packages/flitter-core/src/framework/binding.ts` — 增加度量收集 hook
  - `packages/flitter-core/src/input/event-dispatcher.ts` — 增加事件处理计时
  - `packages/flitter-core/src/terminal/screen-buffer.ts` — 增加 repaint% 计算
  - `packages/flitter-core/src/index.ts` — 导出新的公共 API
- **BREAKING**: 无。所有新功能默认关闭，零运行时开销。

---

## ADDED Requirements

### Requirement: 管线度量桥接 (PERF-WIRE)

系统 SHALL 在每帧执行完成后，将帧总耗时和各阶段（build/layout/paint/render）耗时自动写入 `FrameStats` 环形缓冲区。

#### Scenario: PerformanceOverlay 显示真实数据
- **WHEN** 用户通过 `toggleFrameStatsOverlay()` 开启性能叠加层
- **THEN** 叠加层显示的 FPS、Frame P50/P95/P99 反映真实帧执行数据而非全零

#### Scenario: 事件处理耗时被记录
- **WHEN** 键盘或鼠标事件被 EventDispatcher 分发处理
- **THEN** 处理耗时（ms）被记录到 `FrameStats.keyEventTimes` / `mouseEventTimes`

#### Scenario: Render 阶段度量被记录
- **WHEN** 一帧完成 render 阶段
- **THEN** repaint 百分比和输出字节数被记录到 `FrameStats.repaintPercents` / `bytesWritten`

---

### Requirement: Timeline 追踪 (PERF-TIMELINE)

系统 SHALL 提供一个 `FrameTimeline` 类，在启用时为每帧生成结构化的 span 追踪数据。

#### Scenario: 帧 span 层次结构
- **WHEN** `debugFlags.debugTimeline = true` 且一帧开始执行
- **THEN** 生成 root span `frame:{n}` 包含 4 个子 span `build`/`layout`/`paint`/`render`

#### Scenario: span 携带结构化 attributes
- **WHEN** 一帧完成
- **THEN** 每个 phase span 包含 `durationMs`、`dirtyNodeCount` 等属性
- **AND** root span 包含 `totalMs`、`fps`、`budgetPercent`

#### Scenario: 生产环境零开销
- **WHEN** `debugFlags.debugTimeline = false`（默认值）
- **THEN** `FrameTimeline` 方法为 no-op，无 `performance.now()` 调用

---

### Requirement: Widget 级性能归因 (PERF-ATTRIBUTION)

系统 SHALL 在启用时记录每个 Widget/RenderObject 的 build/layout/paint 耗时。

#### Scenario: 查询最慢 Widget
- **WHEN** `debugFlags.debugProfileBuilds = true` 且若干帧执行完成
- **THEN** `PerfAttribution.getTopSlowWidgets(5)` 返回累计 build 耗时 top 5 的 Widget 类名及耗时

#### Scenario: Per-frame attribution 重置
- **WHEN** 新帧开始
- **THEN** 当前帧的 per-widget 计时器重置，不影响累计统计

---

### Requirement: NDJSON 性能导出 (PERF-EXPORT)

系统 SHALL 提供 `PerfSink` 接口和 `NdjsonPerfSink` 实现，将帧级度量和 Timeline span 导出为 NDJSON 流。

#### Scenario: 环境变量激活
- **WHEN** `FLITTER_PERF=ndjson` 环境变量设置
- **THEN** 自动创建 `NdjsonPerfSink` 将 NDJSON 写入 stderr

#### Scenario: NDJSON 格式
- **WHEN** 一帧完成
- **THEN** 输出一行 JSON 包含 `{kind:"frame", frameNumber, totalMs, phases:{build,layout,paint,render}, dirtyNodes, repaintPercent, bytesWritten}`

#### Scenario: 编程式激活
- **WHEN** 调用 `WidgetsBinding.instance.setPerfSink(customSink)`
- **THEN** 后续帧数据流向自定义 sink

---

### Requirement: PerformanceOverlay 增强 (PERF-OVERLAY-ENHANCED)

系统 SHALL 在 PerformanceOverlay 中增加帧耗时 sparkline 和脏节点统计。

#### Scenario: 帧 sparkline
- **WHEN** PerformanceOverlay 渲染
- **THEN** 在面板底部显示最近 30 帧的 Unicode block sparkline，超预算帧红色

#### Scenario: 脏节点计数
- **WHEN** PerformanceOverlay 渲染
- **THEN** 显示当前帧的 dirtyBuild / dirtyLayout 节点数

---

## MODIFIED Requirements

### Requirement: debugFlags 扩展

现有 `debugFlags` 对象 SHALL 新增以下标志：
- `debugTimeline: boolean` — 启用 FrameTimeline span 追踪
- `debugProfileBuilds: boolean` — 启用 per-widget build 耗时归因
- `debugProfileLayouts: boolean` — 启用 per-widget layout 耗时归因
- `debugProfilePaints: boolean` — 启用 per-widget paint 耗时归因

`FLITTER_DEBUG=timeline` 映射启用 `debugTimeline`。
`FLITTER_DEBUG=profile` 映射启用全部 `debugProfile*` 标志。
`FLITTER_DEBUG=all` 映射启用所有标志。

### Requirement: index.ts 公共 API 扩展

`packages/flitter-core/src/index.ts` SHALL 导出：
- `FrameStats` (class), `RingBuffer` (class) — 从 `diagnostics/frame-stats`
- `PerformanceOverlay` (class) — 从 `diagnostics/perf-overlay`
- `FrameTimeline` (class) — 从 `diagnostics/frame-timeline`
- `PerfAttribution` (class) — 从 `diagnostics/perf-attribution`
- `PerfSink` (interface), `NdjsonPerfSink` (class) — 从 `diagnostics/perf-sink`
- `debugFlags`, `setDebugFlag`, `resetDebugFlags` — 从 `diagnostics/debug-flags`

---

## REMOVED Requirements

无。
