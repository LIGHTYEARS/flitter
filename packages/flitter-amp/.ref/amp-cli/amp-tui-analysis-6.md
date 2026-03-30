# Amp TUI 深度分析 #6: 鼠标系统 + HitTest + Cursor 管理

> 基于 Amp CLI v0.0.1774512763 (Bun standalone binary) 混淆 JS 逆向 + flitter-core 源码对比。
> 分析日期: 2026-03-29

---

## 1. Amp 实现细节

### 1.1 鼠标协议栈 — 从终端字节到结构化事件

#### 1.1.1 协议启用 (DECSET 模式)

Amp 在 `wB0.init()` (TerminalManager 初始化) 中启用鼠标追踪，发送以下 DECSET 序列：

```
\x1b[?1002h   ← DECSET 1002: Button Event Tracking (按钮事件 + 拖拽)
\x1b[?1003h   ← DECSET 1003: Any Event Tracking (所有鼠标移动)
\x1b[?1004h   ← DECSET 1004: Focus Event Reporting (终端获焦/失焦)
\x1b[?1006h   ← DECSET 1006: SGR Mouse Mode (扩展坐标编码)
```

**模式解释**：
| DECSET 代码 | 协议名称 | 作用 |
|-------------|---------|------|
| `1000` | X10 Mouse Reporting | 仅报告按下事件（Amp 未使用） |
| `1002` | Button Event Tracking | 报告按下/释放/按住拖拽 |
| `1003` | Any Event Tracking | 报告所有鼠标移动（含无按钮移动）|
| `1004` | Focus Event Reporting | 报告终端窗口获焦(`\e[I`)/失焦(`\e[O`) |
| `1006` | SGR Mouse Mode | 使用 `\e[<...M/m` 编码（替代 X10 的 raw byte 编码）|

**关键设计**：Amp 同时启用 1002+1003 是因为 1003 是 1002 的超集。1003 启用后即可收到所有鼠标事件（含 hover 移动），1002 保证在不支持 1003 的终端上仍有基本按钮事件追踪。

#### 1.1.2 三种鼠标编码协议对比

终端鼠标有三种主流编码：

| 协议 | 格式 | 坐标范围 | 释放识别 | Amp 使用 |
|------|------|---------|---------|---------|
| **X10** | `\e[M` + 3 raw bytes (Cb;Cx;Cy) | 0-222 (7-bit) | button=3 表示释放（不知哪个按钮释放）| ❌ 不使用 |
| **URxvt** | `\e[Cb;Cx;CyM` (decimal) | 无上限 | 同 X10 (button=3) | ❌ 不使用 |
| **SGR** (1006) | `\e[<Cb;Cx;CyM` / `\e[<Cb;Cx;Cym` | 无上限 | 小写 `m` = 释放 + 精确按钮 | ✅ 唯一使用 |

**SGR 优势**：
1. **精确释放**：`m` 终止符明确标识释放事件，且 Cb 包含哪个按钮被释放
2. **无坐标上限**：decimal 编码支持任意大的列/行号
3. **修饰键**：Cb 高位编码 Shift/Alt/Ctrl/Motion

#### 1.1.3 SGR 按钮编码 (Cb 字段)

```
Cb = button_id | modifier_bits

button_id 编码:
  0      = 左键
  1      = 中键
  2      = 右键
  3      = 释放（仅 X10 模式，SGR 不用）
  64     = 滚轮上
  65     = 滚轮下
  66     = 滚轮左
  67     = 滚轮右

modifier_bits (位掩码):
  bit 2 (+4)  = Shift
  bit 3 (+8)  = Meta/Alt
  bit 4 (+16) = Ctrl
  bit 5 (+32) = Motion (鼠标移动中)
```

**示例**：
- `\e[<0;10;5M` → 左键按下 at (10,5) [1-based]
- `\e[<0;10;5m` → 左键释放 at (10,5)
- `\e[<32;12;8M` → 鼠标移动 (motion=32) at (12,8)，按住左键拖拽
- `\e[<64;10;5M` → 滚轮上 at (10,5)
- `\e[<16;10;5M` → Ctrl+左键按下 at (10,5)

#### 1.1.4 Amp 解析器状态机 (emitKeys)

Amp 使用 Bun/Node 风格的 `emitKeys` 状态机解析转义序列。混淆名在 `amp-strings.txt:241761`。

状态机流程：
```
stdin raw bytes
    ↓
┌─────────┐  \x1b   ┌──────────┐  [    ┌──────────┐  <Cb;Cx;CyM/m  ┌───────────────┐
│  Idle   │ ──────→ │  Escape  │ ────→ │   CSI    │ ─────────────→ │ SGR Mouse     │
└─────────┘         └──────────┘       └──────────┘                │ → MouseEvent  │
                          │                  │                      └───────────────┘
                          │ 500ms timeout    │ other finals
                          ↓                  ↓
                    emit bare ESC       emit KeyEvent
```

**关键正则**：
```js
const SGR_MOUSE_RE = /^<(\d+);(\d+);(\d+)$/;
```
匹配 `<button;col;row`，结合终止符 `M`(press/motion) 或 `m`(release) 判断动作类型。

