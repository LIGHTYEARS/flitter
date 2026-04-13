# Phase 6: TUI 高级交互组件 — RESEARCH

> **Phase:** 6 — TUI 高级交互组件 (`@flitter/tui` 子阶段 4/4)
> **Effort:** L | **Risk:** High
> **Depends on:** Phase 5 (Widget 库 + 主题)
> **Requirements:** TUI-09, TUI-10, TUI-12, TUI-13, TUI-14, TUI-15
> **Generated:** 2026-04-12

---

## 1. 目标概述

本阶段为 `@flitter/tui` 的最终子阶段，需实现 6 大高级交互子系统：

| Plan | 功能 | 对应需求 | 逆向代码核心类 |
|------|------|----------|---------------|
| 1 | ScrollController + Scrollable 容器 | TUI-09 | `Q3` (ScrollController), `P1T` (ScrollKeyHandler), `k1T` (ScrollPhysics) |
| 2 | ListView Widget | TUI-09 | `Scrollable` 的 builder 模式 + viewport 裁剪 |
| 3 | TextField 多行编辑 | TUI-10 | TextEditingController (wc) + `Kw` (TextLayoutEngine) |
| 4 | TextField 选择与 Kill buffer | TUI-10 | wc._killBuffer + Emacs keybindings |
| 5 | Markdown 渲染器 | TUI-12 | `micromark-parser.js` 模块 (12K 行) + `tui-thread-widgets.js` |
| 6 | Overlay/Popup 系统 | TUI-13 | `lZT` (OverlayEntry), `mZT` (LayerLink), `uZT` (AutocompleteController) |
| 7 | 跨 Widget 文本选择与剪贴板 | TUI-14 | `SelectionArea` + `m1T` (SelectionKeepAliveBoundary) + `eA` (clipboard) |
| 8 | 性能监控叠加层 | TUI-15 | `QXT` (PerformanceTracker), `ZXT` (FrameStatsOverlay) |

---

## 2. 现有基础设施 (Phase 3–5 产出)

### 2.1 已有的 @flitter/tui 模块

| 子系统 | 文件 | 关键类/接口 |
|--------|------|------------|
| **三棵树核心** | `tree/widget.ts`, `tree/element.ts`, `tree/render-object.ts` | `Widget`, `Element`, `RenderObject`, `StatefulWidget`, `StatelessWidget` |
| **RenderBox** | `tree/render-box.ts` | `RenderBox` — 2D 盒子布局基类 with `performLayout()`, `paint()` |
| **约束系统** | `tree/constraints.ts` | `BoxConstraints` — min/max width/height |
| **帧调度** | `tree/frame-scheduler.ts` | `FrameScheduler` — ~16ms 帧循环, build→layout→paint→render phases |
| **BuildOwner** | `tree/build-owner.ts` | 脏标记队列, 按深度排序重建 |
| **PipelineOwner** | `tree/pipeline-owner.ts` | 布局/绘制管线, `flushLayout()` / `flushPaint()` |
| **屏幕缓冲** | `screen/screen.ts`, `screen/buffer.ts` | `Screen` — 双缓冲 + 差分渲染 |
| **Cell** | `screen/cell.ts` | `Cell` — 字符 + 前景/背景色 + 样式属性 |
| **TextStyle** | `screen/text-style.ts` | 文字样式: bold, italic, underline, fg/bg |
| **ANSI 渲染器** | `screen/ansi-renderer.ts` | 差分 ANSI 序列生成 |
| **Color** | `screen/color.ts` | RGB/索引色 |
| **VT 解析器** | `vt/vt-parser.ts`, `vt/input-parser.ts` | CSI/OSC/DCS 解析, 输入事件映射 |
| **字宽计算** | `text/char-width.ts`, `text/emoji.ts` | `getCharWidth()`, CJK/Emoji 宽度处理 |
| **Widget 库** | `widgets/` | Container, Row, Column, Flex, Flexible, SizedBox, Padding, Stack, Text, RichText, TextSpan, Theme, ColorScheme |

### 2.2 关键依赖关系

```
Phase 6 新增模块
  ├── ScrollController / Scrollable / ListView  ← 依赖 RenderBox, Constraints, FrameScheduler
  ├── TextField                                  ← 依赖 TextLayoutEngine, RenderBox, InputParser
  ├── Markdown Renderer                          ← 依赖 micromark (外部), Text/RichText/TextSpan
  ├── Overlay / Popup                            ← 依赖 Stack (已有), Element lifecycle
  ├── Text Selection / Clipboard                 ← 依赖 RenderBox hit test, 平台 clipboard API
  └── Performance Overlay                        ← 依赖 FrameScheduler phaseStats, Screen.setCell
```

