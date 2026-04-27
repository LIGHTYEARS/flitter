# TuiController 子系统

本页介绍终端控制器——负责管理终端的 raw mode、备用屏幕、输入读取、能力检测和信号处理。它是 Flitter 与底层终端之间的桥梁。

:::warning 高级内容
大多数开发者不需要直接使用这些 API。TuiController 由 `WidgetsBinding` 自动管理。只有在需要访问终端能力信息、处理挂起/恢复信号、或定制终端初始化行为时才需要了解这些内容。
:::

**何时需要用到：**
- 需要检测终端支持的特性（真彩色、Kitty 图形协议等）时
- 需要处理 `Ctrl+Z`（挂起）和恢复逻辑时
- 需要在 `runApp` 之外手动控制终端生命周期时

> 终端控制器——管理 raw mode、alt screen、输入读取、能力检测与信号处理。

---

## TuiController

> 逆向自 amp `XXT`，负责终端 I/O 的完整生命周期。

WidgetsBinding 持有一个 TuiController 实例，通常不需要直接构造。

**构造**

```ts
new TuiController()
```

初始化 `Screen(80, 24)` 和 `AnsiRenderer`，未连接终端。

### 生命周期

```
new TuiController()
  → init()              # 连接终端：raw mode、鼠标、paste、kitty keyboard
  → startCapabilityDetection()  # 发送 VT 查询序列
  → waitForCapabilities(ms)     # 等待响应或超时
  → render()            # 渲染循环（每帧调用一次）
  → deinit()            # 恢复终端、释放资源
```

**关键方法**

| 方法 | 说明 |
|------|------|
| `init()` | 进入 raw mode，启用鼠标/paste/kitty keyboard/in-band resize |
| `render()` | 调用 AnsiRenderer 生成差分输出，写入 stdout，调用 `screen.present()` |
| `deinit(): Promise<void>` | 退出 alt screen，恢复终端，清除所有 handler |
| `enterAltScreen()` | 进入备用屏幕缓冲区（幂等） |
| `exitAltScreen()` | 退出备用屏幕缓冲区（幂等） |
| `getSize()` | 返回 `TerminalSize`（`{ width, height }` 浅拷贝） |
| `getScreen()` | 返回内部 `Screen` 实例 |
| `getCapabilities()` | 返回 `TerminalCapabilities \| null`（检测完成前为 null） |
| `startCapabilityDetection()` | 发送 VT 查询序列，2 秒超时后调用 `finishCapabilityDetection` |
| `waitForCapabilities(ms)` | 等待能力检测完成的 Promise |
| `handleSuspend()` | 处理 Ctrl+Z / SIGTSTP（同步恢复终端，然后暂停进程） |
| `handleResume()` | 处理 SIGCONT（恢复输入流、重新启用终端特性） |
| `setMouseCursor(cursor)` | 设置鼠标指针形状（OSC 22，仅支持终端响应） |
| `setProgressBar(state)` | 设置 OS 任务栏进度条（OSC 9;4，需 Ghostty/WezTerm） |

**事件注册**

| 方法 | 回调类型 | 说明 |
|------|----------|------|
| `onKey(cb)` | `(event: KeyEvent) => void` | 键盘事件 |
| `offKey(cb)` | — | 注销键盘 handler |
| `onMouse(cb)` | `(event: MouseEvent) => void` | 鼠标事件 |
| `onResize(cb)` | `(event: TerminalSize) => void` | 终端尺寸变化 |
| `onPaste(cb)` | `(event: PasteEvent) => void` | Bracketed Paste |
| `onFocus(cb)` | `(event: FocusEvent) => void` | 焦点获得/失去（CSI I / CSI O） |
| `offFocus(cb)` | — | 注销焦点 handler |
| `onCapabilities(cb)` | `(event: CapabilityEvent) => void` | 能力检测完成 |

---

## TerminalCapabilities

