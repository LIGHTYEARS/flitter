# 滚动 Widget

本页涵盖 Flitter TUI 中的滚动相关 Widget 和控制器。当内容超出终端可视区域时，你需要用到这里的组件来实现滚动浏览。

:::tip 快速参考：最常用滚动组件
- **ListView** -- 虚拟化可滚动列表，只渲染可见项（最常用）
- **ScrollController** -- 滚动状态控制器，用于编程控制滚动位置
- **Scrollbar** -- 可交互的滚动条
:::

---

## ListView

**何时使用：** 需要显示一个可能很长的项目列表时使用。支持虚拟化，即使有数千项也不会卡顿。

> 虚拟化可滚动列表，只渲染可见项。

:::tip 最常用参数
- `itemCount` + `itemBuilder` -- 列表项总数和构建回调，必须提供
- `itemExtent` -- 每项固定高度，设置后可提升滚动性能
- `controller` -- 绑定 `ScrollController`，用于编程控制滚动
:::

| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `itemCount` | `number` | **必填** | 列表项总数 |
| `itemBuilder` | `(index: number) => Widget` | **必填** | 列表项构建回调 |
| `itemExtent` | `number` | `undefined` | 每项固定高度（可选，提升性能） |
| `controller` | `ScrollController` | `undefined` | 滚动控制器 |
| `cacheExtent` | `number` | `undefined` | 视口外缓存项数 |

```typescript
const controller = new ScrollController();

new ListView({
  itemCount: 1000,
  itemBuilder: (index) => new Text({ data: `Item ${index}` }),
  itemExtent: 1,
  controller,
  cacheExtent: 5,
})
```

**相关 Widget**: Scrollable, Viewport, ScrollController

---

## Scrollable

> 滚动基础 Widget。

提供滚动的底层机制，一般不直接使用，通过 ListView 间接使用。

**相关 Widget**: ListView, Viewport

---

## Viewport

> 裁剪视口。

限制子节点的可见区域，配合 Scrollable 实现滚动效果。

**相关 Widget**: Scrollable, ClipBox

---

## ViewportWithPosition

> 带定位的视口，支持 `"bottom"` 锚定。

用于实现底部锚定的滚动视图（如聊天窗口）。

**相关 Widget**: Viewport, ListView

---

## Scrollbar

**何时使用：** 需要在列表旁边显示可视化的滚动位置指示器时使用。支持鼠标点击跳转和拖拽。

> 滚动条 Widget。使用 Unicode 块元素（`▁▂▃▄▅▆▇█`）实现 1/8 字符精度的滑块渲染。

| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `controller` | `ScrollController` | **必填** | 滚动控制器 |
| `getScrollInfo` | `() => ScrollInfo` | **必填** | 滚动信息获取函数 |
| `thickness` | `number` | `1` | 滚动条宽度 |
| `thumbColor` | `Color` | `Color.rgb(150,150,150)` | 滑块颜色 |
| `trackColor` | `Color` | `Color.rgb(60,60,60)` | 轨道颜色 |
| `showTrack` | `boolean` | `true` | 是否显示轨道背景 |

### ScrollInfo

```typescript
interface ScrollInfo {
  totalContentHeight: number;
  viewportHeight: number;
  scrollOffset: number;
}
```

鼠标交互：

- 点击轨道上方 -> 上翻一页
- 点击轨道下方 -> 下翻一页
- 拖拽滑块 -> 按比例滚动

```typescript
new Row({
  children: [
    new Expanded({
      child: new ListView({
        itemCount: 100,
        itemBuilder: (i) => new Text({ data: `Item ${i}` }),
        controller,
      }),
    }),
    new Scrollbar({
      controller,
      getScrollInfo: () => ({
        totalContentHeight: 100,
        viewportHeight: 24,
        scrollOffset: controller.offset,
      }),
    }),
  ],
})
```

**相关 Widget**: ScrollController, ListView

---

## ScrollController

**何时使用：** 需要编程控制滚动位置（跳转到顶部/底部、自动跟随新内容等）时使用。

> 滚动状态控制器。

```typescript
new ScrollController()
```

### 导航方法