---

## 3. 逆向代码深度分析

### 3.1 ScrollController (`Q3` @ widget-property-system.js:393–585)

**完整实现已解析。** 关键设计:

```
class ScrollController {
  _offset: number = 0          // 当前滚动偏移 (行为单位)
  _maxScrollExtent: number = 0 // 最大可滚动范围
  _listeners: Function[] = []  // 滚动变更监听器
  _followMode: boolean = true  // 自动跟随模式 (新内容到达时自动滚底)
  _disposed: boolean = false

  // 动画状态
  _animationTimer: Timer | null
  _animationTarget: number | null
  _animationStartTime: number
  _animationDuration: number
  _animationCurve: 'linear' | 'easeOutCubic' | 'easeInOutCubic'
}
```

**核心 API:**
- `jumpTo(offset)` — 立即跳转 (clamped to [0, maxScrollExtent])
- `animateTo(target, duration?)` — 动画滚动 (setInterval ~16ms)
- `scrollToTop()` / `scrollToBottom()` — 边界跳转
- `scrollUp(n)` / `scrollDown(n)` — 相对滚动
- `scrollPageUp(viewportSize)` / `scrollPageDown(viewportSize)` — 半屏翻页
- `animateScrollUp()` / `animateScrollDown()` — 带动画的相对滚动
- `enableFollowMode()` / `disableFollowMode()` / `toggleFollowMode()`
- `updateMaxScrollExtent(n)` — 由 Scrollable 容器在 layout 后调用
- `updateOffset(n)` — 由 Scrollable 容器在滚动事件时调用
- 动画曲线: `_applyAnimationCurve()` 支持 linear / easeOutCubic / easeInOutCubic

**关键发现:**
1. **动画机制**: 使用 `setInterval(16ms)` 实现简单的补间动画, 非 requestAnimationFrame
2. **offset 单位**: 是行号 (整数), 非像素
3. **followMode**: 是实现「自动滚到底部」体验的核心 — 当新内容追加时, 如果 followMode=true 则自动调用 scrollToBottom()
4. **动画目标可变**: 如果动画进行中收到新的 animateTo(), 仅更新 target 而不重启 timer

### 3.2 ScrollKeyHandler (`P1T` @ widget-property-system.js:300–392)

实现 vim-style + 标准键盘滚动:

| 键 | 动作 (垂直) |
|----|------------|
| `ArrowUp` / `k` | 向上滚动 scrollStep(default=3) |
| `ArrowDown` / `j` | 向下滚动 scrollStep |
| `PageUp` | 翻页 (pageScrollStep=10) |
| `PageDown` | 翻页 |
| `Ctrl+u` | 半页上 |
| `Ctrl+d` | 半页下 |
| `Home` / `g` | scrollToTop |
| `End` / `G` (Shift+g) | scrollToBottom |

水平同理 (`ArrowLeft`/`h`, `ArrowRight`/`l`).

鼠标滚轮: button 64–67 对应 wheel up/down/left/right.

**关键发现:** scrollStep 从 `TerminalCapabilities.scrollStep()` 获取, 默认 fallback = 3.

### 3.3 TextEditingController (@ tui-widget-library.js:1–260+)

**超大组件, 实现完整的多行文本编辑器.** 关键字段:

```
class TextEditingController {
  _text: string              // 原始文本
  _cursorPosition: number    // 光标位置 (grapheme index)
  _selectionBase: number     // 选区起始
  _selectionExtent: number   // 选区终止
  _preferredColumn: number   // 垂直移动时记住的列偏好
  _killBuffer: string        // Emacs kill-ring (仅一级, 非完整 ring)
  _vScrollOffset: number     // 垂直滚动偏移
  _layoutEngine: TextLayoutEngine  // 文本布局引擎 (Kw)
  _promptRules: PromptRule[] // 提示符规则 (concealPrefix)
  _listeners: Function[]     // 变更监听器
  _scrollListeners: Function[] // 滚动监听器
}
```

