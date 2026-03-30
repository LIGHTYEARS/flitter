# Amp TUI 深度分析 #15: 动画系统 + 定时器管理 + 性能监控

> 基于 Amp CLI 二进制逆向 + flitter-core / flitter-amp 源码的深度对比分析。
> 覆盖 BrailleSpinner、Handoff Blink、GlowText、DensityOrb、AgentModePulse、
> Copy Highlight、FrameScheduler、PerformanceOverlay、FrameStats、DebugInspector、debug flags。

---

## 1. Amp 实现细节

### 1.1 BrailleSpinner（Amp: `Af` 类）

**混淆文件**: `braille-spinner-Af.js`

Amp 的 BrailleSpinner 是一个 **细胞自动机**，而非传统帧序列旋转器。

#### 数据结构

```javascript
class Af {
  state = [true, false, true, false, true, false, true, false]; // 8 个布尔值，平铺 2×4 网格
  previousState = [];
  generation = 0;
  maxGenerations = 15;
  neighborMap = [                    // 预计算的邻居索引表（非标准 Moore 邻居）
    [1,3,4,5,7], [0,2,4,5,6],       // 8 个单元各自的邻居列表
    [1,3,5,6,7], [0,2,4,6,7],       // 基于 2×4 网格拓扑的自定义连接
    [0,1,3,5,7], [0,1,2,4,6],
    [1,2,3,5,7], [0,2,3,4,6]
  ];
}
```

#### 演化规则

```javascript
step() {
  let next = this.state.map((alive, i) => {
    let neighbors = this.neighborMap[i].filter(j => this.state[j]).length;
    if (alive) return neighbors === 2 || neighbors === 3; // 存活: 2-3 邻居
    return neighbors === 3 || neighbors === 6;             // 诞生: 3 或 6 邻居
  });
  // ... 静态/周期检测 + 重播种
}
```

**关键差异**: Amp 使用 **平铺数组** (`state[8]`) + 预计算 `neighborMap`；诞生规则包含 `neighbors === 6`（标准 GoL 只有 `3`）。

#### 重播种条件

- 静态: 当前帧与上一帧完全相同
- 周期: 当前帧与两帧前完全相同（period ≤ 2）
- 代数上限: `generation >= 15`（`maxGenerations = 15`）
- 全灭: 所有细胞死亡
- 枯竭: 存活细胞 < 2

重播种密度: `Math.random() > 0.6`，即 **40% 初始密度**，且确保至少 3 个存活。

#### Braille 编码

```javascript
toBraille() {
  let H = [0, 1, 2, 6, 3, 4, 5, 7]; // 平铺索引→braille 点位映射
  let L = 10240;                       // 0x2800
  for (let A = 0; A < 8; A++)
    if (this.state[A]) L |= 1 << H[A];
  return String.fromCharCode(L);
}
```

映射表: `H = [0,1,2,6,3,4,5,7]` 将平铺数组索引映射到 braille 点位权重的 bit 位。

#### 使用间隔

- **工具头 (`xD`, `$x`)**: `setInterval(200ms)` — 每 200ms 调用 `spinner.step()`
- **思维块 (`zk`)**: `setInterval(200ms)` — 同样 200ms
- **状态栏 (`iJH`)**: 使用 Wave Spinner（字符序列 `[" ", "∼", "≈", "≋", "≈", "∼"]`），200ms

### 1.2 Wave Spinner（Amp: `iJH` 状态栏动画）

**混淆文件**: `status-bar-iJH.js`

非细胞自动机，而是简单的 **帧序列循环**：

```javascript
animationFrames = [" ", "∼", "≈", "≋", "≈", "∼"]; // 6 帧
// 200ms 间隔，循环: animationFrame = (animationFrame + 1) % 6
```

条件启动: 仅在 streaming/processing/tool-running 时才动画。颜色随状态变化:
- submitting → `colors.primary`（蓝色）
- inference running → `colors.primary`
- 其他 → `colors.mutedForeground`（灰色）

### 1.3 Scanning Bar（Amp: `q$$`）

**参考**: `README.md` §11.3

