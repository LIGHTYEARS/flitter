# Binding 子系统

> WidgetsBinding 单例编排所有子系统，runApp 是应用入口。

---

## runApp

> 启动 TUI 应用的顶层入口函数。

```ts
import { runApp } from "@flitter/tui";

// 最简启动
await runApp(new MyAppWidget());

// 带回调
await runApp(new MyAppWidget(), {
  onRootElementMounted: (element) => {
    console.error("根元素已挂载");
  },
  onCapabilitiesReady: (caps) => {
    // 能力检测完成，Widget 树挂载前，可在此选择主题
    if (caps.background === "light") useLight();
  },
});
```

**签名**

```ts
function runApp(widget: Widget, options?: RunAppOptions): Promise<void>
```

`Promise` 在应用退出时 resolve。

**RunAppOptions**

| 选项 | 类型 | 说明 |
|------|------|------|
| `onRootElementMounted` | `(element: Element) => void` | 根 Element 挂载完成后回调 |
| `onCapabilitiesReady` | `(caps: TerminalCapabilities) => void` | 能力检测完成、Widget 树挂载前回调 |
| `keyInterceptor` | `(event: KeyEvent) => boolean` | 全局键盘拦截器（返回 true 则阻止事件继续传播） |

---

## WidgetsBinding

> TUI 应用核心编排器单例，逆向自 amp `d9`。

**获取单例**

```ts
import { WidgetsBinding } from "@flitter/tui";

const binding = WidgetsBinding.instance;
```

单例在首次访问时创建，不可直接实例化。

**内部子系统属性**

| 属性 | 类型 | 说明 |
|------|------|------|
| `frameScheduler` | `FrameScheduler` | 帧调度器 |
| `buildOwner` | `BuildOwner` | 脏元素调度与重建 |
| `pipelineOwner` | `PipelineOwner` | 布局与绘制调度 |
| `focusManager` | `FocusManager` | 键盘焦点树与事件路由 |
| `mouseManager` | `MouseManager` | 命中测试与鼠标事件分发 |
| `tui` | `TuiController` | 终端控制器 |

**关键方法**

| 方法 | 说明 |
|------|------|
| `runApp(widget, opts?)` | 启动应用（通常通过顶层 `runApp()` 调用） |
| `setRootElementMountedCallback(cb)` | 注册根元素挂载回调 |
| `on("key" \| "mouse" \| "paste", cb)` | 订阅原始输入事件 |
| `off("key" \| "mouse" \| "paste", cb)` | 取消订阅 |
| `scheduleFrame()` | 请求调度一帧 |
| `addKeyInterceptor(fn)` | 添加键盘拦截器 |
| `removeKeyInterceptor(fn)` | 移除键盘拦截器 |

---

## 帧管线（4 阶段）

每一帧按以下顺序执行：

```
1. Build   — BuildOwner.buildScopes()
             按深度排序脏元素，调用 performRebuild()

2. Layout  — PipelineOwner.flushLayout()
             自顶向下传递约束，自底向上确定尺寸

3. Paint   — PipelineOwner.flushPaint()
             将 RenderObject 绘制到 Screen back buffer

4. Present — TuiController.render()
             AnsiRenderer 差分输出 + screen.present()
```

FrameScheduler 注册了 6 个回调（frame-start、resize、build、layout、paint、render），由 `requestAnimationFrame` 风格的内部循环驱动。

---

## BuildOwner

> 管理脏元素队列，按深度排序后执行重建。

```ts
// 标记元素为脏（通常由 State.setState() 触发）
buildOwner.scheduleBuildFor(element);

// 执行所有待重建元素（由 FrameScheduler 在 build 阶段调用）
buildOwner.buildScopes();
```

**属性**

| 属性 | 说明 |
|------|------|
| `hasDirtyElements` | 是否存在待重建的脏元素 |

重建支持最多 10 轮迭代，处理重建过程中新增的脏元素。

---

## PipelineOwner

> 管理渲染树的布局与绘制调度。

```ts
// 标记 RenderObject 需要重新布局
renderObject.markNeedsLayout();

// 标记 RenderObject 需要重新绘制
renderObject.markNeedsPaint();

// 执行所有待布局对象（由 FrameScheduler 在 layout 阶段调用）
pipelineOwner.flushLayout();

// 执行所有待绘制对象（由 FrameScheduler 在 paint 阶段调用）
pipelineOwner.flushPaint(screen);
```

脏标记向上传播到最近的布局边界，确保子树不会触发全局重布局。
