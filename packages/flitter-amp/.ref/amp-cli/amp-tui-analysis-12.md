# Amp TUI 深度分析 #12: StatefulWidget 状态管理 + setState 调度 + 错误边界

> 基于 Amp CLI v0.0.1774512763 混淆 JS 逆向分析 + flitter-core 完整源码对比
> 分析范围: StatefulWidget/State/StatefulElement 生命周期、setState 调度机制、BuildOwner.buildScope 算法、错误边界、帧合并
> 分析日期: 2026-03-29

---

## 0. 混淆名映射表

| Amp 混淆名 | Amp 概念 | flitter-core 类 | 文件路径 |
|------------|---------|----------------|---------|
| `Sf` | Widget 基类 | `Widget` | `framework/widget.ts` |
| `H3` / `$A` | StatelessWidget | `StatelessWidget` | `framework/widget.ts` |
| `H8` / `q$` | StatefulWidget | `StatefulWidget` | `framework/widget.ts` |
| `_8` / `R$` | State | `State<T>` | `framework/widget.ts` |
| `T$` | Element 基类 | `Element` | `framework/element.ts` |
| `lU0` | StatelessElement | `StatelessElement` | `framework/element.ts` |
| `V_0` | StatefulElement | `StatefulElement` | `framework/element.ts` |
| `Z_0` | InheritedElement | `InheritedElement` | `framework/element.ts` |
| `Bt` | InheritedWidget | `InheritedWidget` | `framework/widget.ts` |
| `NB0` | BuildOwner | `BuildOwner` | `framework/build-owner.ts` |
| `c9` | FrameScheduler | `FrameScheduler` | `scheduler/frame-scheduler.ts` |
| `J3` | WidgetsBinding | `WidgetsBinding` | `framework/binding.ts` |
| `jd` | BuildContext | `BuildContext` / `BuildContextImpl` | `framework/widget.ts` / `framework/element.ts` |
| `XG8` | getBuildScheduler() | `getBuildScheduler()` | `framework/binding.ts` |
| `VG8` | initSchedulers() | `initSchedulers()` | `framework/binding.ts` |

> 注: Amp 中 `q$`/`R$` 与 `H8`/`_8` 来自不同版本的混淆结果。`q$`/`R$` 是实际运行时使用的名称（与 JS 引用一致），`H8`/`_8` 是源码注释中标注的映射。

---

## 1. Amp 实现细节

### 1.1 StatefulWidget (class q$ / H8)

从混淆 JS 逆向还原的 Amp StatefulWidget 核心结构：

```
class q$ extends Sf {
  constructor({ key }) {
    super({ key });
  }

  createElement() {
    return new V_0(this);    // StatefulElement
  }

  // 子类必须实现
  abstract createState(): R$;
}
```

Amp 的 StatefulWidget 极其精简：
- 只有 `key` 字段（继承自 `Sf`/Widget）
- `createElement()` 返回 `V_0`（StatefulElement）
- 唯一抽象方法 `createState()`
- **无** `canUpdate()` 实例方法——仅有 `Sf.canUpdate(old, new)` 静态方法

#### 1.1.1 实际使用模式

从提取的 JS 中可看到大量 StatefulWidget 子类的模式：

```js
// status-bar-iJH.js — 典型 Amp StatefulWidget
iJH = class iJH extends R$ {
  animationFrame = 0;
  animationTimer = null;

  initState() { this.startAnimationIfNeeded() }
  didUpdateWidget(H) { this.startAnimationIfNeeded() }
  dispose() { this.stopAnimation() }

  startAnimation() {
    this.animationTimer = setInterval(() => {
      this.setState(() => {
        this.animationFrame = (this.animationFrame + 1) % this.animationFrames.length
      })
    }, 200)
  }

  build(H) { /* ... */ }
}
```

关键模式：
1. 状态字段直接声明在 State 类上（`animationFrame`, `animationTimer`）
2. `initState()` 启动副作用（定时器）
3. `didUpdateWidget()` 根据新 widget 属性调整副作用
4. `dispose()` 清理副作用
5. `setState(() => { ... })` 传入回调同步修改状态

### 1.2 State (class R$ / _8)

从混淆 JS 逆向还原的核心实现：

```
class R$ {
  _widget;       // 当前 widget 配置
  _element;      // 关联的 StatefulElement（也是 BuildContext）
  _mounted;      // boolean

  get widget() { return this._widget; }
  get context() { return this._element; }  // element 即 context
  get mounted() { return this._mounted; }

  // --- 内部生命周期 (framework 调用) ---

  _mount(widget, context) {
    this._widget = widget;
    this._element = context;
    this._mounted = true;
    this.initState();
  }

  _update(newWidget) {
    let old = this._widget;
    this._widget = newWidget;
    this.didUpdateWidget(old);
  }

  _unmount() {
    this._mounted = false;
    this.dispose();
  }

  // --- 用户可覆写生命周期钩子 ---
  initState() {}
  didUpdateWidget(oldWidget) {}
  build(context) { /* abstract */ }
  dispose() {}

  // --- setState ---
  setState(fn) {
    if (!this._mounted) throw new Error('setState() called after dispose()');
    if (fn) fn();
    this._markNeedsBuild();
  }

  _markNeedsBuild() {
    this._element.markNeedsBuild();
  }
}
```