#### 1.1.5 动作判定逻辑

Amp 的 `determineMouseAction(buttonCode, finalChar)` 判定：

```
if (final === 'm')           → 'release'
if (baseButton >= 64..67)    → 'scroll'
if (buttonCode & 32)         → 'move'  (Motion bit)
otherwise                    → 'press'
```

#### 1.1.6 协议禁用 (cleanup)

Amp 在退出/挂起时通过 `zG8` cleanup 函数发送：

```
\x1b[?1002l   ← 禁用 Button Event Tracking
\x1b[?1003l   ← 禁用 Any Event Tracking
\x1b[?1004l   ← 禁用 Focus Event Reporting
\x1b[?1006l   ← 禁用 SGR Mouse Mode
\x1b[?1016l   ← 禁用 Pixel Mouse Mode (预留)
```

### 1.2 事件分发管线

#### 1.2.1 完整管线

```
stdin (raw bytes)
    │
    ▼
InputParser.feed(data)          ← 状态机解析
    │
    ▼
EventDispatcher.dispatch(event) ← 单例路由器
    │
    ├── event.type === 'mouse'
    │       │
    │       ├─ action === 'release' → fire globalReleaseCallbacks (拖拽结束)
    │       │
    │       └─ 所有 mouseHandlers 被调用
    │               │
    │               ▼
    │       MouseManager.updatePosition(x, y)  ← 更新全局位置
    │               │
    │               ├─ action === 'scroll'/'press'/'release'
    │               │       │
    │               │       ▼
    │               │   MouseManager.dispatchMouseAction(action, x, y, button)
    │               │       │
    │               │       ▼
    │               │   hitTest on render tree → find deepest RenderMouseRegion
    │               │       │
    │               │       ▼
    │               │   region.handleMouseEvent(type, event)
    │               │
    │               └─ action === 'move' → hover 由 reestablishHoverState 处理
    │
    └── event.type === 'key' / 'resize' / 'paste' / 'focus'
            → 各自的处理管线
```

#### 1.2.2 Global Release Callbacks

Amp (混淆: `Pg.instance.addGlobalReleaseCallback`) 维护一个全局释放回调集合。当鼠标释放事件到达时，在分发给具体 handler 之前先触发这些回调。

用途：TextField 的拖拽选区——当用户在文本区域开始拖拽后，即使鼠标移出了文本区域，释放事件仍需通知 TextField 结束拖拽。

### 1.3 HitTest 算法

#### 1.3.1 核心 DFS 遍历

Amp 的 hit-test 在 `Pg` (MouseManager) 中实现，对 render tree 做 DFS 遍历：

```
_hitTest(node, x, y, parentOffsetX, parentOffsetY, depth, results):
  1. 计算 globalOffset = parentOffset + node.offset
  2. 如果 node instanceof RenderMouseRegion:
     - 检查 (x, y) 是否在 [globalX, globalY, width, height] 范围内
     - 命中 → 加入 results: { region, depth }
     - 如果 region.opaque → 标记 opaqueHit = true
  3. 收集子节点列表
  4. 倒序遍历子节点 (i = children.length-1 → 0)
     - 对每个子节点递归 _hitTest
     - 如果子节点返回 opaqueHit → break (跳过后续兄弟)
  5. return opaqueHit
```

**关键设计**：
- **倒序遍历**：最后一个子节点 = 最高 z-order（最后绘制 = 最上层），先检查它
- **opaque 阻断**：`opaque=true` 的区域阻止命中测试穿透到下方节点
- **坐标累加**：通过 `parentOffset + node.offset` 逐层累加实现坐标变换

#### 1.3.2 两套 HitTest 实现

Amp/flitter 中存在两套 hit-test：

| 实现 | 类/函数 | 用途 | 返回格式 |
|------|---------|------|---------|
| MouseManager._hitTest | `MouseManager` 私有方法 | hover 追踪 + action 分发 | `{ region, depth }[]` |
| hitTest() 函数 | `hit-test.ts` 独立函数 | 通用 render tree hit-test | `{ renderObject, localX, localY }[]` |

第一套（MouseManager 内部）专为 `RenderMouseRegion` 优化，直接收集命中的鼠标区域。
第二套是通用的 render tree hit-test，返回从最深到最浅的完整路径，包含 local 坐标。

#### 1.3.3 HitTestEntry 结构

**MouseManager 内部版**：
```typescript
interface HitTestEntry {
  region: RenderMouseRegion;  // 命中的鼠标区域
  depth: number;              // DFS 深度 (用于 z-order 排序)
}
```

**通用版 (hit-test.ts)**：
```typescript
interface HitTestEntry {
  renderObject: RenderObject; // 命中的渲染对象
  localX: number;             // 相对于该对象的 local X
  localY: number;             // 相对于该对象的 local Y
}
```

### 1.4 MouseRegion Widget

#### 1.4.1 Amp 混淆名映射

| Amp 混淆名 | 类型 | Flitter 类名 |
|------------|------|-------------|
| `T3` | Widget | `MouseRegion` |
| `Ba` | RenderObject | `RenderMouseRegion` |
| `GL` | (简化别名) | `MouseRegion` |

