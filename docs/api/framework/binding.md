# WidgetsBinding / runApp

`来源: src/framework/binding.ts`

顶层编排器，将 BuildOwner、PipelineOwner、TerminalManager、ScreenBuffer 和 Renderer 组合在一起。单例模式，通过在 FrameScheduler 上注册阶段回调来协调 4 阶段帧管线：BUILD -> LAYOUT -> PAINT -> RENDER。

## runApp

```typescript
async function runApp(widget: Widget, options?: RunAppOptions): Promise<WidgetsBinding>
```

顶层入口函数（Amp cz8 thin wrapper）。获取 WidgetsBinding 单例，委托给 `binding.runApp(widget, options)`。初始化终端、附加根 Widget、调度首帧。

```typescript
import { runApp } from './framework/binding';
await runApp(new MyApp(), { output: process.stdout });
```

## WidgetsBinding

### 获取实例

```typescript
// 单例访问
const binding = WidgetsBinding.instance;
```

### 属性

| 属性 | 类型 | 说明 |
|------|------|------|
| buildOwner | `BuildOwner` | 构建所有者 |
| pipelineOwner | `PipelineOwner` | 管道所有者 |
| rootElement | `Element \| null` | 根 Element |
| isRunning | `boolean` | 是否运行中 |

### 脏状态追踪

| 属性 | 类型 | 说明 |
|------|------|------|
| forcePaintOnNextFrame | `boolean` | 下一帧强制绘制 |
| shouldPaintCurrentFrame | `boolean` | 当前帧是否应绘制 |
| didPaintCurrentFrame | `boolean` | 当前帧是否已完成绘制 |
| pendingResizeEvent | `object \| null` | 待处理的 resize 事件 |

### 屏幕缓冲区方法

#### `getScreen(): ScreenBuffer`

获取屏幕缓冲区（惰性创建）。

#### `getRenderer(): Renderer`

获取渲染器（惰性创建）。

#### `setOutput(output: OutputWriter | null): void`

设置输出写入器。测试时传 `null`，生产环境传 `process.stdout`。

```typescript
interface OutputWriter {
  write(data: string): void;
}
```

### 生命周期方法

#### `attachRootWidget(widget: Widget): void`

附加根 Widget，创建三棵树（Widget/Element/RenderObject），设置初始约束。

#### `drawFrameSync(): void`

同步帧执行（测试辅助方法）。执行完整管线：beginFrame -> processResizeIfPending -> BUILD -> LAYOUT -> PAINT -> RENDER。

::: warning 无 drawFrame()
v1.3 起 WidgetsBinding 不再有 `drawFrame()` 方法。帧执行完全由 FrameScheduler 通过注册的阶段回调驱动。参见 [渲染管线](/guide/rendering-pipeline)。
:::

### 帧阶段方法

#### `beginFrame(): void`

帧开始。根据脏状态决定是否需要绘制。

#### `processResizeIfPending(): void`

处理待定的 resize 事件。更新缓冲区大小和约束。

#### `paint(): void`

绘制阶段。将渲染树绘制到屏幕缓冲区。如果 `shouldPaintCurrentFrame` 为 false 则跳过。

#### `render(): void`

渲染阶段。计算 diff 并写出 ANSI 输出。仅在 paint 阶段执行后才运行。

### Resize 处理

#### `handleResize(width: number, height: number): void`

处理终端窗口大小变化。设置待处理事件并调度新帧。

#### `requestForcedPaintFrame(): void`

请求下一帧强制绘制。

### 静态方法

#### `WidgetsBinding.reset(): void`

重置单例（用于测试）。清理 BuildOwner、PipelineOwner、屏幕缓冲区和渲染器。

#### `stop(): void`

停止运行。卸载根 Element，dispose 所有资源。

## 示例

```typescript
import { runApp, WidgetsBinding } from './framework/binding';

// 启动应用（runApp 是 async thin wrapper）
const binding = await runApp(new MyApp(), { output: process.stdout });

// 停止应用
binding.stop();
WidgetsBinding.reset();
```

::: tip 帧管线
WidgetsBinding 在构造时注册 6 个帧回调到 FrameScheduler（beginFrame、processResize、build、layout、paint、render）。所有帧调度完全通过 FrameScheduler.requestFrame() 驱动，没有 queueMicrotask 回退路径。
:::