#### 1.2.1 State 生命周期（Amp 版）

```
              createState()
                   │
                   ▼
        ┌─── _mount(widget, context) ───┐
        │    _mounted = true            │
        │    initState()                │
        └──────────┬────────────────────┘
                   │
                   ▼
           build(context) ←───────────────┐
                   │                      │
                   ▼                      │
         [树中运行…]                      │
                   │                      │
          ┌────────┴────────┐             │
          │                 │             │
    setState(fn)     _update(newWidget)   │
    fn?.()           didUpdateWidget()    │
    markNeedsBuild() ─────────────────────┘
          │
          ▼
    _unmount()
    _mounted = false
    dispose()
```

**关键点**：
- **无 didChangeDependencies()**：Amp 没有此生命周期钩子。InheritedWidget 变化时直接通过 `markNeedsBuild()` 触发 rebuild，不经过 didChangeDependencies
- **无 deactivate()**：Element 从 mounted 直接到 unmounted，没有中间的 deactivate 状态
- **无 reassemble()**：无热重载支持
- **无 debugFillProperties()**：无诊断支持

#### 1.2.2 setState 保护机制（Amp）

Amp 的 setState 实现仅有一个保护：

```
setState(fn) {
  if (!this._mounted) throw new Error('setState() called after dispose()');
  if (fn) fn();
  this._markNeedsBuild();
}
```

**保护层次**：
1. **mounted 检查**：`_mounted === false` 时抛出异常。这覆盖了 dispose 后调用和 mount 之前调用两种情况
2. **无 build 中调用检查**：Amp **不检查**是否在 build() 方法内调用 setState()。这意味着在 build() 内调用 setState() 不会报错——它只是标记 dirty，然后在 BuildOwner 的 while 循环中被重新处理
3. **无锁机制**：没有防止递归 setState 的锁。连续调用多次 setState 只是重复标记 dirty + scheduleBuildFor（Set 自动去重）

### 1.3 StatefulElement (class V_0)

```
class V_0 extends T$ {
  _state;       // State 实例
  _child;       // 子 Element
  _context;     // BuildContext (jd 实例)

  constructor(widget) {
    super(widget);
  }

  // 挂载
  mount() {
    this._context = new jd(this, this.widget);
    this._state = this.statefulWidget.createState();
    this._state._mount(this.statefulWidget, this._context);
    this.rebuild();
    this.markMounted();
  }

  // 卸载
  unmount() {
    this._child?.unmount();
    this.removeChild(this._child);
    this._state?._unmount();
    this._state = null;
    super.unmount();
  }

  // 更新 (父节点 rebuild 产生新 widget 时)
  update(newWidget) {
    if (this.widget === newWidget) return;  // 引用相等 fast path
    super.update(newWidget);
    this._state._update(this.statefulWidget);
    this._context.widget = newWidget;
    this.rebuild();
  }

  performRebuild() {
    this.rebuild();
  }

  markNeedsBuild() {
    this.markNeedsRebuild();
  }

  // rebuild: 调用 State.build(), diff 子节点
  rebuild() {
    let newWidget = this._state.build(this._context);
    if (this._child) {
      if (this._child.widget.canUpdate(newWidget)) {
        this._child.update(newWidget);
      } else {
        this._child.unmount();
        this.removeChild(this._child);
        this._child = newWidget.createElement();
        this.addChild(this._child);
        this._mountChild(this._child);
      }
    } else {
      this._child = newWidget.createElement();
      this.addChild(this._child);
      this._mountChild(this._child);
    }
  }
}
```

#### 1.3.1 mount 时序（指令级）

```
V_0.mount():
  1. this._context = new jd(this, this.widget)    // 创建 BuildContext
  2. this._state = widget.createState()            // 创建 State 实例
  3. this._state._mount(widget, this._context)     // 绑定 + initState()
     ├── _widget = widget
     ├── _element = context (也就是 element)
     ├── _mounted = true
     └── initState()                               // ★ 用户代码在此执行
  4. this.rebuild()                                // 首次 build
     └── _state.build(context)                     // ★ 用户 build 在此执行
         └── updateChild / inflate child
  5. this.markMounted()                            // _mounted = true
```

**关键观察**：`initState()` 在 `rebuild()` **之前**调用。这意味着 initState 中通过 `setState()` 修改的状态会在紧接着的首次 `build()` 中生效。但 initState 中调用 `setState()` 实际上是多余的——因为接下来马上就要 build 了。

#### 1.3.2 update 时序（指令级）

```
V_0.update(newWidget):
  1. if (this.widget === newWidget) return          // 引用相等跳过
  2. super.update(newWidget)                        // this.widget = newWidget
  3. this._state._update(this.statefulWidget)       // didUpdateWidget(oldWidget)
     ├── old = this._widget
     ├── this._widget = newWidget
     └── this.didUpdateWidget(old)                  // ★ 用户代码
  4. this._context.widget = newWidget               // 更新 context
  5. this.rebuild()                                 // 重新 build
```

### 1.4 BuildOwner (class NB0)

Amp 的 BuildOwner 是构建阶段的调度器，管理脏 Element 集合。