#### 1.4.2 事件类型枚举

```typescript
type MouseEventType = 'click' | 'release' | 'drag' | 'enter' | 'exit' | 'hover' | 'scroll';
```

| 事件 | 触发条件 | 回调属性 |
|------|---------|---------|
| `click` | 鼠标按下 (press action → 映射为 click) | `onClick` |
| `release` | 鼠标释放 | `onRelease` |
| `drag` | 按住移动 (motion bit + button held) | `onDrag` |
| `enter` | 鼠标进入区域 | `onEnter` |
| `exit` | 鼠标离开区域 | `onExit` |
| `hover` | 鼠标在区域内移动 (无按钮) | `onHover` |
| `scroll` | 滚轮事件 | `onScroll` |

#### 1.4.3 RenderMouseRegion 布局行为

`RenderMouseRegion` 是透传布局的 RenderBox：
```
performLayout():
  if (child):
    child.layout(this.constraints)
    this.size = child.size
  else:
    this.size = constraints.constrain(Size.zero)
```
它不添加任何额外尺寸，完全等同于子节点的大小。

#### 1.4.4 opaque 属性

```typescript
opaque: boolean  // 默认 true
```

当 `opaque=true` 时，该区域会阻止 hit-test 穿透到 z-order 更低的兄弟节点。用于：
- 模态对话框阻止背景点击
- 叠加元素的事件屏蔽

### 1.5 Cursor 管理

#### 1.5.1 双层 Cursor 系统

Amp 使用两层 cursor 管理：

```
                  cursorOverride (优先级高)
                       │
                       ▼
currentCursor = cursorOverride ?? regionCursor
                                      │
                                      ▼
                              最后注册的 hoveredRegion 的 cursor
```

- **Region Cursor**：通过 `MouseRegion({ cursor: 'pointer' })` 设置，当鼠标悬停时自动生效
- **Cursor Override**：非 MouseRegion 的渲染对象（如 RenderText 中的超链接）通过 `MouseManager.updateCursorOverride()` 直接覆盖

#### 1.5.2 4 种标准 Cursor

```typescript
const SystemMouseCursors = {
  DEFAULT: 'default',   // 默认块状光标
  POINTER: 'pointer',   // 手型（可点击元素）
  TEXT: 'text',          // I-beam（文本选区）
  NONE: 'none',          // 隐藏光标
};
```

#### 1.5.3 DECSCUSR 序列映射

Cursor shape 通过 DECSCUSR (`\e[N q`) 控制终端光标形态：

| Cursor | DECSCUSR | 附加序列 | 终端效果 |
|--------|----------|---------|---------|
| `default` | `\e[0 q` | `\e[?25h` (show) | 闪烁块 |
| `pointer` | `\e[2 q` | `\e[?25h` (show) | 稳定块 |
| `text` | `\e[6 q` | `\e[?25h` (show) | 稳定竖线 (I-beam) |
| `none` | — | `\e[?25l` (hide) | 隐藏 |

#### 1.5.4 OSC 22 Mouse Shape (扩展)

除了 DECSCUSR 光标形态，Amp 还支持 OSC 22 鼠标指针形状（需要终端支持，如 Kitty、WezTerm）：

```
\e]22;{name}\e\\
```

例如：`\e]22;pointer\e\\` 将终端鼠标指针设为手型。这是 DECSCUSR 之外的补充——DECSCUSR 控制文本光标，OSC 22 控制鼠标指针。

### 1.6 Hover 追踪

#### 1.6.1 reestablishHoverState 机制

Amp 在每帧渲染结束后（post-frame callback）调用 `Pg.reestablishHoverState()`：

```
reestablishHoverState():
  1. 跳过条件: lastPosition < 0 || 无 root || disposed
  2. hitTest 当前鼠标位置 → hitEntries[]
  3. 构建 hitRegions Set
  4. 对当前 hoveredRegions:
     - 不在 hitRegions 中 → unregisterHover(region) → fire onExit
  5. hitEntries 按 depth 排序 (浅到深)
  6. 对每个 hitEntry:
     - 不在 hoveredRegions 中 → registerHover(region) → fire onEnter
```

**关键设计**：
- 每帧重新评估，确保布局变化后 hover 状态正确
- 按 depth 排序后 shallowest-first 注册，使 deepest cursor 最后覆盖（updateCursor 遍历 Set 取最后一个有 cursor 的）
- 注册为 post-frame callback，在 render 阶段之后执行

#### 1.6.2 Hover 状态机

```
鼠标移动 → EventDispatcher → MouseManager.updatePosition(x, y)
                                    ↓
                            (不立即 hit-test)
                                    ↓
帧结束 → FrameScheduler → render-phase callback
                                    ↓
                          reestablishHoverState()
                                    ↓
                         DFS hit-test at lastPosition
                                    ↓
                    ┌───────────────┴───────────────┐
                    ▼                               ▼
            新进入的区域:                     离开的区域:
            registerHover(region)            unregisterHover(region)
            → onEnter callback               → onExit callback
            → updateCursor()                 → updateCursor()
```