水平动画线，字符 `━` (U+2501)，带尾部透明度梯度:
- 不透明度序列: `[1, 0.7, 0.5, 0.35, 0.25, 0.15]`
- 扫描方向: 从左到右，循环

### 1.4 Orb Glow / AgentModePulse（Amp: `kd` 类）

**混淆文件**: `agent-mode-colors-Ym.js`

Amp 使用 **Perlin 噪声** 生成 agent 模式的动态颜色:

```javascript
class kd {
  _noise2D;          // open-simplex-noise.makeNoise2D(seed)
  _seed;

  sample(H, L, A, I = 1) {
    return (this._noise2D(H / CcH, L / CcH + A * I) + 1) * 0.5;
    // CcH 是缩放因子，将坐标映射到噪声空间
  }

  sampleEdge(H, L, A, I, D = 1) {
    let t = H - 1;
    let f = L / 2 + A * (L / 2);
    return this.sample(t, f, I, D);
  }

  getColor(H, L, A) {
    return JKH(H, L, A);
    // JKH: 在 primary/secondary 颜色间插值
    // H = 噪声采样值 [0, 1]
    // L = agent mode name
    // A = 可选颜色对
  }
}
```

颜色混合: `QKH(primary, secondary, t)` — 两个模式颜色间的线性插值。

模式颜色对:
- `smart` → `primaryColor` / `secondaryColor`（从 uiHints 获取）
- 默认回退 → `OvH` (primary) / `wvH` (secondary)

### 1.5 Handoff Blink（Amp: 推断自行为）

虽然未找到独立的 handoff blink 混淆文件，但 `README.md` §5 和行为分析表明:
- `handoff` 工具在 `in-progress` 时使用状态指示器
- 使用 braille spinner（与其他工具相同）
- **Flitter 的 700ms blink 是增强实现**，Amp 原版可能只是 braille spinner

### 1.6 Copy Highlight（Amp: 推断）

Amp 的 `copyHighlight` 颜色 `(238, 170, 43)` 定义于主题中，用于选区复制后的短暂视觉反馈。机制: `updateSelection(start, end, 'copy')` → 短暂显示 → `clearSelection()`。

### 1.7 帧调度器（Amp: `c9` 类）

**Amp 原始行为**（从逆向分析还原）:

```
c9 (FrameScheduler) 单例:
  - _frameCallbacks: Map<string, { callback, phase, priority, name }>
  - _postFrameCallbacks: Array<{ callback, name }>
  - _frameScheduled: boolean
  - _pendingFrameTimer: setTimeout handle
  - _lastFrameTimestamp: number
  - _useFramePacing: boolean (test 模式 = false)

  requestFrame():
    if (_frameScheduled) return;                       // 合并
    if (_frameInProgress) { _frameScheduled = true; return; }  // 帧中请求
    if (!_useFramePacing) { 立即 setImmediate(); return; }
    elapsed = now - _lastFrameTimestamp;
    if (elapsed >= 16.67ms) → 立即执行
    else → setTimeout(16.67 - elapsed)

  executeFrame():
    for phase in ["build", "layout", "paint", "render"]:
      executePhase(phase);
    executePostFrameCallbacks();
    record stats;
    if (_frameScheduled) → 重新调度
```

**关键设计**: 完全 **按需驱动**（event-driven），无 setInterval 轮询。帧节流 = 60fps（16.67ms）。

### 1.8 性能监控（Amp: `BB0`）

Amp 有 `BB0` 类 (PerformanceTracker/PerformanceOverlay):
- 直接在 ScreenBuffer 上绘制
- 显示 FPS、帧时间百分位数
- 颜色编码: 绿色 (<70% budget)、黄色 (70-100%)、红色 (>100%)

### 1.9 调试检查器（Amp: `Mu`）

Amp 的 `Mu` 类运行在 `http://localhost:9876`:
- Widget/Element 树序列化
- Focus 树序列化
- 稳定 Element ID（WeakMap）
- RenderObject → Element 反向映射
- 1 秒间隔的周期性树扫描
- 按键历史缓冲区

### 1.10 定时器管理模式（Amp 通用）

Amp 所有动画使用统一模式:

```javascript
initState() { if (shouldAnimate) this._startAnimation(); }
didUpdateWidget(old) {
  if (!wasAnimating && nowAnimating) this._startAnimation();
  if (wasAnimating && !nowAnimating) this._stopAnimation();
}
dispose() { this._stopAnimation(); }

_startAnimation() {
  this._timer = setInterval(() => {
    this.setState(() => { /* update */ });
  }, INTERVAL);
}
_stopAnimation() {
  if (this._timer) clearInterval(this._timer);
  this._timer = undefined;
}
```

---

## 2. Flitter 实现细节

### 2.1 BrailleSpinner（`flitter-core/src/utilities/braille-spinner.ts`）

#### 数据结构

```typescript
class BrailleSpinner {
  private _grid: boolean[][];    // 4×2 二维数组（4行2列）
  private _history: number[] = []; // 最近 5 帧的码点历史
  private _maxHistory = 5;
}
```

**与 Amp 的关键差异**: Flitter 使用 **二维数组** `boolean[4][2]`（4行×2列），Amp 使用平铺 `boolean[8]`。

#### 演化规则

```typescript
// 使用标准 Moore 邻居（8方向扫描，边界检查）
for (let dr = -1; dr <= 1; dr++) {
  for (let dc = -1; dc <= 1; dc++) {
    if (dr === 0 && dc === 0) continue;
    // 边界检查 + 计数
  }
}
// 存活规则: 1-3 邻居（比 Amp 的 2-3 宽松）
// 诞生规则: 2-3 邻居（比 Amp 的 3/6 不同）
```

**规则差异**:
| 条件 | Amp | Flitter |
|------|-----|---------|
| 存活 | `neighbors === 2 \|\| neighbors === 3` | `neighbors >= 1 && neighbors <= 3` |
| 诞生 | `neighbors === 3 \|\| neighbors === 6` | `neighbors >= 2 && neighbors <= 3` |

#### 重播种条件

```typescript
_shouldReseed(): boolean {
  // 枯竭: < 2 存活
  // 静态: 连续 2 帧相同
  // 周期: history.length >= 4 时检测周期 ≤ 4（Amp 只检测 ≤ 2）
  // 无代数上限检查（Amp 有 maxGenerations = 15）
}
```

#### Braille 编码

```typescript
// 使用预定义权重表（二维查找）
const DOT_WEIGHTS = [
  [0x01, 0x08],  // row 0
  [0x02, 0x10],  // row 1
  [0x04, 0x20],  // row 2
  [0x40, 0x80],  // row 3
];
// code = Σ(grid[r][c] ? DOT_WEIGHTS[r][c] : 0)
// braille = String.fromCodePoint(0x2800 + code)
```

**与 Amp 的编码差异**: Flitter 直接使用二维权重表，Amp 使用 bit 移位 + 映射数组 `H = [0,1,2,6,3,4,5,7]`。两者最终结果等价。

#### 使用间隔

在 `ToolHeader` 中使用 **100ms** 间隔（Amp 使用 200ms）:
```typescript
// tool-header.ts
private startSpinner(): void {
  this.timer = setInterval(() => {
    this.setState(() => { this.spinner.step(); });
  }, 100);
}
```

### 2.2 Handoff Blink（`flitter-amp/src/widgets/tool-call/handoff-tool.ts`）

**Flitter 独有实现**（Amp 未见独立 blink 动画）:

```typescript
// 700ms 颜色交替
private startBlink(): void {
  this.timer = setInterval(() => {
    this.setState(() => {
      this.blinkVisible = !this.blinkVisible;
    });
  }, 700);
}

// 可见时: app.toolSuccess (绿色)
// 不可见时: base.mutedForeground (灰色)
// 渲染: "Waiting for handoff ●" — ● 颜色交替
```

### 2.3 GlowText（`flitter-amp/src/widgets/glow-text.ts`）

**Flitter 独有实现** — Perlin 噪声驱动的逐字符发光效果:

```typescript
class GlowTextState extends State<GlowText> {
  private timer: ReturnType<typeof setInterval> | null = null;
  private timeOffset = 0;

  initState() {
    this.timer = setInterval(() => {
      this.setState(() => { this.timeOffset += 0.08; });
    }, 100); // 100ms = 10fps
  }

  build() {
    for (let i = 0; i < text.length; i++) {
      const n = (noiseGT(i * 0.3 + this.timeOffset) + 1) * 0.5;
      const t = n * glowIntensity;  // glowIntensity 默认 0.4
      // 在 baseColor 和 glowColor 间按 t 插值
      const r = Math.round(base.r + (glow.r - base.r) * t);
      // ... g, b 同理
    }
  }
}
```

噪声函数: 1D Perlin（自实现），使用 Fisher-Yates 置换表，quintic fade。

### 2.4 DensityOrb（`flitter-amp/src/widgets/density-orb-widget.ts`）

**Flitter 独有实现** — 2D Perlin 噪声驱动的密度场可视化:

```typescript
// 参数:
const CELL_COLS = 40;
const CELL_ROWS = 20;
const NOISE_SCALE = 0.08;
const DENSITY_CHARS = ' .:-=+*#';  // 8 级密度字符

// 100ms 更新，timeOffset += 0.06
// 使用 fbm (Fractal Brownian Motion) 3 个八度 Perlin 噪声
// 椭圆边缘淡出: edgeFade = 1 - sqrt(nx² + ny²)

// 交互: 鼠标点击产生冲击波
// SHOCKWAVE_DURATION = 1.0s, SHOCKWAVE_SPEED = 30, SHOCKWAVE_RADIUS = 3
// 5 次点击 → 爆炸 + 粒子系统
```

### 2.5 Copy Highlight（`flitter-core/src/widgets/text.ts`）

```typescript
// RenderText 支持三种高亮模式:
get highlightMode(): 'selection' | 'copy' | 'none'

// copy 模式使用 copyHighlightColor (默认金黄色 238,170,43)
// 回退到 selectionColor
updateSelection(start, end, 'copy') → 设置 highlightMode = 'copy'
clearSelection() → 重置为 'none'
```

**注意**: 计时器驱动的自动消失（300ms flash）**尚未实现**。当前只提供 paint 层支持。

### 2.6 ScrollController.animateTo（`flitter-core/src/widgets/scroll-controller.ts`）

```typescript
animateTo(targetOffset: number, duration: number = 200): void {
  const frameInterval = 16; // ~60fps
  this._animationTimer = setInterval(() => {
    const elapsed = Date.now() - startTime;
    const progress = Math.min(elapsed / duration, 1);
    const newOffset = startOffset + delta * progress;  // 线性插值
    if (progress >= 1) this._cancelAnimation();
  }, frameInterval);
}
```

### 2.7 FrameScheduler（`flitter-core/src/scheduler/frame-scheduler.ts`）

高保真复刻 Amp 的 `c9`:

```typescript
class FrameScheduler {
  // 单例模式
  static get instance(): FrameScheduler { ... }

  // 4 阶段管线: BUILD → LAYOUT → PAINT → RENDER
  private executeFrame(): void {
    for (const phase of PHASE_ORDER) {
      this.executePhase(phase);
    }
    this.executePostFrameCallbacks();
  }

  // 帧合并 + 帧节流
  requestFrame(): void {
    if (this._frameScheduled) return;        // 合并
    if (!this._useFramePacing) {             // 测试模式
      this.scheduleFrameExecution(0);        // setImmediate
    } else {
      const remaining = FRAME_BUDGET_MS - elapsed;
      this.scheduleFrameExecution(remaining); // setTimeout
    }
  }
}
```

### 2.8 FrameStats（`flitter-core/src/diagnostics/frame-stats.ts`）

```typescript
class FrameStats {
  private _buffer: Float64Array;              // 总帧时间环形缓冲
  private _phaseTimings: Map<string, Float64Array>; // 每阶段独立缓冲
  readonly keyEventTimes: RingBuffer;          // 键盘事件耗时
  readonly mouseEventTimes: RingBuffer;        // 鼠标事件耗时
  readonly repaintPercents: RingBuffer;        // 重绘百分比
  readonly bytesWritten: RingBuffer;           // 字节写入量

  // 百分位计算: 复制 → 排序 → floor(N * p / 100)
  getPercentile(p: number): number { ... }

  // 快捷属性
  get p50(): number { return this.getPercentile(50); }
  get p95(): number { return this.getPercentile(95); }
  get p99(): number { return this.getPercentile(99); }
}
```