```
class NB0 {
  _dirtyElements = new Set();   // ★ Set，非 List，自动去重
  _building = false;

  scheduleBuildFor(element) {
    if (this._dirtyElements.has(element)) return;
    this._dirtyElements.add(element);
    c9.instance.requestFrame();   // 请求下一帧
  }

  buildScopes() {
    this._building = true;
    try {
      // ★ while 循环处理级联脏标记
      while (this._dirtyElements.size > 0) {
        let elements = Array.from(this._dirtyElements);
        this._dirtyElements.clear();

        // 按深度排序 —— 父节点先 rebuild
        elements.sort((a, b) => a.depth - b.depth);

        for (let element of elements) {
          if (element.dirty) {
            element.performRebuild();
            element._dirty = false;
          }
        }
        // 如果 rebuild 过程中有新的 element 被标记 dirty
        // while 循环会继续处理
      }
    } finally {
      this._building = false;
    }
  }
}
```

#### 1.4.1 buildScopes 算法详解

**核心算法特征**：

1. **Set 去重**：使用 `Set<Element>` 而非数组，同一 Element 多次 `scheduleBuildFor()` 不会重复
2. **while 循环**：外层 while 循环处理级联脏标记。如果 Element A 的 rebuild 导致 Element B 被标记 dirty，while 循环的下一轮迭代会处理 B
3. **深度排序**：每轮 while 迭代中，先将 Set 转为数组再按 depth 排序。父节点（depth 小）先 rebuild，避免不必要的子节点 rebuild
4. **dirty 检查**：每个 element 在 rebuild 前检查 `if (element.dirty)`，因为父节点 rebuild 可能已经更新了子节点，子节点的 dirty 标记可能已失效
5. **dirty 清除**：无论 rebuild 成功还是失败，dirty 标记都会被清除

**级联脏标记时序示例**：

```
初始状态: dirtyElements = {A(depth=1), C(depth=3)}

While 迭代 #1:
  snapshot = [A, C]  →  clear set  →  sort by depth  →  [A(1), C(3)]
  
  rebuild A(1):
    A.build() 返回新 widget
    → 触发 B.markNeedsBuild() (B 是 A 的子节点)
    → dirtyElements = {B(depth=2)}        // ★ 新增
    
  rebuild C(3):
    C.build() 正常完成
    
While 迭代 #2:                            // ★ while 继续
  snapshot = [B]  →  clear set  →  sort  →  [B(2)]
  
  rebuild B(2):
    正常完成
    dirtyElements = {}                     // 空了，while 退出
```

#### 1.4.2 Amp 的错误处理

**Amp 的 buildScopes() 不使用 try-catch**。

从混淆 JS 逆向分析，Amp 的 `NB0.buildScopes()` 内部循环没有 per-element 的 try-catch 包裹。如果某个 Element 的 `performRebuild()` 抛出异常，**整个 buildScopes() 会中断**，后续的 dirty elements 不会被处理。

这意味着：
- Amp 中 build 抛异常是**致命错误**——会导致当前帧的构建阶段中断
- 没有 ErrorWidget fallback 机制
- 没有 errorLogger 回调
- 异常会传播到 FrameScheduler 的 executeFrame() 级别

这是一个有意的设计选择：Amp 是一个 CLI 工具，如果 build 失败，正确的行为是暴露错误而非静默降级。

### 1.5 帧调度与 setState 合并

#### 1.5.1 requestFrame 与 setState 合并

Amp 的 setState 合并通过两层机制实现：

**第一层：Set 去重**
```
Element A 调用 setState() → markNeedsRebuild() → scheduleBuildFor(A) → dirtyElements.add(A)
Element A 再次 setState() → scheduleBuildFor(A) → Set.has(A) = true → 跳过
```

**第二层：requestFrame 合并**
```
scheduleBuildFor(element):
  this._dirtyElements.add(element);
  c9.instance.requestFrame();     // ← 多次调用被合并

// FrameScheduler.requestFrame():
requestFrame():
  if (this._frameScheduled) return;    // ★ 已调度则跳过
  this._frameScheduled = true;
  if (this._frameInProgress):
    return;                             // 帧执行中，标记后当前帧结束后再调度
  scheduleFrameExecution(delay);        // 实际调度
```

**第三层：setImmediate / setTimeout 延迟**
```
scheduleFrameExecution(delay):
  if (delay <= 0):
    setImmediate(() => runScheduledFrame())    // 下一个事件循环 tick
  else:
    setTimeout(() => runScheduledFrame(), delay)  // 帧节奏限制
```

因此，在同一个同步代码块中多次调用 setState（不同组件）的情况下：

```js
// 同步代码块
widgetA.setState(() => { ... })   // dirtyElements = {A}, requestFrame → scheduled
widgetB.setState(() => { ... })   // dirtyElements = {A, B}, requestFrame → 跳过
widgetC.setState(() => { ... })   // dirtyElements = {A, B, C}, requestFrame → 跳过

// → 下一个事件循环 tick:
// → executeFrame() → buildScopes() → rebuild A, B, C 一次性完成
```

这就是"批量 setState"机制：**所有在同一个同步执行上下文中的 setState 调用会在下一帧合并处理**。

#### 1.5.2 帧执行管线