> 描述终端仿真器支持的特性集，由能力检测流程填充。

| 属性 | 类型 | 说明 |
|------|------|------|
| `emojiWidth` | `boolean` | 支持 Emoji 宽度检测（DEC ?2027） |
| `syncOutput` | `boolean` | 支持同步输出（DEC ?2026） |
| `kittyKeyboard` | `boolean` | 支持 Kitty 键盘协议 |
| `kittyGraphics` | `boolean` | 支持 Kitty 图形协议 |
| `colorPaletteNotifications` | `boolean` | 支持调色板变更通知 |
| `xtversion` | `string \| null` | xtversion 响应字符串（如 `"ghostty 1.0"`) |
| `pixelMouse` | `boolean` | 支持像素级鼠标追踪（DEC ?1016） |
| `pixelDimensions` | `{ width, height } \| null` | 终端像素尺寸 |
| `osc52` | `boolean` | 支持 OSC 52 剪贴板 |
| `background` | `"dark" \| "light"` | 终端背景亮度（默认 `"dark"`） |
| `kittyExplicitWidth` | `boolean` | 支持 OSC 66 显式字符宽度 |
| `supportsCursorShape` | `boolean` | 支持 DECSCUSR 光标形状（Emacs/JetBrains 返回 false） |
| `colorDepth` | `ColorDepth` | 颜色深度：`"16" \| "256" \| "truecolor"` |
| `animationSupport` | `"fast" \| "slow" \| "disabled"` | 动画支持级别 |
| `underlineSupport` | `"none" \| "standard"` | 下划线支持（JetBrains 为 `"none"`） |
| `scrollStep` | `() => number` | 每次滚动行数（Ghostty/JetBrains=1，其他=3） |

---

## TerminalSize

```ts
interface TerminalSize {
  width: number;   // 列数
  height: number;  // 行数
}
```

### SIGWINCH 处理

`init()` 调用后，TuiController 同时监听：
- `process.on("SIGWINCH")` — Unix 信号
- `process.stdout.on("resize")` — Node.js resize 事件
- `InputParser` 中的 `inband_resize` 事件（DEC ?2048）

三路来源均触发 `handleResize()`，更新 `terminalSize` 缓存并通知所有 resize handler。带内尺寸通知（?2048）比 SIGWINCH 更可靠，在支持的终端上优先使用。

---

## Kitty 键盘协议

当 `capabilities.kittyKeyboard === true` 时，`init()` 发送 `CSI > 7 u` 推入键盘模式（flags=7 = disambiguate(1) | reportEventTypes(2) | 固定位(4)）。终端随后以 `CSI u` 格式上报按键，包含按下/重复/释放事件类型，并消除 Enter/Ctrl+M、Tab/Ctrl+I 等歧义。

`deinit()` 发送 `CSI < u` 弹出键盘模式。

---

## modifyOtherKeys

`finishCapabilityDetection()` 后**无条件**启用：
- 非 tmux：`CSI > 4;1 m`（mode 1）
- tmux 环境：`CSI > 4;2 m`（mode 2，因为 tmux 不代理 kitty 查询）

消除 Ctrl+字母、Alt+字母等组合键的歧义，与 Kitty 键盘协议互补。

---

## 同步输出

当 `capabilities.syncOutput === true` 时，`render()` 用同步输出序列包裹帧内容：

```ts
SYNC_START + ansiOutput + SYNC_END
// 即 \x1b[?2026h ... \x1b[?2026l
```

防止支持同步输出的终端（kitty、iTerm2、WezTerm、foot、Ghostty 等）出现视觉撕裂。

---

## isTtyStream 助手函数

```ts
import { isTtyStream } from "@flitter/tui";

isTtyStream(stream): boolean
// 检查 stream.isTTY === true && typeof stream.setRawMode === "function"
```

用于判断流是否为真实 TTY。`updateTerminalSize()` 内部使用此函数决定是否读取终端尺寸。
