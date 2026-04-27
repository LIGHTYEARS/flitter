# 性能与调试

## 概述

当你的 TUI 应用出现卡顿、闪烁、或者响应变慢时，就需要用到性能与调试工具。Flitter 提供了帧时间追踪、实时 FPS 覆盖层和分级调试日志，帮助你快速定位问题根源。

`@flitter/tui` 提供**帧时间追踪、百分位统计、FPS 覆盖层**和**分级调试日志**，帮助定位渲染瓶颈和运行时异常。

**你将学到什么：**

- 常见的性能陷阱以及如何避免
- 如何使用 `PerformanceTracker` 追踪帧时间
- 如何用 FPS 覆盖层实时监控性能
- 如何使用调试日志排查问题

## 快速检查清单

遇到性能问题时，先按这个清单逐项排查：

- [ ] 是否在 `build()` 方法中调用了 `setState`？（会导致无限重建循环）
- [ ] 是否对长列表（>50 项）使用了 `ListView` 虚拟化？
- [ ] 高频更新的状态是否下推到了最小子树？（避免整树重建）
- [ ] 是否有不必要的父 Widget 重建？（考虑用 `StatefulWidget` 隔离可变状态）

## 常见性能陷阱

:::warning 这些是最常见的性能问题
以下三个陷阱覆盖了大部分 TUI 性能问题。在使用 PerformanceTracker 等高级工具之前，先确保你的代码没有踩到这些坑。
:::

### 1. 在 build() 中调用 setState

<!-- 错误示例：在 build 方法中调用 setState 会导致无限循环 -->

```typescript
// 错误：触发无限重建循环
build(context) {
  setState(() => counter++); // ❌
  return new Text(`${counter}`);
}

// 正确：在事件回调中调用
onTap: () => setState(() => counter++)  // ✓
```

### 2. 不必要的整树重建

避免在高频更新路径（如流式输出）中重建大量父 Widget。使用 `StatefulWidget` 将可变状态下推到最小子树：

<!-- 演示将可变状态隔离到最小子树，避免父 Widget 连带重建 -->

```typescript
// 只有 MessageBubble 自身重建，而非整个列表
class MessageBubble extends StatefulWidget { ... }
```

### 3. 未使用 ListView 虚拟化

对超过 ~50 项的列表，必须使用 `ListView` 的 `builder` 模式而非 `Column({ children: [...allItems] })`：

<!-- 演示使用 ListView builder 模式替代一次性构建全部列表项 -->

```typescript
// 低效（一次构建全部）
new Column({ children: items.map((i) => new ItemWidget(i)) }) // ❌

// 高效（按需构建）
new ListView({
  itemCount: items.length,
  itemBuilder: (index) => new ItemWidget(items[index]),       // ✓
})
```

## 核心概念

下表列出了性能与调试相关的工具和 API。日常开发中，大部分开发者只需要关注 `PerformanceTracker` 和 `FLITTER_LOG_LEVEL` 环境变量。

| 类 / 工具 | 职责 |
|---|---|
| `PerformanceTracker` | 环形缓冲采样帧时间和各阶段耗时；计算 P50/P95/P99 |
| `RingBuffer` | `Float64Array` 实现的环形缓冲，容量 1024 个样本 |
| `percentile(samples, p)` | 在排序样本上计算任意百分位（P95=0.95，P99=0.99） |
| `FrameStatsOverlay` | 终端内覆盖层，实时显示 FPS 和帧时间分布 |
| `Screen` 脏区优化 | 仅重绘变化区域的字符单元格，减少终端写入量 |
| `FLITTER_LOG_LEVEL` | 环境变量；`debug` 开启全量日志，`warn` 仅警告 |

:::info 最常用的是 `PerformanceTracker` 和 `FLITTER_LOG_LEVEL` 环境变量，大部分调试场景只需要它们就够了。
:::

### PerformanceTracker API

```
recordFrame(ms)            // 记录一帧总耗时
recordPhase(phase, ms)     // 记录单阶段耗时（build/layout/paint/flush）
getFrameP50() / getFrameP95() / getFrameP99()
getPhaseP95(phase)
getSummary()               // 返回 { frameP95, frameP99, phaseBreakdown }
reset()
```

## 基本用法

### 启用性能追踪

<!-- 演示如何创建 PerformanceTracker 并在帧回调中记录帧时间 -->

```typescript
import { PerformanceTracker } from "@flitter/tui/perf";

const tracker = new PerformanceTracker();

// 在帧调度器的 afterFrame 钩子中记录
frameScheduler.addPostFrameCallback((frameTimeMs) => {
  tracker.recordFrame(frameTimeMs);
});

// 读取统计
console.log(`P95帧时间: ${tracker.getFrameP95().toFixed(1)}ms`);
```

### FrameStatsOverlay：实时 FPS 覆盖层

<!-- 演示在应用顶层叠加 FPS 实时监控覆盖层 -->

```typescript
import { FrameStatsOverlay } from "@flitter/tui/perf";

// 在顶层 Widget 中叠加
new Stack({
  children: [
    mainApp,
    new FrameStatsOverlay({ tracker, position: "top-right" }),
  ],
})
```

覆盖层显示当前 FPS、P95 帧时间和最近 60 帧的迷你折线图。

## 调试日志

调试日志可以帮你了解应用内部发生了什么。开启方式很简单，只需设置一个环境变量：

```bash
FLITTER_LOG_LEVEL=debug bun run your-app.ts 2>debug.log
```

这会将所有调试信息输出到 `debug.log` 文件（通过 stderr 重定向），不影响正常的终端渲染。

**日志频道（channel）：**

下表列出了所有可用的日志频道。当你排查特定问题时，可以用 `grep` 过滤对应频道的输出。

| 频道 | 内容 |
|---|---|
| `[input]` | 原始终端输入字节、键名解析 |
| `[mouse]` | 鼠标事件坐标、命中测试结果 |
| `[build]` | Widget 构建、setState 触发 |
| `[frame]` | 帧调度、RAF 时序 |
| `[paint]` | 绘制指令、脏区范围 |
| `[tui]` | TUI 初始化、resize、能力检测 |

在代码中添加自定义日志点：

<!-- 演示在自定义 Widget 中添加调试日志 -->

```typescript
import { logger } from "@flitter/tui/debug";

const log = logger.scoped("my-widget");
log.debug("build called", { offset: controller.offset });
```

### 检查脏区优化效果

<!-- 演示通过过滤 paint 频道日志来检查脏区优化是否生效 -->

```bash
FLITTER_LOG_LEVEL=debug bun run app.ts 2>&1 | grep '\[paint\]'
# 输出类似：[paint] dirty cells=42/1920 (2.2%)
```

## 完整示例

帧统计 + 调试日志综合演示：

<!-- 综合演示：在应用中同时使用帧统计覆盖层和调试日志 -->

```typescript
const tracker = new PerformanceTracker();

const app = new Stack({
  children: [
    new MyApp({ tracker }),
    new FrameStatsOverlay({ tracker }),
  ],
});
```

:::tip 运行示例
```bash
bun run examples/debug-paint-pipeline.ts
```
:::

## 下一步

> 详细 API: [调试工具参考](/reference/subsystems/debug)