`RingBuffer` 使用 `Float64Array` 实现高效存储，容量默认 1024。

### 2.9 PerformanceOverlay（`flitter-core/src/diagnostics/perf-overlay.ts`）

```typescript
class PerformanceOverlay {
  draw(screen: ScreenBuffer, frameStats: FrameStats): void {
    // 34×14 Unicode box-drawing 面板
    // 位置: 屏幕右上角
    // 内容:
    //   FPS + Budget%
    //   ────────────
    //        P50    P95    P99
    //   Frame   X.Xms  X.Xms  X.Xms
    //   Build   X.Xms  X.Xms  X.Xms
    //   Layout  X.Xms  X.Xms  X.Xms
    //   Paint   X.Xms  X.Xms  X.Xms
    //   ────────────
    //   Repaint  XX%   XX%   XX%
    //   Bytes  XXXK  XXXK  XXXK
    //   ────────────
    //   Key P95:X.Xms Mouse:X.Xms
  }
}
```

颜色阈值:
- 绿色: < 70% budget (< 11.7ms)
- 黄色: 70-100% budget (11.7-16.7ms)
- 红色: > 100% budget (> 16.7ms)

标题: `" Gotta Go Fast "` — 居中在顶部边框。

### 2.10 DebugInspector（`flitter-core/src/diagnostics/debug-inspector.ts`）

```typescript
class DebugInspector {
  // HTTP 端点 (Bun.serve, port 9876):
  //   GET /tree         → Widget/Element 树 JSON
  //   GET /focus-tree   → Focus 树 JSON
  //   GET /inspect?id=N → 元素详细信息
  //   GET /select?id=N  → 选中元素高亮
  //   GET /keystrokes   → 按键历史
  //   GET /health       → { status: "ok" }

  // 周期性扫描: setInterval(1000ms)
  // 稳定 ID: WeakMap<Element, number>
  // 按键历史: RingBuffer<KeystrokeEntry>(100)
  // 反向映射: Map<RenderObject, Element>
}
```

### 2.11 Debug Flags（`flitter-core/src/diagnostics/debug-flags.ts`）

```typescript
const debugFlags = {
  debugPaintSize: false,         // 绘制每个 RenderBox 边界
  debugPrintBuilds: false,       // 日志每次 Widget.build()
  debugPrintLayouts: false,      // 日志每次 performLayout()
  debugPrintPaints: false,       // 日志每次 paint()
  debugRepaintRainbow: false,    // 重绘时循环边框颜色
  debugShowFrameStats: false,    // 控制台显示帧统计
  debugInspectorEnabled: false,  // 启用 HTTP 调试检查器
};
```

### 2.12 CollapsibleDrawer Spinner（引用）

`flitter-core/src/widgets/collapsible-drawer.ts` 也使用 200ms 的 spinner:
```typescript
private _startSpinner(): void {
  this._spinnerTimer = setInterval(() => {
    this.setState(() => { this._spinnerFrame++; });
  }, 200);
}
```

---

## 3. 差异对比表

