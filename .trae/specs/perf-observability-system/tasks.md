# Tasks

## Task 1: 管线度量桥接 (PERF-WIRE) — 让数据流起来
将 FrameScheduler 的帧/阶段计时数据桥接到 WidgetsBinding 的 FrameStats 实例，使 PerformanceOverlay 能显示真实数据。同时在 EventDispatcher 中增加事件处理计时，在 render 阶段收集 repaint% 和字节数。

- [x] SubTask 1.1: 在 `binding.ts` 的 6 个 frame callback 中增加 FrameStats 数据收集
  - paint-phase callback 结束后调用 `getFrameStats().recordPhase('paint', ms)`
  - render-phase callback 结束后收集 `patches.length`, `output.length`, repaint% 并记录
  - 在 `frame-start` callback 中增加 `recordFrame()` 调用（用上一帧的总耗时）
  - 注意：利用 FrameScheduler.frameStats.lastFrameTime 获取帧总时间
- [x] SubTask 1.2: 在 `event-dispatcher.ts` 中包装 dispatch 方法，记录事件处理耗时
  - 键盘事件完成后 → `FrameStats.recordKeyEvent(ms)`
  - 鼠标事件完成后 → `FrameStats.recordMouseEvent(ms)`
  - 需要从 binding 获取 FrameStats 引用（通过 WidgetsBinding.instance）
- [x] SubTask 1.3: 在 `screen-buffer.ts` 的 `getDiff()` 方法中计算 repaint 百分比
  - repaint% = (changed cells / total cells) * 100
  - 暴露 `lastRepaintPercent` getter

## Task 2: Timeline 追踪层 (PERF-TIMELINE)
新建 `frame-timeline.ts`，提供每帧结构化 span 追踪。

- [x] SubTask 2.1: 创建 `diagnostics/frame-timeline.ts`
  - `FrameTimeline` 类：`beginFrame(frameNumber)` → 创建 root span
  - `beginPhase(phase)` / `endPhase(phase, attrs)` → 创建/关闭子 span
  - `endFrame(attrs)` → 关闭 root span + 通知 PerfSink
  - 受 `debugFlags.debugTimeline` 保护：false 时所有方法为 no-op
  - Span 数据结构兼容 flitter-cli 的 `Span` 接口
- [x] SubTask 2.2: 在 `binding.ts` 中集成 FrameTimeline
  - `frame-start` callback 调用 `frameTimeline.beginFrame()`
  - 各阶段 callback 前后调用 `beginPhase()`/`endPhase()`
  - `render-phase` callback 结束后调用 `endFrame()`

## Task 3: Widget 级性能归因 (PERF-ATTRIBUTION)
新建 `perf-attribution.ts`，跟踪每个 Widget 的 build/layout/paint 累计耗时。

- [x] SubTask 3.1: 创建 `diagnostics/perf-attribution.ts`
  - `PerfAttribution` 单例类
  - `recordBuild(widgetName, ms)` / `recordLayout(roName, ms)` / `recordPaint(roName, ms)`
  - `getTopSlowWidgets(n, phase)` → 返回 `{name, totalMs, count, avgMs}[]`
  - `resetFrame()` 重置当前帧计数（不重置累计）
  - `resetAll()` 重置所有数据
- [x] SubTask 3.2: 在 `build-owner.ts` 的 `buildScope()` 中，当 `debugProfileBuilds` 启用时，包装每个 `performRebuild()` 调用记录耗时
- [x] SubTask 3.3: 在 `pipeline-owner.ts` 的 `flushLayout()` 中，当 `debugProfileLayouts` 启用时，包装每个 layout 调用记录耗时
- [x] SubTask 3.4: 在 `scheduler/paint.ts` 的 `paintRenderTree()` 中，当 `debugProfilePaints` 启用时，包装每个 `paint()` 调用记录耗时

