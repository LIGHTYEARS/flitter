# Checklist — Performance Observability System

## PERF-WIRE: 管线度量桥接
- [x] PerformanceOverlay 开启后，FPS 和帧耗时 P50/P95/P99 显示非零真实数据
- [x] FrameStats 的 build/layout/paint/render 各阶段百分位数据非零
- [x] 键盘事件处理后 `FrameStats.keyEventP95` 非零
- [x] 鼠标事件处理后 `FrameStats.mouseEventP95` 非零
- [x] ScreenBuffer.getDiff() 后 `lastRepaintPercent` 返回合理百分比
- [x] 每帧 render 完成后 `FrameStats.bytesWritten` 记录非零值

## PERF-TIMELINE: Timeline 追踪
- [x] `debugFlags.debugTimeline = true` 时，FrameTimeline 生成 root span + 4 个 phase 子 span
- [x] 每个 span 包含 `durationMs`、`name`、`startTime`、`endTime` 属性
- [x] root span 包含 `totalMs`、`budgetPercent` attributes
- [x] `debugFlags.debugTimeline = false` 时，FrameTimeline 方法为 no-op，零开销

## PERF-ATTRIBUTION: Widget 级归因
- [x] `debugProfileBuilds = true` 时，`PerfAttribution.getTopSlowWidgets(5, 'build')` 返回非空结果
- [x] `debugProfileLayouts = true` 时，layout 阶段归因数据被正确记录
- [x] `debugProfilePaints = true` 时，paint 阶段归因数据被正确记录
- [x] 结果按累计耗时降序排列
- [x] `resetAll()` 后 `getTopSlowWidgets()` 返回空数组

## PERF-EXPORT: NDJSON 导出
- [x] `NdjsonPerfSink.onFrame()` 输出合法的单行 JSON，包含 `kind:"frame"` 字段
- [x] `NdjsonPerfSink.onSpan()` 输出合法的单行 JSON，包含 `kind:"span"` 字段
- [x] `WidgetsBinding.setPerfSink(sink)` 后帧数据流向自定义 sink
- [x] `FLITTER_PERF=ndjson` 环境变量设置后自动激活 NdjsonPerfSink

## PERF-OVERLAY: PerformanceOverlay 增强
- [x] PerformanceOverlay 显示 Unicode block sparkline（最近 30 帧）
- [x] 超预算帧在 sparkline 中显示为红色
- [x] PerformanceOverlay 显示 dirty node count（build / layout）
- [x] BOX_HEIGHT 增大以容纳新增内容

## debugFlags 扩展
- [x] `debugFlags` 包含 `debugTimeline`、`debugProfileBuilds`、`debugProfileLayouts`、`debugProfilePaints` 四个新标志
- [x] `FLITTER_DEBUG=timeline` 启用 `debugTimeline`
- [x] `FLITTER_DEBUG=profile` 启用全部 `debugProfile*`
- [x] `FLITTER_DEBUG=all` 启用所有标志

## 公共 API 与构建
- [x] `index.ts` 导出 `FrameStats`, `RingBuffer`, `PerformanceOverlay`, `FrameTimeline`, `PerfAttribution`, `PerfSink`, `NdjsonPerfSink`, `debugFlags`, `setDebugFlag`, `resetDebugFlags`
- [x] `npm run build` 编译通过无错误
- [x] `npm test` 全部测试通过
- [x] 新增测试覆盖 PERF-WIRE、PERF-TIMELINE、PERF-ATTRIBUTION、PERF-EXPORT 核心场景
