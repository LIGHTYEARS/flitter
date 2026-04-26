# 性能与调试

## 概述

`@flitter/tui` 提供**帧时间追踪、百分位统计、FPS 覆盖层**和**分级调试日志**，帮助定位渲染瓶颈和运行时异常。

## 核心概念

| 类 / 工具 | 职责 |
|---|---|
| `PerformanceTracker` | 环形缓冲采样帧时间和各阶段耗时；计算 P50/P95/P99 |
| `RingBuffer` | `Float64Array` 实现的环形缓冲，容量 1024 个样本 |
| `percentile(samples, p)` | 在排序样本上计算任意百分位（P95=0.95，P99=0.99） |
| `FrameStatsOverlay` | 终端内覆盖层，实时显示 FPS 和帧时间分布 |
| `Screen` 脏区优化 | 仅重绘变化区域的字符单元格，减少终端写入量 |
| `FLITTER_LOG_LEVEL` | 环境变量；`debug` 开启全量日志，`warn` 仅警告 |

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

## 进阶用法 — 常见性能陷阱

### 1. 在 build() 中调用 setState

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

```typescript
// 只有 MessageBubble 自身重建，而非整个列表
class MessageBubble extends StatefulWidget { ... }
```

### 3. 未使用 ListView 虚拟化

对超过 ~50 项的列表，必须使用 `ListView` 的 `builder` 模式而非 `Column({ children: [...allItems] })`：

```typescript
// 低效（一次构建全部）
new Column({ children: items.map((i) => new ItemWidget(i)) }) // ❌

// 高效（按需构建）
new ListView({
  itemCount: items.length,
  itemBuilder: (index) => new ItemWidget(items[index]),       // ✓
})
```

## 调试日志

通过环境变量开启：

```bash
FLITTER_LOG_LEVEL=debug bun run your-app.ts 2>debug.log
```

**日志频道（channel）：**

| 频道 | 内容 |
|---|---|
| `[input]` | 原始终端输入字节、键名解析 |
| `[mouse]` | 鼠标事件坐标、命中测试结果 |
| `[build]` | Widget 构建、setState 触发 |
| `[frame]` | 帧调度、RAF 时序 |
| `[paint]` | 绘制指令、脏区范围 |
| `[tui]` | TUI 初始化、resize、能力检测 |

在代码中添加日志点：

```typescript
import { logger } from "@flitter/tui/debug";

const log = logger.scoped("my-widget");
log.debug("build called", { offset: controller.offset });
```

### 检查脏区优化效果

```bash
FLITTER_LOG_LEVEL=debug bun run app.ts 2>&1 | grep '\[paint\]'
# 输出类似：[paint] dirty cells=42/1920 (2.2%)
```

## 完整示例

帧统计 + 调试日志综合演示：

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

> 📖 详细 API: [调试工具参考](/reference/subsystems/debug)