| 特性 | Amp 实现 | Flitter 实现 | 差异等级 | 说明 |
|------|---------|-------------|---------|------|
| **BrailleSpinner 数据结构** | 平铺 `boolean[8]` + 预计算 `neighborMap[8][]` | 二维 `boolean[4][2]` + 运行时 Moore 邻居扫描 | 🟡 低 | 功能等价，Amp 的预计算稍快（O(1) 查表 vs O(邻居数) 循环），但 8 单元级别差异可忽略 |
| **BrailleSpinner 存活规则** | `neighbors === 2 \|\| neighbors === 3` | `neighbors >= 1 && neighbors <= 3` | 🟡 低 | Flitter 更宽松（1 邻居也存活），可能产生稍不同的视觉演化模式 |
| **BrailleSpinner 诞生规则** | `neighbors === 3 \|\| neighbors === 6` | `neighbors >= 2 && neighbors <= 3` | 🟡 低 | 不同但等效——两者都产生有机变化的 braille 字符；Amp 的 `6 邻居诞生` 在 2×4 网格中几乎不可能触发 |
| **BrailleSpinner 重播种** | `maxGenerations = 15`；密度 40%；确保 ≥3 存活 | 无代数上限；密度 60%（`Math.random() > 0.4`）；无最小存活保证 | 🟡 低 | Flitter 密度更高(60% vs 40%)，无代数上限意味着可能运行更长代数再重播种 |
| **BrailleSpinner 周期检测** | 检测 period ≤ 2（仅 `previousState`） | 检测 period ≤ 4（`_history` 环形缓冲 5 帧） | 🟢 无 | Flitter 更严格，能检测更长周期 |
| **Spinner 更新间隔** | 200ms（所有使用处） | 100ms（ToolHeader）/ 200ms（CollapsibleDrawer） | 🟠 中 | ToolHeader 使用 100ms 是 Amp 200ms 的 2 倍帧率，视觉上更流畅但消耗更多 CPU |
| **Wave Spinner** | 字符序列 `[" ", "∼", "≈", "≋", "≈", "∼"]` 200ms | 未实现 | 🔴 高 | Flitter 状态栏缺少 wave spinner 动画 |
| **Scanning Bar** | `━` + 透明度梯度 `[1, 0.7, 0.5, 0.35, 0.25, 0.15]` | 未实现 | 🟠 中 | Flitter 无水平扫描高亮动画 |
| **AgentModePulse 颜色** | Perlin 噪声 (`kd` + open-simplex) + primary/secondary 颜色插值 | 无动态模式颜色——静态 `agentModeColor()` 返回固定色 | 🟠 中 | Flitter 缺少 agent 模式标签的动态颜色脉冲 |
| **Handoff Blink** | Amp 可能使用 braille spinner（同其他工具） | 独立的 700ms 颜色交替动画 | 🟢 无 | Flitter 实现更明确的视觉反馈，是合理的增强 |
| **GlowText** | Amp 的 orb 使用 `kd` Perlin 噪声 | 独立 `GlowText` 组件，1D Perlin，逐字符颜色 | 🟢 无 | 功能等价的不同实现 |
| **DensityOrb** | Amp 有 splash orb（大小/细节未完全逆向） | 40×20 ASCII art + 2D fbm 噪声 + 冲击波 + 爆炸粒子系统 | 🟢 无 | Flitter 实现了 Amp 的 orb 概念且增加了交互 |
| **Copy Highlight 动画** | 短暂高亮 + 自动消失（推断 ~300ms） | `highlightMode = 'copy'` paint 支持，但无定时自动消失 | 🟠 中 | 缺少 setTimeout 驱动的自动 fade-out |
| **ScrollController 动画** | Amp 未见独立滚动动画（推断用帧调度） | `animateTo()` 使用 setInterval(16ms) 线性插值 | 🟢 无 | 合理实现 |
| **FrameScheduler** | `c9` 单例，4 阶段，帧合并+节流，setImmediate | 高保真复刻 | 🟢 无 | 几乎 1:1 对应 |
| **帧率控制** | 60fps (16.67ms)，test 模式即时执行 | 同 Amp | 🟢 无 | 完全一致 |
| **PerformanceOverlay** | `BB0` 直接缓冲绘制 | `PerformanceOverlay.draw()` 34×14 面板 | 🟢 无 | 等价实现 |
| **FrameStats 指标** | 帧时间 + 每阶段时间 | 帧时间 + 每阶段 + 键鼠事件 + 重绘% + 字节写入 | 🟢 无 | Flitter 比 Amp 更丰富 |
| **FrameStats 百分位** | P50/P95/P99（推断） | P50/P95/P99 + per-phase P95/P99 | 🟢 无 | Flitter 更细粒度 |
| **DebugInspector** | `Mu` 类，HTTP 9876，周期扫描，WeakMap 稳定 ID | 完整复刻 + keystroke history + CORS | 🟢 无 | 高保真 |
| **debug flags** | 散布在代码各处 | 7 个集中管理的标志 + setDebugFlag/resetDebugFlags API | 🟢 无 | 结构化管理 |
| **定时器清理** | `dispose()` 中 `clearInterval` | 同 Amp 模式 | 🟢 无 | 一致 |
| **动画框架** | 无 AnimationController/Tween/Curve — 纯 setInterval+setState | 同 Amp（纯 setInterval+setState） | 🟢 无 | 两者都使用相同的轻量级方案 |