### 1.7 拖拽 (Drag) 支持

#### 1.7.1 TextField 拖拽状态机

TextField (Amp 混淆: 文本输入组件) 中的拖拽选区状态机：

```
状态变量:
  _isDragging: boolean = false
  _dragAnchor: number = -1 (字符位置)
  _lastClickTime: number = 0 (用于双击检测)
  _lastClickPos: number = -1

状态转换:
  press/click:
    if (doubleClick):
      → selectWordAt(charPos) → 复制选区到剪贴板
    else:
      → clearSelection()
      → cursorPosition = charPos
      → _isDragging = true
      → _dragAnchor = charPos

  move/drag:
    if (_isDragging && _dragAnchor >= 0):
      → setSelection(_dragAnchor, charPos)
      → cursorPosition = charPos  (drag end)

  release:
    if (_isDragging && hasSelection):
      → copySelectionToClipboard (OSC 52)
    → _isDragging = false
```

#### 1.7.2 双击检测

```typescript
const isDoubleClick = (now - lastClickTime < 500) && (lastClickPos === charPos);
```

双击 500ms 窗口 + 相同位置 → 选中单词。

#### 1.7.3 Global Release Callback 联动

TextField 的拖拽依赖 EventDispatcher 的 `globalReleaseCallbacks`。当鼠标从 TextField 内部开始拖拽、移出 TextField 边界后释放时，release 事件仍能通过全局回调通知 TextField。

### 1.8 滚轮事件

#### 1.8.1 按钮编码

| 按钮码 | 方向 | 常量名 |
|--------|------|--------|
| 64 | 滚轮上 | `ScrollUp` |
| 65 | 滚轮下 | `ScrollDown` |
| 66 | 滚轮左 | `ScrollLeft` |
| 67 | 滚轮右 | `ScrollRight` |

#### 1.8.2 分发策略

滚轮事件通过 `dispatchMouseAction('scroll', x, y, button)` 分发到命中测试的最深层具有 `onScroll` handler 的 `RenderMouseRegion`。

**冒泡行为**：从最深 (deepest) 向浅层搜索第一个有 `onScroll` 的 region，找到即停止（不继续冒泡）。

#### 1.8.3 JetBrains 终端兼容

Amp 特别处理了 JetBrains IDE 终端（JediTerm），因为 JetBrains 终端会发送快速重复的滚轮事件。TerminalManager 中有 JetBrains 检测：

```typescript
private static _detectJetBrains(): boolean {
  if (env.TERMINAL_EMULATOR?.includes('JetBrains')) return true;
  if (env.TERM_PROGRAM === 'JetBrains-JediTerm') return true;
  return false;
}
```

#### 1.8.4 可配置滚动步长

```typescript
get scrollStep(): number     // 默认 3 行
setScrollStep(lines: number) // 范围 [1, 20]
```

### 1.9 文本选区与鼠标集成

#### 1.9.1 RenderText 鼠标处理

`RenderText` (文本渲染对象) 支持以下鼠标交互：

| 事件类型 | 行为 |
|---------|------|
| `click` | 检查点击位置是否有 `onClick` handler（来自 TextSpan），有则调用 |
| `enter`/`hover` | 检查位置是否有超链接或 onClick，有则设置 cursor override 为 POINTER |
| `exit` | 重置 cursor override 为 DEFAULT |

```typescript
handleMouseEvent(event):
  if (type === 'click'):
    onClick = getOnClickAtPosition(x, y)
    if (onClick) onClick()
  elif (type === 'enter' || type === 'hover'):
    hasInteraction = getHyperlinkAtPosition(x, y) || getOnClickAtPosition(x, y)
    if (hasInteraction):
      MouseManager.instance.updateCursorOverride('pointer')
  elif (type === 'exit'):
    MouseManager.instance.updateCursorOverride('default')
```

#### 1.9.2 CollapsibleDrawer 鼠标交互

折叠抽屉组件使用 MouseRegion 包裹标题行：

```js
// Amp 逆向 (expand-collapse-lT.js)
new GL({             // MouseRegion
  onClick: this._handleClick.bind(this),
  cursor: "pointer",
  child: new Y$({    // Row
    children: [title, SizedBox(1), indicator]
  })
})
```

点击标题行 → toggle expanded 状态。

---

## 2. Flitter 实现细节

### 2.1 鼠标协议支持