**文本编辑操作:**
- `insertText(text)` — 插入文本, 处理 grapheme cluster
- `deleteText(n)` — 向前删除 n 个 grapheme
- `deleteForward(n)` — 向后删除
- `deleteSelectedText()` — 删除选区文本
- `deleteSelectedOrText()` — 有选区删选区, 无选区删字符
- `deleteCurrentLine()` — 删除当前行 (存入 killBuffer)
- `deleteToLineEnd()` / `deleteToLineStart()` — 行尾/行首删除 (存入 killBuffer)
- `deleteWordLeft()` / `deleteWordRight()` — 词粒度删除 (存入 killBuffer)

**光标移动:**
- `moveCursorLeft()` / `moveCursorRight()` — 水平移动
- `moveCursorUp()` / `moveCursorDown()` — 垂直移动 (使用 `_preferredColumn`)
- `moveCursorToStart()` / `moveCursorToEnd()` — 文档首尾
- `moveCursorToLineStart()` / `moveCursorToLineEnd()` — 行首尾
- `moveCursorWordBoundary(direction)` — 词边界跳转
- `moveCursorVertically(delta)` — 通过 TextLayoutEngine 计算目标位置

**选区操作:**
- 所有 move 方法接受 `extend: boolean` 参数, true 时扩展选区
- `selectWordAt(offset)` — 双击选词
- `selectLineAt(offset)` — 三击选行
- `setSelectionRange(start, end)` — 编程设置选区
- `hasSelection` getter — 判断是否有活跃选区
- `selectionRange` getter — 返回 {start, end} (normalized)

**Kill buffer (Emacs 风格):**
- `deleteWordLeft()` → 将删除内容存入 `_killBuffer`
- `deleteWordRight()` → 同上
- `deleteToLineEnd()` → 同上
- `deleteToLineStart()` → 同上
- `deleteCurrentLine()` → 同上
- `yankText()` → 在光标处插入 `_killBuffer` 内容

**Prompt 规则:**
- `_promptRules` 支持前缀隐藏 (concealPrefix), 用于实现输入提示符
- `_getMinimumCursorPosition()` 确保光标不会移到提示符区域内

**关键发现:**
1. **Grapheme-aware**: 所有位置计算使用 grapheme cluster index, 非 code point / byte offset
2. **TextLayoutEngine (Kw)**: 独立组件, 负责将文本按宽度换行 → 产出行列映射
3. **垂直移动**: `_preferredColumn` 机制确保上下移动时列位置不丢失 (跨越短行时保持原列)
4. **滚动集成**: 内置 `_vScrollOffset` + scroll 监听器, 光标移出视口时自动滚动

### 3.4 TextLayoutEngine (`Kw`)

逆向代码中 TextLayoutEngine 嵌入在 tui-widget-library 模块中 (未完整暴露, 但通过 TextEditingController 间接调用). 核心功能:

- `updateText(text)` — 重新布局
- `updateWidth(width)` — 视口宽度变更
- `getLine(lineIndex)` — 获取行文本
- `getLineCount()` — 总行数
- `positionToOffset(line, col)` → grapheme index
- `offsetToPosition(offset)` → {line, col}
- `getLayoutColumnFromOffset(offset)` — 获取布局列号

**关键发现:** 使用了 `B9` 函数 (Intl.Segmenter 或 polyfill) 进行 grapheme 分割, 确保中文/Emoji 正确处理.

### 3.5 Markdown 渲染 (micromark-parser.js)

**模块结构:** `micromark-parser.js` 是一个 12K+ 行的巨大模块, 包含:
1. **micromark 核心**: CommonMark 解析器 (tokenizer + compiler)
2. **GFM 扩展**: 表格、删除线、任务列表、自动链接
3. **HTML 编译器**: micromark tokens → HTML
4. **parse5 HTML 解析器**: HTML → DOM tree

但更重要的是 `tui-thread-widgets.js` 中的 **Markdown → Widget** 转换逻辑:

- `buildShimmerOverlay()` — 构建加载中的闪烁覆盖层
- `buildFallingOverlay()` — 构建下落效果覆盖层
- Thread 消息渲染: 将 Markdown AST 转为 TUI Widget tree (Text, RichText, TextSpan)

**渲染策略:**
1. micromark 解析 markdown → tokens
2. 自定义编译器将 tokens → 中间 AST (非 HTML)
3. AST → TUI Widget 树 (RichText + TextSpan + TextStyle)
4. 代码块: 语法高亮通过 theme 的 `syntaxHighlight` 配色实现