| 方法 | 说明 |
|------|------|
| `jumpTo(offset)` | 跳转到偏移量 |
| `scrollUp(lines?=3)` | 上滚指定行数 |
| `scrollDown(lines?=3)` | 下滚指定行数 |
| `scrollToTop()` | 滚到顶部 |
| `scrollToBottom()` | 滚到底部 |
| `scrollPageUp(viewportSize)` | 上翻一页 |
| `scrollPageDown(viewportSize)` | 下翻一页 |
| `animateTo(target, duration?=200)` | 动画滚动到目标偏移（默认 200ms） |

### Follow 模式

| 方法 | 说明 |
|------|------|
| `enableFollowMode()` | 开启自动跟随（新内容自动滚到底部） |
| `disableFollowMode()` | 关闭自动跟随 |
| `toggleFollowMode()` | 切换自动跟随 |

### 状态属性

| 属性 | 类型 | 说明 |
|------|------|------|
| `offset` | `number` | 当前偏移 |
| `maxScrollExtent` | `number` | 最大滚动范围 |
| `followMode` | `boolean` | 是否自动跟随 |
| `atTop` | `boolean` | 是否在顶部 |
| `atBottom` | `boolean` | 是否在底部 |
| `atEdge` | `boolean` | 是否在边缘（顶部或底部） |
| `disposed` | `boolean` | 是否已释放 |

### 生命周期

| 方法 | 说明 |
|------|------|
| `addListener(fn)` | 监听偏移变化 |
| `removeListener(fn)` | 移除监听 |
| `dispose()` | 释放资源 |

### 使用示例

```typescript
const sc = new ScrollController();
sc.jumpTo(100);
sc.scrollUp(3);
sc.scrollToBottom();
sc.animateTo(50, 200);

sc.enableFollowMode();

sc.addListener(() => {
  console.log('offset changed:', sc.offset);
});

sc.dispose();
```

---

## ScrollPhysics

> 滚动物理基类。

定义滚动行为的抽象基类。

---

## ClampingScrollPhysics

> 限制滚动范围，不允许越界。

默认滚动物理实现，将偏移限制在 `[0, maxScrollExtent]` 范围内。

---

## FlingScrollPhysics

> 惯性滚动物理引擎。

```typescript
class FlingScrollPhysics {
  constructor(friction?: number, maxSamples?: number);
  readonly tracker: VelocityTracker;
  clampOffset(offset, min, max): number;
  computeFlingDisplacement(velocity, elapsedMs): number;
  computeFlingVelocity(velocity, elapsedMs): number;
  isFlingComplete(velocity, elapsedMs, threshold?): boolean;
  computeTotalFlingDistance(velocity): number;
}
```

---

## ScrollBehavior

**何时使用：** 需要为滚动区域添加 vim 风格键盘滚动绑定（j/k/g/G 等）时使用。

> vim 风格键盘滚动绑定。

```typescript
new ScrollBehavior(controller: ScrollController, options?: {
  scrollStep?: number;       // 默认 3
  pageScrollStep?: number;   // 默认 10
  axisDirection?: 'vertical' | 'horizontal';  // 默认 "vertical"
})
```

| 按键 | 动作 |
|------|------|
| `↑` / `k` | 上滚 scrollStep 行 |
| `↓` / `j` | 下滚 scrollStep 行 |
| `PageUp` / `Ctrl+U` | 上翻一页 |
| `PageDown` / `Ctrl+D` | 下翻一页 |
| `Home` / `g` | 滚到顶部 |
| `End` / `G` / `Shift+G` | 滚到底部 |

| 方法 | 说明 |
|------|------|
| `handleKeyEvent(event)` | 匹配按键并执行滚动 |
| `handleScrollDelta(delta)` | 直接应用滚动偏移 |

---

## VelocityTracker

> 拖拽速度估算器。

```typescript
class VelocityTracker {
  constructor(maxSamples?: number);
  addSample(position: number, timestamp?: number): void;
  estimateVelocity(): number;     // 线性回归估算速度（positions/ms）
  reset(): void;
  get sampleCount(): number;
}
```

---

> 📖 相关教程: [滚动系统](/tutorial/subsystems/scroll)