```
FrameScheduler.executeFrame():
  ┌──────────────────────────────────────────────┐
  │  BUILD 阶段                                   │
  │  ├── WidgetsBinding.beginFrame()              │
  │  ├── WidgetsBinding.processResizeIfPending()  │
  │  └── BuildOwner.buildScopes()                 │
  │       └── while (dirtyElements.size > 0)      │
  │           └── sort + rebuild each             │
  ├──────────────────────────────────────────────┤
  │  LAYOUT 阶段                                  │
  │  └── PipelineOwner.flushLayout()              │
  ├──────────────────────────────────────────────┤
  │  PAINT 阶段                                   │
  │  └── paintRenderTree(rootRO, screenBuffer)    │
  ├──────────────────────────────────────────────┤
  │  RENDER 阶段                                  │
  │  └── screen.getDiff() → renderer.render()     │
  │      → stdout.write(ansi)                     │
  └──────────────────────────────────────────────┘
```

### 1.6 Amp 中 build 期间调用 setState 的行为

Amp 不阻止在 build() 方法中调用 setState()。分析可能的场景：

**场景 1：在自己的 build() 中调用 setState()**
```
ElementA.rebuild():
  state.build(context):
    this.setState(() => { ... })       // ★
    → markNeedsRebuild()
    → dirtyElements.add(A)            // A 再次被标记 dirty
    → 当前 rebuild 继续到 return
  
  element._dirty = false               // 外层清除 dirty

  // 但 A 已经被重新加入 dirtyElements Set
  // → while 循环下一轮迭代会再次 rebuild A
  // → 如果每次 build 都 setState → 无限循环
```

**结论**：Amp 中在 build 内调用 setState 不会报错，但可能导致**无限循环**（while 循环永远不会退出）。这是一个 bug pattern，依赖开发者纪律来避免。

**场景 2：在 build() 中调用另一个 Widget 的 setState()**
```
ElementA.rebuild():
  state.build(context):
    otherState.setState()              // ★ 标记 ElementB dirty
    → dirtyElements.add(B)
  
  // A 正常完成 rebuild
  // while 循环下一轮会 rebuild B
```

这是**合法的**级联脏标记，BuildOwner 的 while 循环专门处理这种情况。

---

## 2. Flitter 实现细节

### 2.1 StatefulWidget

**源码位置**: `flitter-core/src/framework/widget.ts:112-135`

```typescript
export abstract class StatefulWidget extends Widget {
  constructor(opts?: { key?: Key }) {
    super(opts);
  }

  createElement(): any {
    const { StatefulElement } = require('./element');
    return new StatefulElement(this);
  }

  abstract createState(): State<StatefulWidget>;
}
```

与 Amp 完全一致。唯一的实现差异是使用 `require()` 惰性导入来避免循环依赖（Amp 中也存在类似的 lazy module 模式 `SR()`）。

### 2.2 State<T>

**源码位置**: `flitter-core/src/framework/widget.ts:157-271`

flitter 的 State 实现与 Amp 高度一致，包括：

1. **相同的字段**：`_widget`, `_element`, `_mounted`
2. **相同的内部方法**：`_mount()`, `_update()`, `_unmount()`
3. **相同的生命周期钩子**：`initState()`, `didUpdateWidget()`, `build()`, `dispose()`
4. **相同的缺失**：无 `didChangeDependencies()`，无 `deactivate()`，无 `reassemble()`

#### 2.2.1 setState 实现

```typescript
setState(fn?: () => void): void {
  if (!this._mounted) {
    throw new Error('setState() called after dispose()');
  }
  if (fn) fn();
  this._markNeedsBuild();
}

private _markNeedsBuild(): void {
  if (
    this._element &&
    'markNeedsBuild' in this._element &&
    typeof this._element.markNeedsBuild === 'function'
  ) {
    this._element.markNeedsBuild();
  }
}
```

**与 Amp 的差异**：

flitter 的 `_markNeedsBuild()` 进行了**防御性检查**：
- 检查 `_element` 是否存在
- 检查 `_element` 上是否有 `markNeedsBuild` 方法
- 检查该方法是否为函数

Amp 的实现更直接：`this._element.markNeedsBuild()` 不做任何检查。这是因为 Amp 的 mounted 检查已经保证了 `_element` 存在（`_mount` 在设置 `_element` 之后才设置 `_mounted = true`）。

flitter 的额外检查是**防御性编程**，处理了 `_element` 虽然被设置但可能被置为 undefined 的边界情况（比如部分 unmount 场景）。

### 2.3 StatefulElement

**源码位置**: `flitter-core/src/framework/element.ts:307-405`

flitter 的 StatefulElement 与 Amp 基本一致，包括：

1. **mount() 时序**：createState → _mount → rebuild → markMounted
2. **unmount() 时序**：child.unmount → state._unmount → super.unmount
3. **update() 时序**：identity check → super.update → state._update → context update → rebuild
4. **rebuild()**：state.build → canUpdate diff → update or replace child

**微差异**：
- flitter 在 `rebuild()` 中有 `if (!this._context || !this._state)` 的守卫检查（抛出 'Cannot rebuild unmounted element'）
- Amp 没有这个守卫——直接访问 `_state.build()`，如果 unmounted 状态下 rebuild 会得到 null reference 错误

### 2.4 BuildOwner