**关键发现:**
1. **非 HTML 路径**: 不走 micromark → HTML → parse5 → Widget 的路径; 而是直接从 micromark tokens 转换
2. **流式渲染**: 支持增量追加 (streaming), 在 AI 生成过程中逐步更新
3. **主题集成**: TuiTheme (yS 类) 定义了完整的 Markdown 相关配色: codeBlock, inlineCode, syntaxHighlight (keyword, string, number, comment, function, variable, type, operator)

### 3.6 Overlay / Popup 系统

在 `micromark-parser.js:11427–11600` 中发现完整的 Overlay 架构:

#### OverlayEntry (`lZT`)
```
class OverlayEntry {
  builder: Function           // Widget builder 函数
  maintainState: boolean      // 是否在隐藏时保持状态
  _overlayState: OverlayState // 所属 Overlay 状态
  _needsBuild: boolean        // 脏标记

  remove()          // 从 Overlay 移除
  markNeedsBuild()  // 标记需要重建
}
```

#### LayerLink (`mZT`)
```
class LayerLink {
  _target: { getGlobalPosition(), getSize() }  // 锚点目标
  _followers: Set<Function>                     // 位置追随者

  getTargetTransform() → { position, size } | null
}
```
用于 Overlay 定位——将弹出层锚定到特定 Widget 的位置.

#### AutocompleteController (`uZT`)
```
class AutocompleteController {
  _state: BehaviorSubject<AutocompleteState>
  _textController: TextEditingController
  _triggers: Trigger[]         // 触发条件 (如 @, /)
  _optionsBuilder: Function    // 选项生成器
  _onSelected: Function        // 选中回调

  initialize({ textController, triggers, optionsBuilder, onSelected })
  selectNext() / selectPrevious()  // 上下选择
  acceptSelected()                  // 确认选中
  dismiss()                         // 关闭
}
```

**AutocompleteState:**
```
{
  trigger: { query: string, start: number } | null,
  options: Option[],
  selectedIndex: number,
  isActive: boolean,
  generationId: number  // 防止异步竞态
}
```

**关键发现:**
1. **OverlayEntry 模式**: 类似 Flutter 的 `OverlayEntry`, 由 builder 函数延迟构建 Widget
2. **LayerLink 定位**: Overlay 弹出层通过 LayerLink 追踪锚点位置, 而非绝对坐标
3. **CommandPalette**: 在 `tui-thread-widgets.js:2748` 发现 `commandPaletteMode === "standalone"` 判断, CommandPalette 是通过 Overlay + AutocompleteController 实现的
4. **Debounce**: AutocompleteController 内置 debounce 逻辑, 防止频繁触发选项生成
5. **焦点管理**: Overlay 关闭时需要正确恢复底层 Widget 焦点

### 3.7 跨 Widget 文本选择与剪贴板

#### SelectionArea (@ widget-property-system.js:1–180)

```
class SelectionArea {
  _selectables: Selectable[]       // 注册的可选区域列表
  _idToSelectable: Map             // ID→Selectable 映射
  _orderedCache: Selectable[]      // 按文档序排列的缓存
  _selection: { anchor, extent }   // 当前选区 (跨多 Selectable)
  _isDragging: boolean             // 拖选状态
  _dragAnchor: SelectionPosition   // 拖选锚点
  _onCopyCallback: Function        // 复制回调

  // 选区操作
  setSelection({ anchor, extent })
  getSelection() → Selection | null
  clear()
  selectAll()
  copySelection() → string

  // 拖选
  beginDrag(position)
  updateDrag(position)
  endDrag() → async (自动复制到剪贴板)

  // 复制高亮
  startCopyHighlight() → 300ms 高亮后恢复
  endCopyHighlight()

  // 内部
  _splitSelectionBySelectable(selection) → Map<id, Range[]>
  _compareDocumentPositions(a, b) → number
  _propagateSelection() → 向每个 Selectable 分发其范围
  _autoCopySelection() → 异步写入剪贴板
}
```

#### SelectionKeepAliveBoundary (`m1T` @ widget-property-system.js:197–298)

```
class SelectionKeepAliveBoundary {
  _parent: SelectionArea
  _selectables: Set<Selectable>
  _keptAlive: boolean

  register(selectable) / unregister(selectable)
  _updateKeepAlive() → 当选区触及边界内的 Selectable 时, 保持 alive
  _selectionTouchesSelectable(selection, selectable) → boolean
}
```

用于 ListView 中——当列表项因滚出视口被回收时, 如果其文本参与了选区, 则通过 KeepAlive 机制保持其存在.