---

## 4. 差异修复建议（按优先级排序）

### P0 — 高优先级（视觉保真度）

#### 4.1 状态栏 Wave Spinner（差异: 🔴 高）

**现状**: Flitter 状态栏无动画指示器。
**目标**: 实现 Amp 的 `iJH` wave spinner。

```
位置: flitter-amp/src/widgets/bottom-grid.ts (top-left 区域)
实现: 新建 WaveSpinner StatefulWidget
  - 帧序列: [" ", "∼", "≈", "≋", "≈", "∼"]
  - 间隔: 200ms setInterval + setState
  - 条件: isProcessing/isStreaming 时启动
  - 颜色: streaming → base.primary, 其他 → base.mutedForeground
```

工作量: ~1h

### P1 — 中优先级（视觉细节）

#### 4.2 BrailleSpinner 更新间隔对齐（差异: 🟠 中）

**现状**: ToolHeader 使用 100ms，Amp 统一使用 200ms。

```
修改: flitter-amp/src/widgets/tool-call/tool-header.ts
  - 将 setInterval 间隔从 100 改为 200
  - 同步所有 spinner 使用处为 200ms
```

工作量: ~10min

#### 4.3 Copy Highlight 自动消失（差异: 🟠 中）

**现状**: `highlightMode = 'copy'` 支持 paint，但无计时器驱动的自动消失。

```
实现位置: SelectionManager 或 ScrollView (处理 copy 操作的地方)
方案:
  1. 执行 copy 后调用 updateSelection(start, end, 'copy')
  2. setTimeout(300, () => clearSelection())
  3. 在 dispose 中 clearTimeout 防泄漏
```

工作量: ~30min

#### 4.4 Scanning Bar / AgentModePulse（差异: 🟠 中）

**现状**: 缺少扫描高亮和动态模式颜色。

```
方案 A (轻量): 在 BottomGrid 的 agent mode badge 上添加简单脉冲动画
  - 用 GlowText 替代纯 Text 渲染模式标签
  - 已有 GlowText 组件可直接复用

方案 B (完整): 实现 Scanning Bar widget
  - 字符: ━ (U+2501)
  - 不透明度梯度: [1, 0.7, 0.5, 0.35, 0.25, 0.15]
  - 逐帧移动扫描位置
```

工作量: 方案 A ~30min，方案 B ~2h

### P2 — 低优先级（内部质量）

#### 4.5 BrailleSpinner 规则对齐（差异: 🟡 低）

**现状**: 存活/诞生规则与 Amp 略有不同，视觉差异微小。

```
修改: flitter-core/src/utilities/braille-spinner.ts
  - 存活: neighbors >= 1 && <= 3 → neighbors === 2 || neighbors === 3
  - 诞生: neighbors >= 2 && <= 3 → neighbors === 3 || neighbors === 6
  (可选) 切换到平铺数组 + neighborMap 方案以完全匹配
```

工作量: ~20min

#### 4.6 BrailleSpinner 重播种参数对齐（差异: 🟡 低）

**现状**: 初始密度 60% vs Amp 40%；无代数上限。

```
修改: flitter-core/src/utilities/braille-spinner.ts
  - _randomGrid: Math.random() > 0.4 → Math.random() > 0.6
  - 添加 _maxGenerations = 15 检查
  - 重播种后确保至少 3 个存活细胞
```

工作量: ~15min

### P3 — 观察项（无需修复）

- **动画框架选择**: Amp 和 Flitter 都使用 `setInterval + setState` 的轻量方案，**不需要** 引入 Flutter 风格的 AnimationController/Tween/Curve 系统。Terminal TUI 的 10-60fps 需求不需要精确的缓动曲线。
- **内存泄漏防护**: 所有 StatefulWidget 的定时器都在 `dispose()` 中清理，模式一致且安全。`didUpdateWidget()` 中的条件启停也正确处理了状态变化。
- **FrameScheduler / FrameStats / PerformanceOverlay / DebugInspector**: 已高保真实现，无需修改。
- **debug flags**: 集中管理方案优于 Amp 的分散方式，是合理改进。