## Task 4: NDJSON 导出管道 (PERF-EXPORT)
新建 `perf-sink.ts`，提供性能数据的结构化导出。

- [x] SubTask 4.1: 创建 `diagnostics/perf-sink.ts`
  - `PerfSink` 接口：`onFrame(data: FramePerfData)`, `onSpan(span: TimelineSpan)`
  - `FramePerfData` 类型：frameNumber, totalMs, phases, dirtyNodes, repaintPercent, bytesWritten
  - `NdjsonPerfSink` 类：实现 `PerfSink`，将数据 JSON.stringify 写入 Writable
- [x] SubTask 4.2: 在 `binding.ts` 中集成 PerfSink
  - `setPerfSink(sink)` / `getPerfSink()` 方法
  - 每帧 render 完成后，如有 sink 则调用 `sink.onFrame(data)`
  - FrameTimeline endFrame 时，如有 sink 则调用 `sink.onSpan(span)`
- [x] SubTask 4.3: 在 `debug-flags.ts` 的 `applyEnvDebugFlags()` 中处理 `FLITTER_PERF=ndjson` 环境变量

## Task 5: debugFlags 扩展与环境变量映射
扩展 debugFlags 对象并更新环境变量映射。

- [x] SubTask 5.1: 在 `debug-flags.ts` 中新增 4 个标志和环境变量映射
  - `debugTimeline`, `debugProfileBuilds`, `debugProfileLayouts`, `debugProfilePaints`
  - `FLITTER_DEBUG=timeline` → `debugTimeline`
  - `FLITTER_DEBUG=profile` → 全部 `debugProfile*`
  - `FLITTER_DEBUG=all` → 所有标志

## Task 6: PerformanceOverlay 增强
增加帧 sparkline 和脏节点统计显示。

- [x] SubTask 6.1: 在 `FrameStats` 中增加 `getRecentFrameTimes(n)` 方法，返回最近 n 帧的耗时数组
- [x] SubTask 6.2: 在 `perf-overlay.ts` 中增加 sparkline 渲染
  - 使用 Unicode block characters（▁▂▃▄▅▆▇█）绘制最近 30 帧
  - 超 16.67ms 预算的帧用红色，否则用绿色
- [x] SubTask 6.3: 在 `perf-overlay.ts` 中增加脏节点计数行
  - 调大 BOX_HEIGHT（14 → 17）容纳新内容
  - 显示 `Dirty: build={n} layout={n}`

## Task 7: 公共 API 导出与测试
更新 index.ts 导出新的公共 API，并添加测试。

- [x] SubTask 7.1: 在 `index.ts` 中导出所有新的公共类型和类
- [x] SubTask 7.2: 为 PERF-WIRE 桥接逻辑添加测试
  - 验证帧执行后 FrameStats 包含真实数据
  - 验证事件计时被记录
- [x] SubTask 7.3: 为 FrameTimeline 添加测试
  - 验证 debugTimeline=true 时生成正确 span 结构
  - 验证 debugTimeline=false 时为 no-op
- [x] SubTask 7.4: 为 PerfAttribution 添加测试
- [x] SubTask 7.5: 为 NdjsonPerfSink 添加测试
- [x] SubTask 7.6: 运行 `npm run build` 确保编译通过
- [x] SubTask 7.7: 运行 `npm test` 确保所有测试通过

# Task Dependencies
- Task 5 (debugFlags) 无依赖，可最先执行
- Task 1 (PERF-WIRE) 依赖 Task 5
- Task 2 (PERF-TIMELINE) 依赖 Task 5
- Task 3 (PERF-ATTRIBUTION) 依赖 Task 5
- Task 4 (PERF-EXPORT) 依赖 Task 2
- Task 6 (PERF-OVERLAY) 依赖 Task 1
- Task 7 (API + 测试) 依赖 Task 1-6 全部
- Task 5, Task 1, Task 2, Task 3 可并行执行（Task 5 先完成后）