#### 剪贴板 (`eA` @ clipboard-and-input.js)

```
class Clipboard {
  // 策略模式: 多平台支持
  writeText(text) → Promise<boolean>
  readText() → Promise<string>
}
```

平台检测逻辑:
1. macOS: `pbcopy` / `pbpaste`
2. Linux (Wayland): `wl-copy` / `wl-paste`
3. Linux (X11): `xclip -selection clipboard`
4. 终端 OSC 52: 直接通过终端转义序列

**关键发现:**
1. **多 Selectable 选区**: 选区可以跨越多个注册的 Selectable 组件
2. **文档序排列**: `_orderedCache` 按 `globalBounds()` 的 top→left 排序, 确定文档顺序
3. **自动复制**: `endDrag()` 自动触发异步剪贴板写入 + 300ms 复制高亮反馈
4. **KeepAlive 联动**: ListView 的虚拟化与选区系统深度集成

### 3.8 性能监控叠加层

#### PerformanceTracker (`QXT` @ tui-layout-engine.js:709–798)

```
class PerformanceTracker {
  frameTimes: number[] = []           // 帧时间样本
  phaseTimes: {                       // 各阶段时间样本
    build: number[], layout: number[], paint: number[], render: number[]
  }
  keyEventTimes: number[] = []        // 键盘事件处理时间
  mouseEventTimes: number[] = []      // 鼠标事件处理时间
  repaintPercents: number[] = []      // 重绘百分比
  bytesWritten: number[] = []         // 写入字节数
  MAX_SAMPLES = 1024                  // 环形缓冲区大小

  recordFrame(time) / recordPhase(name, time) / recordKeyEvent(time) / ...
  getFrameP95() / getFrameP99() → number  (使用 Yh 百分位函数)
  getPhaseP95(name) / getPhaseP99(name) → number
  ...
}
```

#### 百分位计算 (`Yh` @ tui-layout-engine.js:702–708)

```typescript
function percentile(samples: number[], p: number): number {
  if (samples.length === 0) return 0;
  const sorted = [...samples].sort((a, b) => a - b);
  const k = Math.max(0, Math.min(p, 1));
  const index = Math.ceil(sorted.length * k) - 1;
  return sorted[Math.max(0, index)] || 0;
}
```

#### FrameStatsOverlay (`ZXT` @ tui-layout-engine.js:799–1045)

**直接在 Screen buffer 上绘制.** 不走 Widget 树, 而是在 `WidgetsBinding.drawFrame()` 的最后一步直接操作 Screen.

**布局:**
- 固定尺寸: 34 宽 × 14 高
- 位置: 右上角 (width - 34 - 2, 1)
- 标题: "Gotta Go Fast"

**显示内容:**
```
╭───── Gotta Go Fast ─────╮
│      Last    P95    P99  │
│  Key  1.23   2.34   3.45│
│Mouse  0.56   1.23   2.34│
│                          │
│Build  0.12   0.34   0.56│
│Layout 0.23   0.45   0.67│
│Paint  0.34   0.56   0.78│
│Render 0.45   0.67   0.89│
│                          │
│Frame  1.14   2.02   3.10│
│Repnt  5.2%  12.3%  18.7%│
│Bytes   1.2k   2.3k  3.4k│
╰──────────────────────────╯
```

**颜色编码:**
- 正常: foreground 色
- 警告 (>= 70% 帧预算): warning 色
- 危险 (>= 100% 帧预算): destructive 色
- 帧预算 = `cP` (全局变量, 约 16.67ms)
- Repaint%: >= 20% warning, >= 50% destructive

**集成点:**
- `WidgetsBinding.drawFrame()` 最后调用 `frameStatsOverlay.recordStats()` 和 `frameStatsOverlay.draw()`
- 键盘/鼠标事件处理后调用 `frameStatsOverlay.recordKeyEvent()` / `recordMouseEvent()`
- 通过 `Ctrl+Shift+P` (或特定快捷键) 调用 `toggleFrameStatsOverlay()`

**关键发现:**
1. **Screen 直接绘制**: 不参与 Widget 树, 避免自身影响性能指标
2. **排序百分位**: 每次调用都 sort (O(n log n)), 但 n ≤ 1024 所以可接受
3. **环形缓冲**: 超过 MAX_SAMPLES 时 shift() 淘汰最旧样本

---

## 4. 技术决策与风险分析

### 4.1 关键技术决策