**源码位置**: `flitter-core/src/framework/build-owner.ts:67-218`

flitter 的 BuildOwner 在 Amp 基础上增加了多项功能。

#### 2.4.1 scheduleBuildFor

```typescript
scheduleBuildFor(element: Element): void {
  if (this._dirtyElements.has(element)) return;
  this._dirtyElements.add(element);
  FrameScheduler.instance.requestFrame();
}
```

与 Amp 完全一致：Set 去重 + requestFrame。

#### 2.4.2 buildScope（关键差异）

```typescript
buildScope(callback?: () => void): void {
  callback?.();                      // ★ Amp: buildScopes() 无 callback 参数
  this._building = true;

  const startTime = performance.now();     // ★ 性能统计
  let rebuiltCount = 0;

  try {
    while (this._dirtyElements.size > 0) {
      const elements = Array.from(this._dirtyElements);
      this._dirtyElements.clear();
      elements.sort((a, b) => a.depth - b.depth);

      for (const element of elements) {
        if (element.dirty) {
          try {                              // ★★ per-element try-catch
            element.performRebuild();
            element._dirty = false;
            rebuiltCount++;
          } catch (error) {                  // ★★ 错误隔离
            const widgetName = element.widget?.constructor?.name ?? 'unknown';
            const detail = error instanceof Error
              ? (error.stack ?? error.message)
              : String(error);
            this._errorLogger(`Build error in ${widgetName}:`, detail);
            element._dirty = false;          // ★★ 即使出错也清除 dirty
          }
        }
      }
    }
  } finally {
    this._recordBuildStats(performance.now() - startTime, rebuiltCount);
    this._building = false;
  }
}
```

**flitter 相比 Amp 的增强点**：

1. **callback 参数**：`buildScope(callback?)` 支持在构建前执行一个回调，对应 Flutter 原版的 `BuildOwner.buildScope(element, callback)` 模式
2. **per-element try-catch**：每个 element 的 rebuild 被 try-catch 包裹。一个 element build 失败不会影响后续 element 的 rebuild
3. **errorLogger 机制**：通过 `_errorLogger` 记录 build 错误，包含 widget 类名和完整错误栈。可通过 `setErrorLogger()` 自定义
4. **性能统计**：记录 rebuild 耗时、元素数量、最大值、平均值（60 帧滚动窗口）
5. **hasDirtyElements getter**：方便外部查询是否有脏元素
6. **buildScopes() 别名**：提供无参数的 `buildScopes()` 方法匹配 Amp 的命名

#### 2.4.3 errorLogger

```typescript
private _errorLogger: (msg: string, ...args: unknown[]) => void = console.error;

setErrorLogger(logger: (msg: string, ...args: unknown[]) => void): void {
  this._errorLogger = logger;
}
```

默认使用 `console.error`，可被外部替换。这是 **flitter 独有的功能**——Amp 没有错误日志回调。

#### 2.4.4 构建统计

```typescript
private _stats = {
  totalRebuilds: 0,
  elementsRebuiltThisFrame: 0,
  maxElementsPerFrame: 0,
  averageElementsPerFrame: 0,
  lastBuildTime: 0,
  averageBuildTime: 0,
  maxBuildTime: 0,
};
```

60 帧滚动窗口统计，供 PerformanceOverlay 消费。这也是 **flitter 独有的功能**。

### 2.5 ErrorWidget

**源码位置**: `flitter-core/src/framework/error-widget.ts`

```typescript
export class ErrorWidget extends StatelessWidget {
  readonly message: string;
  readonly error?: Error;

  constructor(opts: { message: string; error?: Error; key?: Key }) {
    super(opts.key !== undefined ? { key: opts.key } : undefined);
    this.message = opts.message;
    this.error = opts.error;
  }

  static fromError(error: Error): ErrorWidget {
    return new ErrorWidget({ message: error.message, error });
  }

  build(_context: BuildContext): Widget {
    return this;  // 叶子节点，返回自身
  }
}
```

ErrorWidget 是一个 **flitter 独有的概念**：
- Amp 中没有 ErrorWidget
- 它是 Flutter 的 `ErrorWidget` 概念的移植
- 目前是一个占位实现（返回自身），实际的错误文本渲染将在后续阶段实现
- 当前在 buildScope 中并**未被使用**——build 错误仅被 errorLogger 记录，不会用 ErrorWidget 替换失败子树

### 2.6 WidgetsBinding 帧管线

**源码位置**: `flitter-core/src/framework/binding.ts:234-327`

flitter 通过 6 个命名回调注册到 FrameScheduler，执行完整的 4 阶段管线：

```typescript
// BUILD 阶段
this.frameScheduler.addFrameCallback('frame-start', () => this.beginFrame(), 'build', -2000);
this.frameScheduler.addFrameCallback('resize', () => this.processResizeIfPending(), 'build', -1000);
this.frameScheduler.addFrameCallback('build', () => {
  this.buildOwner.buildScopes();
  this.updateRootRenderObject();
}, 'build', 0);

// LAYOUT 阶段
this.frameScheduler.addFrameCallback('layout', () => {
  this.updateRootConstraints(this._renderViewSize);
  if (this.pipelineOwner.flushLayout()) {
    this._shouldPaintCurrentFrame = true;
  }
}, 'layout', 0);

// PAINT 阶段
this.frameScheduler.addFrameCallback('paint-phase', () => this.paint(), 'paint', 0);

// RENDER 阶段
this.frameScheduler.addFrameCallback('render-phase', () => {
  this.render();
  if (this.mouseManager) this.mouseManager.reestablishHoverState();
}, 'render', 0);
```