**文件**: [renderer.ts](file:///Users/bytedance/.oh-my-coco/studio/flitter/packages/flitter-core/src/terminal/renderer.ts#L475-L488)

```typescript
enableMouse(): string {
  return `${CSI}?1002h${CSI}?1003h${CSI}?1004h${CSI}?1006h`;
}

disableMouse(): string {
  return `${CSI}?1002l${CSI}?1003l${CSI}?1004l${CSI}?1006l${CSI}?1016l`;
}
```

Flitter 启用 1002 + 1003 + 1004 + 1006，与 Amp 完全一致。禁用时额外关闭 1016 (Pixel Mouse)。

**快捷常量** ([renderer.ts:43-44](file:///Users/bytedance/.oh-my-coco/studio/flitter/packages/flitter-core/src/terminal/renderer.ts#L43-L44)):
```typescript
export const MOUSE_ON = '\x1b[?1003h\x1b[?1006h';    // 简化版 (仅 1003+1006)
export const MOUSE_OFF = '\x1b[?1003l\x1b[?1006l';   // 简化版
```

注意：`MOUSE_ON/OFF` 仅覆盖 1003 和 1006，而 `enableMouse()/disableMouse()` 覆盖全部模式。`terminalCleanup()` 使用 `renderer.disableMouse()` 确保完整清理。

### 2.2 SGR 鼠标解析

**文件**: [input-parser.ts](file:///Users/bytedance/.oh-my-coco/studio/flitter/packages/flitter-core/src/input/input-parser.ts#L524-L555)

```typescript
private _parseSGRMouse(params: string, final: string, sequence: string): void {
  const match = SGR_MOUSE_RE.exec('<' + params);  // re-prepend '<' for regex
  if (!match) return;

  const buttonCode = parseInt(match[1]!, 10);
  const col = parseInt(match[2]!, 10);
  const row = parseInt(match[3]!, 10);

  const mods = extractMouseModifiers(buttonCode);
  const baseButton = extractBaseButton(buttonCode);
  const action = determineMouseAction(buttonCode, final);

  const event: MouseEvent = {
    type: 'mouse', action, button: baseButton,
    x: col - 1,  // 1-based → 0-based
    y: row - 1,
    ctrlKey: mods.ctrl, altKey: mods.alt, shiftKey: mods.shift,
  };

  this._callback(event);
}
```

解析流程：
1. CSI 状态机检测 `<...M` 或 `<...m` 前缀
2. 正则提取 `buttonCode;col;row`
3. `extractBaseButton()` 去除修饰位
4. `extractMouseModifiers()` 提取 Shift/Alt/Ctrl/Motion
5. `determineMouseAction()` 判定 press/release/move/scroll
6. 构造 MouseEvent 并回调

### 2.3 按钮编码处理

**文件**: [mouse.ts](file:///Users/bytedance/.oh-my-coco/studio/flitter/packages/flitter-core/src/input/mouse.ts)

```typescript
export function extractBaseButton(buttonCode: number): number {
  const stripped = buttonCode & ~(4 | 8 | 16 | 32);  // 去除 Shift|Alt|Ctrl|Motion
  return stripped;
}

export function determineMouseAction(buttonCode: number, final: string):
  'press' | 'release' | 'move' | 'scroll' {
  if (final === 'm') return 'release';

  const baseButton = extractBaseButton(buttonCode);
  if (baseButton >= 64 && baseButton <= 67) return 'scroll';
  if (buttonCode & 32) return 'move';  // Motion bit

  return 'press';
}
```

### 2.4 事件分发管线

**文件**: [binding.ts](file:///Users/bytedance/.oh-my-coco/studio/flitter/packages/flitter-core/src/framework/binding.ts#L795-L841)

```typescript
private setupEventHandlers(): void {
  const dispatcher = EventDispatcher.instance;

  this._inputParser = new InputParser((event) => dispatcher.dispatch(event));
  this._tui.onInput = (data: Buffer) => this._inputParser!.feed(data);

  // Mouse → MouseManager
  if (this.mouseManager) {
    dispatcher.addMouseHandler((event) => {
      this.mouseManager!.updatePosition(event.x, event.y);

      if (event.action === 'scroll' || event.action === 'press' || event.action === 'release') {
        this.mouseManager!.dispatchMouseAction(event.action, event.x, event.y, event.button);
      }
    });
  }
}
```

**注意**：`move` action 不直接分发给 MouseManager.dispatchMouseAction。hover 状态的更新通过 post-frame 的 `reestablishHoverState()` 完成。

### 2.5 HitTest 实现

#### 2.5.1 MouseManager 内部 HitTest

**文件**: [mouse-manager.ts](file:///Users/bytedance/.oh-my-coco/studio/flitter/packages/flitter-core/src/input/mouse-manager.ts#L246-L314)

```typescript
private _hitTest(
  node: RenderObject, x: number, y: number,
  parentOffsetX: number, parentOffsetY: number,
  depth: number, results: HitTestEntry[],
): boolean {
  const RMR = getRenderMouseRegionClass();
  let globalX = parentOffsetX;
  let globalY = parentOffsetY;
  if (box.offset) { globalX += box.offset.col; globalY += box.offset.row; }

  let opaqueHit = false;

  if (node instanceof RMR) {
    if (x >= globalX && x < globalX + box.size.width &&
        y >= globalY && y < globalY + box.size.height) {
      results.push({ region, depth });
      if (region.opaque) opaqueHit = true;
    }
  }

  // 倒序遍历子节点 (topmost first)
  const children = [];
  node.visitChildren((child) => children.push(child));

  for (let i = children.length - 1; i >= 0; i--) {
    const childOpaqueHit = this._hitTest(children[i], x, y, globalX, globalY, depth + 1, results);
    if (childOpaqueHit) { opaqueHit = true; break; }
  }

  return opaqueHit;
}
```

#### 2.5.2 通用 HitTest

**文件**: [hit-test.ts](file:///Users/bytedance/.oh-my-coco/studio/flitter/packages/flitter-core/src/input/hit-test.ts)

```typescript
function _hitTestNode(
  node: RenderObject, screenX: number, screenY: number,
  parentOffsetX: number, parentOffsetY: number,
  path: HitTestEntry[]
): boolean {
  if (!(node instanceof RenderBox)) {
    // 非 RenderBox: 递归子节点
    let childHit = false;
    node.visitChildren((child) => { if (_hitTestNode(...)) childHit = true; });
    if (childHit) path.push({ renderObject: node, localX: screenX, localY: screenY });
    return childHit;
  }

  const nodeScreenX = parentOffsetX + node.offset.col;
  const nodeScreenY = parentOffsetY + node.offset.row;
  const localX = screenX - nodeScreenX;
  const localY = screenY - nodeScreenY;

  if (!hitTestSelf(node, localX, localY)) return false;

  // ContainerRenderBox: 倒序遍历, 取第一个命中的子节点
  if (node instanceof ContainerRenderBox) {
    for (let i = children.length - 1; i >= 0; i--) {
      if (_hitTestNode(children[i], ..., nodeScreenX, nodeScreenY, path)) {
        childHit = true;
        break;  // 只取 front-most 子节点
      }
    }
  }

  path.push({ renderObject: node, localX, localY });
  return true;
}
```

### 2.6 MouseRegion Widget

**文件**: [mouse-region.ts](file:///Users/bytedance/.oh-my-coco/studio/flitter/packages/flitter-core/src/widgets/mouse-region.ts)

完整的 Widget → RenderObject 映射：

```typescript
class MouseRegion extends SingleChildRenderObjectWidget {
  onClick, onRelease, onDrag, onEnter, onExit, onHover, onScroll, cursor, opaque

  createRenderObject(): RenderMouseRegion { ... }
  updateRenderObject(ro: RenderObject): void { /* 同步所有属性 */ }
}

class RenderMouseRegion extends RenderBox {
  performLayout(): void { /* 透传 child 布局 */ }
  paint(ctx, offset): void { /* 透传 child 绘制 */ }
  handleMouseEvent(type, event): void { /* switch/case 分发到回调 */ }
}
```

### 2.7 Cursor 系统

**文件**: [mouse-cursors.ts](file:///Users/bytedance/.oh-my-coco/studio/flitter/packages/flitter-core/src/input/mouse-cursors.ts)

4 种标准 cursor + DECSCUSR 映射：
```typescript
function cursorToAnsi(cursor: string): string {
  'default' → '\x1b[?25h\x1b[0 q'   // show + blinking block
  'pointer' → '\x1b[?25h\x1b[2 q'   // show + steady block
  'text'    → '\x1b[?25h\x1b[6 q'   // show + steady bar
  'none'    → '\x1b[?25l'            // hide
}
```

OSC 22 鼠标形状 ([renderer.ts:93-95](file:///Users/bytedance/.oh-my-coco/studio/flitter/packages/flitter-core/src/terminal/renderer.ts#L93-L95)):
```typescript
function mouseShape(name: string): string {
  return `\x1b]22;${name}\x1b\\`;
}
```

### 2.8 Hover 追踪

**文件**: [mouse-manager.ts:193-232](file:///Users/bytedance/.oh-my-coco/studio/flitter/packages/flitter-core/src/input/mouse-manager.ts#L193-L232)

`reestablishHoverState()` 注册为 render-phase 的 post-frame callback：

```typescript
// binding.ts — FrameScheduler 'render-phase' callback
this.frameScheduler.addFrameCallback('render-phase', () => {
  this.render();
  if (this.mouseManager) {
    this.mouseManager.reestablishHoverState();
  }
}, 'render', 0);
```

同样在 `drawFrameSync()` (测试同步版本) 中也包含：
```typescript
drawFrameSync(): void {
  // ... build, layout, paint, render ...
  if (this.mouseManager) {
    this.mouseManager.reestablishHoverState();
  }
}
```

### 2.9 拖拽支持

**文件**: [text-field.ts:993-1041](file:///Users/bytedance/.oh-my-coco/studio/flitter/packages/flitter-core/src/widgets/text-field.ts#L993-L1041)

TextField 的拖拽状态机完全实现：
- `_isDragging` + `_dragAnchor` 状态变量
- 双击检测 (500ms 窗口)
- OSC 52 剪贴板复制
- press → drag → release 完整生命周期

### 2.10 滚轮处理

MouseManager.dispatchMouseAction('scroll', ...) 从最深 RenderMouseRegion 搜索有 onScroll handler 的区域：

```typescript
if (action === 'scroll') {
  for (let i = hitEntries.length - 1; i >= 0; i--) {
    if (hitEntries[i].region.onScroll) {
      region.handleMouseEvent('scroll', event);
      return;  // 找到第一个即停止
    }
  }
}
```

### 2.11 Pixel Mouse Mode (1016)

**文件**: [renderer.ts:98-101](file:///Users/bytedance/.oh-my-coco/studio/flitter/packages/flitter-core/src/terminal/renderer.ts#L98-L101)

```typescript
export const PIXEL_MOUSE_ON = `${CSI}?1016h`;
export const PIXEL_MOUSE_OFF = `${CSI}?1016l`;
```

Pixel Mouse Mode (SGR-Pixels) 在 flitter-core 中已定义常量和 enable/disable 方法，但尚未在启动时默认启用。仅在 `disableMouse()` 清理时包含 `?1016l`。

### 2.12 终端清理

**文件**: [terminal-cleanup.ts](file:///Users/bytedance/.oh-my-coco/studio/flitter/packages/flitter-core/src/terminal/terminal-cleanup.ts)

完整清理序列：
```
KITTY_KEYBOARD_OFF + MODIFY_OTHER_KEYS_OFF + EMOJI_WIDTH_OFF + IN_BAND_RESIZE_OFF +
PROGRESS_BAR_OFF + renderer.disableMouse() + BRACKET_PASTE_OFF + ALT_SCREEN_OFF +
DECSCUSR_DEFAULT + CURSOR_SHOW + SGR_RESET + HYPERLINK_CLOSE
```

严格遵循 Amp 的 `zG8` 清理顺序：键盘 → 鼠标 → 屏幕 → 光标。

---

## 3. 差异对比表

| 特性 | Amp 实现 | Flitter 实现 | 差异等级 | 说明 |
|------|---------|-------------|---------|------|
| **SGR 协议 (1006)** | `\e[<Cb;Cx;CyM/m` 解析 | 完全相同的正则+解析逻辑 | 🟢 一致 | SGR_MOUSE_RE + extractBaseButton + extractMouseModifiers + determineMouseAction 完全对齐 |
| **X10 协议** | 未使用（仅 SGR） | 未使用（仅 SGR） | 🟢 一致 | 两者都只支持 SGR，不支持 X10 raw byte 编码 |
| **URxvt 协议** | 未使用 | 未使用 | 🟢 一致 | 两者都跳过 URxvt decimal 编码 |
| **DECSET 启用** | 1002+1003+1004+1006 | 1002+1003+1004+1006 | 🟢 一致 | enableMouse() 序列完全相同 |
| **DECSET 禁用** | 1002+1003+1004+1006+1016 | 1002+1003+1004+1006+1016 | 🟢 一致 | disableMouse() 包含 1016 清理 |
| **Pixel Mouse (1016)** | 仅在清理时禁用 | 有 enable/disable 方法 + 常量，清理时禁用 | 🟡 微差 | Flitter 多了 enablePixelMouse() API，但未默认启用 |
| **按钮常量** | 0-2, 64-67 | MouseButton.Left(0)..ScrollRight(67) | 🟢 一致 | 值完全相同 |
| **修饰键解析** | Shift(4), Alt(8), Ctrl(16), Motion(32) | MouseModifier.Shift(4)..Motion(32) | 🟢 一致 | 位掩码值相同 |
| **坐标转换** | 1-based → 0-based (col-1, row-1) | 同上 (col-1, row-1) | 🟢 一致 | |
| **事件类型** | press/release/move/scroll | press/release/move/scroll | 🟢 一致 | InputEvent 的 action 字段 |
| **MouseEventType** | click/release/drag/enter/exit/hover/scroll | click/release/drag/enter/exit/hover/scroll | 🟢 一致 | 7 种完整事件类型 |
| **HitTest DFS 遍历** | 倒序子节点 + offset 累加 | 倒序子节点 + offset 累加 | 🟢 一致 | 算法完全相同 |
| **HitTest opaque** | opaque 区域阻断穿透 | opaque=true 默认行为 | 🟢 一致 | |
| **两套 HitTest** | MouseManager 内部 + 通用 | mouse-manager._hitTest + hit-test.hitTest | 🟢 一致 | 两套并存 |
| **通用 HitTest 路径** | 返回 deepest→shallowest 路径 | HitTestResult.path: deepest→shallowest | 🟢 一致 | |
| **MouseRegion Widget** | T3/Ba, SingleChildRenderObject | MouseRegion/RenderMouseRegion | 🟢 一致 | 完全复刻 |
| **Cursor 类型** | default/pointer/text/none | SystemMouseCursors: DEFAULT/POINTER/TEXT/NONE | 🟢 一致 | |
| **DECSCUSR 映射** | gg.cursorToAnsi | cursorToAnsi() | 🟢 一致 | default→0q, pointer→2q, text→6q, none→?25l |
| **OSC 22 Mouse Shape** | `\e]22;name\e\\` | mouseShape(name) | 🟢 一致 | Renderer.setMouseShape() |
| **Cursor Override** | Pg.cursorOverride | MouseManager.updateCursorOverride() | 🟢 一致 | 优先级高于 region cursor |
| **Hover 追踪** | post-frame callback → reestablishHoverState | render-phase callback → reestablishHoverState | 🟢 一致 | 注册时机相同 |
| **Enter/Exit 事件** | registerHover → onEnter, unregisterHover → onExit | 完全相同 | 🟢 一致 | |
| **拖拽状态机** | press→drag→release + anchor + isDragging | 完全相同 (TextField) | 🟢 一致 | |
| **双击检测** | 500ms 窗口 + 相同位置 | 500ms 窗口 + 相同位置 | 🟢 一致 | |
| **Global Release Callback** | Pg.addGlobalReleaseCallback | EventDispatcher.addGlobalReleaseCallback | 🟢 一致 | 用于拖拽跨区域释放 |
| **滚轮分发** | 深度优先找 onScroll handler | 完全相同 (deepest first, stop on match) | 🟢 一致 | |
| **滚轮方向** | up(64)/down(65)/left(66)/right(67) | ScrollUp(64)..ScrollRight(67) | 🟢 一致 | |
| **JetBrains 终端滤波** | wB0 检测 JetBrains 终端 | TerminalManager._detectJetBrains | 🟢 一致 | TERMINAL_EMULATOR/TERM_PROGRAM 检测 |
| **可配置滚动步长** | wB0.scrollStep | TerminalManager.scrollStep (默认3, 范围1-20) | 🟢 一致 | |
| **RenderText 鼠标** | 超链接/onClick → cursor override | handleMouseEvent → 超链接检测 → cursor override | 🟢 一致 | |
| **Escape 超时** | 500ms timeout → emit bare ESC | ESCAPE_TIMEOUT_MS = 500 | 🟢 一致 | |
| **事件分发管线** | stdin→emitKeys→Pg.dispatch | stdin→InputParser→EventDispatcher.dispatch | 🟢 一致 | 架构完全对齐 |
| **Focus Event (1004)** | `\e[I`=focusIn, `\e[O`=focusOut | FocusEvent: focused=true/false | 🟢 一致 | |
| **Cleanup 顺序** | zG8: keyboard→mouse→screen→cursor | terminalCleanup: keyboard→mouse→screen→cursor | 🟢 一致 | 严格遵循相同顺序 |
| **Suspend/Resume** | wB0.suspend/resume: mouse off/on | TerminalManager.suspend/resume | 🟢 一致 | |
| **move 事件处理** | move 不直接 dispatch to regions | 同 (仅 updatePosition, hover 由 reestablish 处理) | 🟢 一致 | |
| **press→click 映射** | press action 在 dispatchMouseAction 中映射为 click | dispatchMouseAction('press',..) → 搜索 onClick | 🟢 一致 | |

---

## 4. 差异修复建议（按优先级排序）

整个鼠标系统实现**高度对齐**。flitter-core 的鼠标系统是 Amp CLI 鼠标系统的忠实复刻，从协议层（SGR 解析）到应用层（MouseRegion/HitTest/Cursor/Drag）全部一致。

以下是极少数可以进一步完善的点：

### P3 (低优先级) — 增强项

#### 4.1 Pixel Mouse Mode (1016) 启用支持

**现状**: flitter-core 已有 `enablePixelMouse()`/`disablePixelMouse()` API 和 `PIXEL_MOUSE_ON/OFF` 常量，但不在 `enableMouse()` 中启用。Amp 也未默认启用 1016。

**建议**: 保持现状。Pixel mouse 是 Kitty 扩展协议，需要终端能力检测后按需启用。目前的 API 预留已足够。

#### 4.2 InputParser 对 X10/URxvt 的容错

**现状**: Amp 和 Flitter 均只解析 SGR (`\e[<...M/m`)。如果终端回退到 X10 (`\e[M` + 3 raw bytes)，解析器不会识别。

**建议**: 低优先级。现代终端（iTerm2, Kitty, WezTerm, Alacritty, Ghostty）均支持 SGR 1006。X10 回退几乎不会发生（因为我们主动请求 1006 模式）。如需容错，可在 CSI 状态机中增加 `\e[M` + 3 byte 的 fallback 分支。

#### 4.3 滚轮 delta 量化

**现状**: 滚轮事件以整数步 (1 event = 1 step) 传递，实际滚动行数由 `TerminalManager.scrollStep` 配置。

**建议**: 保持现状。终端环境不像 GUI 有亚像素精度的滚轮 delta。每个 scroll event = 1 个 step 是终端的标准行为。

#### 4.4 hover 节流

**现状**: 每帧 reestablishHoverState 都做一次完整 DFS hit-test。对于大型 render tree，这可能有性能影响。

**建议**: Amp 也是相同策略（每帧 post-frame 重评估）。当前终端 TUI 的 render tree 规模远小于 GUI，这不构成瓶颈。如未来需要优化，可考虑 dirty flag 或 spatial hash 索引。

### 总结

鼠标系统是 flitter-core 中**完成度最高**的子系统之一。从 SGR 协议解析、按钮/修饰键编码、HitTest DFS 遍历、MouseRegion 7 事件类型、双层 Cursor 管理、Hover 追踪状态机、拖拽生命周期、Global Release Callback、滚轮分发，到终端清理序列——全部与 Amp CLI 的实现保持了指令级的一致性。**无需进行任何修复**，仅有 Pixel Mouse 启用等极低优先级的增强项。