| 决策点 | 原版做法 | 建议 | 理由 |
|--------|---------|------|------|
| 滚动偏移单位 | 行号 (整数) | 保持行号 | TUI 天然是行为单位, 无亚像素概念 |
| 滚动动画 | setInterval(16ms) | 改用 FrameScheduler.requestFrame() | 与现有帧循环集成, 避免竞争 |
| Grapheme 分割 | `B9` (Intl.Segmenter polyfill) | 使用 Bun 内置 Intl.Segmenter | Bun 原生支持, 无需 polyfill |
| Kill buffer | 单级 (非 ring) | 保持单级 | 忠实还原, 后续可扩展为 ring |
| Markdown 解析 | micromark (bundled) | npm micromark + @micromark/extension-gfm | 使用官方包, 非 bundle |
| Overlay 绘制 | 独立于 Widget 树 (FrameStatsOverlay) 或 OverlayEntry Widget | 区分: 性能叠加用 Screen 直绘; 业务 Overlay 用 Widget 树 | 性能叠加层不应影响指标; 业务弹出需要完整生命周期 |
| 剪贴板 | 多策略: pbcopy, wl-copy, xclip, OSC52 | 同样多策略 + 优先尝试 OSC 52 | 最广兼容性 |
| 性能数据采样 | Array.push + shift (环形) | 使用固定大小 Float64Array + 游标 | 避免 GC 压力, 内存更紧凑 |

### 4.2 已知陷阱 (Pitfalls)

#### PIT-C2: 差分渲染鬼影 (Overlay 关闭后残留像素)

**原因:** Screen 双缓冲差分渲染时, 如果 Overlay 直接在 Screen 上绘制, 关闭后需要明确还原被覆盖的区域.

**缓解措施:**
1. FrameStatsOverlay 在每帧完全重绘其区域 (先清再画)
2. 关闭 Overlay 后触发 `requestForcedPaintFrame()` 强制全屏重绘
3. 对于 Widget 树中的 Overlay, 通过正常的脏标记机制触发父级重绘

#### PIT-D4: 背压帧率冲突 (滚动期间 Layout 开销)

**原因:** 快速滚动时每帧触发 layout 重算, 如果 ListView 子项复杂, 可能超出帧预算.

**缓解措施:**
1. ListView 使用 **懒加载**: 只构建视口内 + 缓冲区的子项 (builder 模式)
2. 滚动时的 layout 只重算 **可见区域** 的子项, 不触发全树
3. Markdown 渲染结果缓存 — 只有内容变化时重新解析
4. FrameScheduler 的背压机制: 如果帧时间超标, 降低调度频率

### 4.3 风险矩阵

| 风险 | 概率 | 影响 | 缓解 |
|------|------|------|------|
| Grapheme 处理: 中文输入法组合字符导致光标错位 | 高 | 高 | 依赖 Bun Intl.Segmenter + 充分的 CJK/Emoji 测试 |
| Overlay Z-order 冲突: 多层弹出覆盖顺序错误 | 中 | 中 | OverlayEntry 按插入顺序排列, 后插入的在上层 |
| 性能叠加层自身影响帧时间 | 低 | 低 | 直接 Screen 绘制, 不走 Widget layout |
| micromark 解析性能: 超长 Markdown 文档 | 中 | 中 | 增量解析 + 内容分块 |
| 跨 Widget 选区: 滚动导致 Selectable 重排序 | 高 | 高 | 实现 SelectionKeepAliveBoundary, 正确处理回收/复用 |
| ScrollController 动画与 FrameScheduler 竞争 | 中 | 中 | 统一使用帧调度, 不用独立 setInterval |

---

## 5. 依赖与外部库

### 5.1 新增 npm 依赖

| 包 | 版本 | 用途 |
|----|------|------|
| `micromark` | ^4.x | Markdown 解析 |
| `micromark-extension-gfm` | ^3.x | GFM 扩展 (表格, 删除线, 任务列表) |
| `micromark-util-types` | ^2.x | TypeScript 类型定义 |

### 5.2 可选依赖

| 包 | 用途 | 决策 |
|----|------|------|
| `parse5` | HTML 解析 (用于 Markdown 内嵌 HTML) | 暂不引入, Markdown 纯文本路径足够 |

### 5.3 现有依赖 (Phase 3–5 已安装)

无额外变更.

---

## 6. 文件结构规划

