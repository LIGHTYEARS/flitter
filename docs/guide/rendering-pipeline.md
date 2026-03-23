# 渲染管线

Flutter-TUI 使用 4 阶段帧管线处理每一帧的更新：BUILD → LAYOUT → PAINT → RENDER。帧调度器按需触发，只在有脏数据时才执行帧渲染。

## 管线概览

```
    requestFrame()
         │
         ▼
  ┌──────────────────────────────────────────────────┐
  │                  Frame Pipeline                    │
  │                                                    │
  │  ┌─────────┐  ┌──────────┐  ┌───────┐  ┌────────┐ │
  │  │  BUILD  │→ │  LAYOUT  │→ │ PAINT │→ │ RENDER │ │
  │  │         │  │          │  │       │  │        │ │
  │  │BuildOwner│  │Pipeline │  │Paint  │  │Renderer│ │
  │  │处理脏   │  │Owner    │  │Context│  │差异    │ │
  │  │Element  │  │从根布局  │  │绘制到 │  │更新到  │ │
  │  │         │  │          │  │Screen │  │终端    │ │
  │  │         │  │          │  │Buffer │  │        │ │
  │  └─────────┘  └──────────┘  └───────┘  └────────┘ │
  └──────────────────────────────────────────────────┘
                         │
                    16.67ms 帧间隔
                    （60fps 目标）
```

## BUILD 阶段

**负责模块**：`BuildOwner`

BUILD 阶段处理所有标记为脏的 Element，通过调用 `Widget.build()` 生成新的 Widget 子树。

```typescript
// BuildOwner.buildScopes() 的核心逻辑
buildScopes(): void {
  this._building = true;

  // 1. 按深度排序脏元素（浅层优先）
  const sorted = [...this._dirtyElements]
    .sort((a, b) => a.depth - b.depth);

  // 2. 使用 while 循环处理级联脏标记
  while (sorted.length > 0) {
    const element = sorted.shift()!;
    if (element.dirty && element.mounted) {
      element.performRebuild();
    }
    // 注意：重建可能产生新的脏元素
  }

  this._dirtyElements.clear();
  this._building = false;
}
```

::: info 脏集合使用 Set
BuildOwner 使用 `Set<Element>` 而不是数组存储脏元素，自动去重避免同一个 Element 被重建多次。
:::

### 关键特性

- **深度排序**：父组件先于子组件重建，避免冗余重建
- **级联处理**：重建 A 可能标记 B 为脏，while 循环确保 B 也被处理
- **统计追踪**：记录每帧重建的 Element 数量，用于性能分析

## LAYOUT 阶段

**负责模块**：`PipelineOwner`

LAYOUT 阶段从根 RenderObject 开始，递归计算每个节点的尺寸和位置。

```typescript
flushLayout(): void {
  if (!this._rootRenderObject || !this._rootConstraints) return;

  // 从根节点开始布局，传入终端尺寸作为根约束
  this._rootRenderObject.layout(this._rootConstraints);
  this._needsLayout = false;
}
```

### 布局传播

```
PipelineOwner.flushLayout()
       │
  root.layout(rootConstraints)     rootConstraints = 终端宽高
       │
  root.performLayout()
       │
  对每个子组件:
    child.layout(子约束)
    child.offset = 计算的位置
```

::: warning 与 Flutter 的差异
Flutter-TUI 的 PipelineOwner 没有 `_nodesNeedingLayout` 列表。布局总是从根节点开始，不使用 RelayoutBoundary 优化。这简化了实现，同时终端 UI 的节点数量通常不需要这个优化。
:::

### 根约束更新

当终端窗口大小改变时，`PipelineOwner` 更新根约束：

```typescript
updateRootConstraints(terminalSize: Size): void {
  const newConstraints = new BoxConstraints({
    minWidth: 0,
    maxWidth: terminalSize.width,
    minHeight: 0,
    maxHeight: terminalSize.height,
  });
  this._rootConstraints = newConstraints;
  this._needsLayout = true;
}
```

## PAINT 阶段

**负责模块**：`PaintContext` + `paintRenderTree()`

PAINT 阶段通过 DFS 遍历渲染树，每个 RenderObject 将自身绘制到 ScreenBuffer 的后缓冲区。

```typescript
// 绘制入口
function paintRenderTree(
  root: RenderBox,
  context: PaintContext,
): void {
  root.paint(context, root.offset);
}
```

### PaintContext API

`PaintContext` 是 RenderObject 的绘制画布接口：

| 方法 | 说明 |
|------|------|
| `drawText(x, y, text, style)` | 绘制单行文本 |
| `drawTextSpan(x, y, span)` | 绘制富文本 TextSpan |
| `fillRect(x, y, w, h, char, style)` | 填充矩形区域 |
| `drawBorder(x, y, w, h, style, borderStyle)` | 绘制边框（rounded/solid） |
| `setCell(x, y, char, style)` | 设置单个单元格 |
| `withClip(x, y, w, h)` | 创建裁剪子区域上下文 |

```typescript
// RenderObject.paint() 示例
paint(context: PaintContext, offset: Offset): void {
  // 绘制自身背景
  context.fillRect(
    offset.col, offset.row,
    this.size.width, this.size.height,
    ' ', { bg: Color.blue }
  );

  // 绘制子组件（传递偏移量）
  for (const child of this.children) {
    child.paint(context, new Offset(
      offset.col + child.offset.col,
      offset.row + child.offset.row,
    ));
  }
}
```