---

## 附录 A: 定时器生命周期完整性审计

| 组件 | 定时器类型 | 间隔 | initState | didUpdateWidget | dispose | 泄漏风险 |
|------|-----------|------|-----------|----------------|---------|---------|
| `ToolHeader` | `setInterval` | 100ms | ✅ 条件启动 | ✅ 条件启停 | ✅ 清理 | 无 |
| `HandoffTool` | `setInterval` | 700ms | ✅ 条件启动 | ✅ 条件启停 | ✅ 清理 | 无 |
| `GlowText` | `setInterval` | 100ms | ✅ 无条件启动 | ❌ 未处理 | ✅ 清理 | 低 — GlowText 始终动画 |
| `DensityOrbWidget` | `setInterval` | 100ms | ✅ 无条件启动 | ❌ 未处理 | ✅ 清理 | 低 — Orb 始终动画 |
| `CollapsibleDrawer` | `setInterval` | 200ms | ✅ 条件启动 | ✅ 条件启停 | ✅ 清理 | 无 |
| `ScrollController.animateTo` | `setInterval` | 16ms | N/A | N/A | ✅ 清理 | 无 |
| `DebugInspector._scanTimer` | `setInterval` | 1000ms | N/A (start) | N/A | ✅ stop() | 无 |
| `FrameScheduler._pendingFrameTimer` | `setTimeout` | 0-16ms | N/A | N/A | ✅ reset() | 无 |
| `InputParser._escapeTimer` | `setTimeout` | 500ms | N/A | N/A | ✅ dispose() | 无 |

**审计结论**: 所有定时器在 `dispose()` 中被正确清理。`GlowText` 和 `DensityOrbWidget` 缺少 `didUpdateWidget` 处理，但由于它们始终处于动画状态（无条件启停需求），不构成实际问题。

## 附录 B: Amp 动画更新间隔汇总

| 动画 | Amp 混淆位置 | Amp 间隔 | Flitter 间隔 | 匹配 |
|------|-------------|---------|-------------|------|
| BrailleSpinner (工具头) | `xD`, `$x` | 200ms | 100ms | ❌ |
| BrailleSpinner (思维块) | `zk` (aQH) | 200ms | 未直接使用 | — |
| BrailleSpinner (可折叠抽屉) | — | — | 200ms | ✅ |
| Wave Spinner (状态栏) | `iJH` | 200ms | 未实现 | ❌ |
| Handoff Blink | 推断 | — | 700ms | 独有 |
| GlowText | `kd` (Perlin) | — | 100ms | 独有 |
| DensityOrb | splash | — | 100ms | 独有 |
| ScrollController.animateTo | — | — | 16ms | 独有 |
| DebugInspector scan | `Mu` | 1s | 1s | ✅ |

## 附录 C: PerformanceOverlay 渲染布局

```
┌──────── Gotta Go Fast ────────┐  ← 34 chars wide
│FPS: 100          Budget:  60%│  ← FPS + budget %
├────────────────────────────────┤
│         P50    P95    P99    │  ← header
│Frame   5.0ms  8.2ms 12.1ms  │  ← 颜色编码
│Build   1.2ms  2.1ms  3.4ms  │
│Layout  1.5ms  2.8ms  4.2ms  │
│Paint   2.0ms  3.1ms  4.5ms  │
├────────────────────────────────┤
│Repaint  42%    65%    78%    │
│Bytes  1.2K   2.4K   3.8K    │
├────────────────────────────────┤
│Key P95: 1.2ms Mouse: 0.8ms  │
└────────────────────────────────┘  ← 14 rows high
```

颜色编码阈值（基于 16.67ms budget）:
- 🟢 绿色: < 70% → < 11.7ms
- 🟡 黄色: 70-100% → 11.7-16.7ms
- 🔴 红色: > 100% → > 16.7ms