```
packages/tui/src/
├── scroll/
│   ├── scroll-controller.ts        — ScrollController 类 (Plan 1)
│   ├── scroll-controller.test.ts
│   ├── scroll-physics.ts           — ScrollPhysics 接口 (Plan 1)
│   ├── scrollable.ts               — Scrollable Widget + State (Plan 1)
│   ├── scrollable.test.ts
│   ├── scroll-key-handler.ts       — 键盘/鼠标滚动处理 (Plan 1)
│   ├── list-view.ts                — ListView Widget (Plan 2)
│   ├── list-view.test.ts
│   └── index.ts
├── editing/
│   ├── text-layout-engine.ts       — TextLayoutEngine (Plan 3)
│   ├── text-layout-engine.test.ts
│   ├── text-editing-controller.ts  — TextEditingController (Plan 3+4)
│   ├── text-editing-controller.test.ts
│   ├── text-field.ts               — TextField Widget (Plan 3)
│   ├── text-field.test.ts
│   └── index.ts
├── markdown/
│   ├── markdown-parser.ts          — micromark 解析封装 (Plan 5)
│   ├── markdown-parser.test.ts
│   ├── markdown-renderer.ts        — AST → Widget 转换 (Plan 5)
│   ├── markdown-renderer.test.ts
│   ├── syntax-highlight.ts         — 代码块语法高亮 (Plan 5)
│   └── index.ts
├── overlay/
│   ├── overlay-entry.ts            — OverlayEntry (Plan 6)
│   ├── overlay.ts                  — Overlay Widget + State (Plan 6)
│   ├── layer-link.ts               — LayerLink 定位 (Plan 6)
│   ├── autocomplete-controller.ts  — AutocompleteController (Plan 6)
│   ├── autocomplete-controller.test.ts
│   ├── command-palette.ts          — CommandPalette Widget (Plan 6)
│   └── index.ts
├── selection/
│   ├── selection-area.ts           — SelectionArea (Plan 7)
│   ├── selection-area.test.ts
│   ├── selection-keep-alive.ts     — SelectionKeepAliveBoundary (Plan 7)
│   ├── clipboard.ts                — 跨平台 Clipboard (Plan 7)
│   ├── clipboard.test.ts
│   └── index.ts
├── perf/
│   ├── performance-tracker.ts      — PerformanceTracker (Plan 8)
│   ├── performance-tracker.test.ts
│   ├── frame-stats-overlay.ts      — FrameStatsOverlay (Plan 8)
│   ├── frame-stats-overlay.test.ts
│   └── index.ts
```

---

## 7. 实现顺序与依赖链

```
Plan 1: ScrollController + Scrollable
  └─→ Plan 2: ListView (依赖 Scrollable)
        └─→ Plan 7: 文本选择 + 剪贴板 (依赖 ListView 的 KeepAlive)

Plan 3: TextField 基础
  └─→ Plan 4: TextField 选择与 Kill buffer (依赖 Plan 3)
        └─→ Plan 6: Overlay/Popup (AutocompleteController 依赖 TextField)

Plan 5: Markdown 渲染 (独立, 仅依赖 Phase 5 的 Text/RichText/TextSpan)

Plan 8: 性能监控叠加层 (独立, 仅依赖 FrameScheduler + Screen)
```

**推荐并行策略:**
- **Wave 1:** Plan 1 (Scroll) + Plan 3 (TextField 基础) + Plan 5 (Markdown) + Plan 8 (性能监控)
- **Wave 2:** Plan 2 (ListView) + Plan 4 (Kill buffer)
- **Wave 3:** Plan 6 (Overlay) + Plan 7 (文本选择)

---

## 8. 测试策略

### 8.1 每个 Plan 的测试要求

| Plan | 测试类型 | 关键测试用例 |
|------|---------|-------------|
| 1 | 单元 | ScrollController: offset clamping, animateTo timing, followMode, dispose |
| 2 | 单元+集成 | ListView: 1000+ 行懒加载, 视口内子项数验证, 快速滚动无闪烁 |
| 3 | 单元 | TextEditingController: 中文输入, 光标位置, Grapheme cluster 边界 |
| 4 | 单元 | Kill buffer: deleteWordLeft/Right → yank, deleteToLineEnd → yank |
| 5 | 单元+Golden | Markdown: AST 对比 golden files, 代码块高亮, 嵌套列表 |
| 6 | 单元+集成 | OverlayEntry: mount/remove lifecycle, AutocompleteController: 触发/选择/关闭 |
| 7 | 单元+集成 | SelectionArea: 跨 Selectable 选区, clipboard write mock |
| 8 | 单元 | PerformanceTracker: P95/P99 计算, 环形缓冲溢出 |