**关键点**：
- `beginFrame()` 在 build 阶段最先执行（priority=-2000），判断本帧是否需要 paint
- `processResizeIfPending()` 在 build 之前处理终端尺寸变化（priority=-1000）
- `buildScopes()` 在 build 阶段核心位置执行（priority=0）
- 帧调度完全事件驱动，无 setInterval 轮询

### 2.7 帧合并与 setState 批处理

flitter 的帧合并机制与 Amp 完全一致：

```
setState() → markNeedsRebuild() → scheduleBuildFor() → requestFrame()
                                   ↑ Set 去重            ↑ 合并标记

FrameScheduler.requestFrame():
  if (_frameScheduled) return;      // ★ 多次调用仅一次生效
  _frameScheduled = true;
  scheduleFrameExecution(delay):
    if (delay <= 0):
      setImmediate(runScheduledFrame)   // 让出事件循环
    else:
      setTimeout(runScheduledFrame, delay)  // 帧节奏控制
```

在测试环境中 `_useFramePacing = false`，delay 始终为 0（setImmediate）。在生产环境中使用帧节奏控制（60fps ≈ 16.67ms budget）。

### 2.8 测试验证

flitter 通过完整的测试套件验证了以上行为：

**build-owner.test.ts** 验证了：
- `scheduleBuildFor` 的 Set 去重（同一 element 多次调度只记录一次）
- 深度排序 rebuild（浅层 element 先 rebuild）
- 级联脏标记处理（rebuild A 触发 B dirty → while 循环处理 B）
- 空集合的 no-op 行为
- 未挂载 element 的处理（dirty flag 被清除但不 rebuild）
- 异常隔离（rebuild 抛异常后 dirty flag 仍被清除）
- `isBuilding` 状态追踪
- callback 参数执行

**widget.test.ts** 验证了：
- `initState` 在 `_mount` 中调用
- `mounted` 状态在 `_mount`/`_unmount` 间切换
- `didUpdateWidget` 在 `_update` 中用旧 widget 调用
- `dispose` 在 `_unmount` 中调用
- `setState` 执行回调并标记 dirty
- `setState` 在 dispose 后抛出异常
- `setState(undefined)` 不传回调仍标记 dirty

---

## 3. 差异对比表

| 特性 | Amp 实现 | Flitter 实现 | 差异等级 | 说明 |
|------|---------|-------------|---------|------|
| **State 生命周期钩子** | initState, didUpdateWidget, build, dispose | 同 Amp（完全一致） | ✅ 无差异 | 两者均无 didChangeDependencies/deactivate/reassemble |
| **setState mounted 检查** | `if (!_mounted) throw` | `if (!_mounted) throw` | ✅ 无差异 | 相同的错误信息 |
| **setState 回调执行** | `if (fn) fn()` 同步执行 | `if (fn) fn()` 同步执行 | ✅ 无差异 | |
| **_markNeedsBuild 实现** | 直接 `this._element.markNeedsBuild()` | 防御性检查 `_element` 和 `markNeedsBuild` 存在性 | ⚠️ 低差异 | flitter 更安全，Amp 更简洁。实际运行无功能差异 |
| **StatefulElement.mount 时序** | createState → _mount → rebuild → markMounted | 同 Amp（完全一致） | ✅ 无差异 | |
| **StatefulElement.unmount 时序** | child.unmount → state._unmount → super.unmount | 同 Amp（完全一致） | ✅ 无差异 | |
| **StatefulElement.update 时序** | identity check → super.update → state._update → rebuild | 同 Amp（完全一致） | ✅ 无差异 | |
| **StatefulElement.rebuild 守卫** | 无守卫，直接调用 state.build | `if (!_context \|\| !_state) throw` | ⚠️ 低差异 | flitter 多了 unmounted 状态守卫 |
| **BuildOwner 数据结构** | `Set<Element>` | `Set<Element>` | ✅ 无差异 | 两者都用 Set 实现自动去重 |
| **buildScope 深度排序** | `sort((a, b) => a.depth - b.depth)` | 同 Amp | ✅ 无差异 | |
| **buildScope while 循环** | while (size > 0) 处理级联脏标记 | 同 Amp | ✅ 无差异 | |
| **buildScope dirty 检查** | `if (element.dirty)` | 同 Amp | ✅ 无差异 | |
| **buildScope 错误处理** | **无 try-catch**，异常传播到上层 | **per-element try-catch**，错误隔离 + errorLogger | 🔴 高差异 | flitter 独有：build 失败不影响其他 element |
| **errorLogger** | 无 | `_errorLogger` 回调，默认 console.error，可自定义 | 🟡 中差异 | flitter 独有功能 |
| **ErrorWidget** | 不存在 | 存在但未集成到 buildScope | 🟡 中差异 | flitter 有 ErrorWidget 类但未在 build 失败时使用 |
| **构建统计** | 无 | 60 帧滚动窗口统计（totalRebuilds, buildTime 等） | 🟡 中差异 | flitter 独有功能，供 PerformanceOverlay 使用 |
| **buildScope callback** | `buildScopes()` 无参数 | `buildScope(callback?)` 支持前置回调 | ⚠️ 低差异 | Flutter API 兼容性，Amp 未使用 |
| **requestFrame 合并** | `if (_frameScheduled) return` | 同 Amp | ✅ 无差异 | |
| **帧节奏控制** | 60fps (16.67ms), setImmediate | 同 Amp（60fps + 测试模式无节奏） | ✅ 无差异 | |
| **setImmediate 调度** | `setImmediate(runScheduledFrame)` | 同 Amp | ✅ 无差异 | |
| **批量 setState 合并** | 通过 Set 去重 + requestFrame 合并 | 同 Amp | ✅ 无差异 | |
| **帧内 re-dirty 处理** | while 循环自动处理 | 同 Amp | ✅ 无差异 | |
| **build 中 setState** | 不阻止，可能导致无限循环 | 不阻止，可能导致无限循环 | ✅ 无差异 | 两者都依赖开发者纪律 |
| **dispose 后 setState** | throw Error | throw Error | ✅ 无差异 | |
| **State.mounted 追踪** | `_mounted` boolean | `_mounted` boolean | ✅ 无差异 | |
| **BuildContext 实现** | `jd` 独立类（持有 element ref） | `BuildContextImpl` 独立类（持有 element ref） | ✅ 无差异 | 结构和字段完全对应 |
| **Element.markNeedsRebuild** | `T$.markNeedsRebuild()` 设置 dirty + scheduleBuildFor | 同 Amp（通过 getBuildScheduler() 桥接） | ✅ 无差异 | |
| **Element.markNeedsBuild** | `V_0.markNeedsBuild → markNeedsRebuild` | 同 Amp（别名关系） | ✅ 无差异 | |
| **unmounted element rebuild** | Amp 的 `if (dirty)` 检查仍会 rebuild | flitter 的 `if (dirty)` 也会 rebuild，但清除 dirty | ✅ 无差异 | 两者行为一致 |