### 裁剪 (Clip)

`withClip()` 创建一个受限的绘制区域，超出区域的绘制操作被忽略：

```typescript
// ScrollView 使用裁剪只显示可见部分
const clipped = context.withClip(
  offset.col, offset.row,
  this.size.width, this.size.height,
);
// 在裁剪上下文中绘制子组件
child.paint(clipped, childOffset);
```

## RENDER 阶段

**负责模块**：`ScreenBuffer` + `Renderer`

RENDER 阶段将 ScreenBuffer 中的变化转换为最小的 ANSI 转义序列输出到终端。

### ScreenBuffer 双缓冲

`ScreenBuffer` 维护两个缓冲区：

```
┌────────────────┐    ┌────────────────┐
│  前缓冲 (front) │    │  后缓冲 (back)  │
│  当前屏幕内容   │    │  新帧绘制目标   │
└────────────────┘    └────────────────┘
         │                    │
         └───── diff() ──────┘
                  │
            RowPatch[] 差异
                  │
            Renderer 输出 ANSI
                  │
            swap() 交换缓冲区
```

### Renderer ANSI 输出

`Renderer` 将 `RowPatch[]` 转换为最小的 ANSI 转义序列：

| 功能 | 转义序列 |
|------|---------|
| 光标定位 | `\x1b[{row};{col}H` |
| SGR 样式 | `\x1b[{codes}m`（粗体、颜色等） |
| 备用屏幕 | `\x1b[?1049h` / `\x1b[?1049l` |
| 同步更新 | `\x1b[?2026h` / `\x1b[?2026l` |
| 光标隐藏 | `\x1b[?25l` / `\x1b[?25h` |

```typescript
// Renderer 输出优化
// 1. 同步更新包装（防闪烁）
output += BSU;  // Begin Synchronized Update

// 2. 只输出变化的单元格
for (const patch of patches) {
  output += CURSOR_MOVE(patch.col, patch.row);
  // 增量 SGR：只输出与上一个单元格的样式差异
  output += buildSgrDelta(prevStyle, patch.style);
  output += patch.char;
}

// 3. 结束同步更新
output += ESU;  // End Synchronized Update
```

::: tip SGR 增量更新
Renderer 追踪上一个输出的 SGR 状态，只输出样式变化的部分。例如从 "白色粗体" 变为 "白色非粗体" 只需要输出 `\x1b[22m`（关闭粗体），而不是完整重置再设置。
:::

## FrameScheduler

`FrameScheduler` 是帧管线的总调度器，单例模式。

### 核心特性

| 特性 | 说明 |
|------|------|
| 按需调度 | 没有 setInterval，只在有脏数据时调度帧 |
| 帧合并 | 多次 `requestFrame()` 在同一帧内合并为一次执行 |
| 帧间隔 | 生产环境遵守 60fps（~16.67ms）预算 |
| 测试模式 | 测试环境下帧立即执行，无延迟 |

### 注册回调

各子系统通过注册阶段回调参与帧管线：

```typescript
// WidgetsBinding 在构造时注册各阶段回调
const scheduler = FrameScheduler.instance;

scheduler.addFrameCallback(
  'build',                                    // 唯一 ID
  () => this.buildOwner.buildScopes(),       // 回调函数
  'build',                                    // 阶段
  0,                                          // 优先级
  'BuildOwner.buildScopes',                  // 调试名称
);
scheduler.addFrameCallback(
  'layout',
  () => this.pipelineOwner.flushLayout(),
  'layout',
  0,
  'PipelineOwner.flushLayout',
);
scheduler.addFrameCallback(
  'paint-phase',
  () => this.paint(),
  'paint',
  0,
  'WidgetsBinding.paint',
);
scheduler.addFrameCallback(
  'render-phase',
  () => this.render(),
  'render',
  0,
  'WidgetsBinding.render',
);
```

### 帧执行流程

```
requestFrame()
     │
     ▼
是否已有待执行帧？ ── 是 → 不操作（合并）
     │ 否
     ▼
调度帧执行（setTimeout/setImmediate）
     │
     ▼
  executeFrame()
     │
     ├→ Phase.BUILD   回调
     ├→ Phase.LAYOUT  回调
     ├→ Phase.PAINT   回调
     ├→ Phase.RENDER  回调
     │
     ▼
  执行 postFrameCallbacks
     │
     ▼
  记录帧统计（FPS、各阶段耗时）
```

::: details 测试模式
当 `BUN_TEST=1` 环境变量设置时，FrameScheduler 禁用帧间隔限制，帧通过 `setImmediate` 立即执行。这使得测试可以同步验证帧输出。
:::

## 性能监控

`FrameStats` 和 `PerformanceOverlay` 提供运行时性能数据：

```typescript
// 获取帧统计
const stats = FrameScheduler.instance.getStats();
console.log(`FPS: ${stats.fps}`);
console.log(`BUILD: ${stats.buildTime}ms`);
console.log(`LAYOUT: ${stats.layoutTime}ms`);
console.log(`PAINT: ${stats.paintTime}ms`);
console.log(`RENDER: ${stats.renderTime}ms`);
```

## 下一步

- [三棵树架构](/guide/three-tree) — 理解管线在整体架构中的角色
- [布局系统](/guide/layout-system) — 深入 LAYOUT 阶段的盒约束算法
- [状态管理](/guide/state-management) — 了解如何触发帧更新