### 8.2 验收标准映射

| 验收标准 | 测试方式 |
|---------|---------|
| ListView 1000+ 行流畅无闪烁 | 性能基准测试: 生成 2000 行数据, 验证每帧时间 < 16ms |
| TextField 多行中文输入 | 单元测试: CJK 字符串输入 + 光标位置断言 |
| kill-yank 操作 | 单元测试: Emacs 编辑序列回放 |
| Markdown golden file 对比 | 快照测试: 输入 Markdown → 输出 Widget 结构 → 对比预期 |
| Overlay 不影响底层状态 | 集成测试: 弹出→关闭→验证底层 Widget 状态不变 |
| 性能叠加层实时指标 | 集成测试: 注入已知帧时间 → 验证 P95/P99 计算结果 |

---

## 9. 开放问题

| # | 问题 | 影响 | 建议 |
|---|------|------|------|
| Q1 | micromark v4 vs v3? 逆向代码中 micromark 版本未确认 | 中 | 使用 micromark v4 (最新), API 差异不大 |
| Q2 | Markdown 内嵌 HTML 需要支持到什么程度? | 低 | 初期仅支持纯 Markdown, 忽略内嵌 HTML |
| Q3 | AutocompleteController 的触发器是否已由 Phase 5 的 Theme/Widget 提供? | 低 | 需确认, 否则本阶段需额外实现 Trigger 接口 |
| Q4 | ScrollController 动画应使用 setInterval 还是 FrameScheduler? | 中 | 使用 FrameScheduler requestFrame (更好的集成), 但需确保不影响帧预算统计 |
| Q5 | 性能叠加层的帧预算常量 (cP) 应该是 16.67ms 还是可配置? | 低 | 默认 16.67ms, 通过环境变量可覆盖 |

---

## 10. 参考文件索引

| 资源 | 路径 | 用途 |
|------|------|------|
| ScrollController 原始实现 | `amp-cli-reversed/framework/widget-property-system.js:393–585` | Plan 1 参考 |
| ScrollKeyHandler | `amp-cli-reversed/framework/widget-property-system.js:300–392` | Plan 1 参考 |
| SelectionArea | `amp-cli-reversed/framework/widget-property-system.js:1–180` | Plan 7 参考 |
| SelectionKeepAliveBoundary | `amp-cli-reversed/framework/widget-property-system.js:197–298` | Plan 7 参考 |
| TextEditingController | `amp-cli-reversed/framework/tui-widget-library.js:1–260+` | Plan 3/4 参考 |
| TuiTheme (yS) | `amp-cli-reversed/framework/tui-widget-library.js:1742–1900` | Plan 5 配色 |
| micromark-parser | `amp-cli-reversed/framework/micromark-parser.js` (12K lines) | Plan 5 参考 |
| OverlayEntry / LayerLink | `amp-cli-reversed/framework/micromark-parser.js:11427–11485` | Plan 6 参考 |
| AutocompleteController | `amp-cli-reversed/framework/micromark-parser.js:11486–11600` | Plan 6 参考 |
| PerformanceTracker (QXT) | `amp-cli-reversed/framework/tui-layout-engine.js:709–798` | Plan 8 参考 |
| FrameStatsOverlay (ZXT) | `amp-cli-reversed/framework/tui-layout-engine.js:799–1045` | Plan 8 参考 |
| Percentile 函数 (Yh) | `amp-cli-reversed/framework/tui-layout-engine.js:702–708` | Plan 8 参考 |
| Clipboard | `amp-cli-reversed/framework/clipboard-and-input.js:1–475` | Plan 7 参考 |
| WidgetsBinding 集成点 | `amp-cli-reversed/framework/tui-render-pipeline.js:81,115–131,157–159` | Plan 8 集成 |
| CommandPalette 模式 | `amp-cli-reversed/framework/tui-thread-widgets.js:2748` | Plan 6 参考 |
| 现有 Widget 库 | `packages/tui/src/widgets/` | 所有 Plan 的基础 |
| 帧调度器 | `packages/tui/src/tree/frame-scheduler.ts` | Plan 1/8 集成点 |
| 屏幕缓冲 | `packages/tui/src/screen/screen.ts` | Plan 8 绘制目标 |
| 字宽计算 | `packages/tui/src/text/char-width.ts` | Plan 3/5 依赖 |