---

## 4. 差异修复建议（按优先级排序）

### P1: 高优先级

#### 4.1 buildScope 错误处理行为对齐

**当前差异**: flitter 在 buildScope 中使用 per-element try-catch 隔离 build 错误，Amp 不使用。

**建议**: **保留 flitter 的实现，不对齐 Amp**。

**原因**:
1. flitter 的错误隔离是**有意的增强**（参见 build-owner.ts 注释 `"performRebuild() is called, then _dirty is cleared (even on error)"`）
2. 这是 Flutter 原版的标准行为——Flutter 的 `BuildOwner.buildScope()` 也使用 try-catch + `FlutterError.reportError()`
3. Amp 不使用 try-catch 是因为它是 CLI 工具，快速失败是合理策略。但 flitter-core 作为通用框架库，错误隔离更合理
4. 已有测试验证此行为（`clears dirty flag even on rebuild error`）

**如果需要 Amp 兼容模式**: 可添加一个 `strictMode: boolean` 选项到 BuildOwner，为 true 时 re-throw 异常

### P2: 中优先级

#### 4.2 ErrorWidget 集成

**当前状态**: ErrorWidget 类已存在但未在 buildScope 中使用。build 失败时仅 log 错误，不替换失败子树。

**建议**: 在 buildScope 的 catch 块中，尝试用 ErrorWidget 替换失败的 widget 子树。

**实现思路**:
```typescript
catch (error) {
  this._errorLogger(`Build error in ${widgetName}:`, detail);
  element._dirty = false;
  // 尝试用 ErrorWidget 替换失败子树
  if (element instanceof StatefulElement || element instanceof StatelessElement) {
    try {
      const errorWidget = ErrorWidget.fromError(error instanceof Error ? error : new Error(String(error)));
      // 替换逻辑...
    } catch { /* 如果连替换都失败了，放弃 */ }
  }
}
```

**优先级**: 中。当前 errorLogger 已经提供了足够的诊断信息。ErrorWidget 替换在 TUI 场景中不如 Web/桌面 GUI 重要（用户看到的是终端输出，不是持久的 UI 界面）。

#### 4.3 _markNeedsBuild 防御性检查简化

**当前差异**: flitter 的 `_markNeedsBuild()` 有三重防御性检查，Amp 只做直接调用。

**建议**: **保留现有实现**。防御性检查的性能开销可忽略不计（属性存在性检查 < 1ns），但提供了更好的 TypeScript 类型安全性（`_element` 声明为 `ElementLike | undefined`）。

### P3: 低优先级

#### 4.4 build 中 setState 的循环检测

**两者共同缺失**: Amp 和 flitter 都没有检测 build 内 setState 导致的无限循环。

**建议**: 在 buildScope 的 while 循环中添加迭代次数上限：

```typescript
const MAX_BUILD_ITERATIONS = 100;
let iterations = 0;

while (this._dirtyElements.size > 0) {
  if (++iterations > MAX_BUILD_ITERATIONS) {
    this._errorLogger(
      `BuildOwner.buildScope: exceeded ${MAX_BUILD_ITERATIONS} iterations. ` +
      `Possible infinite rebuild loop detected.`
    );
    this._dirtyElements.clear();
    break;
  }
  // ... 现有逻辑
}
```

**优先级**: 低。这是防御性改进，Flutter 原版也有类似的安全限制。

#### 4.5 构建统计可选化

**当前状态**: flitter 的 BuildOwner 始终记录构建统计。

**建议**: 可考虑在生产模式下禁用统计以减少微量 GC 压力，但当前实现的开销极小（几个 number 变量 + 60 元素数组），不构成实际问题。保持现状即可。

---

## 附录 A: setState 完整调用链路图

```
用户代码:
  state.setState(() => { count++ })
  │
  ▼
State.setState(fn):               // widget.ts:250
  ├── if (!_mounted) throw         // 守卫检查
  ├── fn()                         // 同步执行回调
  └── _markNeedsBuild()
      │
      ▼
State._markNeedsBuild():           // widget.ts:262
  └── _element.markNeedsBuild()
      │
      ▼
Element.markNeedsBuild():          // element.ts:154
  └── markNeedsRebuild()
      │
      ▼
Element.markNeedsRebuild():       // element.ts:143
  ├── if (!_mounted) return        // 守卫检查
  ├── _dirty = true
  └── getBuildScheduler().scheduleBuildFor(this)
      │
      ▼
BuildOwner.scheduleBuildFor(elem): // build-owner.ts:95
  ├── if (Set.has(elem)) return    // 去重
  ├── Set.add(elem)
  └── FrameScheduler.instance.requestFrame()
      │
      ▼
FrameScheduler.requestFrame():    // frame-scheduler.ts:215
  ├── if (_frameScheduled) return  // 合并
  ├── _frameScheduled = true
  └── scheduleFrameExecution(delay)
      │
      ▼
setImmediate / setTimeout:         // 让出事件循环
  └── runScheduledFrame()
      └── executeFrame()
          └── BUILD phase:
              └── BuildOwner.buildScopes()
                  └── while (dirtyElements.size > 0)
                      ├── sort by depth
                      └── element.performRebuild()
                          └── State.build(context)
                              → 返回新 Widget 树
                              → updateChild diff
```

## 附录 B: 关键测试用例清单

| 测试文件 | 测试名 | 验证内容 |
|---------|--------|---------|
| `build-owner.test.ts` | `adds element to dirty set` | scheduleBuildFor 基础功能 |
| `build-owner.test.ts` | `deduplicates (Set behavior)` | Set 去重机制 |
| `build-owner.test.ts` | `rebuilds dirty elements in depth order` | 深度排序 rebuild |
| `build-owner.test.ts` | `handles cascading dirtying` | while 循环级联处理 |
| `build-owner.test.ts` | `skips unmounted elements during rebuild` | unmounted 安全性 |
| `build-owner.test.ts` | `clears dirty flag even on rebuild error` | 错误后 dirty 清除 |
| `build-owner.test.ts` | `sets isBuilding during scope execution` | 构建状态追踪 |
| `widget.test.ts` | `initState is called during _mount` | 生命周期: initState |
| `widget.test.ts` | `mounted is true after _mount, false after _unmount` | mounted 状态 |
| `widget.test.ts` | `didUpdateWidget is called during _update with old widget` | 生命周期: didUpdateWidget |
| `widget.test.ts` | `dispose is called during _unmount` | 生命周期: dispose |
| `widget.test.ts` | `setState calls the callback` | setState 回调执行 |
| `widget.test.ts` | `setState marks element as needing build` | setState → dirty 标记 |
| `widget.test.ts` | `setState throws after dispose` | dispose 后 setState 防护 |
| `widget.test.ts` | `setState with no callback still marks dirty` | 无回调 setState |

## 附录 C: Amp 实际使用的 StatefulWidget 模式汇总

从提取的 Amp JS 文件中发现的 StatefulWidget 使用模式：

| Amp 类 | 概念 | setState 触发方式 | 生命周期使用 |
|--------|------|------------------|------------|
| `iJH` / `g0H` | StatusBar 状态 | `setInterval(200ms)` → `setState()` | initState/didUpdateWidget/dispose |
| `lT` / `$L$` | ExpandCollapse 折叠 | 外部 `onChanged` 回调 + `setState()` | initState/didUpdateWidget |
| `zk` | ThinkingBlock | `setInterval` → `setState()` | initState/didUpdateWidget/dispose |
| `Af` (内部) | BrailleSpinner | `setInterval(100ms)` → step + setState | initState/dispose |
| `dH0` | Scrollable | 键盘/鼠标事件 → controller → `setState` | initState/dispose |
| `F0H` 相关 | PromptBar 输入区 | 文本变化/补全/Shell 检测 → `setState` | initState/dispose |
| `mJH`/`bJH` | WelcomeScreen | 动画帧 → `setState` | initState/dispose |
| `$uH` | ThreadView (ChatView) | 消息流更新 → `setState` | initState/didUpdateWidget/dispose |

**共同模式**：
1. 定时器/动画：`initState` 启动 → `dispose` 清理 → `didUpdateWidget` 动态启停
2. 外部事件：controller/stream → callback → `setState`
3. 所有 `setState` 都传回调函数来同步修改状态变量
